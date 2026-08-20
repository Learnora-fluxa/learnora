import { useState, useEffect } from 'react'
import { ArrowLeft, Paperclip, Calendar, User, AlertCircle } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface AnnouncementData {
  id:         string
  title:      string
  body:       string
  authorName: string
  authorRole: string
  date:       string
  audience:   string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function audienceLabel(roles: string[] | null) {
  if (!roles?.length) return 'All'
  return roles.map(r => r.charAt(0).toUpperCase() + r.slice(1) + 's').join(', ')
}

export default function AnnouncementDetailsPage({ onNavigate }: Props) {
  const { profile }     = useAuth()
  const sidebarUser     = profileToSidebarUser(profile)

  const [ann,     setAnn]     = useState<AnnouncementData | null>(null)
  const [loading, setLoading] = useState(true)

  const isTeacher = profile?.role === 'teacher'
  const backPage  = isTeacher ? 'teacher-announcements' : 'announcements'

  useEffect(() => { if (profile?.id) loadAnnouncement() }, [profile?.id])

  async function loadAnnouncement() {
    setLoading(true)
    let annId = sessionStorage.getItem('learnora_selected_announcement')

    if (!annId && profile?.school_id) {
      const { data: latest } = await supabase
        .from('announcements')
        .select('id')
        .eq('school_id', profile.school_id)
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (latest) annId = (latest as { id: string }).id
    }

    if (!annId) { setLoading(false); return }

    const { data } = await supabase
      .from('announcements')
      .select('id, title, body, published_at, target_roles, profiles!author_id(full_name, role)')
      .eq('id', annId)
      .maybeSingle()

    if (!data) { setLoading(false); return }

    const raw = data as unknown as {
      id: string; title: string; body: string | null
      published_at: string | null; target_roles: string[] | null
      profiles: { full_name: string | null; role: string | null } | null
    }

    setAnn({
      id:         raw.id,
      title:      raw.title,
      body:       raw.body ?? '',
      authorName: raw.profiles?.full_name ?? 'School Admin',
      authorRole: raw.profiles?.role
        ? raw.profiles.role.charAt(0).toUpperCase() + raw.profiles.role.slice(1)
        : 'Admin',
      date:       raw.published_at ? fmtDate(raw.published_at) : '—',
      audience:   audienceLabel(raw.target_roles),
    })
    setLoading(false)
  }

  if (loading) {
    return (
      <DashboardLayout activePage="announcements" onNavigate={onNavigate} title="Announcement"
        nav={isTeacher ? teacherNav : undefined} user={sidebarUser}>
        <p className="text-sm text-muted py-8">Loading…</p>
      </DashboardLayout>
    )
  }

  if (!ann) {
    return (
      <DashboardLayout activePage="announcements" onNavigate={onNavigate} title="Announcement"
        nav={isTeacher ? teacherNav : undefined} user={sidebarUser}>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <AlertCircle size={32} className="text-muted opacity-40" />
          <p className="text-sm text-muted">Announcement not found.</p>
          <button onClick={() => onNavigate(backPage)}
            className="h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill">
            Back to Announcements
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activePage="announcements" onNavigate={onNavigate} title="Announcement"
      nav={isTeacher ? teacherNav : undefined} user={sidebarUser}>
      <div className="max-w-[780px] flex flex-col gap-5">
        <button
          onClick={() => onNavigate(backPage)}
          className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft size={16} /> Back to Announcements
        </button>

        <div className="bg-surface rounded-card shadow-sm p-6">
          <h1 className="text-xl font-bold text-foreground leading-snug mb-4">{ann.title}</h1>

          <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-black/6">
            <div className="flex items-center gap-2 text-sm text-muted">
              <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User size={13} className="text-primary" />
              </div>
              <span className="font-medium text-foreground">{ann.authorName}</span>
              <span>·</span>
              <span>{ann.authorRole}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Calendar size={13} />
              <span>{ann.date}</span>
            </div>
            <div className="text-sm text-muted">
              <span>To: <span className="font-medium text-foreground">{ann.audience}</span></span>
            </div>
          </div>

          <div className="mt-5">
            {ann.body.split('\n\n').map((para, i) => (
              <p key={i} className="text-sm text-foreground leading-relaxed mb-4 last:mb-0 whitespace-pre-line">
                {para}
              </p>
            ))}
          </div>
        </div>

        {/* Attachment placeholder — no storage table yet */}
        <div className="bg-surface rounded-card shadow-sm p-5">
          <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <Paperclip size={14} className="text-muted" /> Attachments
          </p>
          <p className="text-xs text-muted">No attachments for this announcement.</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
