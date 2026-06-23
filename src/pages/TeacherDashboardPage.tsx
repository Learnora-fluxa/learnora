import { useState, useEffect } from 'react'
import { Plus, Play, Upload, ChevronRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface TeacherClass {
  classId: string
  className: string
  subjectName: string
  enrollments: number
}

interface AssignmentRow {
  id: string
  title: string
  className: string
  due_date: string | null
  submittedCount: number
  totalStudents: number
}

interface ActivityRow {
  studentName: string
  assignmentTitle: string
  submittedAt: string
}

const statusBadge: Record<string, string> = {
  active:    'bg-primary/10 text-primary',
  pending:   'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
}

function assignmentStatus(dueDate: string | null): string {
  if (!dueDate) return 'active'
  const now = new Date()
  const due = new Date(dueDate)
  if (now > due) return 'completed'
  if (due.getTime() - now.getTime() < 24 * 60 * 60 * 1000) return 'pending'
  return 'active'
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`
  return fmtDate(iso)
}

export default function TeacherDashboardPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)
  const firstName   = profile?.full_name?.split(' ')[0] ?? 'Teacher'

  const [myClasses,   setMyClasses]   = useState<TeacherClass[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [activity,    setActivity]    = useState<ActivityRow[]>([])
  const [stats,       setStats]       = useState({ classes: 0, students: 0, pending: 0 })
  const [loading,     setLoading]     = useState(true)

  useEffect(() => { if (profile?.id) loadDashboard() }, [profile?.id])

  async function loadDashboard() {
    setLoading(true)
    const teacherId = profile!.id
    const schoolId  = profile!.school_id!

    // 1. Teacher's class+subject assignments
    const { data: taData } = await supabase
      .from('teacher_assignments')
      .select('class_id, classes(id, name), subjects(id, name)')
      .eq('teacher_id', teacherId)

    const rawTa = (taData ?? []) as unknown as {
      class_id: string
      classes:  { id: string; name: string } | null
      subjects: { id: string; name: string } | null
    }[]

    const classIds = [...new Set(rawTa.map(ta => ta.class_id).filter(Boolean))]

    // 2. Enrollment counts per class
    const enrollmentMap: Record<string, number> = {}
    if (classIds.length > 0) {
      const { data: eData } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .in('class_id', classIds)
      for (const e of (eData ?? []) as { class_id: string }[]) {
        enrollmentMap[e.class_id] = (enrollmentMap[e.class_id] ?? 0) + 1
      }
    }

    const classes: TeacherClass[] = rawTa.map(ta => ({
      classId:     ta.class_id,
      className:   ta.classes?.name ?? '—',
      subjectName: ta.subjects?.name ?? '—',
      enrollments: enrollmentMap[ta.class_id] ?? 0,
    }))
    const totalStudents = Object.values(enrollmentMap).reduce((s, v) => s + v, 0)

    // 3. Recent assignments
    const { data: aData } = await supabase
      .from('assignments')
      .select('id, title, class_id, due_date, classes(name)')
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(5)

    const rawA = (aData ?? []) as unknown as {
      id: string; title: string; class_id: string; due_date: string | null
      classes: { name: string } | null
    }[]
    const assignIds = rawA.map(a => a.id)

    // 4. Submission counts + pending count
    const subMap: Record<string, number> = {}
    let pendingCount = 0
    if (assignIds.length > 0) {
      const { data: sData } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, status')
        .in('assignment_id', assignIds)
      for (const s of (sData ?? []) as { assignment_id: string; status: string }[]) {
        subMap[s.assignment_id] = (subMap[s.assignment_id] ?? 0) + 1
        if (s.status === 'submitted') pendingCount++
      }
    }

    const assignRows: AssignmentRow[] = rawA.map(a => ({
      id:             a.id,
      title:          a.title,
      className:      a.classes?.name ?? '—',
      due_date:       a.due_date,
      submittedCount: subMap[a.id] ?? 0,
      totalStudents:  enrollmentMap[a.class_id] ?? 0,
    }))

    // 5. Recent activity
    let activityRows: ActivityRow[] = []
    if (assignIds.length > 0) {
      const { data: acData } = await supabase
        .from('assignment_submissions')
        .select('submitted_at, student:profiles!student_id(full_name, email), assignment:assignments!assignment_id(title)')
        .in('assignment_id', assignIds)
        .order('submitted_at', { ascending: false })
        .limit(5)

      activityRows = ((acData ?? []) as unknown as {
        submitted_at: string
        student:      { full_name: string | null; email: string | null } | null
        assignment:   { title: string } | null
      }[]).map(s => ({
        studentName:     s.student?.full_name ?? s.student?.email ?? 'Student',
        assignmentTitle: s.assignment?.title ?? 'assignment',
        submittedAt:     s.submitted_at,
      }))
    }

    setMyClasses(classes)
    setAssignments(assignRows)
    setActivity(activityRows)
    setStats({ classes: classIds.length, students: totalStudents, pending: pendingCount })
    setLoading(false)
  }

  const statCards = [
    { label: 'Active Classes',      value: loading ? '…' : String(stats.classes),  color: 'text-primary'    },
    { label: 'Total Students',      value: loading ? '…' : String(stats.students), color: 'text-foreground' },
    { label: 'Pending Submissions', value: loading ? '…' : String(stats.pending),  color: 'text-amber-600'  },
    { label: 'Attendance Rate',     value: '—',                                     color: 'text-green-600'  },
  ]

  return (
    <DashboardLayout
      activePage="teacher-dashboard"
      onNavigate={onNavigate}
      title="Dashboard"
      subtitle="Here's what's happening across your classes today"
      nav={teacherNav}
      user={sidebarUser}
    >
      <div className="flex flex-col gap-6 max-w-[1300px]">

        {/* Welcome banner */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Welcome Back, {firstName}!</h2>
              <p className="text-sm text-muted mt-1">Here's what's happening across your classes today.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onNavigate('assignment-builder')}
                className="flex items-center gap-2 h-10 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary"
              >
                <Plus size={14} /> Create Assignment
              </button>
              <button
                onClick={() => onNavigate('teacher-live-classes')}
                className="flex items-center gap-2 h-10 px-4 border border-muted text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors"
              >
                <Play size={14} className="fill-current" /> Start Live Class
              </button>
              <button
                onClick={() => onNavigate('resources')}
                className="flex items-center gap-2 h-10 px-4 border border-muted text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors"
              >
                <Upload size={14} /> Upload Resource
              </button>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(s => (
            <div key={s.label} className="bg-surface rounded-card shadow-sm p-5">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* My Classes + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* My Classes */}
          <div className="bg-surface rounded-card shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground">My Classes</h3>
              <button
                onClick={() => onNavigate('classes')}
                className="text-sm text-primary font-semibold hover:underline flex items-center gap-1"
              >
                View all <ChevronRight size={14} />
              </button>
            </div>
            {loading ? (
              <p className="text-sm text-muted py-4 text-center">Loading…</p>
            ) : myClasses.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <span className="text-3xl">🏫</span>
                <p className="text-sm font-semibold text-foreground">No classes yet</p>
                <p className="text-xs text-muted">Your admin will assign classes to you soon.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {myClasses.slice(0, 4).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-card bg-canvas/60">
                    <div className="size-9 rounded-card bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                      {c.subjectName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{c.subjectName}</p>
                      <p className="text-xs text-muted">{c.className} · {c.enrollments} students</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-surface rounded-card shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground">Recent Activity</h3>
              <button
                onClick={() => onNavigate('submissions-inbox')}
                className="text-sm text-primary font-semibold hover:underline"
              >
                View all
              </button>
            </div>
            {loading ? (
              <p className="text-sm text-muted py-4 text-center">Loading…</p>
            ) : activity.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <span className="text-3xl">📬</span>
                <p className="text-sm font-semibold text-foreground">No submissions yet</p>
                <p className="text-xs text-muted">Student submissions will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {activity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="size-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {a.studentName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        <span className="font-semibold">{a.studentName}</span>{' '}
                        submitted {a.assignmentTitle}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{fmtTime(a.submittedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick actions */}
            <div className="mt-6 pt-5 border-t border-black/6">
              <p className="text-sm font-bold text-foreground mb-3">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Grade Work',         icon: CheckCircle2, page: 'submissions-inbox'     },
                  { label: 'Take Attendance',     icon: Clock,        page: 'attendance'             },
                  { label: 'View Analytics',      icon: AlertCircle,  page: 'analytics'              },
                  { label: 'Post Announcement',   icon: Plus,         page: 'teacher-announcements'  },
                ].map(a => {
                  const Icon = a.icon
                  return (
                    <button
                      key={a.label}
                      onClick={() => onNavigate(a.page)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-card bg-canvas hover:bg-primary/6 hover:text-primary text-muted transition-colors text-center"
                    >
                      <Icon size={16} />
                      <span className="text-xs font-medium leading-tight">{a.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

        </div>

        {/* Assignment Overview */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-black/6">
            <h3 className="text-base font-bold text-foreground">Assignment Overview</h3>
            <button
              onClick={() => onNavigate('teacher-assignments')}
              className="text-sm text-primary font-semibold hover:underline flex items-center gap-1"
            >
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/6 bg-canvas/40">
                  {['Title', 'Class', 'Deadline', 'Submissions', 'Status'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-muted">Loading…</td></tr>
                ) : assignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">📝</span>
                        <p className="text-sm font-semibold text-foreground">No assignments yet</p>
                        <p className="text-xs text-muted">Create your first assignment to get started.</p>
                        <button onClick={() => onNavigate('assignment-builder')}
                          className="mt-2 flex items-center gap-1.5 h-8 px-4 bg-primary text-white text-xs font-semibold rounded-pill hover:bg-primary-deep transition-colors">
                          Create Assignment
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : assignments.map(a => {
                  const st    = assignmentStatus(a.due_date)
                  const label = st === 'active' ? 'Active' : st === 'pending' ? 'Pending' : 'Completed'
                  return (
                    <tr key={a.id} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-foreground">{a.title}</td>
                      <td className="px-6 py-3.5 text-muted">{a.className}</td>
                      <td className="px-6 py-3.5 text-muted">{fmtDate(a.due_date)}</td>
                      <td className="px-6 py-3.5 text-foreground">{a.submittedCount}/{a.totalStudents}</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-xs ${statusBadge[st]}`}>{label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
