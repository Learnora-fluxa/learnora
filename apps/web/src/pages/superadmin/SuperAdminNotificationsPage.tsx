import { useState, useEffect } from 'react'
import {
  Bell, AlertCircle, Building2, CreditCard,
  Megaphone, UserPlus, Clock, Check,
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { superAdminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

type NType = 'school' | 'billing' | 'system' | 'announcement' | 'invite' | 'general'

type Notif = {
  id:    string
  type:  NType
  title: string
  body:  string
  time:  string
  read:  boolean
  page?: string
}

const iconMap: Partial<Record<NType, { icon: typeof Bell; bg: string; color: string }>> = {
  school:       { icon: Building2,  bg: 'bg-primary/10', color: 'text-primary'   },
  billing:      { icon: CreditCard, bg: 'bg-amber-50',   color: 'text-amber-600' },
  system:       { icon: AlertCircle,bg: 'bg-canvas',     color: 'text-muted'     },
  announcement: { icon: Megaphone,  bg: 'bg-blue-50',    color: 'text-blue-600'  },
  invite:       { icon: UserPlus,   bg: 'bg-teal-50',    color: 'text-teal-600'  },
}

const defaultIcon = { icon: Bell, bg: 'bg-canvas', color: 'text-muted' }

function fmtTime(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 60000
  if (diff < 60)   return `${Math.round(diff)}m ago`
  if (diff < 1440) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

type Filter = 'All' | 'Unread' | 'Schools' | 'Billing' | 'System'

export default function SuperAdminNotificationsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [filter, setFilter] = useState<Filter>('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile?.id) loadNotifs() }, [profile?.id])

  async function loadNotifs() {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, type, read, created_at')
      .eq('user_id', profile!.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifs((data ?? []).map((n: {
      id: string; title: string; body: string | null; type: string | null; read: boolean | null; created_at: string | null
    }) => ({
      id:    n.id,
      type:  (n.type ?? 'general') as NType,
      title: n.title,
      body:  n.body ?? '',
      time:  fmtTime(n.created_at),
      read:  n.read ?? false,
    })))
    setLoading(false)
  }

  const unreadCount = notifs.filter(n => !n.read).length

  async function markRead(id: string) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  async function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile!.id)
  }

  function handleClick(n: Notif) {
    markRead(n.id)
    if (n.page) onNavigate(n.page)
  }

  const filterTypes: Record<Filter, NType[] | null> = {
    'All':     null,
    'Unread':  null,
    'Schools': ['school', 'invite'],
    'Billing': ['billing'],
    'System':  ['system', 'announcement'],
  }

  const visible = notifs.filter(n => {
    if (filter === 'Unread') return !n.read
    const types = filterTypes[filter]
    return types === null || types.includes(n.type)
  })

  return (
    <DashboardLayout
      activePage="super-notifications"
      onNavigate={onNavigate}
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
      nav={superAdminNav}
      user={sidebarUser}
    >
      <div className="max-w-[720px] flex flex-col gap-4">

        {/* Controls */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 bg-canvas rounded-card p-1 overflow-x-auto">
            {(['All', 'Unread', 'Schools', 'Billing', 'System'] as Filter[]).map(f => (
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

        {/* List */}
        {loading ? (
          <div className="text-center py-10 text-sm text-muted">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center">
            <Bell size={32} className="text-muted mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted">No notifications yet.</p>
          </div>
        ) : (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="divide-y divide-black/4">
              {visible.map(n => {
                const meta = iconMap[n.type] ?? defaultIcon
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
                        <span className="text-[11px] text-muted flex items-center gap-1 whitespace-nowrap shrink-0">
                          <Clock size={10} /> {n.time}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">{n.body}</p>
                      {n.page && <p className="text-xs text-primary font-semibold mt-1.5">Tap to view →</p>}
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
