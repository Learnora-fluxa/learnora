import { useState, useEffect } from 'react'
import { ArrowLeft, Users, BookOpen, ClipboardCheck, TrendingUp, UserPlus, ArrowUpRight, GraduationCap, Plus, Trash2, ChevronDown } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import PromoteStudentsModal from '../../components/shared/PromoteStudentsModal'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/shared/Toast'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface ClassMeta {
  id: string; name: string; level: string | null; arm: string | null
  teacher: string | null; students: number; subjects: number
}

interface StudentRow {
  id:         string
  full_name:  string | null
  avgScore:   number | null
  attendance: number | null
}

interface TeacherOption {
  id: string
  full_name: string | null
}

interface SubjectOption {
  id: string
  name: string | null
}

interface TeachingAssignmentRow {
  id: string
  teacher_id: string
  subject_id: string
  teacher: { full_name: string | null } | null
  subject: { name: string | null } | null
}

export default function AdminClassDetailsPage({ onNavigate }: Props) {
  const { profile }    = useAuth()
  const sidebarUser    = profileToSidebarUser(profile)
  const { toast }      = useToast()
  const schoolId       = profile?.school_id

  const raw = sessionStorage.getItem('learnora_admin_class')
  const cls: ClassMeta | null = raw ? JSON.parse(raw) : null

  const [students,        setStudents]        = useState<StudentRow[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [selected,        setSelected]        = useState<Set<string>>(new Set())
  const [promoteOpen,     setPromoteOpen]     = useState(false)
  const [teachers,        setTeachers]        = useState<TeacherOption[]>([])
  const [subjects,        setSubjects]        = useState<SubjectOption[]>([])
  const [assignments,     setAssignments]     = useState<TeachingAssignmentRow[]>([])
  const [loadingTeaching, setLoadingTeaching] = useState(true)
  const [teacherId,       setTeacherId]       = useState('')
  const [subjectId,       setSubjectId]       = useState('')
  const [savingAssign,    setSavingAssign]    = useState(false)

  useEffect(() => {
    if (cls?.id) {
      loadStudents(cls.id)
      loadTeachingSetup(cls.id)
    }
  }, [cls?.id, schoolId])

  async function loadStudents(classId: string) {
    setLoadingStudents(true)

    const { data: enrollData } = await supabase
      .from('class_enrollments')
      .select('student_id, profiles!student_id(id, full_name)')
      .eq('class_id', classId)

    const rawEnroll = (enrollData ?? []) as unknown as {
      student_id: string
      profiles: { id: string; full_name: string | null } | null
    }[]

    const studentIds = rawEnroll.map(r => r.student_id)
    if (!studentIds.length) { setStudents([]); setLoadingStudents(false); return }

    // Fetch grade summaries for avg score
    const { data: gradeData } = await supabase
      .from('grade_summaries')
      .select('student_id, average_score')
      .in('student_id', studentIds)

    const gradeMap: Record<string, number[]> = {}
    for (const g of (gradeData ?? []) as { student_id: string; average_score: number | null }[]) {
      if (!gradeMap[g.student_id]) gradeMap[g.student_id] = []
      if (g.average_score != null) gradeMap[g.student_id].push(g.average_score)
    }

    // Fetch attendance records for this class
    const { data: attData } = await supabase
      .from('attendance_records')
      .select('student_id, status')
      .eq('class_id', classId)
      .in('student_id', studentIds)

    const attMap: Record<string, { present: number; total: number }> = {}
    for (const a of (attData ?? []) as { student_id: string; status: string }[]) {
      if (!attMap[a.student_id]) attMap[a.student_id] = { present: 0, total: 0 }
      attMap[a.student_id].total++
      if (a.status === 'present') attMap[a.student_id].present++
    }

    const rows: StudentRow[] = rawEnroll.map(r => {
      const sid    = r.student_id
      const scores = gradeMap[sid] ?? []
      const avg    = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null
      const att    = attMap[sid]
      const attPct = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null
      return {
        id:         sid,
        full_name:  r.profiles?.full_name ?? null,
        avgScore:   avg,
        attendance: attPct,
      }
    })

    setStudents(rows)
    setLoadingStudents(false)
  }

  async function loadTeachingSetup(classId: string) {
    if (!schoolId) return
    setLoadingTeaching(true)

    const [teacherRes, subjectRes, assignmentRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('school_id', schoolId)
        .eq('role', 'teacher')
        .order('full_name'),
      supabase
        .from('class_subjects')
        .select('subject_id, subjects(name)')
        .eq('class_id', classId),
      supabase
        .from('teacher_assignments')
        .select('id, teacher_id, subject_id, teacher:profiles!teacher_id(full_name), subject:subjects!subject_id(name)')
        .eq('class_id', classId)
        .order('created_at', { ascending: false }),
    ])

    if (teacherRes.error) {
      logSupabaseError('AdminClassDetails.loadTeachers', teacherRes.error)
      toast('Unable to load teachers.', 'error')
    } else {
      setTeachers((teacherRes.data ?? []) as TeacherOption[])
    }

    if (subjectRes.error) {
      logSupabaseError('AdminClassDetails.loadSubjects', subjectRes.error)
      toast('Unable to load class subjects.', 'error')
    } else {
      const subjectOptions = ((subjectRes.data ?? []) as unknown as { subject_id: string; subjects: { name: string | null } | null }[])
        .map(row => ({ id: row.subject_id, name: row.subjects?.name ?? 'Unnamed subject' }))
      setSubjects(subjectOptions)
      if (subjectOptions.length > 0 && !subjectId) {
        setSubjectId(subjectOptions[0].id)
      }
    }

    if (assignmentRes.error) {
      logSupabaseError('AdminClassDetails.loadTeachingAssignments', assignmentRes.error)
      toast('Unable to load teaching assignments.', 'error')
    } else {
      setAssignments((assignmentRes.data ?? []) as unknown as TeachingAssignmentRow[])
    }

    if (!teacherId && teacherRes.data && teacherRes.data.length > 0) {
      setTeacherId(teacherRes.data[0].id)
    }

    setLoadingTeaching(false)
  }

  async function assignTeacherToSubject() {
    if (!cls?.id || !schoolId || !teacherId || !subjectId) return
    setSavingAssign(true)

    try {
      const existingForSubject = assignments.filter(assignment => assignment.subject_id === subjectId)

      if (existingForSubject.length > 0) {
        const { error: deleteError } = await supabase
          .from('teacher_assignments')
          .delete()
          .in('id', existingForSubject.map(assignment => assignment.id))

        if (deleteError) throw deleteError
      }

      const { error: insertError } = await supabase
        .from('teacher_assignments')
        .insert({
          teacher_id: teacherId,
          class_id: cls.id,
          subject_id: subjectId,
          school_id: schoolId,
        })

      if (insertError) throw insertError

      toast('Teacher assigned to subject successfully.', 'success')
      await loadTeachingSetup(cls.id)
    } catch (err: unknown) {
      logSupabaseError('AdminClassDetails.assignTeacherToSubject', err as any)
      toast((err as Error).message ?? 'Failed to assign teacher.', 'error')
    } finally {
      setSavingAssign(false)
    }
  }

  async function removeAssignment(assignmentId: string) {
    if (!cls?.id) return

    const { error } = await supabase
      .from('teacher_assignments')
      .delete()
      .eq('id', assignmentId)

    if (error) {
      logSupabaseError('AdminClassDetails.removeAssignment', error)
      toast(error.message, 'error')
      return
    }

    toast('Teaching assignment removed.', 'success')
    await loadTeachingSetup(cls.id)
  }

  function statusLabel(avg: number | null) {
    if (avg === null) return 'No Data'
    if (avg >= 80)   return 'Excellent'
    if (avg >= 65)   return 'Good'
    if (avg >= 50)   return 'At Risk'
    return 'Critical'
  }

  const statusStyle: Record<string, string> = {
    Excellent: 'bg-green-50 text-green-700',
    Good:      'bg-primary/10 text-primary',
    'At Risk': 'bg-orange-50 text-orange-600',
    Critical:  'bg-red-50 text-red-600',
    'No Data': 'bg-canvas text-muted',
  }

  const avgAttendance = students.length
    ? Math.round(students.reduce((s, st) => s + (st.attendance ?? 0), 0) / students.length)
    : 0

  const avgScore = students.filter(s => s.avgScore !== null).length
    ? Math.round(students.filter(s => s.avgScore !== null).reduce((s, st) => s + st.avgScore!, 0) / students.filter(s => s.avgScore !== null).length)
    : 0

  if (!cls) {
    return (
      <DashboardLayout activePage="classes-management" onNavigate={onNavigate} title="Class Details" nav={adminNav} user={sidebarUser}>
        <div className="text-center py-20 text-muted">
          <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No class selected. Go back and click "View Details" on a class.</p>
          <button onClick={() => onNavigate('classes-management')} className="mt-4 text-sm text-primary hover:underline">Back to Classes</button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      activePage="classes-management"
      onNavigate={onNavigate}
      title={`Class ${cls.name}`}
      subtitle={`${cls.level ?? ''} · Arm ${cls.arm ?? ''}`}
      nav={adminNav}
      user={sidebarUser}
    >
      <div className="max-w-[1100px] flex flex-col gap-6">

        <button onClick={() => onNavigate('classes-management')} className="flex items-center gap-2 text-sm text-muted hover:text-foreground w-fit">
          <ArrowLeft size={14} /> Back to Classes
        </button>

        {/* Header card */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{cls.name}</h2>
              <p className="text-sm text-muted mt-1">{cls.level} · Arm {cls.arm}</p>
              <p className="text-sm text-muted mt-0.5">
                Form Teacher: <span className={cls.teacher ? 'font-semibold text-foreground' : 'text-red-500 font-semibold'}>
                  {cls.teacher ?? 'Not assigned'}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onNavigate('admin-attendance')} className="h-9 px-4 border border-primary text-primary text-sm font-semibold rounded-pill hover:bg-primary hover:text-white transition-colors flex items-center gap-1.5">
                <ClipboardCheck size={14} /> View Attendance
              </button>
              <button onClick={() => onNavigate('user-management')} className="h-9 px-4 border border-black/15 text-muted text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5">
                <UserPlus size={14} /> Enroll Students
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Students',       value: students.length,             icon: Users,        color: 'text-primary bg-primary/10'    },
            { label: 'Subjects',       value: cls.subjects,                icon: BookOpen,     color: 'text-foreground bg-canvas'     },
            { label: 'Avg Attendance', value: students.length ? `${avgAttendance}%` : '—', icon: ClipboardCheck, color: 'text-green-600 bg-green-50' },
            { label: 'Avg Score',      value: students.filter(s => s.avgScore !== null).length ? `${avgScore}%` : '—', icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-surface rounded-card shadow-sm p-5">
                <div className={`size-9 rounded-full flex items-center justify-center mb-2 ${s.color}`}>
                  <Icon size={16} />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted mt-0.5">{s.label}</p>
              </div>
            )
          })}
        </div>

        {/* Teaching assignments */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-black/6 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <GraduationCap size={15} className="text-primary" /> Subject Teacher Assignments
              </h3>
              <p className="text-xs text-muted mt-1">Choose a teacher and subject for this class so teachers can create courses, assignments, quizzes, and live sessions.</p>
            </div>
          </div>

          <div className="px-6 py-5 border-b border-black/6 bg-canvas/30">
            {loadingTeaching ? (
              <p className="text-sm text-muted">Loading teaching setup…</p>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-card px-4 py-3">
                No subjects are attached to this class yet. Add class subjects first in Classes Management before assigning teachers.
              </p>
            ) : teachers.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-card px-4 py-3">
                No teachers are available yet. Add teacher accounts first in User Management.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Teacher</label>
                  <div className="relative">
                    <select
                      value={teacherId}
                      onChange={e => setTeacherId(e.target.value)}
                      className="w-full h-11 pl-4 pr-8 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary appearance-none"
                    >
                      {teachers.map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.full_name || 'Unnamed teacher'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Subject</label>
                  <div className="relative">
                    <select
                      value={subjectId}
                      onChange={e => setSubjectId(e.target.value)}
                      className="w-full h-11 pl-4 pr-8 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary appearance-none"
                    >
                      {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name || 'Unnamed subject'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  </div>
                </div>

                <button
                  onClick={assignTeacherToSubject}
                  disabled={!teacherId || !subjectId || savingAssign}
                  className="h-11 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> {savingAssign ? 'Saving...' : 'Assign'}
                </button>
              </div>
            )}
          </div>

          <div className="divide-y divide-black/4">
            {loadingTeaching ? (
              <div className="px-6 py-6 text-sm text-muted">Loading assignments…</div>
            ) : assignments.length === 0 ? (
              <div className="px-6 py-8 text-sm text-muted">
                No subject teachers have been assigned to this class yet.
              </div>
            ) : (
              assignments.map(assignment => (
                <div key={assignment.id} className="px-6 py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {assignment.subject?.name || 'Unnamed subject'}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {assignment.teacher?.full_name || 'Unnamed teacher'}
                    </p>
                  </div>
                  <button
                    onClick={() => removeAssignment(assignment.id)}
                    className="size-8 rounded-full flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label={`Remove ${assignment.subject?.name || 'subject'} assignment`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Students table */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-black/6 flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Users size={15} className="text-primary" /> Enrolled Students
            </h3>
            <div className="flex items-center gap-3">
              {selected.size > 0 && (
                <button
                  onClick={() => setPromoteOpen(true)}
                  className="flex items-center gap-1.5 h-8 px-4 bg-primary text-white text-xs font-semibold rounded-pill hover:bg-primary-deep transition-colors"
                >
                  <ArrowUpRight size={12} /> Promote ({selected.size})
                </button>
              )}
              <span className="text-xs text-muted">{students.length} student{students.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {loadingStudents ? (
            <div className="py-12 text-center text-sm text-muted">Loading students…</div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={28} className="mx-auto mb-3 text-muted opacity-30" />
              <p className="text-sm text-muted">No students enrolled yet.</p>
              <button
                onClick={() => onNavigate('user-management')}
                className="mt-4 h-9 px-5 bg-primary text-white text-sm font-semibold rounded-pill"
              >
                Go to User Management
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-black/6 bg-canvas/40">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={students.length > 0 && selected.size === students.length}
                        onChange={() => setSelected(prev => prev.size === students.length ? new Set() : new Set(students.map(s => s.id)))}
                        className="size-4 accent-primary"
                        aria-label="Select all students"
                      />
                    </th>
                    {['Student', 'Avg Score', 'Attendance', 'Status'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/4">
                  {students.map(s => {
                    const label = statusLabel(s.avgScore)
                    return (
                      <tr key={s.id} className="hover:bg-canvas/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={selected.has(s.id)}
                            onChange={() => setSelected(prev => {
                              const n = new Set(prev)
                              if (n.has(s.id)) n.delete(s.id); else n.add(s.id)
                              return n
                            })}
                            className="size-4 accent-primary"
                            aria-label={`Select ${s.full_name ?? 'student'}`}
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="size-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                              {(s.full_name ?? '?').charAt(0)}
                            </div>
                            <span className="font-medium text-foreground">{s.full_name ?? 'Unnamed'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          {s.avgScore !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-canvas rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${s.avgScore >= 70 ? 'bg-green-500' : s.avgScore >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${s.avgScore}%` }} />
                              </div>
                              <span className={`text-xs font-bold ${s.avgScore < 60 ? 'text-red-500' : 'text-foreground'}`}>{s.avgScore}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted">No grades</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {s.attendance !== null ? (
                            <span className={`text-xs font-bold ${s.attendance < 75 ? 'text-red-500' : 'text-green-600'}`}>{s.attendance}%</span>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[label]}`}>{label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      <PromoteStudentsModal
        open={promoteOpen}
        students={students.filter(s => selected.has(s.id)).map(s => ({ id: s.id, name: s.full_name ?? 'Unnamed' }))}
        onClose={() => setPromoteOpen(false)}
        onDone={() => { setSelected(new Set()); if (cls?.id) loadStudents(cls.id) }}
      />
    </DashboardLayout>
  )
}
