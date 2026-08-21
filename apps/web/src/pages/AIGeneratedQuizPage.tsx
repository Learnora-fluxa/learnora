import { useState } from 'react'
import { CheckCircle2, XCircle, ArrowRight, Sparkles, RotateCcw } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'

type Props = { onNavigate: (page: string) => void }

const questions = [
  {
    question: "According to Newton's Second Law, if the force on an object doubles while mass stays constant, what happens to the acceleration?",
    options: ['It halves', 'It stays the same', 'It doubles', 'It quadruples'],
    correct: 2,
    explanation: "F = ma. If F doubles and m is constant, then a must also double to keep the equation balanced.",
  },
  {
    question: "A 4 kg object is acted on by a net force of 12 N. What is its acceleration?",
    options: ['2 m/s²', '3 m/s²', '4 m/s²', '48 m/s²'],
    correct: 1,
    explanation: "a = F/m = 12/4 = 3 m/s²",
  },
  {
    question: "Which of the following best describes Newton's First Law?",
    options: ['Force equals mass times acceleration', 'Every action has an equal and opposite reaction', 'An object in motion continues in motion unless a net force acts on it', 'Acceleration is inversely proportional to force'],
    correct: 2,
    explanation: "Newton's First Law is the Law of Inertia — objects maintain their state of motion unless a net external force acts on them.",
  },
  {
    question: "A rocket expels gas downward, causing the rocket to move upward. Which law explains this?",
    options: ['Newton\'s First Law', 'Newton\'s Second Law', 'Newton\'s Third Law', 'Law of Gravity'],
    correct: 2,
    explanation: "Newton's Third Law: the rocket pushes gases down (action), so the gases push the rocket up (equal and opposite reaction).",
  },
]

export default function AIGeneratedQuizPage({ onNavigate }: Props) {
  const [current,  setCurrent]  = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers,  setAnswers]  = useState<(number | null)[]>(Array(questions.length).fill(null))
  const [done,     setDone]     = useState(false)

  const q = questions[current]

  function choose(i: number) {
    if (selected !== null) return
    setSelected(i)
    setAnswers(prev => { const a = [...prev]; a[current] = i; return a })
  }

  function next() {
    if (current < questions.length - 1) {
      setCurrent(current + 1)
      setSelected(answers[current + 1])
    } else {
      setDone(true)
    }
  }

  const score = answers.filter((a, i) => a === questions[i].correct).length

  if (done) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <DashboardLayout activePage="ai-tutor" onNavigate={onNavigate} title="Quiz Results">
        <div className="max-w-[600px] flex flex-col gap-6">
          <div className="bg-surface rounded-card shadow-sm p-8 text-center">
            <div className={`size-20 rounded-full mx-auto mb-4 flex items-center justify-center ${pct >= 70 ? 'bg-green-50' : 'bg-amber-50'}`}>
              {pct >= 70 ? <CheckCircle2 size={36} className="text-green-500" /> : <Sparkles size={36} className="text-amber-500" />}
            </div>
            <p className="text-4xl font-bold text-foreground mb-1">{pct}%</p>
            <p className="text-sm text-muted">{score} of {questions.length} correct</p>
            <p className={`text-sm font-semibold mt-2 ${pct >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
              {pct >= 80 ? 'Excellent work!' : pct >= 70 ? 'Good job! Keep practising.' : 'Keep studying — you\'ll get there!'}
            </p>
          </div>
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-black/6">
              <p className="text-sm font-bold text-foreground">Review Answers</p>
            </div>
            <div className="divide-y divide-black/4">
              {questions.map((q, i) => {
                const chosen  = answers[i]
                const correct = chosen === q.correct
                return (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-start gap-2 mb-2">
                      {correct ? <CheckCircle2 size={15} className="text-green-500 mt-0.5 shrink-0" /> : <XCircle size={15} className="text-red-500 mt-0.5 shrink-0" />}
                      <p className="text-sm text-foreground">{q.question}</p>
                    </div>
                    {!correct && chosen !== null && (
                      <p className="text-xs text-red-500 ml-5 mb-1">Your answer: {q.options[chosen]}</p>
                    )}
                    <p className="text-xs text-green-600 ml-5">Correct: {q.options[q.correct]}</p>
                    <p className="text-xs text-muted ml-5 mt-1">{q.explanation}</p>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setCurrent(0); setSelected(null); setAnswers(Array(questions.length).fill(null)); setDone(false) }}
              className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors">
              <RotateCcw size={14} /> Retry Quiz
            </button>
            <button onClick={() => onNavigate('ai-tutor')} className="h-11 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:bg-canvas transition-colors">
              Back
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activePage="ai-tutor" onNavigate={onNavigate} title="AI Quiz" subtitle={`Newton's Laws · Question ${current + 1} of ${questions.length}`}>
      <div className="max-w-[660px] flex flex-col gap-6">
        {/* Progress */}
        <div className="flex gap-2">
          {questions.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${
              i < current ? 'bg-primary' : i === current ? 'bg-primary/50' : 'bg-black/8'
            }`} />
          ))}
        </div>

        {/* Question */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-primary" />
            <span className="text-xs font-semibold text-primary">AI Generated</span>
          </div>
          <p className="text-base font-semibold text-foreground leading-relaxed mb-6">{q.question}</p>
          <div className="flex flex-col gap-3">
            {q.options.map((opt, i) => {
              let style = 'border-black/15 text-foreground hover:border-primary hover:bg-primary/4'
              if (selected !== null) {
                if (i === q.correct)          style = 'border-green-500 bg-green-50 text-green-700'
                else if (i === selected)      style = 'border-red-400 bg-red-50 text-red-600'
                else                          style = 'border-black/8 text-muted'
              } else if (selected === i) {
                style = 'border-primary bg-primary/8 text-primary'
              }
              return (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  className={`flex items-center gap-3 px-4 py-3.5 border-2 rounded-card text-sm font-medium text-left transition-all ${style}`}
                >
                  <span className={`size-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                    selected !== null && i === q.correct ? 'border-green-500 bg-green-500 text-white' :
                    selected === i    ? 'border-red-400 bg-red-400 text-white' : 'border-current'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              )
            })}
          </div>

          {selected !== null && (
            <div className={`mt-4 p-4 rounded-card ${selected === q.correct ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <p className="text-xs font-semibold text-foreground mb-1">{selected === q.correct ? '✓ Correct!' : '✗ Not quite.'}</p>
              <p className="text-xs text-muted leading-relaxed">{q.explanation}</p>
            </div>
          )}
        </div>

        <button
          onClick={next}
          disabled={selected === null}
          className="flex items-center justify-center gap-2 h-12 bg-primary text-white text-sm font-bold rounded-pill shadow-primary hover:bg-primary-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {current === questions.length - 1 ? 'See Results' : 'Next Question'} <ArrowRight size={16} />
        </button>
      </div>
    </DashboardLayout>
  )
}
