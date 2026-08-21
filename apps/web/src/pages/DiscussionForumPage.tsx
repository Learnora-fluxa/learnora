import { useState, useEffect } from 'react'
import { MessageSquare, ThumbsUp, ChevronDown, ChevronUp, Plus, Search, Pin, Send } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Reply {
  id:         string
  author:     string
  initials:   string
  body:       string
  created_at: string
}

interface Thread {
  id:           string
  title:        string
  body:         string
  author:       string
  initials:     string
  created_at:   string
  subject_label:string
  like_count:   number
  is_pinned:    boolean
  reply_count:  number
}

const db = supabase as unknown as { from: (t: string) => any }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?'
}

const SUBJECT_COLORS: Record<string, string> = {
  General:     'bg-canvas text-muted',
  Mathematics: 'bg-primary/10 text-primary',
  Physics:     'bg-amber-50 text-amber-700',
  Chemistry:   'bg-green-50 text-green-700',
  Biology:     'bg-teal-50 text-teal-700',
  English:     'bg-purple-50 text-purple-700',
  Economics:   'bg-orange-50 text-orange-600',
}
function subjectColor(s: string) { return SUBJECT_COLORS[s] ?? 'bg-canvas text-muted' }

const SUBJECTS = ['General', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Economics']

export default function DiscussionForumPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [threads,  setThreads]  = useState<Thread[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [replies,  setReplies]  = useState<Record<string, Reply[]>>({})
  const [liked,    setLiked]    = useState<Set<string>>(new Set())
  const [query,    setQuery]    = useState('')
  const [newPost,  setNewPost]  = useState(false)
  const [draft,    setDraft]    = useState({ title: '', body: '', subject: 'General' })
  const [posting,  setPosting]  = useState(false)
  const [loading,  setLoading]  = useState(true)

  const [replyDraft,   setReplyDraft]   = useState<Record<string, string>>({})
  const [replySending, setReplySending] = useState<string | null>(null)

  useEffect(() => { if (profile?.id) loadThreads() }, [profile?.id])

  async function loadThreads() {
    setLoading(true)
    const schoolId = profile!.school_id!

    const { data } = await db.from('forum_threads')
      .select('id, title, body, subject_label, is_pinned, like_count, created_at, author_id, reply_count, profiles!author_id(full_name)')
      .eq('school_id', schoolId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50)

    const rows = (data ?? []) as {
      id:           string
      title:        string
      body:         string
      subject_label:string
      is_pinned:    boolean
      like_count:   number
      reply_count:  number
      created_at:   string
      author_id:    string
      profiles:     { full_name: string | null } | null
    }[]

    setThreads(rows.map(r => ({
      id:           r.id,
      title:        r.title,
      body:         r.body,
      author:       r.profiles?.full_name ?? 'Unknown',
      initials:     initials(r.profiles?.full_name ?? '?'),
      created_at:   r.created_at,
      subject_label:r.subject_label ?? 'General',
      like_count:   r.like_count,
      is_pinned:    r.is_pinned,
      reply_count:  r.reply_count ?? 0,
    })))
    setLoading(false)
  }

  async function loadReplies(threadId: string) {
    if (replies[threadId]) return
    const { data } = await db.from('forum_replies')
      .select('id, body, created_at, author_id, profiles!author_id(full_name)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    const rows = (data ?? []) as {
      id:         string
      body:       string
      created_at: string
      profiles:   { full_name: string | null } | null
    }[]

    setReplies(prev => ({
      ...prev,
      [threadId]: rows.map(r => ({
        id:         r.id,
        author:     r.profiles?.full_name ?? 'Unknown',
        initials:   initials(r.profiles?.full_name ?? '?'),
        body:       r.body,
        created_at: r.created_at,
      }))
    }))
  }

  function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    loadReplies(id)
  }

  function toggleLike(id: string) {
    setLiked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function submitPost() {
    if (!draft.title.trim() || !draft.body.trim()) return
    setPosting(true)
    const schoolId = profile!.school_id!

    const { data } = await db.from('forum_threads').insert({
      school_id:    schoolId,
      author_id:    profile!.id,
      subject_label:draft.subject,
      title:        draft.title.trim(),
      body:         draft.body.trim(),
      reply_count:  0,
    }).select('id').single()

    if (data) {
      setNewPost(false)
      setDraft({ title: '', body: '', subject: 'General' })
      await loadThreads()
    }
    setPosting(false)
  }

  async function sendReply(threadId: string) {
    const text = replyDraft[threadId]?.trim()
    if (!text) return
    setReplySending(threadId)
    const schoolId = profile!.school_id!

    await db.from('forum_replies').insert({
      thread_id: threadId,
      school_id: schoolId,
      author_id: profile!.id,
      body:      text,
    })

    await db.from('forum_threads')
      .update({ reply_count: (threads.find(t => t.id === threadId)?.reply_count ?? 0) + 1 })
      .eq('id', threadId)

    setReplyDraft(prev => ({ ...prev, [threadId]: '' }))
    delete replies[threadId]
    setReplies(prev => { const r = { ...prev }; delete r[threadId]; return r })
    await loadReplies(threadId)
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, reply_count: t.reply_count + 1 } : t))
    setReplySending(null)
  }

  const visible = query
    ? threads.filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || t.subject_label.toLowerCase().includes(query.toLowerCase()))
    : threads

  const pinned = visible.filter(t => t.is_pinned)
  const rest   = visible.filter(t => !t.is_pinned)

  return (
    <DashboardLayout
      activePage="courses"
      onNavigate={onNavigate}
      title="Discussion Forum"
      subtitle="Ask questions and discuss with classmates and teachers"
      user={sidebarUser}
    >
      <div className="flex flex-col gap-5 max-w-[840px]">

        {/* Toolbar */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search discussions…"
              className="w-full h-10 pl-9 pr-4 border border-black/20 rounded-full text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={() => setNewPost(true)}
            className="flex items-center gap-2 h-10 px-4 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors ml-auto"
          >
            <Plus size={14} /> New Post
          </button>
        </div>

        {/* New post form */}
        {newPost && (
          <div className="bg-surface rounded-card shadow-sm p-5 border-2 border-primary/20 flex flex-col gap-3">
            <p className="text-sm font-bold text-foreground">Start a Discussion</p>
            <select
              value={draft.subject}
              onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
              className="w-44 h-9 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
            >
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
            <input
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
              placeholder="Discussion title…"
              className="w-full h-10 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
            />
            <textarea
              value={draft.body}
              onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
              placeholder="Describe your question or topic…"
              rows={3}
              className="w-full resize-none border border-black/20 rounded-card p-3 text-sm outline-none focus:border-primary"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setNewPost(false)} className="h-9 px-4 text-sm text-muted hover:text-foreground">Cancel</button>
              <button
                onClick={submitPost}
                disabled={posting || !draft.title.trim() || !draft.body.trim()}
                className="h-9 px-5 bg-primary text-white text-sm font-bold rounded-pill shadow-primary hover:bg-primary-deep disabled:opacity-40 transition-colors"
              >
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-sm text-muted">Loading discussions…</div>
        ) : (
          <>
            {/* Pinned */}
            {pinned.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5"><Pin size={11} /> Pinned</p>
                {pinned.map(t => (
                  <ThreadCard
                    key={t.id} thread={t} expanded={expanded} replies={replies[t.id] ?? []}
                    liked={liked} toggleLike={toggleLike} toggleExpand={toggleExpand}
                    replyDraft={replyDraft[t.id] ?? ''} setReplyDraft={v => setReplyDraft(p => ({ ...p, [t.id]: v }))}
                    sendReply={() => sendReply(t.id)} sending={replySending === t.id}
                    selfId={profile!.id}
                  />
                ))}
              </div>
            )}

            {/* All threads */}
            <div className="flex flex-col">
              {visible.length === 0 ? (
                <div className="text-center py-12 text-muted bg-surface rounded-card shadow-sm">
                  <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No discussions yet. Start one!</p>
                </div>
              ) : rest.map(t => (
                <ThreadCard
                  key={t.id} thread={t} expanded={expanded} replies={replies[t.id] ?? []}
                  liked={liked} toggleLike={toggleLike} toggleExpand={toggleExpand}
                  replyDraft={replyDraft[t.id] ?? ''} setReplyDraft={v => setReplyDraft(p => ({ ...p, [t.id]: v }))}
                  sendReply={() => sendReply(t.id)} sending={replySending === t.id}
                  selfId={profile!.id}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function ThreadCard({
  thread, expanded, replies, liked, toggleLike, toggleExpand,
  replyDraft, setReplyDraft, sendReply, sending, selfId,
}: {
  thread:       Thread
  expanded:     string | null
  replies:      Reply[]
  liked:        Set<string>
  toggleLike:   (id: string) => void
  toggleExpand: (id: string) => void
  replyDraft:   string
  setReplyDraft:(v: string) => void
  sendReply:    () => void
  sending:      boolean
  selfId:       string
}) {
  const open  = expanded === thread.id
  const color = subjectColor(thread.subject_label)

  return (
    <div className="bg-surface rounded-card shadow-sm overflow-hidden mb-3">
      <button
        onClick={() => toggleExpand(thread.id)}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-canvas/50 transition-colors"
      >
        <div className="size-9 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
          {thread.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>{thread.subject_label}</span>
            <span className="text-[10px] text-muted">{thread.author} · {timeAgo(thread.created_at)}</span>
          </div>
          <p className="text-sm font-bold text-foreground leading-snug">{thread.title}</p>
          {!open && <p className="text-xs text-muted mt-1 line-clamp-1">{thread.body}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1 text-xs text-muted"><MessageSquare size={11} /> {thread.reply_count}</span>
          {open ? <ChevronUp size={15} className="text-muted" /> : <ChevronDown size={15} className="text-muted" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-black/6">
          <p className="text-sm text-foreground leading-relaxed pt-4 mb-4">{thread.body}</p>
          <button
            onClick={() => toggleLike(thread.id)}
            className={`flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold transition-colors mb-5 ${liked.has(thread.id) ? 'bg-primary/10 text-primary' : 'bg-canvas text-muted hover:text-primary'}`}
          >
            <ThumbsUp size={11} /> {thread.like_count + (liked.has(thread.id) ? 1 : 0)} Helpful
          </button>

          {replies.length > 0 && (
            <div className="flex flex-col gap-3 mb-4">
              {replies.map(r => (
                <div key={r.id} className="flex gap-3 ml-4 border-l-2 border-black/8 pl-4">
                  <div className="size-7 rounded-full bg-canvas text-muted text-xs font-bold flex items-center justify-center shrink-0">
                    {r.initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground">{r.author} <span className="font-normal text-muted">· {timeAgo(r.created_at)}</span></p>
                    <p className="text-sm text-foreground mt-1 leading-relaxed">{r.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 ml-4 items-center">
            <div className="size-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
              {selfId.charAt(0).toUpperCase()}
            </div>
            <input
              value={replyDraft}
              onChange={e => setReplyDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
              placeholder="Write a reply…"
              className="flex-1 h-8 px-3 border border-black/20 rounded-full text-sm outline-none focus:border-primary"
            />
            <button
              onClick={sendReply}
              disabled={!replyDraft.trim() || sending}
              className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-deep disabled:opacity-40 transition-colors shrink-0"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
