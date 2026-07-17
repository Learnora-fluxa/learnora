import { useState, useEffect } from 'react'
import { ArrowLeft, Users, BookOpen, ClipboardCheck, TrendingUp, UserPlus, ArrowUpRight } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import PromoteStudentsModal from '../../components/shared/PromoteStudentsModal'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

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

export default function AdminClassDetailsPage({ onNavigate }: Props) {
  const { profile }    = useAuth()
  const sidebarUser    = profileToSidebarUser(profile)

  const raw = sessionStorage.getItem('learnora_admin_class')
  const cls: ClassMeta | null = raw ? JSON.parse(raw) : null

  const [students,        setStudents]        = useState<StudentRow[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [selected,        setSelected]        = useState<Set<string>>(new Set())
  const [promoteOpen,     setPromoteOpen]     = useState(false)

  useEffect(() => {
    if (cls?.id) loadStudents(cls.id)
  }, [cls?.id])

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
