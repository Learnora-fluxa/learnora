import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, MessageSquare, Search } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { parentNav } from '../../components/layout/Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

type FilterKey = 'all' | 'class' | 'subject' | 'admin' | 'unread'
type RoleKind = 'class' | 'subject' | 'admin'

interface ConvItem {
  id: string
  name: string
  role: string
  roleKind: RoleKind
  initials: string
  preview: string
  time: string
  color: string
  unreadCount: number
}

const COLORS = [
  'from-lime-400 to-green-500',
  'from-orange-400 to-amber-500',
  'from-sky-400 to-blue-500',
  'from-fuchsia-400 to-purple-500',
  'from-teal-400 to-cyan-500',
]

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All Messages' },
  { key: 'class', label: 'Class Teacher' },
  { key: 'subject', label: 'Subject Teachers' },
  { key: 'admin', label: 'School Admin' },
  { key: 'unread', label: 'Unread' },
]

const FALLBACK_CONVERSATIONS: ConvItem[] = [
  {
    id: 'demo-conv-class',
    name: 'Master Donald Duke',
    role: 'Maths Teacher',
    roleKind: 'class',
    initials: 'DD',
    preview: 'Olive completed the latest maths revision task and is showing stronger confidence this week.',
    time: '10:22',
    color: COLORS[0],
    unreadCount: 1,
  },
  {
    id: 'demo-conv-eng',
    name: 'Master Donald Duke',
    role: 'Eng Tutor',
    roleKind: 'subject',
    initials: 'DD',
    preview: 'I shared a few reading prompts you can review together at home before Friday.',
    time: '10:22',
    color: COLORS[1],
    unreadCount: 1,
  },
  {
    id: 'demo-conv-physics',
    name: 'Master Donald Duke',
    role: 'Physics Teacher',
    roleKind: 'subject',
    initials: 'DD',
    preview: 'Olive asked thoughtful questions in class today and stayed engaged during the practical.',
    time: '10:22',
    color: COLORS[2],
    unreadCount: 1,
  },
]

function fmtTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function deriveRoleMeta(role: string | null | undefined): { role: string; roleKind: RoleKind } {
  const normalized = (role ?? '').toLowerCase()
  if (normalized.includes('admin')) return { role: 'School Admin', roleKind: 'admin' }
  if (normalized.includes('class')) return { role: 'Class Teacher', roleKind: 'class' }
  if (normalized.includes('teacher')) return { role: titleCase(normalized), roleKind: 'subject' }
  if (normalized.includes('tutor')) return { role: titleCase(normalized), roleKind: 'subject' }
  return { role: 'Teacher', roleKind: 'subject' }
}

function ChatListItem({
  item,
  onOpen,
}: {
  item: ConvItem
  onOpen: (conv: ConvItem) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex w-full items-start gap-3 rounded-[20px] px-1 py-2 text-left transition-colors hover:bg-black/[0.03]"
    >
      <div className={`flex size-[60px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${item.color} text-base font-semibold text-white shadow-sm`}>
        {item.initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[16px] font-semibold text-foreground">{item.name}</p>
              <span className="size-[7px] shrink-0 rounded-full bg-black/10" />
              <p className="truncate text-[10px] text-foreground/70">{item.role}</p>
            </div>
            <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-muted">{item.preview}</p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-3 pt-1">
            <span className="text-[12px] text-muted">{item.time}</span>
            {item.unreadCount > 0 && (
              <span className="flex h-[21px] min-w-[21px] items-center justify-center rounded-full bg-primary px-1.5 text-[12px] font-semibold text-white">
                {item.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function ParentChatPage({ onNavigate }: Props) {
  const { profile, loading: authLoading } = useAuth()

  const [conversations, setConversations] = useState<ConvItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [usingFallback, setUsingFallback] = useState(false)

  const userName = profile?.full_name ?? 'Parent User'
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'P'

  useEffect(() => {
    if (authLoading) return
    if (!profile?.id) {
      setLoading(false)
      return
    }
    loadConversations()
  }, [authLoading, profile?.id, profile?.school_id])

  async function loadConversations() {
    setLoading(true)

    if (!profile?.id || !profile.school_id) {
      useFallback()
      return
    }

    const userId = profile.id
    const schoolId = profile.school_id

    const { data: dmData, error: dmError } = await supabase
      .from('conversations')
      .select('id, name, type')
      .eq('school_id', schoolId)
      .eq('type', 'direct')
      .ilike('name', `%${userId}%`)
      .limit(30)

    if (dmError || !dmData?.length) {
      useFallback()
      return
    }

    const directMessages = (dmData ?? []) as { id: string; name: string }[]
    const otherIds = Array.from(
      new Set(
        directMessages
          .map(dm => dm.name.replace('dm:', '').split(':').find(part => part !== userId))
          .filter((value): value is string => Boolean(value)),
      ),
    )

    const [profilesRes, messagesRes] = await Promise.all([
      otherIds.length
        ? supabase.from('profiles').select('id, full_name, role').in('id', otherIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('messages')
        .select('conversation_id, body, sent_at')
        .in('conversation_id', directMessages.map(dm => dm.id))
        .order('sent_at', { ascending: false }),
    ])

    const profileMap = new Map(
      ((profilesRes.data ?? []) as { id: string; full_name: string | null; role: string | null }[]).map(entry => [entry.id, entry]),
    )

    const lastMessageMap = new Map<string, { body: string | null; sent_at: string | null }>()
    for (const message of (messagesRes.data ?? []) as { conversation_id: string; body: string | null; sent_at: string | null }[]) {
      if (!lastMessageMap.has(message.conversation_id)) {
        lastMessageMap.set(message.conversation_id, {
          body: message.body,
          sent_at: message.sent_at,
        })
      }
    }

    const items = directMessages.flatMap((dm, index) => {
      const otherId = dm.name.replace('dm:', '').split(':').find(part => part !== userId)
      if (!otherId) return []

      const otherProfile = profileMap.get(otherId)
      const name = otherProfile?.full_name ?? 'Unknown'
      const roleMeta = deriveRoleMeta(otherProfile?.role)
      const lastMessage = lastMessageMap.get(dm.id)

      return [
        {
          id: dm.id,
          name,
          role: roleMeta.role,
          roleKind: roleMeta.roleKind,
          initials: name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0])
            .join('')
            .toUpperCase() || 'U',
          preview: lastMessage?.body ?? 'No messages yet',
          time: fmtTime(lastMessage?.sent_at ?? null),
          color: COLORS[index % COLORS.length],
          unreadCount: 0,
        } satisfies ConvItem,
      ]
    })

    if (!items.length) {
      useFallback()
      return
    }

    setConversations(items)
    setUsingFallback(false)
    setLoading(false)
  }

  function useFallback() {
    setConversations(FALLBACK_CONVERSATIONS)
    setUsingFallback(true)
    setLoading(false)
  }

  function openConversation(conv: ConvItem) {
    sessionStorage.setItem('learnora_selected_conversation', JSON.stringify({
      id: conv.id,
      name: conv.name,
      role: conv.role,
      initials: conv.initials,
    }))
    onNavigate('parent/chat-room')
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    return conversations.filter(conv => {
      const matchesSearch = !term
        || conv.name.toLowerCase().includes(term)
        || conv.role.toLowerCase().includes(term)
        || conv.preview.toLowerCase().includes(term)

      if (!matchesSearch) return false
      if (filter === 'all') return true
      if (filter === 'unread') return conv.unreadCount > 0
      return conv.roleKind === filter
    })
  }, [conversations, filter, search])

  function renderFilters() {
    return (
      <div className="no-scrollbar -mx-1 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-3 px-1">
          {FILTERS.map(item => {
            const active = filter === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-[6px] border px-4 py-2.5 text-[14px] transition-colors ${
                  active
                    ? 'border-primary bg-primary text-white'
                    : 'border-black/55 bg-white text-foreground hover:bg-canvas'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderSearch() {
    return (
      <div className="flex items-center gap-3 rounded-[14px] border border-black/70 bg-white px-4 py-4">
        <Search size={16} className="shrink-0 text-foreground/70" />
        <input
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search teachers, subjects, or conversations"
          className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted"
        />
      </div>
    )
  }

  function renderEmpty() {
    return (
      <div className="rounded-[28px] border border-dashed border-black/12 bg-white px-6 py-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageSquare size={22} />
        </div>
        <p className="text-lg font-semibold text-foreground">No conversations yet</p>
        <p className="mt-2 text-sm text-muted">
          Start a conversation with a teacher or school administrator when you&apos;re ready.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('parent/message-teacher')}
          className="mt-5 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-deep"
        >
          Message a Teacher
        </button>
      </div>
    )
  }

  function renderConversationSection() {
    if (loading) {
      return <div className="py-14 text-center text-sm text-muted">Loading conversations…</div>
    }

    if (!visible.length) return renderEmpty()

    return (
      <div>
        <h2 className="mb-3 text-[16px] font-semibold text-foreground">Today</h2>
        <div className="space-y-3">
          {visible.map(item => (
            <ChatListItem key={item.id} item={item} onOpen={openConversation} />
          ))}
        </div>
      </div>
    )
  }

  function renderHeader(showBackButton: boolean) {
    return (
      <div>
        {showBackButton && (
          <button type="button" onClick={() => onNavigate('parent/home')} className="mb-6 text-foreground">
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 className="text-[24px] font-semibold text-primary">Messages</h1>
        <p className="mt-1 max-w-[26rem] text-[12px] leading-5 text-foreground">
          Communicate directly with teachers and school administrators.
        </p>
      </div>
    )
  }

  function renderPreviewNotice() {
    if (!usingFallback) return null
    return (
      <div className="rounded-[18px] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary">
        Preview mode: showing fallback conversations because this parent has no live chat history yet.
      </div>
    )
  }

  function renderPageContent(showBackButton: boolean) {
    return (
      <div className="space-y-6">
        {renderHeader(showBackButton)}
        {renderPreviewNotice()}
        {renderSearch()}
        {renderFilters()}
        {renderConversationSection()}
      </div>
    )
  }

  return (
    <>
      <div className="lg:hidden">
        <MobileLayout activePage="parent/chat" onNavigate={onNavigate} nav={parentMobileNav}>
          <div className="px-[18px] pt-14 pb-6">
            {renderPageContent(true)}
          </div>
        </MobileLayout>
      </div>

      <div className="hidden lg:block">
        <DashboardLayout
          activePage="parent/chat"
          onNavigate={onNavigate}
          title="Messages"
          subtitle="Communicate with teachers and school administrators"
          nav={parentNav}
          user={{ name: userName, role: 'Parent', initials: userInitials }}
          mainClassName="flex-1 overflow-y-auto p-6 xl:p-8"
        >
          <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
            <section className="rounded-[30px] bg-white p-6 shadow-sm xl:p-8">
              {renderPageContent(false)}
            </section>

            <aside className="space-y-5">
              <div className="rounded-[30px] bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/70">Chat Overview</p>
                <h2 className="mt-3 text-2xl font-semibold text-foreground">Stay close to your child&apos;s learning journey</h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Use messages to follow up on class performance, ask quick questions, and keep up with school updates.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-[22px] bg-canvas px-4 py-4">
                    <p className="text-xs text-muted">Conversations</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{conversations.length}</p>
                  </div>
                  <div className="rounded-[22px] bg-canvas px-4 py-4">
                    <p className="text-xs text-muted">Unread</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {conversations.reduce((sum, item) => sum + item.unreadCount, 0)}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-canvas px-4 py-4">
                    <p className="text-xs text-muted">Available filters</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{FILTERS.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] bg-primary p-6 text-white shadow-lg shadow-primary/20">
                <p className="text-sm font-semibold">Need to start a new conversation?</p>
                <p className="mt-2 text-sm leading-6 text-white/85">
                  Reach out to a teacher or the school team directly from the parent dashboard.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('parent/message-teacher')}
                  className="mt-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-slate-100"
                >
                  Message a Teacher
                </button>
              </div>
            </aside>
          </div>
        </DashboardLayout>
      </div>
    </>
  )
}
