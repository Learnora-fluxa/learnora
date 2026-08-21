import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, Send } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void; backPage?: string }

interface Message {
  id:        string
  body:      string | null
  sent_at:   string | null
  sender_id: string
  self:      boolean
}

function fmtTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const quickChips = ['Is my son in school?', 'How is he doing?', 'When is the next exam?']

export default function ChatRoomPage({ onNavigate, backPage = 'm/messages' }: Props) {
  const { profile } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [draft,    setDraft]    = useState('')
  const [convInfo, setConvInfo] = useState<{ id: string; name: string; role: string; initials: string } | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('learnora_selected_conversation')
    if (raw) {
      try { setConvInfo(JSON.parse(raw)) } catch {}
    }
  }, [])

  useEffect(() => { if (convInfo?.id && profile?.id) loadMessages() }, [convInfo?.id, profile?.id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadMessages() {
    if (!convInfo?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('id, body, sent_at, sender_id')
      .eq('conversation_id', convInfo.id)
      .order('sent_at', { ascending: true })
      .limit(100)
    const rows = (data ?? []) as { id: string; body: string | null; sent_at: string | null; sender_id: string }[]
    setMessages(rows.map(r => ({ ...r, self: r.sender_id === profile!.id })))
    setLoading(false)
  }

  async function send(text?: string) {
    const body = (text ?? draft).trim()
    if (!body || !convInfo?.id || sending) return
    setSending(true)
    await supabase.from('messages').insert({
      conversation_id: convInfo.id,
      sender_id:       profile!.id,
      school_id:       profile!.school_id!,
      body,
    })
    setDraft('')
    await loadMessages()
    setSending(false)
  }

  return (
    <div className="h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-black/6">
        <button onClick={() => onNavigate(backPage)}>
          <ChevronLeft size={22} className="text-foreground" />
        </button>
        <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold text-white shrink-0">
          {convInfo?.initials ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground truncate">{convInfo?.name ?? 'Chat'}</p>
            {convInfo?.role && <span className="text-[10px] text-muted bg-canvas px-2 py-0.5 rounded-full shrink-0">{convInfo.role}</span>}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <div className="flex justify-center">
          <span className="bg-primary text-white text-xs font-medium px-4 py-1 rounded-full">Today</span>
        </div>
        {loading ? (
          <div className="text-center py-8 text-sm text-muted">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted">No messages yet. Start the conversation!</div>
        ) : messages.map(m => (
          <div key={m.id} className={`flex ${m.self ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              m.self ? 'bg-primary text-white rounded-br-sm' : 'bg-canvas text-foreground rounded-bl-sm'
            }`}>
              {m.body}
              <p className={`text-[10px] mt-1 ${m.self ? 'text-white/60' : 'text-muted'}`}>{fmtTime(m.sent_at)}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      {profile?.role === 'parent' && messages.length === 0 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {quickChips.map(c => (
            <button key={c} onClick={() => send(c)}
              className="h-8 px-3 bg-canvas border border-black/12 rounded-full text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors">
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-black/6 flex items-end gap-2 pb-safe">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none px-4 py-2.5 bg-canvas border border-black/12 rounded-2xl text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() => send()}
          disabled={!draft.trim() || sending}
          className="size-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
