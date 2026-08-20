import { useState, useRef, useEffect, useMemo } from 'react'
import { ArrowLeft, Send, Mic, Paperclip, Sparkles, Copy, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { teacherNav } from '../components/layout/Sidebar'
import {
  clearActiveAssistantSession,
  clearPendingAssistantPrompt,
  clearPendingAssistantScope,
  getActiveAssistantSession,
  getAssistantSession,
  readPendingAssistantPrompt,
  readPendingAssistantScope,
  sendAssistantMessage,
  setActiveAssistantSession,
  type AssistantSource,
  type TeacherAssistantScope,
} from '../lib/aiAssistant'

type Props = { onNavigate: (page: string) => void }

type Role = 'user' | 'assistant'

interface Message {
  id: string
  role: Role
  text: string
  time: string
  sources?: AssistantSource[]
}

export default function AIChatSessionPage({ onNavigate }: Props) {
  const { session, profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [assistantScope, setAssistantScope] = useState<TeacherAssistantScope | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    if (profile?.role === 'teacher') {
      return ['Draft a quiz', 'Suggest a lesson activity', 'Create a rubric', 'Summarize class risks']
    }
    if (profile?.role === 'parent') {
      return ['How is my child doing?', 'Explain this report card', 'What should we practice?', 'Has attendance affected performance?']
    }
    if (profile?.role === 'admin') {
      return ['Summarize school trends', 'What attendance risks exist?', 'Draft an announcement', 'Show operational insights']
    }
    return ['Quiz me on this', 'Give me an exam question', 'Explain with a diagram', 'Summarise this topic']
  }, [profile?.role])

  const assistantLabel = profile?.role === 'teacher'
    ? 'AI Assistant'
    : profile?.role === 'parent'
      ? 'Parent AI Assistant'
      : profile?.role === 'admin'
        ? 'Admin AI Assistant'
        : 'AI Tutor'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    let active = true

    async function bootstrap() {
      const storedSessionId = getActiveAssistantSession()
      const pendingPrompt = readPendingAssistantPrompt()
      const pendingScope = readPendingAssistantScope()

      setAssistantScope(pendingScope)

      if (storedSessionId && storedSessionId.trim()) {
        try {
          const detail = await getAssistantSession(session, storedSessionId)
          if (!active) return

          setSessionId(detail.session.id)
          setMessages(
            detail.messages.map((message) => ({
              id: message.id,
              role: message.role,
              text: message.content,
              time: formatTime(message.created_at),
            })),
          )
        } catch (err) {
          if (!active) return
          setError(err instanceof Error ? err.message : 'Unable to load assistant session.')
        }
      }

      if (pendingPrompt?.trim()) {
        clearPendingAssistantPrompt()
        await send(pendingPrompt, pendingScope)
        clearPendingAssistantScope()
      }
    }

    void bootstrap()
    return () => {
      active = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  async function send(text: string, scopeOverride?: TeacherAssistantScope | null) {
    const trimmed = text.trim()
    if (!trimmed) return
    const effectiveScope = scopeOverride ?? assistantScope

    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    setMessages(m => [...m, {
      id: `local-user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      time: now,
    }])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const response = await sendAssistantMessage(session, {
        prompt: trimmed,
        sessionId: sessionId ?? undefined,
        subjectId: effectiveScope?.subjectId,
        courseId: effectiveScope?.courseId,
      })

      setSessionId(response.sessionId)
      setActiveAssistantSession(response.sessionId)
      setMessages(m => [...m, {
        id: `local-ai-${Date.now()}`,
        role: 'assistant',
        text: response.answer,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        sources: response.sources,
      }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Learnora AI could not answer right now.')
      setMessages(m => m.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  function startNewChat() {
    clearActiveAssistantSession()
    clearPendingAssistantPrompt()
    clearPendingAssistantScope()
    setSessionId(null)
    setMessages([])
    setError(null)
    setAssistantScope(null)
  }

  return (
    <DashboardLayout
      activePage={profile?.role === 'teacher' ? 'ai-assistant' : 'ai-tutor'}
      onNavigate={onNavigate}
      title=""
      mainClassName="flex-1 overflow-hidden flex flex-col"
      nav={profile?.role === 'teacher' ? teacherNav : undefined}
      user={profile?.role === 'teacher' ? sidebarUser : undefined}
    >
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <button
            onClick={() => onNavigate(profile?.role === 'teacher' ? 'ai-assistant' : 'ai-tutor')}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="size-9 rounded-full bg-primary flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{assistantLabel}</p>
            <p className="text-xs text-green-500 font-medium">● Online</p>
          </div>
          <button
            onClick={startNewChat}
            className="ml-auto flex items-center gap-1.5 h-8 px-3 text-xs text-muted border border-black/15 rounded-full hover:border-primary hover:text-primary transition-colors"
          >
            <RefreshCw size={11} /> New chat
          </button>
        </div>

        {profile?.role === 'teacher' && assistantScope?.subjectId && (
          <div className="mb-4 shrink-0 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-xs text-primary">
            Responses in this chat are grounded to your selected teaching scope.
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && (
                <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={13} className="text-white" />
                </div>
              )}
              <div className={`max-w-[70%] ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-primary text-white rounded-br-sm'
                    : 'bg-surface shadow-sm text-foreground rounded-bl-sm border border-black/6'
                }`}>
                  {m.text}
                </div>
                {!!m.sources?.length && (
                  <div className="flex flex-wrap gap-1">
                    {m.sources.slice(0, 4).map((source, index) => (
                      <span
                        key={`${source.type}-${source.recordId ?? index}`}
                        className="px-2 py-1 rounded-full bg-primary/8 text-primary text-[10px] font-medium"
                      >
                        {source.label}
                      </span>
                    ))}
                  </div>
                )}
                <div className={`flex items-center gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[10px] text-muted">{m.time}</span>
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigator.clipboard.writeText(m.text)}
                        className="size-5 flex items-center justify-center text-muted hover:text-primary transition-colors"
                      >
                        <Copy size={10} />
                      </button>
                      <button className="size-5 flex items-center justify-center text-muted hover:text-green-500 transition-colors">
                        <ThumbsUp size={10} />
                      </button>
                      <button className="size-5 flex items-center justify-center text-muted hover:text-red-500 transition-colors">
                        <ThumbsDown size={10} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Sparkles size={13} className="text-white" />
              </div>
              <div className="bg-surface border border-black/6 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  {[0,1,2].map(i => (
                    <span key={i} className="size-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        <div className="flex gap-2 flex-wrap py-3 shrink-0">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              className="h-8 px-3 bg-primary/8 text-primary text-xs font-semibold rounded-full hover:bg-primary/15 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-3 shrink-0">
          <button className="size-10 rounded-full bg-canvas flex items-center justify-center text-muted hover:text-primary transition-colors shrink-0">
            <Paperclip size={16} />
          </button>
          <div className="flex-1 relative">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)}
              placeholder={profile?.role === 'teacher'
                ? 'Ask for help with lessons, grading, quizzes, or interventions…'
                : 'Ask me anything...'}
              className="w-full h-11 px-4 pr-12 border border-black/20 rounded-pill text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
            />
            <button
              onClick={() => setInput(input ? input : '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
            >
              <Mic size={16} />
            </button>
          </div>
          <button
            onClick={() => send(input)}
            className="size-11 rounded-full bg-primary flex items-center justify-center shadow-primary shrink-0 hover:bg-primary-deep transition-colors"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}

function formatTime(value: string | null) {
  if (!value) return '--:--'

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '--:--'
    : date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
