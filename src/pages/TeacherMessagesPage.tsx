import { useState, useEffect, useRef } from 'react'
import { Search, Send, Users, User, ChevronRight, MessageSquare, Plus } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import NewMessageModal from '../components/shared/NewMessageModal'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { loadTeacherContacts } from '../lib/messaging'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }
type ContactType = 'student' | 'parent' | 'teacher' | 'admin' | string

interface Contact {
  id:       string
  name:     string
  type:     ContactType
  lastMsg:  string
  lastTime: string
  unread:   number
}

interface Message {
  id:   string
  from: 'me' | 'them'
  text: string
  time: string
}

function fmtMsgTime(iso: string) {
  const d   = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export default function TeacherMessagesPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [contacts,     setContacts]     = useState<Contact[]>([])
  const [selected,     setSelected]     = useState<Contact | null>(null)
  const [messages,     setMessages]     = useState<Message[]>([])
  const [loadingList,  setLoadingList]  = useState(true)
  const [loadingMsgs,  setLoadingMsgs]  = useState(false)
  const [filter,       setFilter]       = useState<'all' | 'student' | 'parent'>('all')
  const [search,       setSearch]       = useState('')
  const [draft,        setDraft]        = useState('')
  const [sending,      setSending]      = useState(false)
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [showNew,      setShowNew]      = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (profile?.id) loadContacts() }, [profile?.id])
  useEffect(() => { if (activeConvId) loadMessages(activeConvId) }, [activeConvId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!activeConvId || !profile?.id) return
    const channel = supabase
      .channel(`teacher-messages:${activeConvId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages',
          filter: `conversation_id=eq.${activeConvId}` },
        (payload) => {
          const m = payload.new as { id: string; body: string | null; sent_at: string; sender_id: string }
          if (m.sender_id === profile.id) return
          setMessages(prev => [...prev, {
            id: m.id, from: 'them', text: m.body ?? '', time: fmtMsgTime(m.sent_at),
          }])
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeConvId, profile?.id])

  async function loadContacts() {
    setLoadingList(true)
    const userId = profile!.id

    const { data: memberData } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId)
      .eq('school_id', profile!.school_id!)

    const convIds = (memberData ?? []).map((m: { conversation_id: string }) => m.conversation_id)
    if (!convIds.length) { setLoadingList(false); return [] }

    const [partnerRes, lastMsgRes, myMemberRes, unreadMsgRes] = await Promise.all([
      supabase.from('conversation_members')
        .select('conversation_id, user_id, profiles!user_id(full_name, role)')
        .in('conversation_id', convIds)
        .neq('user_id', userId),
      supabase.from('messages')
        .select('conversation_id, body, sent_at')
        .in('conversation_id', convIds)
        .order('sent_at', { ascending: false }),
      supabase.from('conversation_members')
        .select('conversation_id, last_read_at')
        .eq('user_id', userId)
        .in('conversation_id', convIds),
      supabase.from('messages')
        .select('conversation_id, sent_at, sender_id')
        .in('conversation_id', convIds)
        .neq('sender_id', userId),
    ])

    const partners = (partnerRes.data ?? []) as unknown as {
      conversation_id: string; user_id: string
      profiles: { full_name: string | null; role: string | null } | null
    }[]
    const lastMsgs = (lastMsgRes.data ?? []) as { conversation_id: string; body: string | null; sent_at: string }[]

    const partnerMap: Record<string, { name: string; role: string }> = {}
    for (const p of partners) {
      if (!partnerMap[p.conversation_id] && p.profiles?.full_name) {
        partnerMap[p.conversation_id] = { name: p.profiles.full_name, role: p.profiles.role ?? '' }
      }
    }
    const lastMsgMap: Record<string, { body: string; sent_at: string }> = {}
    for (const msg of lastMsgs) {
      if (!lastMsgMap[msg.conversation_id])
        lastMsgMap[msg.conversation_id] = { body: msg.body ?? '', sent_at: msg.sent_at }
    }

    const myLastRead: Record<string, string | null> = {}
    for (const m of (myMemberRes.data ?? []) as { conversation_id: string; last_read_at: string | null }[]) {
      myLastRead[m.conversation_id] = m.last_read_at
    }

    const unreadMap: Record<string, number> = {}
    for (const m of (unreadMsgRes.data ?? []) as { conversation_id: string; sent_at: string; sender_id: string }[]) {
      const lastRead = myLastRead[m.conversation_id]
      if (!lastRead || m.sent_at > lastRead) {
        unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] ?? 0) + 1
      }
    }

    const list: Contact[] = convIds.map(id => ({
      id,
      name:     partnerMap[id]?.name ?? 'Unknown',
      type:     partnerMap[id]?.role ?? 'student',
      lastMsg:  lastMsgMap[id]?.body ?? '',
      lastTime: lastMsgMap[id] ? fmtMsgTime(lastMsgMap[id].sent_at) : '',
      unread:   unreadMap[id] ?? 0,
    }))
    setContacts(list)
    setLoadingList(false)
    return list
  }

  async function loadMessages(convId: string) {
    setLoadingMsgs(true)
    const { data } = await supabase
      .from('messages')
      .select('id, body, sent_at, sender_id')
      .eq('conversation_id', convId)
      .order('sent_at', { ascending: true })
      .limit(100)

    const userId = profile!.id
    setMessages((data ?? []).map((m: { id: string; body: string | null; sent_at: string | null; sender_id: string }) => ({
      id:   m.id,
      from: m.sender_id === userId ? 'me' : 'them',
      text: m.body ?? '',
      time: fmtMsgTime(m.sent_at ?? new Date().toISOString()),
    })))
    setLoadingMsgs(false)
  }

  async function sendMsg() {
    const text = draft.trim()
    if (!text || !activeConvId || sending) return
    setSending(true)
    const now    = new Date().toISOString()
    const tempId = `t-${Date.now()}`
    setMessages(prev => [...prev, { id: tempId, from: 'me', text, time: fmtMsgTime(now) }])
    setDraft('')
    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConvId,
      sender_id:       profile!.id,
      school_id:       profile!.school_id!,
      body:            text,
      sent_at:         now,
    })
    if (error) setMessages(prev => prev.filter(m => m.id !== tempId))
    setSending(false)
  }

  async function markRead(convId: string) {
    await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .eq('user_id', profile!.id)
    setContacts(prev => prev.map(c => c.id === convId ? { ...c, unread: 0 } : c))
  }

  function openContact(c: Contact) {
    setSelected(c)
    setActiveConvId(c.id)
    markRead(c.id)
  }

  const visible = contacts.filter(c =>
    (filter === 'all' || c.type === filter) &&
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout
      activePage="messages"
      onNavigate={onNavigate}
      title="Messages"
      subtitle="Message your students and their parents"
      nav={teacherNav}
      user={sidebarUser}
      mainClassName="flex-1 overflow-hidden flex flex-col"
    >
      <div className="flex flex-1 min-h-0 gap-0 overflow-hidden rounded-card shadow-sm bg-surface mx-4 md:mx-8 mb-4 md:mb-8">

        {/* Contact list */}
        <div className={`flex flex-col border-r border-black/8 ${selected ? 'hidden md:flex' : 'flex'} w-full md:w-[320px] shrink-0`}>
          <div className="p-4 border-b border-black/8 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full h-9 pl-9 pr-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
              </div>
              <button
                onClick={() => setShowNew(true)}
                title="New message"
                className="size-9 shrink-0 rounded-input bg-primary text-white flex items-center justify-center hover:bg-primary-deep transition-colors"
              >
                <Plus size={15} />
              </button>
            </div>
            <div className="flex gap-1 bg-canvas rounded-md p-1">
              {(['all', 'student', 'parent'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 h-7 text-xs font-semibold rounded transition-colors capitalize ${filter === f ? 'bg-white text-primary shadow-sm' : 'text-muted'}`}>
                  {f === 'all' ? 'All' : f === 'student' ? 'Students' : 'Parents'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-black/4">
            {loadingList ? (
              <p className="text-center text-sm text-muted py-8">Loading…</p>
            ) : visible.length === 0 ? (
              <div className="py-10 text-center text-muted">
                <Users size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No conversations found.</p>
              </div>
            ) : visible.map(c => (
              <button key={c.id} onClick={() => openContact(c)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-canvas/50 transition-colors ${selected?.id === c.id ? 'bg-primary/5' : ''}`}>
                <div className={`size-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
                  ${c.type === 'parent' ? 'bg-amber-50 text-amber-700' : 'bg-primary/10 text-primary'}`}>
                  {c.type === 'parent' ? <User size={14} /> : c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    <span className="text-[10px] text-muted shrink-0 ml-2">{c.lastTime}</span>
                  </div>
                  <p className="text-xs text-muted truncate mt-0.5">{c.lastMsg}</p>
                </div>
                {c.unread > 0 && (
                  <span className="size-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        {selected ? (
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-black/8">
              <button onClick={() => setSelected(null)} className="md:hidden text-muted hover:text-foreground">
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <div className={`size-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
                ${selected.type === 'parent' ? 'bg-amber-50 text-amber-700' : 'bg-primary/10 text-primary'}`}>
                {selected.type === 'parent' ? <User size={14} /> : selected.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{selected.name}</p>
                <p className="text-xs text-muted capitalize">{selected.type}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {loadingMsgs ? (
                <p className="text-center text-sm text-muted">Loading…</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-muted mt-10">No messages yet.</p>
              ) : messages.map(m => (
                <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                    ${m.from === 'me'
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-canvas text-foreground rounded-bl-sm'}`}>
                    {m.text}
                    <p className={`text-[10px] mt-1 ${m.from === 'me' ? 'text-white/60' : 'text-muted'}`}>{m.time}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="px-5 py-4 border-t border-black/8 flex items-end gap-3">
              <textarea value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() } }}
                placeholder={`Message ${selected.name}…`}
                rows={1}
                className="flex-1 resize-none px-4 py-2.5 border border-black/15 rounded-2xl text-sm text-foreground placeholder:text-muted outline-none focus:border-primary" />
              <button onClick={sendMsg} disabled={!draft.trim() || sending}
                className="size-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-deep transition-colors disabled:opacity-40 shrink-0">
                <Send size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center text-muted flex-col gap-3">
            <MessageSquare size={40} className="opacity-20" />
            <p className="text-sm">Select a student or parent to start messaging</p>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 h-9 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors"
            >
              <Plus size={13} /> New Message
            </button>
          </div>
        )}
      </div>

      <NewMessageModal
        open={showNew}
        onClose={() => setShowNew(false)}
        loadContacts={() => loadTeacherContacts(profile!.id, profile!.school_id!)}
        onOpened={async convId => {
          const list = await loadContacts()
          const c = (list ?? []).find(x => x.id === convId)
          setActiveConvId(convId)
          if (c) setSelected(c)
        }}
      />
    </DashboardLayout>
  )
}
