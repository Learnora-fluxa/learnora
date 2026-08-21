import { useState, useEffect } from 'react'
import { ChevronLeft, Bell } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { parentNav } from '../../components/layout/Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Notif {
  id: string
  title: string
  body: string
  type: string
  time: string
  read: boolean
}

const tabs = ['All', 'Academics', 'Attendance', 'Assignments', 'School'] as const
type Tab = typeof tabs[number]

const typeMap: Record<Tab, string[] | null> = {
  All: null,
  Academics: ['grade'],
  Attendance: ['attendance'],
  Assignments: ['assignment'],
  School: ['announcement', 'system', 'general'],
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 60000
  if (diff < 60) return `${Math.round(diff)} mins ago`
  if (diff < 1440) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function ParentNotificationsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) loadNotifs()
  }, [profile?.id])

  async function loadNotifs() {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, type, read, created_at')
      .eq('user_id', profile!.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotifs((data ?? []).map((n: {
      id: string
      title: string
      body: string | null
      type: string | null
      read: boolean | null
      created_at: string | null
    }) => ({
      id: n.id,
      title: n.title,
      body: n.body ?? '',
      type: n.type ?? 'general',
      time: n.created_at ? fmtTime(n.created_at) : '—',
      read: n.read ?? false,
    })))
    setLoading(false)
  }

  async function markRead(id: string) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  const types = typeMap[activeTab]
  const visible = types ? notifs.filter(n => types.includes(n.type)) : notifs
  const userName = profile?.full_name ?? 'Parent User'
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'P'
  const unreadCount = notifs.filter(n => !n.read).length

  function renderTabs() {
    return (
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-9 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors ${
              activeTab === tab ? 'border-primary bg-primary text-white' : 'border-black/12 bg-white text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    )
  }

  function renderList() {
    if (loading) {
      return <div className="py-12 text-center text-sm text-muted">Loading…</div>
    }

    if (visible.length === 0) {
      return (
        <div className="py-12 text-center text-muted">
          <Bell size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No notifications yet.</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-5">
        {visible.map(n => (
          <button
            key={n.id}
            onClick={() => markRead(n.id)}
            className="flex w-full items-start gap-4 text-left"
          >
            <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${n.read ? 'border border-black/8 bg-canvas' : 'bg-primary/10'}`}>
              <Bell size={16} className={n.read ? 'text-muted' : 'text-primary'} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-start justify-between gap-2">
                <p className={`text-sm font-bold leading-snug ${n.read ? 'text-muted' : 'text-foreground'}`}>{n.title}</p>
                <span className="shrink-0 whitespace-nowrap text-[10px] text-muted">{n.time}</span>
              </div>
              <p className="text-xs leading-relaxed text-muted">{n.body}</p>
            </div>
            {!n.read && <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
          </button>
        ))}
      </div>
    )
  }

  function renderContent(showBackButton: boolean) {
    return (
      <div className="px-5 pb-24 pt-5 lg:px-0 lg:pb-0 lg:pt-0">
        {showBackButton && (
          <button onClick={() => onNavigate('parent/home')} className="mb-4">
            <ChevronLeft size={22} />
          </button>
        )}

        <h1 className="mb-1 text-2xl font-bold text-primary">Notifications</h1>
        <p className="mb-5 text-xs text-muted">Stay informed about your child&apos;s learning activities and school updates.</p>

        {renderTabs()}
        {renderList()}
      </div>
    )
  }

  return (
    <>
      <div className="lg:hidden">
        <MobileLayout activePage="parent/home" onNavigate={onNavigate} nav={parentMobileNav}>
          {renderContent(true)}
        </MobileLayout>
      </div>

      <div className="hidden lg:block">
        <DashboardLayout
          activePage="parent/notifications"
          onNavigate={onNavigate}
          title="Notifications"
          subtitle="Stay informed about learning activities and school updates."
          nav={parentNav}
          user={{ name: userName, role: 'Parent', initials: userInitials }}
          mainClassName="flex-1 overflow-y-auto p-6 xl:p-8"
        >
          <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
            <section className="rounded-[30px] bg-white p-8 shadow-sm">
              {renderContent(false)}
            </section>

            <aside className="space-y-5">
              <div className="rounded-[30px] bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/70">Overview</p>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-[22px] bg-canvas px-4 py-4">
                    <p className="text-xs text-muted">Total notifications</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{notifs.length}</p>
                  </div>
                  <div className="rounded-[22px] bg-canvas px-4 py-4">
                    <p className="text-xs text-muted">Unread</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{unreadCount}</p>
                  </div>
                  <div className="rounded-[22px] bg-canvas px-4 py-4">
                    <p className="text-xs text-muted">Current filter</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{activeTab}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] bg-primary p-6 text-white shadow-lg shadow-primary/20">
                <p className="text-sm font-semibold">Keep up with important updates</p>
                <p className="mt-2 text-sm leading-6 text-white/85">
                  Notifications here reflect real school activity, including assignments, attendance, grades, and announcements.
                </p>
              </div>
            </aside>
          </div>
        </DashboardLayout>
      </div>
    </>
  )
}
