import { useState } from 'react'
import { Camera, Upload, Sparkles, ChevronRight, RotateCcw } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'

type Props = { onNavigate: (page: string) => void }
type Mode  = 'idle' | 'solving' | 'solved'

const solution = {
  question: 'A 5 kg block is pushed with a force of 25 N on a frictionless surface. Find the acceleration.',
  steps: [
    { step: 1, title: 'Identify the known values',    body: 'Mass (m) = 5 kg\nForce (F) = 25 N\nSurface is frictionless (no friction force)' },
    { step: 2, title: 'Choose the right formula',     body: "Newton's Second Law: F = ma" },
    { step: 3, title: 'Rearrange for the unknown',   body: 'a = F ÷ m' },
    { step: 4, title: 'Substitute and calculate',     body: 'a = 25 ÷ 5 = 5 m/s²' },
    { step: 5, title: 'State the answer with units',  body: 'The acceleration of the block is 5 m/s²' },
  ],
  relatedTopics: ["Newton's Laws", 'Force and Motion', 'WAEC Past Questions'],
}

export default function AIImageSolverPage({ onNavigate }: Props) {
  const [mode, setMode] = useState<Mode>('idle')

  function solve() {
    setMode('solving')
    setTimeout(() => setMode('solved'), 2000)
  }

  return (
    <DashboardLayout activePage="ai-tutor" onNavigate={onNavigate} title="Image Question Solver" subtitle="Take a photo or upload a question for step-by-step solution">
      <div className="max-w-[680px] flex flex-col gap-6">

        {mode === 'idle' && (
          <>
            {/* Image capture area */}
            <div
              className="border-2 border-dashed border-black/20 rounded-card p-10 flex flex-col items-center gap-5 cursor-pointer hover:border-primary hover:bg-primary/4 transition-colors"
              onClick={solve}
            >
              <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera size={36} className="text-primary" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">Point camera at a question</p>
                <p className="text-sm text-muted mt-1">Works with textbooks, worksheets, exam papers, and handwritten notes</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 h-11 px-5 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors">
                  <Camera size={15} /> Open Camera
                </button>
                <button className="flex items-center gap-2 h-11 px-5 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:bg-canvas transition-colors">
                  <Upload size={15} /> Upload Image
                </button>
              </div>
            </div>

            <p className="text-xs text-muted text-center">Supports Maths, Physics, Chemistry, Biology and English questions</p>
          </>
        )}

        {mode === 'solving' && (
          <div className="flex flex-col items-center justify-center py-16 gap-5">
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Sparkles size={36} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-foreground">Reading question…</p>
              <p className="text-sm text-muted mt-1">Generating step-by-step solution</p>
            </div>
          </div>
        )}

        {mode === 'solved' && (
          <>
            {/* Detected question */}
            <div className="bg-canvas border border-black/10 rounded-card p-4">
              <p className="text-xs font-semibold text-muted mb-1">Detected Question</p>
              <p className="text-sm text-foreground">{solution.question}</p>
            </div>

            {/* Step-by-step */}
            <div className="bg-surface rounded-card shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-black/6 flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                <p className="text-base font-bold text-foreground">Step-by-Step Solution</p>
              </div>
              <div className="p-5 flex flex-col gap-4">
                {solution.steps.map(({ step, title, body }) => (
                  <div key={step} className="flex gap-4">
                    <div className="size-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                      {step}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
                      <p className="text-sm text-muted whitespace-pre-line leading-relaxed">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Related */}
            <div className="flex flex-wrap gap-2">
              {solution.relatedTopics.map(t => (
                <button
                  key={t}
                  onClick={() => onNavigate('ai-chat')}
                  className="flex items-center gap-1.5 h-8 px-3 bg-primary/10 text-primary text-xs font-semibold rounded-full hover:bg-primary/20 transition-colors"
                >
                  {t} <ChevronRight size={11} />
                </button>
              ))}
            </div>

            <button
              onClick={() => setMode('idle')}
              className="flex items-center justify-center gap-2 h-11 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:bg-canvas transition-colors"
            >
              <RotateCcw size={14} /> Solve Another
            </button>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
