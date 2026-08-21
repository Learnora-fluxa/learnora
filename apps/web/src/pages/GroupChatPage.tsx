import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, Send, Users } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Message {
  id:         string
  body:       string | null
  sent_at:    string | null
  sender_id:  string
  senderName: string
  self:       boolean
}

function fmtTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function GroupChatPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [messages,    setMessages]    = useState<Message[]>([])
  const [convId,      setConvId]      = useState<string | null>(null)
  const [convName,    setConvName]    = useState('')
  const [memberCount, setMemberCount] = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [input,       setInput]       = useState('')
  const [sending,     setSending]     = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (profile?.id) initChat() }, [profile?.id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function initChat() {
    setLoading(true)
    const schoolId = profile!.school_id!
    const userId   = profile!.id

    let classId: string | null = null
    let className = ''

    if (profile?.role === 'teacher') {
      const db = supabase as unknown as { from: (t: string) => any }
      const { data } = await db.from('teacher_assignments')
        .select('class_id, classes(id, name)')
        .eq('teacher_id', userId)
        .eq('school_id', schoolId)
        .limit(1).maybeSingle()
      if (data) {
        classId   = data.class_id
        className = data.classes?.name ?? ''
      }
    } else {
      const { data } = await supabase
        .from('class_enrollments')
        .select('class_id, classes(id, name)')
        .eq('student_id', userId)
        .limit(1)
        .maybeSingle()
      if (data) {
        const d = data as unknown as { class_id: string; classes: { id: string; name: string } | null }
        classId   = d.class_id
        className = d.classes?.name ?? ''
      }
    }

    if (!classId) { setLoading(false); return }

    // Find or create group conversation for this class
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id, name')
      .eq('class_id', classId)
      .eq('type', 'group')
      .eq('school_id', schoolId)
      .maybeSingle()

    let cid = (existingConv as { id: string; name: string | null } | null)?.id

    if (!cid) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          school_id: schoolId,
          class_id:  classId,
          type:      'group',
          name:      `${className} Group`,
        })
        .select('id')
        .single()
      cid = (newConv as { id: string } | null)?.id
    }

    if (!cid) { setLoading(false); return }

    setConvId(cid)
    setConvName(`${className} Group`)

    // Member count
    const { count } = await supabase
      .from('class_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
    setMemberCount(count ?? 0)

    await loadMessages(cid)
    setLoading(false)
  }

  async function loadMessages(cid: string) {
    const { data } = await supabase
      .from('messages')
      .select('id, body, sent_at, sender_id, profiles!sender_id(full_name)')
      .eq('conversation_id', cid)
      .order('sent_at', { ascending: true })
      .limit(100)

    const rows = (data ?? []) as unknown as {
      id:        string
      body:      string | null
      sent_at:   string | null
      sender_id: string
      profiles:  { full_name: string | null } | null
    }[]

    setMessages(rows.map(r => ({
      id:         r.id,
      body:       r.body,
      sent_at:    r.sent_at,
      sender_id:  r.sender_id,
      senderName: r.profiles?.full_name ?? 'Someone',
      self:       r.sender_id === profile!.id,
    })))
  }

  async function send() {
    if (!input.trim() || !convId || sending) return
    setSending(true)
    await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id:       profile!.id,
      school_id:       profile!.school_id!,
      body:            input.trim(),
    })
    setInput('')
    await loadMessages(convId)
    setSending(false)
  }

  return (
    <DashboardLayout
      activePage="messages"
      onNavigate={onNavigate}
      title={convName || 'Group Chat'}
      subtitle="Class group chat"
      mainClassName="flex-1 overflow-hidden flex flex-col"
      user={sidebarUser}
    >
      <div className="flex flex-1 min-h-0 max-w-[900px] w-full flex-col bg-surface rounded-card shadow-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/6 bg-canvas/40">
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate('messages')} className="text-muted hover:text-foreground transition-colors mr-1">
              <ChevronLeft size={18} />
            </button>
            <div className="size-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">G</div>
            <div>
              <p className="text-sm font-bold text-foreground">{convName || 'Group Chat'}</p>
              {memberCount > 0 && (
                <p className="text-xs text-muted flex items-center gap-1"><Users size={10} /> {memberCount} members</p>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {loading ? (
            <div className="text-center py-12 text-sm text-muted">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted">
              {convId ? 'No messages yet. Start the conversation!' : 'You are not enrolled in any class.'}
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex gap-2.5 ${m.self ? 'flex-row-reverse' : ''}`}>
                {!m.self && (
                  <div className="size-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                    {m.senderName.charAt(0)}
                  </div>
                )}
                <div className={`max-w-[70%] ${m.self ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {!m.self && <p className="text-xs font-semibold text-muted px-1">{m.senderName}</p>}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.self ? 'bg-primary text-white rounded-tr-sm' : 'bg-canvas text-foreground rounded-tl-sm'
                  }`}>
                    {m.body}
                  </div>
                  <p className="text-[10px] text-muted/60 px-1">{fmtTime(m.sent_at)}</p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-black/6 bg-white">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={convId ? 'Type a message…' : 'Join a class to chat'}
            disabled={!convId}
            className="flex-1 text-sm text-foreground placeholder:text-muted outline-none disabled:opacity-40"
          />
          <button
            onClick={send}
            disabled={!input.trim() || !convId || sending}
            className="size-9 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-deep transition-colors disabled:opacity-40 shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
