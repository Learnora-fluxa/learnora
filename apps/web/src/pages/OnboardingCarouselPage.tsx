import { useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'

type Props = { onNavigate: (page: string) => void }

const slides = [
  {
    emoji: '📚',
    title: 'Learn at Your Own Pace',
    body: 'Access all your courses, lessons, and assignments in one place. Watch videos, take notes, and track your progress.',
    bg: 'from-[#4b75ff] to-[#005cf7]',
  },
  {
    emoji: '🤖',
    title: 'AI Tutor, Always Available',
    body: 'Ask questions, get step-by-step explanations, solve problems with your camera, and prepare for WAEC & NECO — all powered by AI.',
    bg: 'from-[#7c3aed] to-[#4b75ff]',
  },
  {
    emoji: '📊',
    title: 'Track Your Growth',
    body: 'See your GPA trends, attendance, study streaks, and leaderboard position. Set academic goals and watch yourself hit them.',
    bg: 'from-[#0891b2] to-[#4b75ff]',
  },
  {
    emoji: '👨‍👩‍👧',
    title: 'Stay Connected',
    body: 'Teachers, students, and parents — all on one platform. Message teachers, join live classes, and keep parents in the loop.',
    bg: 'from-[#059669] to-[#0891b2]',
  },
  {
    emoji: '🚀',
    title: "You're Ready to Go",
    body: "Your account is all set. Let's start your learning journey at Greenfield Academy.",
    bg: 'from-[#f59e0b] to-[#ef4444]',
  },
]

export default function OnboardingCarouselPage({ onNavigate }: Props) {
  const [idx, setIdx] = useState(0)

  const slide = slides[idx]
  const isLast = idx === slides.length - 1

  function next() {
    if (isLast) onNavigate('dashboard')
    else setIdx(i => i + 1)
  }

  function prev() {
    if (idx > 0) setIdx(i => i - 1)
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${slide.bg} flex flex-col items-center justify-center px-6 transition-all duration-500`}>
      {/* Skip */}
      {!isLast && (
        <button
          onClick={() => onNavigate('dashboard')}
          className="absolute top-6 right-6 text-white/70 text-sm font-semibold hover:text-white transition-colors"
        >
          Skip
        </button>
      )}

      {/* Slide content */}
      <div className="max-w-sm w-full text-center">
        <div className="text-8xl mb-8 animate-in fade-in zoom-in-95 duration-300">
          {slide.emoji}
        </div>
        <h1 className="text-2xl font-bold text-white mb-4 leading-snug">
          {slide.title}
        </h1>
        <p className="text-base text-white/80 leading-relaxed">
          {slide.body}
        </p>
      </div>

      {/* Dots */}
      <div className="flex gap-2 mt-12">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`rounded-full transition-all ${i === idx ? 'w-6 h-2.5 bg-white' : 'size-2.5 bg-white/40'}`}
          />
        ))}
      </div>

      {/* Nav buttons */}
      <div className="flex items-center gap-4 mt-8">
        {idx > 0 && (
          <button
            onClick={prev}
            className="size-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <button
          onClick={next}
          className="h-12 px-8 bg-white text-primary font-bold rounded-full shadow-lg hover:bg-white/90 transition-colors flex items-center gap-2"
        >
          {isLast ? "Let's Go!" : 'Next'}
          {!isLast && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  )
}
