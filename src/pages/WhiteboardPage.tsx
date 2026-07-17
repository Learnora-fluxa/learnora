import { lazy, Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const LiveWhiteboard = lazy(() => import('../components/whiteboard/LiveWhiteboard'))

type Props = { onNavigate: (page: string) => void }

// Standalone whiteboard. If opened from a live class it shares that session's
// board (same Realtime channel); otherwise it's a personal scratch board.
export default function WhiteboardPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sessionId = sessionStorage.getItem('learnora_session_id') || `solo-${profile?.id ?? 'anon'}`
  const isTeacher = sessionStorage.getItem('learnora_session_is_teacher') === 'true'
  const backPage  = sessionStorage.getItem('learnora_session_id')
    ? 'live-classroom'
    : (profile?.role === 'teacher' ? 'teacher-dashboard' : 'dashboard')

  return (
    <div className="h-screen flex flex-col bg-canvas">
      <header className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-black/6 shrink-0">
        <button
          onClick={() => onNavigate(backPage)}
          className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <h1 className="text-base font-bold text-foreground">Whiteboard</h1>
        {sessionStorage.getItem('learnora_session_id') && (
          <span className="text-xs text-muted">
            Shared with your class{isTeacher ? ' (you are hosting)' : ''}
          </span>
        )}
      </header>
      <div className="flex-1 min-h-0">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-sm text-muted">Loading whiteboard…</p>
          </div>
        }>
          <LiveWhiteboard sessionId={sessionId} />
        </Suspense>
      </div>
    </div>
  )
}
