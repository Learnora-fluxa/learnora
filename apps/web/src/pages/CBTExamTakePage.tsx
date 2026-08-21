import { useState, useEffect, useRef, useCallback } from 'react'
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, MonitorCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type QType = 'mcq' | 'truefalse' | 'short'

interface ExamMeta {
  id:               string
  title:            string
  instructions:     string | null
  duration_minutes: number
  randomize:        boolean
  status:           string
}

interface Question {
  id:      string
  type:    QType
  prompt:  string
  options: string[]
  answer:  number | boolean | string
  points:  number
}

// Deterministic shuffle so the same student always sees the same order on refresh
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  for (let i = a.length - 1; i > 0; i--) {
    h = (Math.imul(48271, h) % 2147483647 + 2147483647) % 2147483647
    const j = h % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function CBTExamTakePage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const examId = sessionStorage.getItem('learnora_cbt_exam_id') ?? ''

  const [exam,      setExam]      = useState<ExamMeta | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers,   setAnswers]   = useState<Record<string, number | boolean | string>>({})
  const [current,   setCurrent]   = useState(0)
  const [phase,     setPhase]     = useState<'loading' | 'intro' | 'taking' | 'done' | 'already' | 'error'>('loading')
  const [errMsg,    setErrMsg]    = useState('')
  const [timeLeft,  setTimeLeft]  = useState(0)
  const [result,    setResult]    = useState<{ score: number; max: number; auto: boolean } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const submittedRef  = useRef(false)
  const answersRef    = useRef(answers)
  answersRef.current  = answers

  useEffect(() => {
    if (!examId) { setPhase('error'); setErrMsg('No exam selected. Go back and pick an exam.'); return }
    if (profile?.id) load()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [profile?.id])

  async function load() {
    const [examRes, qRes, attemptRes] = await Promise.all([
      supabase.from('cbt_exams')
        .select('id, title, instructions, duration_minutes, randomize, status')
        .eq('id', examId).maybeSingle(),
      supabase.from('quiz_questions')
        .select('id, question, type, options, points, order_index')
        .eq('exam_id', examId)
        .order('order_index', { ascending: true }),
      supabase.from('cbt_attempts')
        .select('id, started_at, submitted_at, score, max_score')
        .eq('exam_id', examId).eq('student_id', profile!.id)
        .maybeSingle(),
    ])

    const ex = examRes.data as ExamMeta | null
    if (!ex) { setPhase('error'); setErrMsg('Exam not found.'); return }
    if (ex.status !== 'published') { setPhase('error'); setErrMsg('This exam is not currently open.'); return }
    setExam(ex)

    type QRaw = { id: string; question: string; type: string; options: unknown; points: number | null }
    let qs: Question[] = ((qRes.data ?? []) as QRaw[]).map(q => {
      const parsed = (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) as { opts?: string[]; answer?: number | boolean | string } | null
      return {
        id:      q.id,
        type:    q.type as QType,
        prompt:  q.question,
        options: parsed?.opts ?? [],
        answer:  parsed?.answer ?? 0,
        points:  q.points ?? 1,
      }
    })
    if (qs.length === 0) { setPhase('error'); setErrMsg('This exam has no questions yet.'); return }
    if (ex.randomize) qs = seededShuffle(qs, examId + profile!.id)
    setQuestions(qs)

    const attempt = attemptRes.data as { id: string; started_at: string | null; submitted_at: string | null; score: number | null; max_score: number | null } | null

    if (attempt?.submitted_at) {
      setResult({ score: attempt.score ?? 0, max: attempt.max_score ?? 0, auto: false })
      setPhase('already')
      return
    }

    if (attempt?.started_at) {
      // Resume: compute remaining time from the original start
      const elapsed  = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000)
      const total    = ex.duration_minutes * 60
      const remaining = total - elapsed
      if (remaining <= 0) {
        // Time expired while away — auto-submit empty/partial
        await submitExam(qs, {}, true, ex)
        return
      }
      startTimer(remaining, qs, ex)
      setPhase('taking')
      return
    }

    setPhase('intro')
  }

  async function begin() {
    if (!exam) return
    // Record start so refresh can't reset the clock
    const { error: err } = await supabase.from('cbt_attempts').insert({
      exam_id:    examId,
      student_id: profile!.id,
      school_id:  profile!.school_id!,
      started_at: new Date().toISOString(),
    })
    if (err && err.code !== '23505') { // ignore duplicate (already started in another tab)
      logSupabaseError('CBTTake/start', err)
      setErrMsg(err.message); setPhase('error'); return
    }
    startTimer(exam.duration_minutes * 60, questions, exam)
    setPhase('taking')
  }

  function startTimer(seconds: number, qs: Question[], ex: ExamMeta) {
    setTimeLeft(seconds)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          submitExam(qs, answersRef.current, true, ex)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const submitExam = useCallback(async (
    qs: Question[],
    finalAnswers: Record<string, number | boolean | string>,
    auto: boolean,
    _ex: ExamMeta,
  ) => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)

    let score = 0, max = 0
    for (const q of qs) {
      max += q.points
      const ans = finalAnswers[q.id]
      if (ans === undefined) continue
      if (q.type === 'mcq'       && ans === q.answer) score += q.points
      if (q.type === 'truefalse' && ans === q.answer) score += q.points
      if (q.type === 'short'
          && String(ans).trim().toLowerCase() === String(q.answer).trim().toLowerCase()
          && String(q.answer).trim() !== '') score += q.points
    }

    const { error: err } = await supabase.from('cbt_attempts').upsert({
      exam_id:        examId,
      student_id:     profile!.id,
      school_id:      profile!.school_id!,
      answers:        JSON.stringify(finalAnswers),
      score,
      max_score:      max,
      submitted_at:   new Date().toISOString(),
      auto_submitted: auto,
    }, { onConflict: 'exam_id,student_id' })
    logSupabaseError('CBTTake/submit', err)

    setResult({ score, max, auto })
    setSubmitting(false)
    setPhase('done')
  }, [examId, profile])

  function setAnswer(qid: string, value: number | boolean | string) {
    setAnswers(prev => ({ ...prev, [qid]: value }))
  }

  const answeredCount = questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== '').length
  const q = questions[current]
  const lowTime = timeLeft > 0 && timeLeft <= 60

  // ── Screens ─────────────────────────────────────────────────────────────────

  if (phase === 'loading') return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <p className="text-sm text-muted">Loading exam…</p>
    </div>
  )

  if (phase === 'error') return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="bg-surface rounded-card shadow-sm p-8 text-center max-w-sm">
        <AlertCircle size={32} className="mx-auto mb-3 text-red-400" />
        <p className="text-sm text-foreground mb-5">{errMsg}</p>
        <button onClick={() => onNavigate('exam-schedule')} className="h-10 px-6 bg-primary text-white text-sm font-semibold rounded-pill">
          Back to Exams
        </button>
      </div>
    </div>
  )

  if (phase === 'already' || phase === 'done') {
    const pct = result && result.max > 0 ? Math.round((result.score / result.max) * 100) : 0
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
        <div className="bg-surface rounded-card shadow-sm p-8 text-center max-w-sm w-full">
          <div className={`size-16 rounded-full mx-auto mb-4 flex items-center justify-center ${pct >= 50 ? 'bg-green-50' : 'bg-amber-50'}`}>
            <CheckCircle2 size={28} className={pct >= 50 ? 'text-green-600' : 'text-amber-500'} />
          </div>
          <h1 className="text-lg font-bold text-foreground mb-1">
            {phase === 'already' ? 'Already Completed' : 'Exam Submitted'}
          </h1>
          <p className="text-xs text-muted mb-5">{exam?.title}</p>
          {result && (
            <>
              <p className="text-4xl font-bold text-foreground">{result.score}<span className="text-lg text-muted font-semibold"> / {result.max}</span></p>
              <p className={`text-sm font-bold mt-1 ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</p>
              {result.auto && phase === 'done' && (
                <p className="text-xs text-amber-600 mt-3">Time ran out — your exam was submitted automatically.</p>
              )}
            </>
          )}
          <button onClick={() => onNavigate('exam-schedule')} className="mt-6 h-10 px-6 bg-primary text-white text-sm font-semibold rounded-pill w-full">
            Back to Exams
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'intro' && exam) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="bg-surface rounded-card shadow-sm p-8 max-w-md w-full">
        <div className="size-12 rounded-card bg-primary/10 text-primary flex items-center justify-center mb-4">
          <MonitorCheck size={20} />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-1">{exam.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted mb-4">
          <span className="flex items-center gap-1.5"><Clock size={13} /> {exam.duration_minutes} minutes</span>
          <span>{questions.length} questions</span>
        </div>
        {exam.instructions && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-card text-sm text-amber-800 mb-4">
            {exam.instructions}
          </div>
        )}
        <ul className="text-xs text-muted flex flex-col gap-1.5 mb-6 list-disc pl-4">
          <li>The timer starts when you click Begin and keeps running even if you leave the page.</li>
          <li>Your exam auto-submits when time runs out.</li>
          <li>You can only submit once.</li>
        </ul>
        <div className="flex gap-3">
          <button onClick={begin} className="flex-1 h-11 bg-primary text-white text-sm font-bold rounded-pill shadow-primary hover:bg-primary-deep transition-colors">
            Begin Exam
          </button>
          <button onClick={() => onNavigate('exam-schedule')} className="h-11 px-5 text-sm font-semibold text-muted hover:text-foreground">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  // ── Taking ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Header: title + timer */}
      <header className="bg-surface border-b border-black/6 px-4 md:px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">{exam?.title}</h1>
          <p className="text-xs text-muted">{answeredCount} of {questions.length} answered</p>
        </div>
        <div className={`flex items-center gap-2 h-10 px-4 rounded-pill font-bold text-sm shrink-0 ${lowTime ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-primary/10 text-primary'}`}>
          <Clock size={15} /> {fmtTime(timeLeft)}
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-4 py-6">
        <div className="w-full max-w-2xl flex flex-col gap-5">

          {/* Question navigator dots */}
          <div className="flex flex-wrap gap-1.5">
            {questions.map((qq, i) => (
              <button
                key={qq.id}
                onClick={() => setCurrent(i)}
                className={`size-8 rounded-md text-xs font-bold transition-colors ${
                  i === current ? 'bg-primary text-white'
                  : answers[qq.id] !== undefined && answers[qq.id] !== '' ? 'bg-green-100 text-green-700'
                  : 'bg-surface text-muted shadow-sm hover:bg-black/5'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Current question */}
          {q && (
            <div className="bg-surface rounded-card shadow-sm p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <p className="text-base font-semibold text-foreground leading-relaxed">
                  <span className="text-muted mr-2">{current + 1}.</span>{q.prompt}
                </p>
                <span className="text-xs font-bold text-muted bg-canvas px-2 py-1 rounded-full shrink-0">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
              </div>

              {q.type === 'mcq' && (
                <div className="flex flex-col gap-2">
                  {q.options.map((opt, oi) => (
                    <button
                      key={oi}
                      onClick={() => setAnswer(q.id, oi)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-card border text-left text-sm transition-colors ${
                        answers[q.id] === oi
                          ? 'border-primary bg-primary/5 text-foreground font-semibold'
                          : 'border-black/10 text-foreground hover:border-primary/40'
                      }`}
                    >
                      <span className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${answers[q.id] === oi ? 'border-primary' : 'border-black/25'}`}>
                        {answers[q.id] === oi && <span className="size-2.5 rounded-full bg-primary" />}
                      </span>
                      {opt || `Option ${oi + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'truefalse' && (
                <div className="flex gap-3">
                  {[true, false].map(v => (
                    <button
                      key={String(v)}
                      onClick={() => setAnswer(q.id, v)}
                      className={`flex-1 h-12 rounded-card border text-sm font-semibold transition-colors ${
                        answers[q.id] === v ? 'border-primary bg-primary/5 text-primary' : 'border-black/10 text-foreground hover:border-primary/40'
                      }`}
                    >
                      {v ? 'True' : 'False'}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'short' && (
                <input
                  value={String(answers[q.id] ?? '')}
                  onChange={e => setAnswer(q.id, e.target.value)}
                  placeholder="Type your answer"
                  className="w-full h-11 px-4 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
                />
              )}
            </div>
          )}

          {/* Nav + submit */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrent(c => Math.max(0, c - 1))}
              disabled={current === 0}
              className="flex items-center gap-1.5 h-10 px-4 border border-black/15 text-sm font-semibold text-foreground rounded-pill disabled:opacity-40 hover:border-primary transition-colors"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            {current < questions.length - 1 ? (
              <button
                onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                className="flex items-center gap-1.5 h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors"
              >
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (answeredCount < questions.length && !confirm(`You have ${questions.length - answeredCount} unanswered question(s). Submit anyway?`)) return
                  if (exam) submitExam(questions, answersRef.current, false, exam)
                }}
                disabled={submitting}
                className="flex items-center gap-1.5 h-10 px-6 bg-green-600 text-white text-sm font-bold rounded-pill hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> {submitting ? 'Submitting…' : 'Submit Exam'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
