import { useState, useEffect, useRef } from 'react'
import { Search, Send, MessageSquare, Plus, ChevronRight } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { adminNav, superAdminNav } from '../components/layout/Sidebar'
import NewMessageModal from '../components/shared/NewMessageModal'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { loadAdminContacts, loadSuperAdminContacts } from '../lib/messaging'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Conv {
  id:       string
  schoolId: string
  name:     string
  role:     string
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

// Messaging for school admins (reach teachers/parents/students + Learnora) and
// super admins (reach every school's admin). Same conversations/messages model
// as the rest of the app; super admin conversations live under the school of
// the admin they're talking to.
export default function StaffMessagesPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const isSuper     = profile?.role === 'super_admin'
  const sidebarUser = profileToSidebarUser(profile)

  const [convs,      setConvs]      = useState<Conv[]>([])
  const [active,     setActive]     = useState<Conv | null>(null)
  const [messages,   setMessages]   = useState<Message[]>([])
  const [loading,    setLoading]    = useState(true)
  const [loadingMsg, setLoadingMsg] = useState(false)
  const [search,     setSearch]     = useState('')
  const [draft,      setDraft]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [showNew,    setShowNew]    = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (profile?.id) loadConvs() }, [profile?.id])
  useEffect(() => { if (active) loadMessages(active.id) }, [active?.id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Realtime for the open conversation
  useEffect(() => {
    if (!active?.id || !profile?.id) return
    const channel = supabase
      .channel(`staff-messages:${active.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages',
          filter: `conversation_id=eq.${active.id}` },
        payload => {
          const m = payload.new as { id: string; body: string | null; sent_at: string; sender_id: string }
          if (m.sender_id === profile.id) return
          setMessages(prev => [...prev, { id: m.id, from: 'them', text: m.body ?? '', time: fmtMsgTime(m.sent_at) }])
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [active?.id, profile?.id])

  async function loadConvs(): Promise<Conv[]> {
    setLoading(true)
    const userId = profile!.id

    // Super admins have no school_id — list purely by membership
    let memberQuery = supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId)
    if (!isSuper) memberQuery = memberQuery.eq('school_id', profile!.school_id!)
    const { data: memberData } = await memberQuery

    const convIds = ((memberData ?? []) as { conversation_id: string }[]).map(m => m.conversation_id)
    if (!convIds.length) { setLoading(false); setConvs([]); return [] }

    const [convRes, partnerRes, lastMsgRes, myMemberRes, unreadRes] = await Promise.all([
      supabase.from('conversations').select('id, school_id').in('id', convIds),
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
        .select('conversation_id, sent_at')
        .in('conversation_id', convIds)
        .neq('sender_id', userId),
    ])

    const schoolMap: Record<string, string> = {}
    for (const c of (convRes.data ?? []) as { id: string; school_id: string }[]) schoolMap[c.id] = c.school_id

    const partnerMap: Record<string, { name: string; role: string }> = {}
    for (const p of (partnerRes.data ?? []) as unknown as { conversation_id: string; profiles: { full_name: string | null; role: string | null } | null }[]) {
      if (!partnerMap[p.conversation_id] && p.profiles?.full_name) {
        partnerMap[p.conversation_id] = { name: p.profiles.full_name, role: p.profiles.role ?? '' }
      }
    }
    const lastMsgMap: Record<string, { body: string; sent_at: string }> = {}
    for (const m of (lastMsgRes.data ?? []) as { conversation_id: string; body: string | null; sent_at: string }[]) {
      if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = { body: m.body ?? '', sent_at: m.sent_at }
    }
    const myLastRead: Record<string, string | null> = {}
    for (const m of (myMemberRes.data ?? []) as { conversation_id: string; last_read_at: string | null }[]) {
      myLastRead[m.conversation_id] = m.last_read_at
    }
    const unreadMap: Record<string, number> = {}
    for (const m of (unreadRes.data ?? []) as { conversation_id: string; sent_at: string }[]) {
      const lr = myLastRead[m.conversation_id]
      if (!lr || m.sent_at > lr) unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] ?? 0) + 1
    }

    const list: Conv[] = convIds.map(id => ({
      id,
      schoolId: schoolMap[id] ?? profile!.school_id ?? '',
      name:     partnerMap[id]?.name ?? 'Unknown',
      role:     partnerMap[id]?.role ?? '',
      lastMsg:  lastMsgMap[id]?.body ?? '',
      lastTime: lastMsgMap[id] ? fmtMsgTime(lastMsgMap[id].sent_at) : '',
      unread:   unreadMap[id] ?? 0,
    }))
    setConvs(list)
    setLoading(false)
    return list
  }

  async function loadMessages(convId: string) {
    setLoadingMsg(true)
    const { data } = await supabase
      .from('messages')
      .select('id, body, sent_at, sender_id')
      .eq('conversation_id', convId)
      .order('sent_at', { ascending: true })
      .limit(100)
    setMessages(((data ?? []) as { id: string; body: string | null; sent_at: string | null; sender_id: string }[]).map(m => ({
      id:   m.id,
      from: m.sender_id === profile!.id ? 'me' : 'them',
      text: m.body ?? '',
      time: fmtMsgTime(m.sent_at ?? new Date().toISOString()),
    })))
    setLoadingMsg(false)
  }

  async function send() {
    const text = draft.trim()
    if (!text || !active || sending) return
    setSending(true)
    const now    = new Date().toISOString()
    const tempId = `t-${Date.now()}`
    setMessages(prev => [...prev, { id: tempId, from: 'me', text, time: fmtMsgTime(now) }])
    setDraft('')
    const { error } = await supabase.from('messages').insert({
      conversation_id: active.id,
      sender_id:       profile!.id,
      school_id:       active.schoolId,   // conversation's school (super admin has none of their own)
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
    setConvs(prev => prev.map(c => c.id === convId ? { ...c, unread: 0 } : c))
  }

  const visible = convs.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <DashboardLayout
      activePage={isSuper ? 'super-messages' : 'admin-messages'}
      onNavigate={onNavigate}
      title="Messages"
      subtitle={isSuper ? 'Message school administrators' : 'Message teachers, parents and Learnora'}
      nav={isSuper ? superAdminNav : adminNav}
      user={sidebarUser}
      mainClassName="flex-1 overflow-hidden flex flex-col"
    >
      <div className="flex flex-1 min-h-0 overflow-hidden rounded-card shadow-sm bg-surface mx-4 md:mx-8 mb-4 md:mb-8 mt-4 md:mt-8">

        {/* Conversation list */}
        <div className={`flex flex-col border-r border-black/8 ${active ? 'hidden md:flex' : 'flex'} w-full md:w-[320px] shrink-0`}>
          <div className="p-4 border-b border-black/8 flex items-center gap-2">
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

          <div className="flex-1 overflow-y-auto divide-y divide-black/4">
            {loading ? (
              <p className="text-center text-sm text-muted py-8">Loading…</p>
            ) : visible.length === 0 ? (
              <div className="py-10 text-center text-muted px-4">
                <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No conversations yet.</p>
                <button
                  onClick={() => setShowNew(true)}
                  className="mt-3 h-9 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors"
                >
                  Start one
                </button>
              </div>
            ) : visible.map(c => (
              <button key={c.id} onClick={() => { setActive(c); markRead(c.id) }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-canvas/50 transition-colors ${active?.id === c.id ? 'bg-primary/5' : ''}`}>
                <div className="size-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    <span className="text-[10px] text-muted shrink-0 ml-2">{c.lastTime}</span>
                  </div>
                  <p className="text-xs text-muted truncate mt-0.5 capitalize">{c.role.replace('_', ' ')}{c.lastMsg ? ` · ${c.lastMsg}` : ''}</p>
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
        {active ? (
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-black/8">
              <button onClick={() => setActive(null)} className="md:hidden text-muted hover:text-foreground">
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <div className="size-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                {active.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{active.name}</p>
                <p className="text-xs text-muted capitalize">{active.role.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {loadingMsg ? (
                <p className="text-center text-sm text-muted">Loading…</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-muted mt-10">No messages yet. Say hello!</p>
              ) : messages.map(m => (
                <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                    ${m.from === 'me' ? 'bg-primary text-white rounded-br-sm' : 'bg-canvas text-foreground rounded-bl-sm'}`}>
                    {m.text}
                    <p className={`text-[10px] mt-1 ${m.from === 'me' ? 'text-white/60' : 'text-muted'}`}>{m.time}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="px-5 py-4 border-t border-black/8 flex items-end gap-3">
              <textarea value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={`Message ${active.name}…`}
                rows={1}
                className="flex-1 resize-none px-4 py-2.5 border border-black/15 rounded-2xl text-sm text-foreground placeholder:text-muted outline-none focus:border-primary" />
              <button onClick={send} disabled={!draft.trim() || sending}
                className="size-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-deep transition-colors disabled:opacity-40 shrink-0">
                <Send size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center text-muted flex-col gap-3">
            <MessageSquare size={40} className="opacity-20" />
            <p className="text-sm">Select a conversation</p>
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
        loadContacts={() => isSuper ? loadSuperAdminContacts() : loadAdminContacts(profile!.school_id!)}
        onOpened={async convId => {
          const list = await loadConvs()
          const c = list.find(x => x.id === convId)
          if (c) { setActive(c); markRead(convId) }
        }}
      />
    </DashboardLayout>
  )
}
