import { useState, useEffect } from 'react'
import { Download, Calendar, BookOpen, TrendingUp } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface SubjectStat {
  name:        string
  score:       number
  submissions: number
  attendance:  number
}

interface MonthBar { month: string; pct: number }

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

export default function StudentAnalysisPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [subjects,     setSubjects]     = useState<SubjectStat[]>([])
  const [monthlyBars,  setMonthlyBars]  = useState<MonthBar[]>([])
  const [attendancePct, setAttendancePct] = useState<number | null>(null)
  const [avgScore,     setAvgScore]     = useState<number | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => { if (profile?.id) loadData() }, [profile?.id])

  async function loadData() {
    setLoading(true)
    const studentId = profile!.id
    const schoolId  = profile!.school_id!

    // Grade summaries by subject
    const { data: gsData } = await supabase
      .from('grade_summaries')
      .select('average_score, subject_id, subjects(name)')
      .eq('student_id', studentId)
      .eq('school_id', schoolId)

    const gsRows = (gsData ?? []) as unknown as {
      average_score: number | null
      subject_id: string
      subjects: { name: string } | null
    }[]

    // Submission count per subject
    const { data: subData } = await supabase
      .from('assignment_submissions')
      .select('assignment_id, submitted_at, assignments(subject_id)')
      .eq('student_id', studentId)
      .eq('school_id', schoolId)

    const subRows = (subData ?? []) as unknown as {
      assignment_id: string
      submitted_at: string | null
      assignments: { subject_id: string | null } | null
    }[]

    const submissionsBySubject: Record<string, number> = {}
    const monthSubmissions: Record<number, number> = {}
    for (const s of subRows) {
      const sid = s.assignments?.subject_id
      if (sid) submissionsBySubject[sid] = (submissionsBySubject[sid] ?? 0) + 1
      if (s.submitted_at) {
        const mo = new Date(s.submitted_at).getMonth()
        monthSubmissions[mo] = (monthSubmissions[mo] ?? 0) + 1
      }
    }

    // Monthly bar chart: submission count by month normalized to pct of max
    const monthCounts = MONTHS.map((_, i) => monthSubmissions[i] ?? 0)
    const maxMonth    = Math.max(1, ...monthCounts)
    setMonthlyBars(MONTHS.map((m, i) => ({ month: m, pct: Math.round((monthCounts[i] / maxMonth) * 100) })))

    // Pending assignments (enrolled class, assignments not submitted)
    const { data: ceData } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', studentId)
    const classIds = (ceData ?? []).map((e: { class_id: string }) => e.class_id)
    if (classIds.length > 0) {
      const { data: aData } = await supabase
        .from('assignments')
        .select('id')
        .in('class_id', classIds)
        .eq('is_published', true)
      const allIds = (aData ?? []).map((a: { id: string }) => a.id)
      const submittedIds = new Set(subRows.map(s => s.assignment_id))
      setPendingCount(allIds.filter(id => !submittedIds.has(id)).length)
    }

    // Attendance
    const { data: attData } = await supabase
      .from('attendance_records')
      .select('status')
      .eq('student_id', studentId)
      .eq('school_id', schoolId)

    const attRows = (attData ?? []) as { status: string }[]
    if (attRows.length > 0) {
      const present = attRows.filter(r => r.status === 'present').length
      setAttendancePct(Math.round((present / attRows.length) * 100))
    }

    // Build subject stats
    const scores = gsRows.filter(r => r.average_score != null).map(r => r.average_score!)
    setAvgScore(scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null)

    setSubjects(gsRows.map(g => ({
      name:        g.subjects?.name ?? `Subject ${g.subject_id.slice(0, 6)}`,
      score:       Math.round(g.average_score ?? 0),
      submissions: submissionsBySubject[g.subject_id] ?? 0,
      attendance:  attRows.length > 0 ? Math.round((attRows.filter(r => r.status === 'present').length / attRows.length) * 100) : 0,
    })).filter(s => s.score > 0))

    setLoading(false)
  }

  return (
    <DashboardLayout
      activePage="analysis"
      onNavigate={onNavigate}
      title="Analysis"
      user={sidebarUser}
    >
      <div className="flex flex-col gap-6 max-w-[1300px]">

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Performance Analysis</h2>
            <p className="text-sm text-muted mt-1">Track your academic growth and learning progress.</p>
          </div>
          <button className="flex items-center gap-2 h-10 px-4 bg-primary text-white rounded-input text-sm font-semibold shadow-primary hover:bg-primary-deep transition-colors">
            Export <Download size={14} />
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Attendance Rate',     value: loading ? '…' : (attendancePct != null ? `${attendancePct}%` : '—'), color: 'text-green-600', icon: Calendar   },
            { label: 'Pending Assignments', value: loading ? '…' : String(pendingCount),                                  color: 'text-amber-600', icon: BookOpen   },
            { label: 'Average Performance', value: loading ? '…' : (avgScore != null ? `${avgScore}%` : '—'),            color: 'text-primary',   icon: TrendingUp },
            { label: 'Subjects Tracked',    value: loading ? '…' : String(subjects.length),                              color: 'text-foreground', icon: BookOpen  },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-surface rounded-card shadow-sm p-5 flex items-start gap-3">
                <div className="size-10 rounded-card bg-canvas flex items-center justify-center text-primary shrink-0">
                  <Icon size={18} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted mt-0.5 leading-snug">{s.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Submission trend chart */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-foreground">Submission Activity</h3>
          </div>
          <div className="flex items-end gap-2" style={{ height: '200px' }}>
            {monthlyBars.map(b => (
              <div key={b.month} className="flex flex-col items-center gap-2 flex-1 min-w-0 h-full">
                <div className="flex-1 flex items-end w-full">
                  <div className="w-full rounded-t-sm bg-primary/80 hover:bg-primary transition-colors" style={{ height: `${Math.max(4, b.pct)}%` }} />
                </div>
                <span className="text-xs text-muted font-medium shrink-0">{b.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subject Performance */}
        <div>
          <div className="mb-5">
            <h3 className="text-xl font-bold text-foreground">Subject Performance</h3>
            <p className="text-sm text-muted mt-1">Compare your performance across all subjects</p>
          </div>
          {loading ? (
            <div className="bg-surface rounded-card shadow-sm p-12 text-center text-sm text-muted">Loading…</div>
          ) : subjects.length === 0 ? (
            <div className="bg-surface rounded-card shadow-sm p-12 text-center text-sm text-muted">
              No grade data yet. Grades will appear here once teachers record them.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {subjects.map(s => (
                <div key={s.name} className="bg-surface rounded-card shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-[60px] rounded-card bg-canvas flex items-center justify-center text-primary shrink-0">
                        <BookOpen size={24} />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground">{s.name}</p>
                        <p className="text-sm text-muted">Overall Performance</p>
                      </div>
                    </div>
                    <span className="text-4xl font-bold text-primary shrink-0">{s.score}%</span>
                  </div>
                  <div className="h-2.5 bg-black/8 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${s.score}%` }} />
                  </div>
                  <div className="flex items-center gap-5 text-xs text-muted">
                    <div className="flex items-center gap-1.5">
                      <BookOpen size={13} />
                      <span className="font-semibold text-foreground">{s.submissions}</span>
                      <span>Submissions</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} />
                      <span className="font-semibold text-foreground">{s.attendance}%</span>
                      <span>Attendance</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
