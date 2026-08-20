import { useState, useEffect } from 'react'
import { ChevronLeft, Search, MessageSquare } from 'lucide-react'
import MobileLayout, { studentMobileNav } from '../../components/layout/MobileLayout'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface ConvItem {
  id:       string
  name:     string
  role:     string
  initials: string
  preview:  string
  time:     string
  unread:   boolean
  color:    string
  type:     string
}

const COLORS = ['bg-green-500','bg-orange-500','bg-blue-500','bg-purple-500','bg-teal-500']

function fmtTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}


export default function MobileStudentMessagesPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [conversations, setConversations] = useState<ConvItem[]>([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')

  useEffect(() => { if (profile?.id) loadConversations() }, [profile?.id])

  async function loadConversations() {
    setLoading(true)
    const userId   = profile!.id
    const schoolId = profile!.school_id!

    const { data: ceData } = await supabase
      .from('class_enrollments')
      .select('class_id, classes(id, name)')
      .eq('student_id', userId)
      .limit(1)
      .maybeSingle()
    const ce = ceData as unknown as { class_id: string; classes: { id: string; name: string } | null } | null

    const queries: any[] = []

    if (ce?.class_id) {
      queries.push(
        supabase.from('conversations')
          .select('id, name, type')
          .eq('class_id', ce.class_id)
          .eq('type', 'group')
          .eq('school_id', schoolId)
          .maybeSingle()
      )
    }

    queries.push(
      supabase.from('conversations')
        .select('id, name, type')
        .eq('school_id', schoolId)
        .eq('type', 'direct')
        .ilike('name', `%${userId}%`)
        .limit(20)
    )

    const results = await Promise.all(queries)
    const items: ConvItem[] = []

    if (ce?.class_id && results[0]?.data) {
      const g = results[0].data as { id: string; name: string; type: string }
      const lastMsg = await getLastMessage(g.id)
      items.push({
        id:       g.id,
        name:     (ce.classes?.name ?? 'Class') + ' Group',
        role:     'Group Chat',
        initials: 'G',
        preview:  lastMsg.body ?? 'No messages yet',
        time:     fmtTime(lastMsg.time),
        unread:   false,
        color:    'bg-primary',
        type:     'group',
      })
    }

    const dmData = results[ce?.class_id ? 1 : 0]?.data ?? []
    const dms    = Array.isArray(dmData) ? dmData : [dmData]

    for (const [i, dm] of (dms as { id: string; name: string }[]).entries()) {
      const otherUuid = dm.name.replace('dm:', '').split(':').find((p: string) => p !== userId)
      if (!otherUuid) continue
      const { data: profData } = await supabase.from('profiles').select('full_name, role').eq('id', otherUuid).maybeSingle()
      const prof = profData as { full_name: string | null; role: string | null } | null
      const name = prof?.full_name ?? 'Unknown'
      const lastMsg = await getLastMessage(dm.id)
      items.push({
        id:       dm.id,
        name,
        role:     prof?.role ?? 'Teacher',
        initials: name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase(),
        preview:  lastMsg.body ?? 'No messages yet',
        time:     fmtTime(lastMsg.time),
        unread:   false,
        color:    COLORS[i % COLORS.length],
        type:     'direct',
      })
    }

    setConversations(items)
    setLoading(false)
  }

  async function getLastMessage(convId: string): Promise<{ body: string | null; time: string | null }> {
    const { data } = await supabase
      .from('messages')
      .select('body, sent_at')
      .eq('conversation_id', convId)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const m = data as { body: string | null; sent_at: string | null } | null
    return { body: m?.body ?? null, time: m?.sent_at ?? null }
  }

  function openConversation(conv: ConvItem) {
    sessionStorage.setItem('learnora_selected_conversation', JSON.stringify({
      id:       conv.id,
      name:     conv.name,
      role:     conv.role,
      initials: conv.initials,
    }))
    onNavigate('m/chat-room')
  }

  const visible = search
    ? conversations.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : conversations

  return (
    <MobileLayout activePage="m/messages" onNavigate={onNavigate} nav={studentMobileNav}>
      <div className="px-5 pt-6 pb-4">
        <button onClick={() => onNavigate('m/home')} className="mb-4 text-foreground">
          <ChevronLeft size={22} />
        </button>

        <h1 className="text-2xl font-bold text-primary mb-1">Messages</h1>
        <p className="text-xs text-muted mb-5">Communicate directly with teachers and administrators.</p>

        <div className="flex items-center gap-2 h-11 px-4 bg-canvas border border-black/8 rounded-full mb-5">
          <Search size={14} className="text-muted shrink-0" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search teachers, subjects, or conversations"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/70 outline-none"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-muted">Loading conversations…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted">
            <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
            <p>No conversations yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {visible.map((c) => (
              <button key={c.id} onClick={() => openConversation(c)} className="flex items-start gap-3 text-left">
                <div className={`size-12 rounded-full ${c.color} flex items-center justify-center shrink-0 text-sm font-bold text-white`}>
                  {c.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-foreground">{c.name}</span>
                    <span className="text-[10px] text-muted bg-canvas px-2 py-0.5 rounded-full shrink-0 capitalize">{c.role}</span>
                  </div>
                  <p className="text-xs text-muted leading-snug line-clamp-2">{c.preview}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[10px] text-muted">{c.time}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
