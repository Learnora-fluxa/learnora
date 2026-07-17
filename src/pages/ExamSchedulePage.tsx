import { useState, useEffect } from 'react'
import { Calendar, BookOpen, AlertCircle, MonitorCheck, Clock, CheckCircle2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Exam {
  id:      string
  subject: string
  type:    string
  date:    string
  day:     string
  month:   string
  due:     Date
  past:    boolean
  color:   string
}

interface CbtExam {
  id:               string
  title:            string
  subject:          string
  duration_minutes: number
  taken:            boolean
  score:            number | null
  max_score:        number | null
}

const COLORS = [
  'bg-primary/10 text-primary','bg-green-50 text-green-700','bg-amber-50 text-amber-700',
  'bg-purple-50 text-purple-700','bg-teal-50 text-teal-700','bg-red-50 text-red-600',
]

function fmtDay(date: Date) {
  return date.toLocaleDateString('en-GB', { weekday: 'short' })
}
function fmtDateStr(date: Date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ExamSchedulePage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [exams,     setExams]     = useState<Exam[]>([])
  const [cbtExams,  setCbtExams]  = useState<CbtExam[]>([])
  const [showPast,  setShowPast]  = useState(false)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { if (profile?.id) loadExams() }, [profile?.id])

  async function loadCbtExams(classIds: string[]) {
    const [examRes, attemptRes] = await Promise.all([
      supabase.from('cbt_exams')
        .select('id, title, duration_minutes, subjects!subject_id(name)')
        .eq('status', 'published')
        .in('class_id', classIds)
        .order('created_at', { ascending: false }),
      supabase.from('cbt_attempts')
        .select('exam_id, score, max_score, submitted_at')
        .eq('student_id', profile!.id),
    ])

    type ERaw = { id: string; title: string; duration_minutes: number; subjects: { name: string } | null }
    type ARaw = { exam_id: string; score: number | null; max_score: number | null; submitted_at: string | null }
    const attempts: Record<string, ARaw> = {}
    for (const a of (attemptRes.data ?? []) as ARaw[]) attempts[a.exam_id] = a

    setCbtExams(((examRes.data ?? []) as unknown as ERaw[]).map(e => ({
      id:               e.id,
      title:            e.title,
      subject:          e.subjects?.name ?? '—',
      duration_minutes: e.duration_minutes,
      taken:            !!attempts[e.id]?.submitted_at,
      score:            attempts[e.id]?.score ?? null,
      max_score:        attempts[e.id]?.max_score ?? null,
    })))
  }

  async function loadExams() {
    setLoading(true)
    const studentId = profile!.id
    const schoolId  = profile!.school_id!

    const { data: ceData } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', studentId)

    const classIds = (ceData ?? []).map((r: any) => r.class_id)
    if (classIds.length === 0) { setLoading(false); return }

    await loadCbtExams(classIds)

    const { data } = await supabase
      .from('assignments')
      .select('id, title, due_date, type, subjects(name)')
      .eq('school_id', schoolId)
      .in('class_id', classIds)
      .not('due_date', 'is', null)
      .order('due_date')

    const now = new Date()
    const rows = (data ?? []) as unknown as {
      id:       string
      title:    string
      due_date: string
      type:     string | null
      subjects: { name: string } | null
    }[]

    setExams(rows.map((r, i) => {
      const due  = new Date(r.due_date + 'T00:00:00')
      return {
        id:      r.id,
        subject: r.subjects?.name ?? r.title,
        type:    r.type ?? 'Assignment',
        date:    fmtDateStr(due),
        day:     fmtDay(due),
        month:   due.toLocaleDateString('en-GB', { month: 'short' }),
        due,
        past:    due < now,
        color:   COLORS[i % COLORS.length],
      }
    }))
    setLoading(false)
  }

  const upcoming = exams.filter(e => !e.past)
  const past     = exams.filter(e => e.past)
  const visible  = showPast ? past : upcoming

  const daysToFirst = upcoming.length > 0
    ? Math.ceil((upcoming[0].due.getTime() - Date.now()) / 86400000)
    : null

  return (
    <DashboardLayout
      activePage="calendar"
      onNavigate={onNavigate}
      title="Exam Schedule"
      subtitle="Your upcoming and past examinations"
      user={sidebarUser}
    >
      <div className="flex flex-col gap-5 max-w-[820px]">

        {/* Countdown banner */}
        <div className="bg-gradient-to-r from-[#4b75ff] to-[#005cf7] rounded-card p-6 text-white flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm font-semibold opacity-80 mb-1">Next Deadline</p>
            <p className="text-3xl font-bold">{loading ? '…' : daysToFirst != null ? `${daysToFirst} day${daysToFirst !== 1 ? 's' : ''} to go` : '— days'}</p>
            <p className="text-sm opacity-70 mt-1">{upcoming[0]?.subject ?? 'No upcoming deadlines'}</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold">{upcoming.length}</p>
            <p className="text-sm opacity-70">Upcoming</p>
          </div>
        </div>

        {/* Alert */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-card text-sm text-amber-800">
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
          <p>Submit assignments on time. Late submissions may affect your grade. Check individual assignments for specific instructions.</p>
        </div>

        {/* CBT exams */}
        {cbtExams.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <MonitorCheck size={16} className="text-primary" /> CBT Exams
            </h2>
            {cbtExams.map(e => {
              const pct = e.taken && e.max_score && e.max_score > 0 ? Math.round(((e.score ?? 0) / e.max_score) * 100) : null
              return (
                <div key={e.id} className="bg-surface rounded-card shadow-sm p-5 flex flex-wrap items-center gap-4">
                  <div className="size-10 rounded-card bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MonitorCheck size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{e.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted flex-wrap">
                      <span>{e.subject}</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {e.duration_minutes} min</span>
                    </div>
                  </div>
                  {e.taken ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <CheckCircle2 size={14} className="text-green-600" />
                      <span className="text-sm font-bold text-foreground">{e.score} / {e.max_score}</span>
                      {pct != null && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct >= 70 ? 'bg-green-50 text-green-700' : pct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>{pct}%</span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        sessionStorage.setItem('learnora_cbt_exam_id', e.id)
                        onNavigate('cbt-exam')
                      }}
                      className="shrink-0 h-9 px-5 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors shadow-primary"
                    >
                      Start Exam
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Tab toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowPast(false)}
            className={`h-9 px-5 rounded-full text-sm font-semibold transition-colors ${!showPast ? 'bg-primary text-white shadow-primary' : 'bg-surface text-muted shadow-sm'}`}
          >
            Upcoming ({upcoming.length})
          </button>
          <button
            onClick={() => setShowPast(true)}
            className={`h-9 px-5 rounded-full text-sm font-semibold transition-colors ${showPast ? 'bg-primary text-white shadow-primary' : 'bg-surface text-muted shadow-sm'}`}
          >
            Past ({past.length})
          </button>
        </div>

        {/* Exam list */}
        {loading ? (
          <div className="text-center py-12 text-sm text-muted">Loading…</div>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.length === 0
              ? <div className="py-8 text-center text-sm text-muted">No data yet.</div>
              : visible.map((exam) => (
                <div key={exam.id} className={`bg-surface rounded-card shadow-sm overflow-hidden flex ${exam.past ? 'opacity-70' : ''}`}>
                  {/* Date column */}
                  <div className="w-20 shrink-0 flex flex-col items-center justify-center py-4 bg-canvas border-r border-black/6">
                    <p className="text-xs font-semibold text-muted">{exam.day}</p>
                    <p className="text-lg font-bold text-foreground">{exam.date.split(' ')[0]}</p>
                    <p className="text-xs text-muted">{exam.month}</p>
                  </div>
                  {/* Content */}
                  <div className="flex-1 flex items-center gap-4 px-5 py-4">
                    <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${exam.color}`}>
                      <BookOpen size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{exam.subject}</p>
                      <p className="text-xs text-muted capitalize">{exam.type}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted">
                        <span className="flex items-center gap-1"><Calendar size={10} /> {exam.date}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('ai-exam-prep')}
                      className="shrink-0 h-8 px-3 bg-primary/10 text-primary text-xs font-bold rounded-full hover:bg-primary hover:text-white transition-colors"
                    >
                      Prepare →
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
