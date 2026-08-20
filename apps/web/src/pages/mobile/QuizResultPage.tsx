import { useEffect, useState } from 'react'
import { Share2, RotateCcw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

interface Result {
  score:       number
  max:         number
  timeTaken:   number
  accuracy:    number
  lessonTitle: string
  studentName: string
}

function gradeFor(pct: number): string {
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B+'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  return 'F'
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60); const sec = s % 60
  return `${m}m ${String(sec).padStart(2, '0')}s`
}

export default function QuizResultPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('learnora_quiz_result')
    if (raw) {
      try {
        const r = JSON.parse(raw) as Result
        if (!r.studentName) r.studentName = profile?.full_name ?? 'Student'
        setResult(r)
      } catch { /* ignore */ }
    }
  }, [profile?.full_name])

  if (!result) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center gap-4 px-5">
        <p className="text-white text-sm">No result to show.</p>
        <button onClick={() => onNavigate('m/learn')}
          className="h-11 px-6 bg-white text-primary font-bold rounded-full text-sm">
          Back to Lessons
        </button>
      </div>
    )
  }

  const pct   = result.max > 0 ? result.accuracy : 0
  const grade = gradeFor(pct)
  const firstName = result.studentName.split(' ')[0]

  return (
    <div className="min-h-screen bg-primary flex flex-col max-w-[430px] mx-auto items-center px-5 pt-10 pb-8">

      {/* Confetti strips */}
      <div className="flex gap-2 mb-6 opacity-70">
        {['bg-yellow-300', 'bg-red-400', 'bg-green-300', 'bg-pink-400', 'bg-blue-300'].map((c, i) => (
          <div key={i} className={`w-1 h-12 ${c} rounded-full`} style={{ transform: `rotate(${i * 15}deg)` }} />
        ))}
      </div>

      {/* Mascot */}
      <div className="size-28 rounded-full bg-white/20 flex items-center justify-center text-6xl mb-4 select-none">
        {pct >= 70 ? '🎉' : pct >= 50 ? '🤔' : '😅'}
      </div>

      {/* Result card */}
      <div className="w-full bg-white rounded-3xl p-6">
        <p className="text-base font-bold text-foreground text-center mb-1">
          {pct >= 80 ? `Great work, ${firstName}!` : pct >= 60 ? `Good effort, ${firstName}!` : `Keep practising, ${firstName}!`}
        </p>
        <p className="text-xs text-muted text-center mb-5 truncate">
          {result.lessonTitle}
        </p>

        {/* Time */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-muted">Time Taken</p>
          <span className="text-[10px] bg-canvas rounded px-2 py-0.5 text-muted">⏱</span>
        </div>
        <p className="text-2xl font-bold text-foreground mb-5">{fmtTime(result.timeTaken)}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-canvas rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted">Accuracy</p>
              <span className="text-xs">🎯</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{pct}%</p>
          </div>
          <div className="bg-canvas rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted">Grade</p>
              <span className="text-xs">⭐</span>
            </div>
            <p className={`text-2xl font-bold ${grade === 'F' ? 'text-red-500' : 'text-foreground'}`}>{grade}</p>
          </div>
          <div className="bg-canvas rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted">Score</p>
              <span className="text-xs">📝</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{result.score}/{result.max}</p>
          </div>
          <div className="bg-canvas rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted">XP Earned</p>
              <span className="text-xs">⚡</span>
            </div>
            <p className="text-2xl font-bold text-amber-500">+{Math.round(pct / 10) * 5}</p>
          </div>
        </div>

        <button onClick={() => onNavigate('m/learn')}
          className="w-full h-12 bg-primary text-white font-bold rounded-full flex items-center justify-center gap-2">
          <Share2 size={15} /> Share Score Card
        </button>
        <button onClick={() => onNavigate('m/quiz')}
          className="w-full h-12 bg-white border-2 border-black/12 text-foreground font-bold rounded-full mt-3 flex items-center justify-center gap-2">
          <RotateCcw size={14} /> Try Again
        </button>
      </div>
    </div>
  )
}
