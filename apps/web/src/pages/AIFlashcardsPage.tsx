import { useState } from 'react'
import { ArrowLeft, ArrowRight, RotateCcw, CheckCircle2, XCircle, Sparkles } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'

type Props = { onNavigate: (page: string) => void }

const cards = [
  { front: "What is Newton's First Law of Motion?",           back: "An object at rest stays at rest, and an object in motion stays in motion at constant velocity, unless acted upon by a net external force. (Law of Inertia)" },
  { front: "State Newton's Second Law of Motion.",            back: "The acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass. F = ma" },
  { front: "What is Newton's Third Law of Motion?",           back: "For every action, there is an equal and opposite reaction. Forces always occur in pairs." },
  { front: "Define inertia.",                                  back: "Inertia is the tendency of an object to resist changes to its state of motion. An object with greater mass has greater inertia." },
  { front: "What is the SI unit of force?",                   back: "The Newton (N). 1 N = 1 kg⋅m/s²" },
  { front: "A 10 kg object accelerates at 3 m/s². What is the net force?", back: "F = ma = 10 × 3 = 30 N" },
]

export default function AIFlashcardsPage({ onNavigate }: Props) {
  const [index,   setIndex]   = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known,   setKnown]   = useState<Set<number>>(new Set())
  const [unsure,  setUnsure]  = useState<Set<number>>(new Set())

  const card = cards[index]
  const total = cards.length
  const progress = Math.round(((known.size + unsure.size) / total) * 100)

  function next() { setIndex(i => (i + 1) % total); setFlipped(false) }
  function prev() { setIndex(i => (i - 1 + total) % total); setFlipped(false) }

  function markKnown() {
    setKnown(prev => new Set([...prev, index]))
    setUnsure(prev => { const s = new Set(prev); s.delete(index); return s })
    next()
  }
  function markUnsure() {
    setUnsure(prev => new Set([...prev, index]))
    setKnown(prev => { const s = new Set(prev); s.delete(index); return s })
    next()
  }

  if (known.size + unsure.size === total && known.size > 0) {
    return (
      <DashboardLayout activePage="ai-tutor" onNavigate={onNavigate} title="Flashcards Done">
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center gap-6">
          <div className="size-20 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 size={36} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Session Complete!</h2>
            <p className="text-sm text-muted">You reviewed all {total} cards.</p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-green-600">{known.size}</p>
              <p className="text-xs text-muted">Got it</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-600">{unsure.size}</p>
              <p className="text-xs text-muted">Review again</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setIndex(0); setFlipped(false); setKnown(new Set()); setUnsure(new Set()) }}
              className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors"
            >
              <RotateCcw size={14} /> Study Again
            </button>
            <button onClick={() => onNavigate('ai-tutor')} className="h-11 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:bg-canvas transition-colors">
              Back to AI Tutor
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activePage="ai-tutor" onNavigate={onNavigate} title="Flashcards" subtitle="Newton's Laws of Motion · 6 cards">
      <div className="max-w-[580px] mx-auto flex flex-col gap-6">

        {/* Progress */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Card {index + 1} of {total}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-green-600 font-semibold">{known.size} known</span>
            <span className="text-xs text-amber-600 font-semibold">{unsure.size} unsure</span>
          </div>
        </div>
        <div className="h-1.5 bg-black/8 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        {/* Card */}
        <div
          className="min-h-[280px] bg-surface rounded-card shadow-sm border border-black/8 flex flex-col items-center justify-center p-8 gap-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setFlipped(!flipped)}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={13} className="text-primary" />
            <span className="text-xs font-semibold text-primary">{flipped ? 'Answer' : 'Question'}</span>
          </div>
          <p className={`text-center leading-relaxed ${flipped ? 'text-base text-foreground' : 'text-lg font-semibold text-foreground'}`}>
            {flipped ? card.back : card.front}
          </p>
          {!flipped && (
            <p className="text-xs text-muted mt-2">Tap to reveal answer</p>
          )}
        </div>

        {/* Action buttons (visible after flip) */}
        {flipped ? (
          <div className="flex gap-3">
            <button
              onClick={markUnsure}
              className="flex-1 flex items-center justify-center gap-2 h-12 border-2 border-amber-300 text-amber-700 text-sm font-semibold rounded-pill hover:bg-amber-50 transition-colors"
            >
              <XCircle size={16} /> Still learning
            </button>
            <button
              onClick={markKnown}
              className="flex-1 flex items-center justify-center gap-2 h-12 bg-green-500 text-white text-sm font-semibold rounded-pill hover:bg-green-600 transition-colors"
            >
              <CheckCircle2 size={16} /> Got it!
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-5">
            <button onClick={prev} className="size-12 rounded-full bg-canvas flex items-center justify-center hover:bg-black/8 transition-colors">
              <ArrowLeft size={20} className="text-muted" />
            </button>
            <button onClick={() => setFlipped(true)} className="h-11 px-8 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors">
              Reveal Answer
            </button>
            <button onClick={next} className="size-12 rounded-full bg-canvas flex items-center justify-center hover:bg-black/8 transition-colors">
              <ArrowRight size={20} className="text-muted" />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
