import { useState } from 'react'

type Props = { onNavigate: (page: string) => void }

const slides = [
  {
    tagline: 'How may I assist you?',
    heading: 'Discover Smarter Learning',
    highlight: 'With Learnora',
    body: 'Lorem ipsum dolor sit amet. Quo omnis deserunt vel magni incidunt ea nemo nihil quo esse voluptas sit',
  },
  {
    tagline: 'Hi, I am Lenora!',
    heading: 'Discover Smarter Learning',
    highlight: 'With Learnora',
    body: 'Lorem ipsum dolor sit amet. Quo omnis deserunt vel magni incidunt ea nemo nihil quo esse voluptas sit',
  },
  {
    tagline: '',
    heading: 'Learn at Your',
    highlight: 'Own Pace',
    body: 'Access lessons, quizzes and resources anytime, anywhere — designed for your academic journey.',
  },
]

export default function MobileOnboardingPage({ onNavigate }: Props) {
  const [current, setCurrent] = useState(0)

  function next() {
    if (current < slides.length - 1) setCurrent(current + 1)
    else onNavigate('login')
  }

  const slide = slides[current]

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto px-6 pb-10">
      {/* illustration area */}
      <div className="flex-1 flex flex-col items-center justify-center pt-16 pb-8">
        <div className="relative mb-8">
          {slide.tagline && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white shadow-md rounded-full px-4 py-2 text-sm font-medium text-foreground border border-black/6 z-10">
              {slide.tagline}
            </div>
          )}
          {/* Robot mascot placeholder */}
          <div className="size-[180px] rounded-full bg-canvas flex items-center justify-center text-[90px] select-none">
            🤖
          </div>
        </div>

        <div className="text-left w-full">
          <h1 className="text-3xl font-bold text-foreground leading-tight">{slide.heading}</h1>
          <h1 className="text-3xl font-bold leading-tight mb-3">
            <span className="relative inline-block">
              {slide.highlight}
              <span className="absolute bottom-0 left-0 w-full h-[10px] bg-primary/20 -z-10 rounded" />
            </span>
          </h1>
          <p className="text-sm text-muted leading-relaxed">{slide.body}</p>
        </div>
      </div>

      {/* bottom controls */}
      <div className="flex items-center justify-between pt-4">
        <button onClick={() => onNavigate('login')} className="text-sm font-semibold text-foreground">
          Skip
        </button>

        <div className="flex gap-1.5 items-center">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'w-6 bg-primary' : 'w-1.5 bg-black/15'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="h-11 px-7 bg-primary text-white text-sm font-bold rounded-full hover:bg-primary-deep transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}
