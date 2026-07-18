import { useState, useEffect, useRef } from 'react'
import { Search, Send, Paperclip, MoreVertical, ArrowLeft, MessageSquare, Loader2, BellOff, FolderOpen, Plus } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import NewMessageModal from '../components/shared/NewMessageModal'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { loadStudentContacts } from '../lib/messaging'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Conversation {
  id:       string
  name:     string
  role:     string
  lastMsg:  string
  lastTime: string
  unread:   number
}

interface Message {
  id:             string
  from:           'me' | 'them'
  text:           string
  time:           string
  attachmentUrl?: string
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('')
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

export default function MessagesPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId,      setActiveId]      = useState<string | null>(null)
  const [messages,      setMessages]      = useState<Message[]>([])
  const [loadingConvs,  setLoadingConvs]  = useState(true)
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const [tab,           setTab]           = useState<'all' | 'unread'>('all')
  const [input,         setInput]         = useState('')
  const [mobileView,    setMobileView]    = useState<'list' | 'chat'>('list')
  const [sending,       setSending]       = useState(false)
  const [uploading,     setUploading]     = useState(false)
  const [showMenu,      setShowMenu]      = useState(false)
  const [showNew,       setShowNew]       = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)
  const menuRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => { if (profile?.id) loadConversations() }, [profile?.id])
  useEffect(() => { if (activeId) loadMessages(activeId) }, [activeId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Realtime: subscribe to new messages in the active conversation
  useEffect(() => {
    if (!activeId || !profile?.id) return
    const channel = supabase
      .channel(`messages:${activeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages',
          filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          const m = payload.new as { id: string; body: string | null; sent_at: string; sender_id: string; attachment_url: string | null }
          if (m.sender_id === profile.id) return
          setMessages(prev => [...prev, {
            id: m.id, from: 'them', text: m.body ?? '',
            time: fmtMsgTime(m.sent_at), attachmentUrl: m.attachment_url ?? undefined,
          }])
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeId, profile?.id])

  async function loadConversations() {
    setLoadingConvs(true)
    const userId = profile!.id

    const { data: memberData } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId)
      .eq('school_id', profile!.school_id!)

    const convIds = (memberData ?? []).map((m: { conversation_id: string }) => m.conversation_id)
    if (!convIds.length) { setLoadingConvs(false); return }

    const [convRes, partnerRes, lastMsgRes, myMemberRes, unreadMsgRes] = await Promise.all([
      supabase.from('conversations').select('id, name, type').in('id', convIds),
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

    const convData = (convRes.data ?? []) as { id: string; name: string | null; type: string }[]
    const partners = (partnerRes.data ?? []) as unknown as {
      conversation_id: string; user_id: string
      profiles: { full_name: string | null; role: string | null } | null
    }[]
    const lastMsgs = (lastMsgRes.data ?? []) as { conversation_id: string; body: string | null; sent_at: string }[]

    const partnerMap: Record<string, { full_name: string; role: string }> = {}
    for (const p of partners) {
      if (!partnerMap[p.conversation_id] && p.profiles?.full_name) {
        partnerMap[p.conversation_id] = {
          full_name: p.profiles.full_name,
          role:      p.profiles.role ?? '',
        }
      }
    }
    const lastMsgMap: Record<string, { body: string; sent_at: string }> = {}
    for (const msg of lastMsgs) {
      if (!lastMsgMap[msg.conversation_id]) {
        lastMsgMap[msg.conversation_id] = { body: msg.body ?? '', sent_at: msg.sent_at }
      }
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

    const convList: Conversation[] = convData.map(c => ({
      id:       c.id,
      name:     c.name ?? partnerMap[c.id]?.full_name ?? 'Unknown',
      role:     partnerMap[c.id]?.role ?? '',
      lastMsg:  lastMsgMap[c.id]?.body ?? '',
      lastTime: lastMsgMap[c.id] ? fmtMsgTime(lastMsgMap[c.id].sent_at) : '',
      unread:   unreadMap[c.id] ?? 0,
    }))

    setConversations(convList)
    if (convList.length > 0 && !activeId) setActiveId(convList[0].id)
    setLoadingConvs(false)
  }

  async function loadMessages(convId: string) {
    setLoadingMsgs(true)
    const { data } = await supabase
      .from('messages')
      .select('id, body, sent_at, sender_id, attachment_url')
      .eq('conversation_id', convId)
      .order('sent_at', { ascending: true })
      .limit(100)

    const userId = profile!.id
    setMessages((data ?? []).map((m: { id: string; body: string | null; sent_at: string | null; sender_id: string; attachment_url: string | null }) => ({
      id:            m.id,
      from:          m.sender_id === userId ? 'me' : 'them',
      text:          m.body ?? '',
      time:          fmtMsgTime(m.sent_at ?? new Date().toISOString()),
      attachmentUrl: m.attachment_url ?? undefined,
    })))
    setLoadingMsgs(false)
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || !activeId || sending) return
    setSending(true)
    const now    = new Date().toISOString()
    const tempId = `t-${Date.now()}`
    const tempMsg: Message = { id: tempId, from: 'me', text, time: fmtMsgTime(now) }
    setMessages(prev => [...prev, tempMsg])
    setInput('')
    const { error } = await supabase.from('messages').insert({
      conversation_id: activeId,
      sender_id:       profile!.id,
      school_id:       profile!.school_id!,
      body:            text,
      sent_at:         now,
    })
    if (error) setMessages(prev => prev.filter(m => m.id !== tempId))
    setSending(false)
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeId) return
    e.target.value = ''
    setUploading(true)
    const ext  = file.name.split('.').pop() ?? 'bin'
    const path = `${profile!.school_id}/${activeId}/${Date.now()}.${ext}`
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('message-attachments')
      .upload(path, file, { upsert: false })
    if (uploadErr || !uploadData) { setUploading(false); return }
    const { data: urlData } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(uploadData.path)
    const attachmentUrl = urlData.publicUrl
    const now    = new Date().toISOString()
    const tempId = `t-${Date.now()}`
    setMessages(prev => [...prev, { id: tempId, from: 'me', text: '', time: fmtMsgTime(now), attachmentUrl }])
    const { error } = await supabase.from('messages').insert({
      conversation_id: activeId,
      sender_id:       profile!.id,
      school_id:       profile!.school_id!,
      body:            null,
      attachment_url:  attachmentUrl,
      sent_at:         now,
    })
    if (error) setMessages(prev => prev.filter(m => m.id !== tempId))
    setUploading(false)
  }

  async function markUnread() {
    if (!activeId) return
    await supabase
      .from('conversation_members')
      .update({ last_read_at: null })
      .eq('conversation_id', activeId)
      .eq('user_id', profile!.id)
    setConversations(prev => prev.map(c => c.id === activeId ? { ...c, unread: 1 } : c))
    setShowMenu(false)
  }

  async function markRead(convId: string) {
    await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .eq('user_id', profile!.id)
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread: 0 } : c))
  }

  function openChat(id: string) {
    setActiveId(id)
    setMobileView('chat')
    markRead(id)
  }

  const visibleConvs = conversations.filter(c => tab === 'all' || c.unread > 0)
  const active       = conversations.find(c => c.id === activeId)

  return (
    <DashboardLayout
      activePage="messages"
      onNavigate={onNavigate}
      title="Messages"
      user={sidebarUser}
      mainClassName="flex-1 flex overflow-hidden"
    >
      {/* Left: chat list */}
      <div className={`w-full md:w-[320px] lg:w-[360px] shrink-0 bg-surface border-r border-black/6 flex flex-col overflow-hidden
        ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 md:p-5 border-b border-black/6 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">Messages</h2>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 h-8 px-3 bg-primary text-white text-xs font-semibold rounded-pill hover:bg-primary-deep transition-colors"
            >
              <Plus size={12} /> New
            </button>
          </div>
          <div className="flex items-center gap-2.5 h-10 px-4 bg-canvas border border-black/8 rounded-input">
            <Search size={15} className="text-muted shrink-0" />
            <input type="search" placeholder="Search chats..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none" />
          </div>
          <div className="flex gap-1 mt-3">
            {(['all', 'unread'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 h-9 text-sm font-semibold rounded-md capitalize transition-colors
                  ${tab === t ? 'bg-primary text-white' : 'text-muted hover:bg-canvas'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <p className="text-center text-sm text-muted py-8">Loading…</p>
          ) : visibleConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted">
              <MessageSquare size={28} className="opacity-30 mb-2" />
              <p className="text-sm">No conversations yet.</p>
            </div>
          ) : visibleConvs.map(chat => (
            <button key={chat.id} onClick={() => openChat(chat.id)}
              className={`w-full flex items-start gap-3 px-4 md:px-5 py-4 border-b border-black/4 last:border-0 text-left transition-colors
                ${activeId === chat.id ? 'bg-primary/6' : 'hover:bg-canvas/60'}`}>
              <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials(chat.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-semibold text-foreground truncate">{chat.name}</p>
                  <span className="text-xs text-muted shrink-0 ml-2">{chat.lastTime}</span>
                </div>
                <p className="text-xs text-muted truncate">{chat.lastMsg}</p>
              </div>
              {chat.unread > 0 && (
                <span className="size-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {chat.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right: active chat */}
      <div className={`flex-1 flex flex-col overflow-hidden bg-canvas
        ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {active ? (
          <>
            <div className="flex items-center gap-3 px-4 md:px-6 py-4 bg-surface border-b border-black/6 shrink-0">
              <button onClick={() => setMobileView('list')}
                className="md:hidden p-1 -ml-1 text-muted hover:text-foreground">
                <ArrowLeft size={18} />
              </button>
              <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials(active.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{active.name}</p>
                <p className="text-xs text-muted capitalize">{active.role}</p>
              </div>
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMenu(v => !v)}
                  className="p-2 text-muted hover:text-foreground rounded-md hover:bg-canvas transition-colors">
                  <MoreVertical size={18} />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-card shadow-lg border border-black/8 py-1 z-20">
                    <button onClick={markUnread}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-foreground hover:bg-canvas transition-colors">
                      <BellOff size={14} className="text-muted" /> Mark as unread
                    </button>
                    <button onClick={() => { onNavigate('shared-files'); setShowMenu(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-foreground hover:bg-canvas transition-colors">
                      <FolderOpen size={14} className="text-muted" /> Shared files
                    </button>
                    <button onClick={() => { setMobileView('list'); setShowMenu(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-foreground hover:bg-canvas transition-colors md:hidden">
                      <ArrowLeft size={14} className="text-muted" /> Close chat
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 flex flex-col gap-3 md:gap-4">
              {loadingMsgs ? (
                <p className="text-center text-sm text-muted">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-muted mt-10">No messages yet. Say hello!</p>
              ) : messages.map(msg => (
                <div key={msg.id} className={`flex flex-col gap-1 max-w-[80%] md:max-w-[65%]
                  ${msg.from === 'me' ? 'self-end items-end' : 'self-start items-start'}`}>
                  <div className={`px-4 py-2.5 md:py-3 text-sm leading-relaxed
                    ${msg.from === 'me'
                      ? 'bg-primary text-white rounded-card rounded-br-xs'
                      : 'bg-surface text-foreground rounded-card rounded-bl-xs shadow-sm'}`}>
                    {msg.text && <p>{msg.text}</p>}
                    {msg.attachmentUrl && (
                      /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachmentUrl)
                        ? <img src={msg.attachmentUrl} alt="attachment" className="max-w-[240px] rounded-lg mt-1" />
                        : <a href={msg.attachmentUrl} target="_blank" rel="noreferrer"
                            className="underline text-xs">View attachment</a>
                    )}
                  </div>
                  <span className="text-xs text-muted">{msg.time}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="px-4 md:px-6 py-3 md:py-4 bg-surface border-t border-black/6 shrink-0">
              <input ref={fileRef} type="file" accept="image/*,application/pdf,.doc,.docx"
                className="hidden" onChange={handleFileSelect} />
              <div className="flex items-center gap-3 h-11 md:h-12 px-4 bg-canvas border border-black/8 rounded-pill">
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  title="Attach file or photo"
                  className="p-1 text-muted hover:text-foreground shrink-0 disabled:opacity-40">
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
                </button>
                <input type="text" value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage() }}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none min-w-0"
                />
                <button onClick={sendMessage} disabled={!input.trim() || sending}
                  className="size-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-deep disabled:opacity-40 transition-colors shrink-0">
                  <Send size={13} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted flex-col gap-3">
            <MessageSquare size={40} className="opacity-20" />
            <p className="text-sm">Select a conversation</p>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 h-9 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors"
            >
              <Plus size={13} /> Start a conversation
            </button>
          </div>
        )}
      </div>

      <NewMessageModal
        open={showNew}
        onClose={() => setShowNew(false)}
        loadContacts={() => loadStudentContacts(profile!.id, profile!.school_id!)}
        onOpened={async convId => {
          await loadConversations()
          setActiveId(convId)
          setMobileView('chat')
        }}
      />
    </DashboardLayout>
  )
}
