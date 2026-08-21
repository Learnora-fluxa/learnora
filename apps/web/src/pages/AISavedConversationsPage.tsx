import { Sparkles, MessageSquare, ArrowRight, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { teacherNav } from '../components/layout/Sidebar'
import { listAssistantSessions, setActiveAssistantSession, type AssistantSessionSummary } from '../lib/aiAssistant'

type Props = { onNavigate: (page: string) => void }

export default function AISavedConversationsPage({ onNavigate }: Props) {
  const { session, profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)
  const [query, setQuery] = useState('')
  const [list,  setList]  = useState<AssistantSessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const sessions = await listAssistantSessions(session)
        if (active) {
          setList(sessions)
          setError(null)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load saved conversations.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [session])

  const filtered = query
    ? list.filter(c => (c.title ?? 'Untitled AI session').toLowerCase().includes(query.toLowerCase()))
    : list

  function openConversation(id: string) {
    setActiveAssistantSession(id)
    onNavigate('ai-chat')
  }

  return (
    <DashboardLayout
      activePage={profile?.role === 'teacher' ? 'ai-assistant' : 'ai-tutor'}
      onNavigate={onNavigate}
      title="Saved Conversations"
      subtitle="Your Learnora AI chat history"
      nav={profile?.role === 'teacher' ? teacherNav : undefined}
      user={profile?.role === 'teacher' ? sidebarUser : undefined}
    >
      <div className="max-w-[720px] flex flex-col gap-5">

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full h-11 pl-10 pr-4 border border-black/20 rounded-pill text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
          />
        </div>

        {/* List */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-muted">
              <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Loading conversations…</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No conversations found</p>
            </div>
          ) : (
            <div className="divide-y divide-black/4">
              {filtered.map(conv => (
                <div key={conv.id} className="flex items-start gap-4 px-5 py-4 hover:bg-canvas/50 transition-colors group">
                  <div className="size-10 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={15} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openConversation(conv.id)}>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-foreground">{conv.title || 'Untitled AI session'}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-canvas text-muted">
                        {conv.subject || 'assistant'}
                      </span>
                    </div>
                    <p className="text-xs text-muted truncate">Continue this grounded Learnora AI conversation.</p>
                    <p className="text-xs text-muted mt-1">
                      {conv.created_at ? new Date(conv.created_at).toLocaleString() : 'Recent'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openConversation(conv.id)} className="size-8 rounded-full flex items-center justify-center text-muted hover:text-primary transition-colors">
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
