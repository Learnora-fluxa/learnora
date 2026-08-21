import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface QuizQuestion {
  id:      string
  type:    'mcq' | 'truefalse' | 'short'
  prompt:  string
  options: string[]
  answer:  number | boolean | string
  points:  number
}

const db = supabase as unknown as { from: (t: string) => any }

export default function QuizPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [questions,   setQuestions]   = useState<QuizQuestion[]>([])
  const [current,     setCurrent]     = useState(0)
  const [selected,    setSelected]    = useState<number | boolean | string | null>(null)
  const [submitted,   setSubmitted]   = useState(false)
  const [answers,     setAnswers]     = useState<Record<number, number | boolean | string>>({})
  const [timeLeft,    setTimeLeft]    = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonId,    setLessonId]    = useState('')
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const answersRef   = useRef(answers)
  useEffect(() => { answersRef.current = answers }, [answers])

  useEffect(() => {
    const lid = sessionStorage.getItem('learnora_selected_lesson') ?? ''
    setLessonId(lid)
    if (lid) loadQuestions(lid)
    else setLoading(false)
  }, [])

  function startTimer(seconds: number) {
    setTimeLeft(seconds)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          finishQuiz(answersRef.current, seconds)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  useEffect(() => () => clearInterval(timerRef.current!), [])

  async function loadQuestions(lid: string) {
    setLoading(true)
    const { data: lData } = await supabase.from('lessons').select('title').eq('id', lid).maybeSingle()
    setLessonTitle((lData as any)?.title ?? 'Quiz')

    const { data } = await db.from('quiz_questions')
      .select('id, question, type, options, points, order_index')
      .eq('lesson_id', lid)
      .order('order_index', { ascending: true })

    if (!data?.length) { setLoading(false); return }

    const qs: QuizQuestion[] = (data as any[]).map((q: any) => {
      const parsed = q.options
        ? JSON.parse(typeof q.options === 'string' ? q.options : JSON.stringify(q.options))
        : {}
      return {
        id:      q.id,
        type:    q.type as QuizQuestion['type'],
        prompt:  q.question,
        options: parsed.opts ?? [],
        answer:  parsed.answer ?? 0,
        points:  q.points ?? 1,
      }
    })

    setQuestions(qs)
    const limitSec = Math.max(180, qs.length * 24)
    startTimer(limitSec)
    setLoading(false)
  }

  async function finishQuiz(finalAnswers: Record<number, number | boolean | string>, totalSec: number) {
    if (!profile || !lessonId) return
    let score = 0; let max = 0

    questions.forEach((q, i) => {
      max += q.points
      const ans = finalAnswers[i]
      if ((q.type === 'mcq' || q.type === 'truefalse') && ans === q.answer) score += q.points
    })

    const timeTaken = totalSec - timeLeft

    const { error: attemptErr } = await db.from('quiz_attempts').upsert({
      student_id:   profile.id,
      school_id:    profile.school_id!,
      lesson_id:    lessonId,
      answers:      JSON.stringify(finalAnswers),
      score,
      max_score:    max,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'student_id,lesson_id' })
    logSupabaseError('QuizPage.upsertAttempt', attemptErr)

    sessionStorage.setItem('learnora_quiz_result', JSON.stringify({
      score, max, timeTaken, lessonTitle,
      accuracy: max > 0 ? Math.round((score / max) * 100) : 0,
      studentName: profile.full_name ?? 'Student',
    }))

    onNavigate('m/quiz-result')
  }

  function handleNext() {
    if (!submitted) {
      const ans = selected ?? (
        questions[current]?.type === 'truefalse' ? true :
        questions[current]?.type === 'short' ? '' : 0
      )
      const newAnswers = { ...answersRef.current, [current]: ans as number | boolean | string }
      setAnswers(newAnswers)
      answersRef.current = newAnswers
      setSubmitted(true)
      return
    }
    setSubmitted(false)
    setSelected(null)
    if (current + 1 >= questions.length) {
      clearInterval(timerRef.current!)
      finishQuiz(answersRef.current, Math.max(180, questions.length * 24))
    } else {
      setCurrent(c => c + 1)
    }
  }

  function fmtTime(s: number) {
    const m = Math.floor(s / 60); const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-muted">Loading quiz…</p>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-5 max-w-[430px] mx-auto">
        <p className="text-lg font-bold text-foreground">No questions yet</p>
        <p className="text-sm text-muted text-center">The teacher has not added quiz questions for this lesson yet.</p>
        <button onClick={() => onNavigate('m/learn')}
          className="h-11 px-6 bg-primary text-white rounded-full text-sm font-semibold">
          Back to Lessons
        </button>
      </div>
    )
  }

  const q      = questions[current]
  const isLast = current + 1 >= questions.length

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto px-5 pt-5 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onNavigate('m/learn')}><ChevronLeft size={22} /></button>
        <p className={`text-xl font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
          {fmtTime(timeLeft)}
        </p>
        <div className="w-8" />
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-black/8 rounded-full overflow-hidden mb-1">
        <div className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${((current + (submitted ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>
      <p className="text-right text-[10px] text-muted mb-6">{current + 1}/{questions.length}</p>

      {/* Question */}
      <div className="flex-1 flex flex-col gap-5">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">{lessonTitle}</p>
          <p className="text-base font-bold text-foreground leading-relaxed">{q.prompt}</p>
        </div>

        {q.type === 'mcq' && (
          <div className="flex flex-col gap-2.5">
            {q.options.map((opt, i) => {
              const isSelected = selected === i
              const isCorrect  = submitted && i === q.answer
              const isWrong    = submitted && isSelected && i !== q.answer
              return (
                <button key={i} disabled={submitted} onClick={() => setSelected(i)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-semibold transition-all
                    ${isCorrect ? 'border-green-500 bg-green-50 text-green-700' :
                      isWrong   ? 'border-red-400 bg-red-50 text-red-600' :
                      isSelected ? 'border-primary bg-primary/8 text-primary' :
                                   'border-black/12 text-foreground hover:border-primary/40'}`}>
                  <span className="flex items-center gap-3">
                    <span className="size-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                    {isCorrect && <CheckCircle2 size={15} className="ml-auto text-green-500 shrink-0" />}
                    {isWrong   && <XCircle      size={15} className="ml-auto text-red-400  shrink-0" />}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {q.type === 'truefalse' && (
          <div className="flex gap-3">
            {([true, false] as boolean[]).map(v => {
              const isSelected = selected === v
              const isCorrect  = submitted && v === q.answer
              const isWrong    = submitted && isSelected && v !== q.answer
              return (
                <button key={String(v)} disabled={submitted} onClick={() => setSelected(v)}
                  className={`flex-1 h-14 rounded-2xl border-2 text-sm font-bold transition-all
                    ${isCorrect ? 'border-green-500 bg-green-50 text-green-700' :
                      isWrong   ? 'border-red-400 bg-red-50 text-red-600' :
                      isSelected ? 'border-primary bg-primary/8 text-primary' :
                                   'border-black/12 text-foreground'}`}>
                  {v ? 'True' : 'False'}
                </button>
              )
            })}
          </div>
        )}

        {q.type === 'short' && (
          <div>
            <textarea disabled={submitted}
              value={(typeof selected === 'string' ? selected : '') as string}
              onChange={e => setSelected(e.target.value)}
              placeholder="Type your answer…" rows={4}
              className="w-full border-2 border-black/15 rounded-2xl p-3 text-sm outline-none focus:border-primary resize-none disabled:bg-canvas" />
            {submitted && (
              <div className="mt-2 p-3 rounded-2xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-bold text-amber-700 mb-1">Model answer:</p>
                <p className="text-xs text-amber-800">{String(q.answer)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <button onClick={handleNext}
        className="w-full h-12 bg-primary text-white font-bold rounded-full mt-6 hover:bg-primary-deep transition-colors">
        {submitted
          ? isLast ? 'View Results' : 'Next Question →'
          : 'Submit Answer'}
      </button>
    </div>
  )
}
