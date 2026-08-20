import { useState, useEffect } from 'react'
import { TrendingUp, Users, BookOpen, Award, Download } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface ClassRow { id: string; name: string; students: number; avgScore: number | null; attendance: number | null }
interface SubjectRow { name: string; avgScore: number; count: number }

export default function SchoolAnalyticsPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [loading,        setLoading]        = useState(true)
  const [totalStudents,  setTotalStudents]  = useState(0)
  const [avgAttendance,  setAvgAttendance]  = useState<number | null>(null)
  const [avgScore,       setAvgScore]       = useState<number | null>(null)
  const [activeCourses,  setActiveCourses]  = useState(0)
  const [classRows,      setClassRows]      = useState<ClassRow[]>([])
  const [subjectRows,    setSubjectRows]    = useState<SubjectRow[]>([])

  useEffect(() => { if (profile?.school_id) loadAll() }, [profile?.school_id])

  async function loadAll() {
    setLoading(true)
    const schoolId = profile!.school_id!

    // Total students
    const { count: studentCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('role', 'student')
    setTotalStudents(studentCount ?? 0)

    // Active courses
    const { count: courseCount } = await supabase
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('is_published', true)
    setActiveCourses(courseCount ?? 0)

    // Average score from grade_summaries
    const { data: gsData } = await supabase
      .from('grade_summaries')
      .select('average_score, subject_id, subjects(name)')
      .eq('school_id', schoolId)

    const gsRows = (gsData ?? []) as unknown as { average_score: number | null; subject_id: string | null; subjects: { name: string } | null }[]

    const scores = gsRows.filter(r => r.average_score != null).map(r => r.average_score!)
    setAvgScore(scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null)

    // Subject performance
    const subjectMap: Record<string, { total: number; count: number; name: string }> = {}
    for (const r of gsRows) {
      if (r.average_score == null || !r.subjects) continue
      const name = r.subjects.name
      if (!subjectMap[name]) subjectMap[name] = { total: 0, count: 0, name }
      subjectMap[name].total += r.average_score
      subjectMap[name].count++
    }
    const subs: SubjectRow[] = Object.values(subjectMap)
      .map(s => ({ name: s.name, avgScore: Math.round(s.total / s.count), count: s.count }))
      .sort((a, b) => b.avgScore - a.avgScore)
    setSubjectRows(subs)

    // Average attendance
    const { data: attData } = await supabase
      .from('attendance_records')
      .select('status')
      .eq('school_id', schoolId)

    const attRows = (attData ?? []) as { status: string }[]
    if (attRows.length > 0) {
      const present = attRows.filter(r => r.status === 'present').length
      setAvgAttendance(Math.round((present / attRows.length) * 100))
    }

    // Class performance
    const { data: classData } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', schoolId)
      .order('name')

    const classes = (classData ?? []) as { id: string; name: string }[]
    if (classes.length > 0) {
      const classIds = classes.map(c => c.id)

      const { data: enrollData } = await supabase
        .from('class_enrollments')
        .select('student_id, class_id')
        .in('class_id', classIds)

      const enrollCounts: Record<string, string[]> = {}
      for (const e of (enrollData ?? []) as { student_id: string; class_id: string }[]) {
        if (!enrollCounts[e.class_id]) enrollCounts[e.class_id] = []
        enrollCounts[e.class_id].push(e.student_id)
      }

      const { data: classAttData } = await supabase
        .from('attendance_records')
        .select('status, class_id')
        .in('class_id', classIds)

      const classAttMap: Record<string, { present: number; total: number }> = {}
      for (const a of (classAttData ?? []) as { status: string; class_id: string }[]) {
        if (!classAttMap[a.class_id]) classAttMap[a.class_id] = { present: 0, total: 0 }
        classAttMap[a.class_id].total++
        if (a.status === 'present') classAttMap[a.class_id].present++
      }

      const rows: ClassRow[] = classes.map(c => {
        const studentIds = enrollCounts[c.id] ?? []
        const att        = classAttMap[c.id]
        const attPct     = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null

        const classScores = gsRows
          .filter(r => r.average_score != null && studentIds.includes(''))
          .map(r => r.average_score!)
        const avg = classScores.length ? Math.round(classScores.reduce((a, b) => a + b, 0) / classScores.length) : null

        return { id: c.id, name: c.name, students: studentIds.length, avgScore: avg, attendance: attPct }
      })
      setClassRows(rows)
    }

    setLoading(false)
  }

  const subjectColors = ['bg-primary', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-teal-500', 'bg-red-500']

  return (
    <DashboardLayout
      activePage="school-analytics"
      onNavigate={onNavigate}
      title="School Analytics"
      subtitle="Academic performance overview across all classes"
      nav={adminNav}
      user={sidebarUser}
    >
      <div className="flex flex-col gap-6">

        <div className="flex justify-end">
          <button className="flex items-center gap-2 h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors">
            <Download size={15} /> Export Report
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Total Students',  value: loading ? '…' : totalStudents.toString(),                    Icon: Users,      color: 'bg-primary/10 text-primary'         },
            { label: 'Avg. Attendance', value: loading ? '…' : (avgAttendance != null ? `${avgAttendance}%` : '—'), Icon: TrendingUp, color: 'bg-green-50 text-green-600'  },
            { label: 'Avg. Score',      value: loading ? '…' : (avgScore != null ? `${avgScore}%` : '—'),   Icon: Award,      color: 'bg-amber-50 text-amber-600'         },
            { label: 'Active Courses',  value: loading ? '…' : activeCourses.toString(),                    Icon: BookOpen,   color: 'bg-accent-mint/10 text-accent-mint' },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="bg-surface rounded-card shadow-sm p-5">
              <div className={`size-10 rounded-card ${color} flex items-center justify-center mb-3`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Class performance */}
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-black/6">
              <h2 className="text-base font-bold text-foreground">Class Performance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-canvas">
                    {['Class', 'Students', 'Attendance'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/4">
                  {loading ? (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-muted">Loading…</td></tr>
                  ) : classRows.length === 0 ? (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-muted">No classes yet.</td></tr>
                  ) : classRows.map(row => (
                    <tr key={row.id} className="hover:bg-canvas/50 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-foreground">{row.name}</td>
                      <td className="px-5 py-3.5 text-muted">{row.students}</td>
                      <td className="px-5 py-3.5">
                        {row.attendance != null
                          ? <span className={`font-semibold ${row.attendance >= 80 ? 'text-green-600' : 'text-amber-600'}`}>{row.attendance}%</span>
                          : <span className="text-muted">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subject performance */}
          <div className="bg-surface rounded-card shadow-sm p-6">
            <h2 className="text-base font-bold text-foreground mb-5">Subject Performance (Avg Score)</h2>
            {loading ? (
              <div className="py-4 text-center text-sm text-muted">Loading…</div>
            ) : subjectRows.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">No grade data yet.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {subjectRows.slice(0, 8).map((s, i) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                      <span className="text-sm font-bold text-foreground">{s.avgScore}%</span>
                    </div>
                    <div className="h-2 bg-black/8 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${subjectColors[i % subjectColors.length]} rounded-full transition-all`}
                        style={{ width: `${s.avgScore}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary card */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h2 className="text-base font-bold text-foreground mb-3">Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-canvas rounded-card p-4">
              <p className="text-xs text-muted mb-1">Total Classes</p>
              <p className="text-xl font-bold text-foreground">{classRows.length}</p>
            </div>
            <div className="bg-canvas rounded-card p-4">
              <p className="text-xs text-muted mb-1">Subjects Tracked</p>
              <p className="text-xl font-bold text-foreground">{subjectRows.length}</p>
            </div>
            <div className="bg-canvas rounded-card p-4">
              <p className="text-xs text-muted mb-1">School-wide Avg</p>
              <p className="text-xl font-bold text-foreground">{avgScore != null ? `${avgScore}%` : '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
