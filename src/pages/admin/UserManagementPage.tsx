import { useState, useEffect } from 'react'
import { Search, Plus, Download, MoreHorizontal, Mail, UserX, Trash2, X, CheckCircle2, ChevronDown, Copy, Link, UserCog } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/shared/Toast'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type RoleFilter = 'All' | 'Student' | 'Teacher' | 'Parent'

interface ProfileRow {
  id: string
  full_name: string | null
  email: string | null
  role: 'student' | 'teacher' | 'parent' | 'admin' | 'super_admin'
  is_active: boolean
  created_at: string
  class_enrollments?: { classes: { name: string } | null }[]
}

interface NewUser {
  full_name: string
  email:     string
  phone:     string
  role:      'Student' | 'Teacher' | 'Parent'
}

function makeInviteToken() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export default function UserManagementPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const { toast }   = useToast()
  const schoolId    = profile?.school_id

  const [users,      setUsers]      = useState<ProfileRow[]>([])
  const [classes,    setClasses]    = useState<{ id: string; name: string }[]>([])
  const [subjects,   setSubjects]   = useState<{ id: string; name: string }[]>([])
  const [students,   setStudents]   = useState<{ id: string; full_name: string | null }[]>([])
  const [loading,    setLoading]    = useState(true)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All')
  const [search,     setSearch]     = useState('')
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Add-user invite modal
  const [showModal,  setShowModal]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [inviteError,setInviteError]= useState('')
  const [savedUser,  setSavedUser]  = useState<NewUser | null>(null)
  const [classId,    setClassId]    = useState('')
  const [newUser,    setNewUser]    = useState<NewUser>({ full_name: '', email: '', phone: '', role: 'Student' })

  // Manage-user modal
  const [manageUser,      setManageUser]      = useState<ProfileRow | null>(null)
  const [manageClassId,   setManageClassId]   = useState('')
  const [manageSubjectId, setManageSubjectId] = useState('')
  const [manageChildId,   setManageChildId]   = useState('')
  const [managing,        setManaging]        = useState(false)
  const [manageDone,      setManageDone]      = useState(false)

  useEffect(() => { if (schoolId) loadAll() }, [schoolId])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadUsers(), loadClasses(), loadSubjects(), loadStudents()])
    setLoading(false)
  }

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select(`id, full_name, email, role, is_active, created_at,
               class_enrollments(classes(name))`)
      .eq('school_id', schoolId!)
      .in('role', ['student', 'teacher', 'parent'])
      .order('created_at', { ascending: false })
    setUsers((data as unknown as ProfileRow[]) ?? [])
  }

  async function loadClasses() {
    const { data } = await supabase.from('classes').select('id, name').eq('school_id', schoolId!).order('name')
    setClasses(data ?? [])
  }

  async function loadSubjects() {
    const { data } = await supabase.from('subjects').select('id, name').eq('school_id', schoolId!).order('name')
    setSubjects((data ?? []) as { id: string; name: string }[])
  }

  async function loadStudents() {
    const { data } = await supabase.from('profiles').select('id, full_name')
      .eq('school_id', schoolId!).eq('role', 'student').order('full_name')
    setStudents((data ?? []) as { id: string; full_name: string | null }[])
  }

  const db = supabase as unknown as { from: (t: string) => any }

  // ── Manage: teacher assign ──
  async function saveTeacherAssignment() {
    if (!manageUser || !manageClassId || !manageSubjectId) return
    setManaging(true)
    const { error } = await db.from('teacher_assignments').upsert({
      teacher_id: manageUser.id,
      class_id:   manageClassId,
      subject_id: manageSubjectId,
      school_id:  schoolId!,
    }, { onConflict: 'teacher_id,class_id,subject_id' })
    setManaging(false)
    if (error) { logSupabaseError('UserMgmt.teacherAssign', error); toast(error.message, 'error'); return }
    setManageDone(true)
    loadUsers()
  }

  // ── Manage: student enroll ──
  async function saveStudentEnrollment() {
    if (!manageUser || !manageClassId) return
    setManaging(true)
    const { error } = await db.from('class_enrollments').upsert({
      student_id: manageUser.id,
      class_id:   manageClassId,
      school_id:  schoolId!,
      status:     'active',
    }, { onConflict: 'student_id,class_id' })
    setManaging(false)
    if (error) { logSupabaseError('UserMgmt.studentEnroll', error); toast(error.message, 'error'); return }
    setManageDone(true)
    loadUsers()
  }

  // ── Manage: parent link ──
  async function saveParentLink() {
    if (!manageUser || !manageChildId) return
    setManaging(true)
    const { error } = await db.from('parent_student_links').upsert({
      parent_id:  manageUser.id,
      student_id: manageChildId,
      school_id:  schoolId!,
    }, { onConflict: 'parent_id,student_id' })
    setManaging(false)
    if (error) { logSupabaseError('UserMgmt.parentLink', error); toast(error.message, 'error'); return }
    setManageDone(true)
  }

  function openManage(u: ProfileRow) {
    setManageUser(u)
    setManageClassId('')
    setManageSubjectId('')
    setManageChildId('')
    setManageDone(false)
    setOpenMenuId(null)
  }

  function closeManage() {
    setManageUser(null)
    setManageDone(false)
  }

  // ── Invite modal ──
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!schoolId) {
      setInviteError('Your admin account is not assigned to a school yet.')
      return
    }
    setSaving(true)
    setInviteError('')
    try {
      const token = makeInviteToken()
      const { error } = await supabase
        .from('invitations')
        .insert({
          school_id: schoolId,
          email:     newUser.email || null,
          full_name: newUser.full_name,
          role:      newUser.role.toLowerCase(),
          class_id:  classId || null,
          token,
        })
      if (error) throw error
      const link = `${window.location.origin}/invite?token=${token}`
      setInviteLink(link)
      setSavedUser(newUser)
    } catch (err: unknown) {
      const message = (err as Error).message ?? 'Failed to create invitation'
      const friendly = message.includes('row-level security policy')
        ? 'Invite creation is blocked by the current Supabase policy. Apply the invitations RLS fix, then try again.'
        : message
      setInviteError(friendly)
      toast(friendly, 'error')
    } finally {
      setSaving(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
    toast('Invite link copied!', 'success')
  }

  function resetModal() {
    setShowModal(false)
    setInviteLink('')
    setInviteError('')
    setSavedUser(null)
    setClassId('')
    setNewUser({ full_name: '', email: '', phone: '', role: 'Student' })
  }

  const dbRoleMap: Record<RoleFilter, string | null> = {
    All: null, Student: 'student', Teacher: 'teacher', Parent: 'parent',
  }

  const filtered = users.filter(u => {
    const matchRole   = roleFilter === 'All' || u.role === dbRoleMap[roleFilter]
    const matchSearch = (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
                        (u.email ?? '').toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  function toggle(id: string) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  function toggleAll() {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(u => u.id)))
  }
  const allChecked = filtered.length > 0 && selected.size === filtered.length

  const counts = {
    students: users.filter(u => u.role === 'student').length,
    teachers: users.filter(u => u.role === 'teacher').length,
    parents:  users.filter(u => u.role === 'parent').length,
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

  function getClassLabel(u: ProfileRow) {
    if (u.role === 'teacher') return 'Teacher'
    if (u.role === 'parent')  return 'Parent'
    const enrollment = u.class_enrollments?.[0]
    return enrollment?.classes?.name ?? '—'
  }

  const sidebarUser = profileToSidebarUser(profile)

  // Manage modal title + save action
  const manageTitle = manageUser?.role === 'teacher' ? 'Assign Teacher to Class'
                    : manageUser?.role === 'student'  ? 'Enroll Student in Class'
                    : 'Link Parent to Child'

  function handleManageSave() {
    if (manageUser?.role === 'teacher') saveTeacherAssignment()
    else if (manageUser?.role === 'student') saveStudentEnrollment()
    else saveParentLink()
  }

  const manageValid = manageUser?.role === 'teacher' ? (!!manageClassId && !!manageSubjectId)
                    : manageUser?.role === 'student'  ? !!manageClassId
                    : !!manageChildId

  return (
    <DashboardLayout
      activePage="user-management"
      onNavigate={onNavigate}
      title="User Management"
      subtitle="Manage students, teachers, and parents"
      nav={adminNav}
      user={sidebarUser}
    >
      <div className="max-w-[1200px] flex flex-col gap-5">

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {[
            { label: 'Students', value: loading ? '—' : String(counts.students), color: 'text-primary' },
            { label: 'Teachers', value: loading ? '—' : String(counts.teachers), color: 'text-teal-600' },
            { label: 'Parents',  value: loading ? '—' : String(counts.parents),  color: 'text-foreground' },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-card shadow-sm p-4 md:p-5">
              <p className={`text-2xl md:text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 bg-primary/8 border border-primary/20 rounded-card px-4 py-3 flex-wrap">
            <span className="text-sm font-semibold text-primary">{selected.size} selected</span>
            <div className="flex gap-2 ml-auto flex-wrap">
              <button className="flex items-center gap-1.5 h-8 px-3 bg-white border border-black/15 rounded-full text-xs font-semibold text-foreground hover:border-amber-400 hover:text-amber-600 transition-colors">
                <UserX size={12} /> Deactivate
              </button>
              <button className="flex items-center gap-1.5 h-8 px-3 bg-white border border-red-200 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={12} /> Remove
              </button>
              <button onClick={() => setSelected(new Set())} className="h-8 w-8 flex items-center justify-center text-muted hover:text-foreground rounded-full hover:bg-white transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full h-10 pl-9 pr-4 border border-black/15 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary" />
          </div>
          <div className="flex gap-1 bg-canvas rounded-card p-1">
            {(['All', 'Student', 'Teacher', 'Parent'] as RoleFilter[]).map(r => (
              <button key={r} onClick={() => { setRoleFilter(r); setSelected(new Set()) }}
                className={`px-3 h-8 text-xs font-semibold rounded-md transition-colors ${roleFilter === r ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}>
                {r}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 h-10 px-3 border border-black/15 rounded-pill text-sm text-muted hover:text-foreground transition-colors">
            <Download size={13} /> <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => onNavigate('invite-users')}
            className="flex items-center gap-1.5 h-10 px-4 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors">
            <Mail size={13} /> <span className="hidden sm:inline">Bulk Invite</span>
          </button>
          <button onClick={() => { setShowModal(true); setInviteLink(''); setInviteError('') }}
            className="flex items-center gap-1.5 h-10 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary">
            <Plus size={13} /> Add User
          </button>
        </div>

        {/* Table */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-black/6 bg-canvas/40">
                  <th className="px-4 md:px-6 py-3 w-10">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} className="accent-primary" />
                  </th>
                  {['Name', 'Role', 'Class / Dept', 'Email', 'Status', 'Joined', ''].map(h => (
                    <th key={h} className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-muted">Loading users...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-muted">
                    {search || roleFilter !== 'All' ? 'No users match your search.' : 'No users yet. Add your first user to get started.'}
                  </td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id} className={`border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors ${selected.has(u.id) ? 'bg-primary/[0.03]' : ''}`}>
                    <td className="px-4 md:px-6 py-3.5">
                      <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} className="accent-primary" />
                    </td>
                    <td className="px-4 md:px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {(u.full_name ?? u.email ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{u.full_name || u.email || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                        u.role === 'student' ? 'bg-primary/10 text-primary' :
                        u.role === 'teacher' ? 'bg-teal-50 text-teal-700' :
                        'bg-canvas text-muted border border-black/10'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-4 md:px-6 py-3.5 text-muted text-sm">{getClassLabel(u)}</td>
                    <td className="px-4 md:px-6 py-3.5 text-muted text-xs hidden md:table-cell">{u.email ?? '—'}</td>
                    <td className="px-4 md:px-6 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-xs ${u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3.5 text-muted text-xs hidden sm:table-cell">{formatDate(u.created_at)}</td>
                    <td className="px-4 md:px-6 py-3.5">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                          className="text-muted hover:text-foreground transition-colors"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                        {openMenuId === u.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-card shadow-lg border border-black/8 py-1 z-20 min-w-max">
                              <button
                                onClick={() => openManage(u)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-foreground hover:bg-canvas transition-colors"
                              >
                                <UserCog size={13} className="text-muted" />
                                {u.role === 'teacher' ? 'Assign to class' : u.role === 'student' ? 'Enroll in class' : 'Link to child'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Manage User Modal ── */}
      {manageUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeManage} />
          <div className="relative z-10 bg-white rounded-card shadow-xl w-full max-w-[460px] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/8">
              <h2 className="text-base font-bold text-foreground">{manageDone ? 'Done!' : manageTitle}</h2>
              <button onClick={closeManage} className="text-muted hover:text-foreground transition-colors"><X size={18} /></button>
            </div>

            {manageDone ? (
              <div className="p-8 text-center">
                <div className="size-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={24} className="text-green-600" />
                </div>
                <p className="text-base font-bold text-foreground mb-1">
                  {manageUser.role === 'teacher' ? 'Teacher assigned!' : manageUser.role === 'student' ? 'Student enrolled!' : 'Parent linked!'}
                </p>
                <p className="text-sm text-muted mb-6">
                  {manageUser.full_name ?? 'User'} has been updated successfully.
                </p>
                <button onClick={closeManage}
                  className="h-10 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">
                  Close
                </button>
              </div>
            ) : (
              <div className="p-6 flex flex-col gap-5">
                {/* Who is being managed */}
                <div className="flex items-center gap-3 bg-canvas rounded-card px-4 py-3">
                  <div className="size-9 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                    {(manageUser.full_name ?? manageUser.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{manageUser.full_name || manageUser.email || '—'}</p>
                    <p className="text-xs text-muted capitalize">{manageUser.role}</p>
                  </div>
                </div>

                {/* Teacher: class + subject */}
                {manageUser.role === 'teacher' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-foreground">Class <span className="text-red-500">*</span></label>
                      {classes.length === 0 ? (
                        <p className="text-xs text-amber-600 bg-amber-50 rounded-card px-3 py-2">
                          No classes yet. Create a class first in Classes Management.
                        </p>
                      ) : (
                        <div className="relative">
                          <select value={manageClassId} onChange={e => setManageClassId(e.target.value)}
                            className="w-full h-11 pl-4 pr-8 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary appearance-none">
                            <option value="">— Select class —</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-foreground">Subject <span className="text-red-500">*</span></label>
                      {subjects.length === 0 ? (
                        <p className="text-xs text-amber-600 bg-amber-50 rounded-card px-3 py-2">
                          No subjects yet. They will be seeded when you create your first class.
                        </p>
                      ) : (
                        <div className="relative">
                          <select value={manageSubjectId} onChange={e => setManageSubjectId(e.target.value)}
                            className="w-full h-11 pl-4 pr-8 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary appearance-none">
                            <option value="">— Select subject —</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted -mt-2">The teacher can be assigned to multiple classes. Repeat for each class/subject pair.</p>
                  </>
                )}

                {/* Student: class */}
                {manageUser.role === 'student' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-foreground">Class <span className="text-red-500">*</span></label>
                    {classes.length === 0 ? (
                      <p className="text-xs text-amber-600 bg-amber-50 rounded-card px-3 py-2">
                        No classes yet. Create a class first in Classes Management.
                      </p>
                    ) : (
                      <div className="relative">
                        <select value={manageClassId} onChange={e => setManageClassId(e.target.value)}
                          className="w-full h-11 pl-4 pr-8 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary appearance-none">
                          <option value="">— Select class —</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                      </div>
                    )}
                  </div>
                )}

                {/* Parent: select child */}
                {manageUser.role === 'parent' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-foreground">Child (Student) <span className="text-red-500">*</span></label>
                    {students.length === 0 ? (
                      <p className="text-xs text-amber-600 bg-amber-50 rounded-card px-3 py-2">
                        No students in the system yet. Students must sign up first.
                      </p>
                    ) : (
                      <div className="relative">
                        <select value={manageChildId} onChange={e => setManageChildId(e.target.value)}
                          className="w-full h-11 pl-4 pr-8 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary appearance-none">
                          <option value="">— Select student —</option>
                          {students.map(s => <option key={s.id} value={s.id}>{s.full_name ?? 'Unnamed'}</option>)}
                        </select>
                        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                      </div>
                    )}
                    <p className="text-xs text-muted">You can link the same parent to multiple children by saving and reopening.</p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeManage}
                    className="h-11 px-5 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleManageSave}
                    disabled={managing || !manageValid}
                    className="flex-1 h-11 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {managing ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add User (Invite) Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={resetModal} />
          <div className="relative z-10 bg-white rounded-card shadow-xl w-full max-w-[480px] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/8">
              <h2 className="text-base font-bold text-foreground">{inviteLink ? 'Invite Created' : 'Add New User'}</h2>
              <button onClick={resetModal} className="text-muted hover:text-foreground transition-colors"><X size={18} /></button>
            </div>

            {inviteLink ? (
              <div className="p-6">
                <div className="size-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={24} className="text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground text-center mb-1">{savedUser?.full_name} invited!</h3>
                <p className="text-sm text-muted text-center mb-5">Share this link with them to set up their account.</p>
                <div className="bg-canvas rounded-card p-3 flex items-center gap-2 mb-4">
                  <Link size={13} className="text-muted shrink-0" />
                  <span className="text-xs text-foreground flex-1 truncate">{inviteLink}</span>
                  <button onClick={copyLink} className="shrink-0 text-primary hover:text-primary-deep transition-colors">
                    <Copy size={14} />
                  </button>
                </div>
                <button onClick={copyLink}
                  className="w-full h-10 bg-primary/8 text-primary text-sm font-semibold rounded-pill hover:bg-primary/15 transition-colors mb-3">
                  Copy Invite Link
                </button>
                <div className="flex gap-3">
                  <button onClick={() => { setInviteLink(''); setSavedUser(null); setNewUser({ full_name: '', email: '', phone: '', role: 'Student' }); setClassId('') }}
                    className="flex-1 h-10 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors">
                    Add Another
                  </button>
                  <button onClick={() => { resetModal(); loadUsers() }} className="flex-1 h-10 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Full Name <span className="text-red-500">*</span></label>
                  <input required value={newUser.full_name} onChange={e => setNewUser(u => ({ ...u, full_name: e.target.value }))}
                    placeholder="e.g. Amara Okafor"
                    className="h-10 px-3 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-foreground">Role <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value as NewUser['role'] }))}
                        className="w-full h-10 pl-3 pr-8 border border-black/20 rounded-input text-sm text-foreground bg-white outline-none focus:border-primary appearance-none">
                        {(['Student','Teacher','Parent'] as const).map(r => <option key={r}>{r}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    </div>
                  </div>
                  {newUser.role === 'Student' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-foreground">Class</label>
                      <div className="relative">
                        <select value={classId} onChange={e => setClassId(e.target.value)}
                          className="w-full h-10 pl-3 pr-8 border border-black/20 rounded-input text-sm text-foreground bg-white outline-none focus:border-primary appearance-none">
                          <option value="">— Select —</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Email Address <span className="text-muted text-xs font-normal">(optional)</span></label>
                  <input type="email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                    placeholder="user@school.edu"
                    className="h-10 px-3 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary" />
                  <p className="text-xs text-muted">An invite link will be generated. Share it with the user.</p>
                </div>
                {inviteError && (
                  <div className="rounded-card border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    {inviteError}
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={resetModal}
                    className="h-10 px-5 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 h-10 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50">
                    {saving ? 'Creating...' : 'Create Invite Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
