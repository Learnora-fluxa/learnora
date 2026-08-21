import { useState, useEffect } from 'react'
import { Megaphone, Search, ChevronRight } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Announcement {
  id:        string
  title:     string
  body:      string
  authorName:string
  authorRole:string
  date:      string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AnnouncementsFeedPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')

  const isTeacher = profile?.role === 'teacher'

  useEffect(() => { if (profile?.school_id) loadAnnouncements() }, [profile?.school_id])

  async function loadAnnouncements() {
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('id, title, body, published_at, target_roles, profiles!author_id(full_name, role)')
      .eq('school_id', profile!.school_id!)
      .order('published_at', { ascending: false })
      .limit(50)

    const raw = (data ?? []) as unknown as {
      id: string; title: string; body: string | null
      published_at: string | null; target_roles: string[] | null
      profiles: { full_name: string | null; role: string | null } | null
    }[]

    const userRole = profile!.role
    const filtered = raw.filter(a =>
      !a.target_roles?.length || a.target_roles.includes(userRole)
    )

    setAnnouncements(filtered.map(a => ({
      id:         a.id,
      title:      a.title,
      body:       a.body ?? '',
      authorName: a.profiles?.full_name ?? 'School Admin',
      authorRole: a.profiles?.role
        ? a.profiles.role.charAt(0).toUpperCase() + a.profiles.role.slice(1)
        : 'Admin',
      date:       a.published_at ? fmtDate(a.published_at) : '—',
    })))
    setLoading(false)
  }

  function goToDetails(id: string) {
    sessionStorage.setItem('learnora_selected_announcement', id)
    onNavigate('announcement-details')
  }

  const visible = announcements.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.body.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout
      activePage="announcements"
      onNavigate={onNavigate}
      title="Announcements"
      subtitle="School-wide announcements and notices"
      nav={isTeacher ? teacherNav : undefined}
      user={sidebarUser}
    >
      <div className="max-w-[860px] flex flex-col gap-6">

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search announcements..."
              className="w-full h-11 pl-9 pr-4 border border-black/15 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted">
            <p className="text-sm">Loading…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {visible.map(a => (
              <button
                key={a.id}
                onClick={() => goToDetails(a.id)}
                className="bg-surface rounded-card shadow-sm p-6 text-left hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-foreground mb-1">{a.title}</h3>
                    <p className="text-sm text-muted line-clamp-2 leading-relaxed">{a.body}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted shrink-0 mt-1" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                    {a.authorName.charAt(0)}
                  </div>
                  <span>{a.authorName} · {a.authorRole}</span>
                  <span>·</span>
                  <span>{a.date}</span>
                </div>
              </button>
            ))}

            {visible.length === 0 && (
              <div className="text-center py-16 text-muted">
                <Megaphone size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">{search ? 'No announcements match your search.' : 'No announcements yet.'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
