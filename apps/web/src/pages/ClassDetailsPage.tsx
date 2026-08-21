import { useState, useEffect } from 'react'
import { Users, BookOpen, BarChart2, Plus, ChevronLeft } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type Tab = 'roster' | 'content' | 'analytics'

interface RosterEntry {
  id:         string
  name:       string
  avg:        number | null
  attendance: string
}

interface CourseEntry {
  id:          string
  title:       string
  moduleCount: number
  published:   boolean
}

interface Analytics {
  avg:        number | null
  high:       number | null
  low:        number | null
  attendance: number | null
}

export default function ClassDetailsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('roster')

  const classId     = sessionStorage.getItem('learnora_selected_class_id')     ?? ''
  const subjectId   = sessionStorage.getItem('learnora_selected_subject_id')   ?? ''
  const className   = sessionStorage.getItem('learnora_selected_class_name')   ?? '—'
  const subjectName = sessionStorage.getItem('learnora_selected_subject_name') ?? 'Class Details'

  const [roster,    setRoster]    = useState<RosterEntry[]>([])
  const [courses,   setCourses]   = useState<CourseEntry[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  useEffect(() => { if (classId) loadData() }, [classId])

  async function loadData() {
    setLoading(true)
    setError('')

    // Enrolled students
    const { data: enrollData, error: enrollErr } = await supabase
      .from('class_enrollments')
      .select('student_id, profiles!student_id(id, full_name)')
      .eq('class_id', classId)

    if (enrollErr) {
      logSupabaseError('ClassDetailsPage/enrollments', enrollErr)
      setError(enrollErr.message)
      setLoading(false)
      return
    }

    type EnrollRow = { student_id: string; profiles: { id: string; full_name: string | null } | null }
    const enrollRows = (enrollData ?? []) as unknown as EnrollRow[]
    const studentIds = enrollRows.map(r => r.student_id)

    // Grade summaries for this subject
    const gradeMap: Record<string, number> = {}
    if (studentIds.length > 0 && subjectId) {
      const { data: gData, error: gErr } = await supabase
        .from('grade_summaries')
        .select('student_id, average_score')
        .eq('subject_id', subjectId)
        .in('student_id', studentIds)
      if (gErr) logSupabaseError('ClassDetailsPage/grades', gErr)
      for (const g of (gData ?? []) as { student_id: string; average_score: number | null }[]) {
        if (g.average_score != null) gradeMap[g.student_id] = g.average_score
      }
    }

    // Attendance for this class
    const attMap: Record<string, { present: number; total: number }> = {}
    if (studentIds.length > 0) {
      const { data: aData, error: aErr } = await supabase
        .from('attendance_records')
        .select('student_id, status')
        .eq('class_id', classId)
        .in('student_id', studentIds)
      if (aErr) logSupabaseError('ClassDetailsPage/attendance', aErr)
      for (const a of (aData ?? []) as { student_id: string; status: string }[]) {
        if (!attMap[a.student_id]) attMap[a.student_id] = { present: 0, total: 0 }
        attMap[a.student_id].total++
        if (a.status === 'present') attMap[a.student_id].present++
      }
    }

    const rosterRows: RosterEntry[] = enrollRows.map(r => {
      const att = attMap[r.student_id]
      return {
        id:         r.student_id,
        name:       r.profiles?.full_name ?? 'Unknown',
        avg:        gradeMap[r.student_id] ?? null,
        attendance: att ? `${Math.round((att.present / att.total) * 100)}%` : '—',
      }
    })
    setRoster(rosterRows)

    // Analytics: aggregate from roster data
    const scores      = rosterRows.map(r => r.avg).filter((s): s is number => s !== null)
    const allAtt      = Object.values(attMap)
    const totalAtt    = allAtt.reduce((s, a) => s + a.total, 0)
    const totalPresent = allAtt.reduce((s, a) => s + a.present, 0)
    setAnalytics({
      avg:        scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null,
      high:       scores.length > 0 ? Math.round(Math.max(...scores)) : null,
      low:        scores.length > 0 ? Math.round(Math.min(...scores)) : null,
      attendance: totalAtt > 0 ? Math.round((totalPresent / totalAtt) * 100) : null,
    })

    // Courses for this class
    const { data: cData, error: cErr } = await supabase
      .from('courses')
      .select('id, title, is_published, modules(id)')
      .eq('class_id', classId)
      .eq('school_id', profile!.school_id!)
      .order('created_at', { ascending: true })
    if (cErr) logSupabaseError('ClassDetailsPage/courses', cErr)
    type CourseRow = { id: string; title: string; is_published: boolean; modules: { id: string }[] }
    setCourses(((cData ?? []) as unknown as CourseRow[]).map(c => ({
      id:          c.id,
      title:       c.title,
      moduleCount: c.modules?.length ?? 0,
      published:   c.is_published,
    })))

    setLoading(false)
  }

  if (!classId) {
    return (
      <DashboardLayout activePage="classes" onNavigate={onNavigate} title="Class Details" nav={teacherNav} user={profileToSidebarUser(profile)}>
        <div className="flex flex-col gap-4">
          <button onClick={() => onNavigate('my-classes')} className="flex items-center gap-2 text-sm text-muted hover:text-foreground w-fit">
            <ChevronLeft size={16} /> Back to Classes
          </button>
          <div className="bg-surface rounded-card shadow-sm p-12 text-center text-muted">
            <p className="text-sm">No class selected. Go back and select a class.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      activePage="classes"
      onNavigate={onNavigate}
      title="Class Details"
      subtitle={loading ? '…' : `${subjectName} — ${className} · ${roster.length} students`}
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[1100px] flex flex-col gap-6">

        <button onClick={() => onNavigate('my-classes')} className="flex items-center gap-2 text-sm text-muted hover:text-foreground w-fit">
          <ChevronLeft size={16} /> Back to Classes
        </button>

        {/* Class hero */}
        <div className="bg-surface rounded-card shadow-sm p-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-card bg-primary/10 text-primary text-2xl font-bold flex items-center justify-center">
              {subjectName.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{subjectName}</h1>
              <p className="text-sm text-muted">{className} · {loading ? '…' : `${roster.length} students`}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => onNavigate('course-builder')} className="flex items-center gap-2 h-10 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">
              <Plus size={13} /> Add Content
            </button>
            <button onClick={() => onNavigate('attendance')} className="h-10 px-4 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
              Take Attendance
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-card px-4 py-3">{error}</p>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-canvas rounded-card p-1 w-fit">
          {([
            { key: 'roster',    icon: Users,     label: 'Class Roster'   },
            { key: 'content',   icon: BookOpen,  label: 'Course Content' },
            { key: 'analytics', icon: BarChart2, label: 'Analytics'      },
          ] as { key: Tab; icon: typeof Users; label: string }[]).map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 h-9 text-sm font-semibold rounded-md transition-colors ${
                  tab === t.key ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'
                }`}
              >
                <Icon size={14} />{t.label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center text-muted text-sm">Loading…</div>
        ) : (
          <>
            {/* Roster tab */}
            {tab === 'roster' && (
              <div className="bg-surface rounded-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-black/6 bg-canvas/40">
                        {['Student', 'Avg Score', 'Attendance', 'Action'].map(h => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {roster.length === 0
                        ? <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-muted">No students enrolled in this class.</td></tr>
                        : roster.map(s => (
                          <tr key={s.id} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                                  {s.name.charAt(0)}
                                </div>
                                <span className="font-medium text-foreground">{s.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              {s.avg !== null
                                ? <span className={`font-semibold ${s.avg >= 80 ? 'text-green-600' : s.avg >= 65 ? 'text-amber-600' : 'text-red-500'}`}>{Math.round(s.avg)}%</span>
                                : <span className="text-muted">—</span>
                              }
                            </td>
                            <td className="px-6 py-3.5 text-muted">{s.attendance}</td>
                            <td className="px-6 py-3.5">
                              <button
                                onClick={() => {
                                  sessionStorage.setItem('learnora_selected_student', s.id)
                                  onNavigate('student-detail')
                                }}
                                className="text-xs text-primary font-semibold hover:underline"
                              >
                                View Profile
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Content tab */}
            {tab === 'content' && (
              <div className="flex flex-col gap-3">
                {courses.length === 0
                  ? <div className="bg-surface rounded-card shadow-sm py-10 text-center text-sm text-muted">No courses created for this class yet.</div>
                  : courses.map(c => (
                    <div key={c.id} className="bg-surface rounded-card shadow-sm p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`size-9 rounded-card flex items-center justify-center ${c.published ? 'bg-green-50' : 'bg-primary/10'}`}>
                          <BookOpen size={16} className={c.published ? 'text-green-600' : 'text-primary'} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{c.title}</p>
                          <p className="text-xs text-muted">{c.moduleCount} module{c.moduleCount !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-xs ${c.published ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                          {c.published ? 'Published' : 'Draft'}
                        </span>
                        <button onClick={() => onNavigate('course-builder')} className="text-xs text-primary font-semibold hover:underline">Edit</button>
                      </div>
                    </div>
                  ))
                }
                <button onClick={() => onNavigate('course-builder')} className="flex items-center gap-2 h-11 px-5 border-2 border-dashed border-black/20 rounded-card text-sm font-semibold text-muted hover:border-primary hover:text-primary transition-colors w-fit">
                  <Plus size={14} /> Add Course
                </button>
              </div>
            )}

            {/* Analytics tab */}
            {tab === 'analytics' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {[
                  {
                    label: 'Class Average',
                    value: analytics?.avg        != null ? `${analytics.avg}%`        : '—',
                    sub:   analytics?.avg        != null ? 'From grade summaries'     : 'No grades recorded yet',
                    color: 'text-primary',
                  },
                  {
                    label: 'Highest Score',
                    value: analytics?.high       != null ? `${analytics.high}%`       : '—',
                    sub:   analytics?.high       != null ? 'Top performer this term'  : 'No grades recorded yet',
                    color: 'text-green-600',
                  },
                  {
                    label: 'Lowest Score',
                    value: analytics?.low        != null ? `${analytics.low}%`        : '—',
                    sub:   analytics?.low        != null ? 'May need extra support'   : 'No grades recorded yet',
                    color: 'text-red-500',
                  },
                  {
                    label: 'Attendance Rate',
                    value: analytics?.attendance != null ? `${analytics.attendance}%` : '—',
                    sub:   analytics?.attendance != null ? 'Based on attendance records' : 'No attendance records yet',
                    color: 'text-amber-600',
                  },
                ].map(s => (
                  <div key={s.label} className="bg-surface rounded-card shadow-sm p-6">
                    <p className={`text-4xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{s.label}</p>
                    <p className="text-xs text-muted mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </DashboardLayout>
  )
}
