import { useState, useEffect } from 'react'
import { ArrowLeft, BookOpen, AlertCircle, MessageSquare, TrendingUp, Award, Calendar, Clock } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface StudentInfo {
  id:        string
  name:      string
  email:     string | null
  className: string
  initials:  string
}

interface SubjectScore {
  subject: string
  score:   number
}

interface MonthAtt {
  month: string
  pct:   number
}

interface RecentSub {
  title:   string
  subject: string
  date:    string
  status:  string
}

interface BehaviorFlag {
  date:  string
  flag:  string
  type:  'attendance' | 'academic'
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function StudentDetailViewPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [student,     setStudent]     = useState<StudentInfo | null>(null)
  const [scores,      setScores]      = useState<SubjectScore[]>([])
  const [attendance,  setAttendance]  = useState<MonthAtt[]>([])
  const [attRate,     setAttRate]     = useState<number | null>(null)
  const [submissions, setSubmissions] = useState<RecentSub[]>([])
  const [flags,       setFlags]       = useState<BehaviorFlag[]>([])
  const [avgScore,    setAvgScore]    = useState<number | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')

  const studentId = sessionStorage.getItem('learnora_selected_student') ?? ''

  useEffect(() => { if (studentId) loadData() }, [studentId])

  async function loadData() {
    setLoading(true)
    setError('')

    // 1. Profile + class
    const { data: pData, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, class_enrollments(class_id, classes(name))')
      .eq('id', studentId)
      .maybeSingle()
    if (pErr) { logSupabaseError('StudentDetail/profile', pErr); setError(pErr.message); setLoading(false); return }

    type PRow = {
      id: string; full_name: string | null; email: string | null
      class_enrollments: { class_id: string; classes: { name: string } | null }[]
    }
    const p = pData as unknown as PRow | null
    if (!p) { setLoading(false); return }

    const name  = p.full_name ?? p.email ?? 'Unknown'
    const cName = p.class_enrollments?.[0]?.classes?.name ?? '—'
    setStudent({ id: p.id, name, email: p.email, className: cName, initials: initials(name) })

    // 2. Grade summaries by subject
    const { data: gData, error: gErr } = await supabase
      .from('grade_summaries')
      .select('subject_id, average_score, subjects(name)')
      .eq('student_id', studentId)
    if (gErr) logSupabaseError('StudentDetail/grades', gErr)

    type GRow = { subject_id: string; average_score: number | null; subjects: { name: string } | null }
    const gRows = (gData ?? []) as unknown as GRow[]

    // Aggregate per subject (average across terms)
    const subjectMap: Record<string, { name: string; scores: number[] }> = {}
    for (const g of gRows) {
      const name = g.subjects?.name ?? g.subject_id
      if (!subjectMap[name]) subjectMap[name] = { name, scores: [] }
      if (g.average_score != null) subjectMap[name].scores.push(g.average_score)
    }
    const scoreList: SubjectScore[] = Object.values(subjectMap).map(s => ({
      subject: s.name,
      score:   s.scores.length > 0 ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : 0,
    })).sort((a, b) => b.score - a.score)

    setScores(scoreList)
    if (scoreList.length > 0) {
      setAvgScore(Math.round(scoreList.reduce((s, r) => s + r.score, 0) / scoreList.length))
    }

    // 3. Attendance records
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const { data: aData, error: aErr } = await supabase
      .from('attendance_records')
      .select('date, status')
      .eq('student_id', studentId)
      .gte('date', sixMonthsAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })
    if (aErr) logSupabaseError('StudentDetail/attendance', aErr)

    type ARow = { date: string; status: string }
    const aRows = (aData ?? []) as ARow[]

    // Overall rate
    const total   = aRows.length
    const present = aRows.filter(r => r.status === 'present').length
    const rate    = total > 0 ? Math.round((present / total) * 100) : null
    setAttRate(rate)

    // Group by month
    const monthMap: Record<string, { present: number; total: number }> = {}
    for (const r of aRows) {
      const d = new Date(r.date)
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
      if (!monthMap[key]) monthMap[key] = { present: 0, total: 0 }
      monthMap[key].total++
      if (r.status === 'present') monthMap[key].present++
    }
    const monthList: MonthAtt[] = Object.entries(monthMap).slice(-6).map(([key, v]) => ({
      month: key.split(' ')[0],
      pct:   v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
    }))
    setAttendance(monthList)

    // 4. Recent submissions
    const { data: sData, error: sErr } = await supabase
      .from('assignment_submissions')
      .select('submitted_at, status, assignments(title, subjects(name))')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })
      .limit(5)
    if (sErr) logSupabaseError('StudentDetail/submissions', sErr)

    type SRow = {
      submitted_at: string; status: string
      assignments: { title: string; subjects: { name: string } | null } | null
    }
    setSubmissions(((sData ?? []) as unknown as SRow[]).map(r => ({
      title:   r.assignments?.title ?? 'Assignment',
      subject: r.assignments?.subjects?.name ?? '—',
      date:    new Date(r.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      status:  r.status,
    })))

    // 5. Auto-generate behavior flags
    const autoFlags: BehaviorFlag[] = []
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    if (rate !== null && rate < 75) {
      autoFlags.push({ date: today, flag: `Overall attendance is ${rate}% — below the 75% threshold`, type: 'attendance' })
    }
    for (const s of scoreList) {
      if (s.score < 60) {
        autoFlags.push({ date: today, flag: `Average score below 60% in ${s.subject} (${s.score}%)`, type: 'academic' })
      }
    }
    // Low attendance months
    for (const m of monthList) {
      if (m.pct < 70) {
        autoFlags.push({ date: m.month, flag: `Attendance in ${m.month} was ${m.pct}%`, type: 'attendance' })
      }
    }
    setFlags(autoFlags.slice(0, 5))

    setLoading(false)
  }

  if (!studentId) {
    return (
      <DashboardLayout activePage="students" onNavigate={onNavigate} title="Student Detail" nav={teacherNav} user={profileToSidebarUser(profile)}>
        <div className="flex flex-col gap-4">
          <button onClick={() => onNavigate('my-classes')} className="flex items-center gap-2 text-sm text-muted hover:text-foreground w-fit">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="bg-surface rounded-card shadow-sm p-12 text-center text-muted">
            <p className="text-sm">No student selected. Go back and select a student from the class roster.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      activePage="students"
      onNavigate={onNavigate}
      title={loading ? 'Student Detail' : (student?.name ?? 'Student Detail')}
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-5 max-w-[920px]">
        <button onClick={() => onNavigate('class-details')} className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors w-fit">
          <ArrowLeft size={14} /> Back to Class
        </button>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-card px-4 py-3">{error}</p>
        )}

        {loading ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center text-sm text-muted">Loading student data…</div>
        ) : !student ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center text-sm text-muted">Student not found.</div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-surface rounded-card shadow-sm p-6 flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-primary/10 text-primary text-xl font-bold flex items-center justify-center">
                  {student.initials}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">{student.name}</h1>
                  <p className="text-sm text-muted">{student.className}{student.email ? ` · ${student.email}` : ''}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {flags.length > 0 && (
                      <span className="text-xs font-bold bg-red-50 text-red-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <AlertCircle size={10} /> {flags.length} Flag{flags.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {attRate !== null && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${attRate >= 75 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                        {attRate}% attendance
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onNavigate('teacher-messages')}
                  className="flex items-center gap-2 h-9 px-4 bg-primary text-white text-xs font-bold rounded-full shadow-primary hover:bg-primary-deep transition-colors"
                >
                  <MessageSquare size={13} /> Message
                </button>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { label: 'Avg Score',    value: avgScore != null ? `${avgScore}%` : '—',          Icon: Award,      color: 'bg-amber-50 text-amber-600' },
                { label: 'Subjects',     value: String(scores.length),                              Icon: TrendingUp, color: 'bg-primary/10 text-primary' },
                { label: 'Attendance',   value: attRate != null ? `${attRate}%` : '—',             Icon: Calendar,   color: attRate != null && attRate < 75 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600' },
                { label: 'Submissions',  value: String(submissions.length),                         Icon: Clock,      color: 'bg-canvas text-muted' },
              ].map(({ label, value, Icon, color }) => (
                <div key={label} className="bg-surface rounded-card shadow-sm p-5">
                  <div className={`size-9 rounded-full flex items-center justify-center mb-2 ${color}`}>
                    <Icon size={16} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Subject scores */}
              <div className="bg-surface rounded-card shadow-sm p-5">
                <h2 className="text-sm font-bold text-foreground mb-4">Subject Performance</h2>
                {scores.length === 0 ? (
                  <p className="text-sm text-muted">No grade data recorded yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {scores.map(s => (
                      <div key={s.subject} className="flex items-center gap-3">
                        <p className="text-xs text-muted w-32 shrink-0 truncate">{s.subject}</p>
                        <div className="flex-1 h-2 bg-canvas rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${s.score >= 70 ? 'bg-green-500' : s.score >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${s.score}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-8 text-right ${s.score < 60 ? 'text-red-500' : 'text-foreground'}`}>{s.score}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attendance chart */}
              <div className="bg-surface rounded-card shadow-sm p-5">
                <h2 className="text-sm font-bold text-foreground mb-4">Attendance by Month</h2>
                {attendance.length === 0 ? (
                  <p className="text-sm text-muted">No attendance records in the last 6 months.</p>
                ) : (
                  <>
                    <div className="flex items-end gap-3 h-24">
                      {attendance.map(({ month, pct }) => (
                        <div key={month} className="flex flex-col items-center gap-1 flex-1">
                          <span className="text-[9px] text-muted">{pct}%</span>
                          <div
                            className={`w-full rounded-t ${pct < 70 ? 'bg-red-400' : pct < 80 ? 'bg-amber-400' : 'bg-primary'}`}
                            style={{ height: `${pct}%` }}
                          />
                          <span className="text-[9px] text-muted">{month}</span>
                        </div>
                      ))}
                    </div>
                    {attRate !== null && attRate < 75 && (
                      <p className="text-xs text-red-500 mt-3 font-semibold flex items-center gap-1">
                        <AlertCircle size={11} /> Attendance below 75% threshold
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Behavior flags */}
              <div className="bg-surface rounded-card shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-black/6">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <AlertCircle size={13} className="text-red-500" /> Behavior Flags
                  </h2>
                </div>
                {flags.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted text-green-600">No flags — student is on track.</p>
                ) : (
                  <div className="divide-y divide-black/4">
                    {flags.map((f, i) => (
                      <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                        <div className={`size-2 rounded-full mt-2 shrink-0 ${f.type === 'attendance' ? 'bg-red-400' : 'bg-amber-400'}`} />
                        <div>
                          <p className="text-sm text-foreground">{f.flag}</p>
                          <p className="text-xs text-muted mt-0.5">{f.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent submissions */}
              <div className="bg-surface rounded-card shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-black/6">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <BookOpen size={13} className="text-primary" /> Recent Submissions
                  </h2>
                </div>
                {submissions.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-muted">No submissions yet.</p>
                ) : (
                  <div className="divide-y divide-black/4">
                    {submissions.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{r.title}</p>
                          <p className="text-xs text-muted">{r.subject} · {r.date}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${r.status === 'submitted' ? 'bg-green-50 text-green-700' : 'bg-canvas text-muted'}`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
