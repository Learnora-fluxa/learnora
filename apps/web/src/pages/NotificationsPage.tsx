import { useState, useEffect } from 'react'
import {
  Bell, CheckCircle2, AlertCircle, BookOpen, DollarSign,
  Video, Megaphone, UserPlus, Clock, Check,
} from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav, adminNav, studentNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }
type NType = 'fee' | 'assignment' | 'grade' | 'announcement' | 'live' | 'system' | 'invite' | 'general'
type Filter = 'All' | 'Unread' | 'Fee' | 'Assignments' | 'Grades' | 'Announcements'

interface Notif {
  id:    string
  type:  NType
  title: string
  body:  string
  time:  string
  read:  boolean
  link?: string | null
}

const iconMap: Record<NType, { icon: typeof Bell; bg: string; color: string }> = {
  fee:          { icon: DollarSign,   bg: 'bg-amber-50',   color: 'text-amber-600' },
  assignment:   { icon: BookOpen,     bg: 'bg-blue-50',    color: 'text-blue-600'  },
  grade:        { icon: CheckCircle2, bg: 'bg-green-50',   color: 'text-green-600' },
  announcement: { icon: Megaphone,    bg: 'bg-primary/10', color: 'text-primary'   },
  live:         { icon: Video,        bg: 'bg-red-50',     color: 'text-red-500'   },
  system:       { icon: AlertCircle,  bg: 'bg-canvas',     color: 'text-muted'     },
  general:      { icon: Bell,         bg: 'bg-canvas',     color: 'text-muted'     },
  invite:       { icon: UserPlus,     bg: 'bg-teal-50',    color: 'text-teal-600'  },
}

const filterTypes: Record<Filter, NType[] | null> = {
  'All':           null,
  'Unread':        null,
  'Fee':           ['fee'],
  'Assignments':   ['assignment'],
  'Grades':        ['grade'],
  'Announcements': ['announcement', 'live'],
}

function fmtNotifTime(iso: string) {
  const d   = new Date(iso)
  const now = new Date()
  const diffMs   = now.getTime() - d.getTime()
  const diffHrs  = diffMs / (1000 * 60 * 60)
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffHrs  <  1) return 'Just now'
  if (diffHrs  < 24) return `${Math.floor(diffHrs)} hr ago`
  if (diffDays <  2) return 'Yesterday'
  if (diffDays <  7) return `${Math.floor(diffDays)} days ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function NotificationsPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [notifs,   setNotifs]   = useState<Notif[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<Filter>('All')

  const nav = profile?.role === 'teacher'  ? teacherNav
            : profile?.role === 'admin'    ? adminNav
            : studentNav

  useEffect(() => { if (profile?.id) loadNotifs() }, [profile?.id])

  async function loadNotifs() {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, type, read, link, created_at')
      .eq('user_id', profile!.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotifs((data ?? []).map((n: {
      id: string; title: string; body: string | null; type: string | null
      read: boolean | null; link: string | null; created_at: string | null
    }) => ({
      id:    n.id,
      type:  (n.type as NType) ?? 'general',
      title: n.title,
      body:  n.body ?? '',
      time:  fmtNotifTime(n.created_at ?? new Date().toISOString()),
      read:  n.read ?? false,
      link:  n.link,
    })))
    setLoading(false)
  }

  async function markRead(id: string) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  async function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile!.id)
      .eq('read', false)
  }

  function handleClick(n: Notif) {
    if (!n.read) markRead(n.id)
    if (n.link) onNavigate(n.link)
  }

  const unreadCount = notifs.filter(n => !n.read).length

  const visible = notifs.filter(n => {
    if (filter === 'Unread') return !n.read
    const types = filterTypes[filter]
    return types === null || types.includes(n.type)
  })

  return (
    <DashboardLayout
      activePage="notifications"
      onNavigate={onNavigate}
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
      nav={nav}
      user={sidebarUser}
    >
      <div className="max-w-[720px] flex flex-col gap-4">

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 bg-canvas rounded-card p-1 overflow-x-auto">
            {(['All', 'Unread', 'Fee', 'Assignments', 'Grades', 'Announcements'] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 h-8 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${filter === f ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}>
                {f}
                {f === 'Unread' && unreadCount > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline shrink-0">
              <Check size={12} /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center">
            <p className="text-sm text-muted">Loading…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center">
            <Bell size={32} className="text-muted mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted">No notifications here.</p>
          </div>
        ) : (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="divide-y divide-black/4">
              {visible.map(n => {
                const meta = iconMap[n.type] ?? iconMap.general
                const Icon = meta.icon
                return (
                  <div key={n.id} onClick={() => handleClick(n)}
                    className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors ${n.read ? 'hover:bg-canvas/40' : 'bg-primary/3 hover:bg-primary/5'}`}>
                    <div className={`size-10 rounded-full ${meta.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon size={16} className={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${n.read ? 'font-medium text-foreground' : 'font-bold text-foreground'}`}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-muted flex items-center gap-1 whitespace-nowrap">
                            <Clock size={10} /> {n.time}
                          </span>
                          {!n.read && <span className="size-2 rounded-full bg-primary shrink-0" />}
                        </div>
                      </div>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">{n.body}</p>
                      {n.link && <p className="text-xs text-primary font-semibold mt-1.5">Tap to view →</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
