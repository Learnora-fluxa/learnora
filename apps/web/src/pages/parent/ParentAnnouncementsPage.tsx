import { useState, useEffect } from 'react'
import { Bell, Search, ChevronRight } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Announcement {
  id:           string
  title:        string
  body:         string | null
  published_at: string | null
  target_roles: string[] | null
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function roleLabel(roles: string[] | null) {
  if (!roles || roles.length === 0) return 'All'
  return roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')
}

const roleBadge: Record<string, string> = {
  parent:  'bg-primary/10 text-primary',
  student: 'bg-green-50 text-green-700',
  teacher: 'bg-amber-50 text-amber-700',
  admin:   'bg-purple-50 text-purple-700',
}

export default function ParentAnnouncementsPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading,       setLoading]       = useState(true)
  const [query,         setQuery]         = useState('')
  const [selected,      setSelected]      = useState<Announcement | null>(null)
  const [read,          setRead]          = useState<Set<string>>(new Set())

  useEffect(() => { if (profile?.school_id) loadAnnouncements() }, [profile?.school_id])

  async function loadAnnouncements() {
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('id, title, body, published_at, target_roles')
      .eq('school_id', profile!.school_id!)
      .order('published_at', { ascending: false })

    const rows = (data ?? []) as Announcement[]
    const visible = rows.filter(a =>
      !a.target_roles || a.target_roles.length === 0 || a.target_roles.includes('parent')
    )
    setAnnouncements(visible)
    setLoading(false)
  }

  function open(a: Announcement) {
    setSelected(a)
    setRead(prev => new Set([...prev, a.id]))
  }

  const filtered = query
    ? announcements.filter(a => a.title.toLowerCase().includes(query.toLowerCase()))
    : announcements

  const unreadCount = announcements.filter(a => !read.has(a.id)).length

  if (selected) {
    return (
      <MobileLayout activePage="parent/announcements" onNavigate={onNavigate} nav={parentMobileNav}>
        <div className="px-4 pt-5 pb-24">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-primary font-semibold mb-5">
            ← Back
          </button>
          <div className="flex items-center gap-2 mb-2">
            {selected.target_roles && selected.target_roles.length > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${roleBadge[selected.target_roles[0]] ?? 'bg-canvas text-muted'}`}>
                {roleLabel(selected.target_roles)}
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-foreground mb-1 leading-snug">{selected.title}</h2>
          <p className="text-xs text-muted mb-5">{fmtDate(selected.published_at)}</p>
          <p className="text-sm text-foreground leading-relaxed">{selected.body ?? 'No details available.'}</p>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout activePage="parent/announcements" onNavigate={onNavigate} nav={parentMobileNav}>
      <div className="px-4 pt-5 pb-24">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-foreground">Announcements</h1>
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center relative">
            <Bell size={15} className="text-primary" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-2.5 bg-red-500 rounded-full border-2 border-surface" />
            )}
          </div>
        </div>
        <p className="text-sm text-muted mb-4">School announcements for parents</p>

        <div className="relative mb-5">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search announcements..."
            className="w-full h-10 pl-9 pr-4 bg-surface border border-black/15 rounded-full text-sm outline-none focus:border-primary"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <Bell size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{query ? 'No announcements match your search.' : 'No announcements yet.'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(a => {
              const isRead    = read.has(a.id)
              const badgeCls  = a.target_roles?.[0] ? (roleBadge[a.target_roles[0]] ?? 'bg-canvas text-muted') : 'bg-canvas text-muted'
              return (
                <button key={a.id} onClick={() => open(a)} className="w-full bg-surface rounded-card shadow-sm p-4 text-left flex items-start gap-3">
                  <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${badgeCls}`}>
                    <Bell size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold leading-snug ${isRead ? 'text-muted' : 'text-foreground'}`}>
                        {a.title}
                      </p>
                      {!isRead && <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                    {a.body && (
                      <p className="text-xs text-muted mt-0.5 truncate">{a.body}</p>
                    )}
                    <p className="text-[10px] text-muted mt-1.5">{fmtDate(a.published_at)}</p>
                  </div>
                  <ChevronRight size={14} className="text-muted shrink-0 mt-0.5" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
