import { useEffect } from 'react'
import { BookOpen } from 'lucide-react'

type Props = { onNavigate: (page: string) => void }

export default function SplashPage({ onNavigate }: Props) {
  useEffect(() => {
    const t = setTimeout(() => onNavigate('login'), 2500)
    return () => clearTimeout(t)
  }, [onNavigate])

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <div className="size-24 rounded-[28px] bg-white/15 backdrop-blur flex items-center justify-center shadow-lg">
          <BookOpen size={44} className="text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight">Learnora</h1>
          <p className="text-white/70 text-sm mt-2 font-medium">Smart Education, Reimagined</p>
        </div>
      </div>

      {/* Loading dots */}
      <div className="flex items-center gap-2 mt-8">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="size-2 rounded-full bg-white/50 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
