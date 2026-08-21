import { supabase } from './supabase'
import { logSupabaseError } from './supabaseError'

// Unified direct-message conversation helper.
//
// Conversations are named `dm:<uuidA>:<uuidB>` (sorted) so the same pair always
// maps to one conversation, and BOTH participants get conversation_members rows
// — the teacher/student/admin lists are membership-driven, while the parent
// list matches on the dm: name; writing both keeps every page in sync.
// Calling this on an existing conversation self-heals missing member rows
// (older parent-created conversations lacked them).
export async function getOrCreateDirectConversation(
  myId: string,
  otherId: string,
  schoolId: string,
): Promise<{ id: string } | { error: string }> {
  const dmName = `dm:${[myId, otherId].sort().join(':')}`

  const { data: existing, error: findErr } = await supabase
    .from('conversations')
    .select('id')
    .eq('school_id', schoolId)
    .eq('name', dmName)
    .maybeSingle()

  if (findErr) {
    logSupabaseError('messaging/find', findErr)
    return { error: findErr.message }
  }

  let convId = (existing as { id: string } | null)?.id

  if (!convId) {
    const { data: created, error: createErr } = await supabase
      .from('conversations')
      .insert({ school_id: schoolId, type: 'direct', name: dmName })
      .select('id')
      .single()
    if (createErr || !created) {
      logSupabaseError('messaging/create', createErr)
      return { error: createErr?.message ?? 'Could not create conversation' }
    }
    convId = (created as { id: string }).id
  }

  // Ensure both membership rows exist (idempotent)
  const { error: memberErr } = await supabase
    .from('conversation_members')
    .upsert(
      [
        { conversation_id: convId, user_id: myId,    school_id: schoolId },
        { conversation_id: convId, user_id: otherId, school_id: schoolId },
      ],
      { onConflict: 'conversation_id,user_id' },
    )
  if (memberErr) logSupabaseError('messaging/members', memberErr)

  return { id: convId }
}

export interface Contact {
  id:       string
  name:     string
  role:     string
  detail?:  string   // e.g. class or school name shown under the name
  schoolId: string   // school the conversation should belong to
}

// ── Role-specific contact loaders for the "New message" picker ───────────────

// Students: teachers of their classes + school admins
export async function loadStudentContacts(studentId: string, schoolId: string): Promise<Contact[]> {
  const { data: ce } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .eq('student_id', studentId)
  const classIds = ((ce ?? []) as { class_id: string }[]).map(r => r.class_id)

  const contacts = new Map<string, Contact>()

  if (classIds.length > 0) {
    const { data: ta } = await supabase
      .from('teacher_assignments')
      .select('teacher_id, profiles!teacher_id(id, full_name), subjects!subject_id(name)')
      .in('class_id', classIds)
    for (const r of (ta ?? []) as unknown as { teacher_id: string; profiles: { id: string; full_name: string | null } | null; subjects: { name: string } | null }[]) {
      if (r.profiles?.id && !contacts.has(r.profiles.id)) {
        contacts.set(r.profiles.id, {
          id: r.profiles.id, name: r.profiles.full_name ?? 'Teacher',
          role: 'teacher', detail: r.subjects?.name ?? undefined, schoolId,
        })
      }
    }
  }

  const { data: admins } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('school_id', schoolId)
    .eq('role', 'admin')
  for (const a of (admins ?? []) as { id: string; full_name: string | null }[]) {
    if (!contacts.has(a.id)) {
      contacts.set(a.id, { id: a.id, name: a.full_name ?? 'Admin', role: 'admin', detail: 'School Admin', schoolId })
    }
  }

  return [...contacts.values()]
}

// Teachers: students of their classes, those students' parents, school admins
export async function loadTeacherContacts(teacherId: string, schoolId: string): Promise<Contact[]> {
  const { data: ta } = await supabase
    .from('teacher_assignments')
    .select('class_id, classes!class_id(name)')
    .eq('teacher_id', teacherId)
  const taRows   = (ta ?? []) as unknown as { class_id: string; classes: { name: string } | null }[]
  const classIds = [...new Set(taRows.map(r => r.class_id))]
  const classNames: Record<string, string> = {}
  for (const r of taRows) if (r.classes?.name) classNames[r.class_id] = r.classes.name

  const contacts = new Map<string, Contact>()
  let studentIds: string[] = []

  if (classIds.length > 0) {
    const { data: ce } = await supabase
      .from('class_enrollments')
      .select('student_id, class_id, profiles!student_id(id, full_name)')
      .in('class_id', classIds)
    for (const r of (ce ?? []) as unknown as { student_id: string; class_id: string; profiles: { id: string; full_name: string | null } | null }[]) {
      if (r.profiles?.id && !contacts.has(r.profiles.id)) {
        contacts.set(r.profiles.id, {
          id: r.profiles.id, name: r.profiles.full_name ?? 'Student',
          role: 'student', detail: classNames[r.class_id], schoolId,
        })
        studentIds.push(r.profiles.id)
      }
    }
  }

  if (studentIds.length > 0) {
    const { data: links } = await supabase
      .from('parent_student_links')
      .select('parent_id, student_id, profiles!parent_id(id, full_name)')
      .in('student_id', studentIds)
    for (const l of (links ?? []) as unknown as { parent_id: string; profiles: { id: string; full_name: string | null } | null }[]) {
      if (l.profiles?.id && !contacts.has(l.profiles.id)) {
        contacts.set(l.profiles.id, { id: l.profiles.id, name: l.profiles.full_name ?? 'Parent', role: 'parent', schoolId })
      }
    }
  }

  const { data: admins } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('school_id', schoolId)
    .eq('role', 'admin')
  for (const a of (admins ?? []) as { id: string; full_name: string | null }[]) {
    if (!contacts.has(a.id)) {
      contacts.set(a.id, { id: a.id, name: a.full_name ?? 'Admin', role: 'admin', detail: 'School Admin', schoolId })
    }
  }

  return [...contacts.values()]
}

// Admins: teachers + parents + students of their school, plus super admins.
// (Reading super_admin profiles needs the profiles_read_super_admins policy.)
export async function loadAdminContacts(schoolId: string): Promise<Contact[]> {
  const [schoolRes, superRes] = await Promise.all([
    supabase.from('profiles')
      .select('id, full_name, role')
      .eq('school_id', schoolId)
      .in('role', ['teacher', 'parent', 'student']),
    supabase.from('profiles')
      .select('id, full_name')
      .eq('role', 'super_admin'),
  ])
  const contacts: Contact[] = []
  for (const p of (schoolRes.data ?? []) as { id: string; full_name: string | null; role: string }[]) {
    contacts.push({ id: p.id, name: p.full_name ?? 'User', role: p.role, schoolId })
  }
  for (const s of (superRes.data ?? []) as { id: string; full_name: string | null }[]) {
    contacts.push({ id: s.id, name: s.full_name ?? 'Learnora Support', role: 'super_admin', detail: 'Platform (Learnora)', schoolId })
  }
  return contacts
}

// Super admins: every school admin across the platform.
// The conversation lives under the admin's school (super admin RLS bypasses).
export async function loadSuperAdminContacts(): Promise<Contact[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, school_id, schools!school_id(name)')
    .eq('role', 'admin')
  const rows = (data ?? []) as unknown as { id: string; full_name: string | null; school_id: string | null; schools: { name: string } | null }[]
  return rows
    .filter(r => r.school_id)
    .map(r => ({
      id: r.id, name: r.full_name ?? 'Admin', role: 'admin',
      detail: r.schools?.name ?? undefined, schoolId: r.school_id!,
    }))
}
