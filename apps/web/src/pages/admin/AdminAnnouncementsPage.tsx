import { useState, useEffect } from 'react'
import { Megaphone, Plus, Search, ChevronRight, Send, X, CheckCircle2, Users, BookOpen, User } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type Audience = 'school-wide' | 'students' | 'teachers' | 'parents' | 'class'

interface Announcement {
  id: string; title: string; body: string | null
  target_roles: string[] | null; published_at: string | null
}

function audienceToRoles(aud: Audience): string[] {
  switch (aud) {
    case 'school-wide': return ['student', 'teacher', 'parent', 'admin']
    case 'students':    return ['student']
    case 'teachers':    return ['teacher']
    case 'parents':     return ['parent']
    case 'class':       return ['student']
  }
}

function rolesDisplay(roles: string[] | null): string {
  if (!roles?.length) return 'Whole School'
  if (roles.includes('teacher') && roles.includes('parent')) return 'Whole School'
  if (roles.includes('teacher')) return 'Teachers'
  if (roles.includes('parent')) return 'Parents'
  return 'Students'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminAnnouncementsPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [search,        setSearch]        = useState('')
  const [showCompose,   setShowCompose]   = useState(false)
  const [sent,          setSent]          = useState(false)
  const [sending,       setSending]       = useState(false)
  const [loading,       setLoading]       = useState(true)

  const [title,       setTitle]       = useState('')
  const [body,        setBody]        = useState('')
  const [audience,    setAudience]    = useState<Audience>('school-wide')
  const [category,    setCategory]    = useState('General')
  const [pin,         setPin]         = useState(false)

  useEffect(() => { if (profile?.school_id) loadAnnouncements() }, [profile?.school_id])

  async function loadAnnouncements() {
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('id, title, body, target_roles, published_at')
      .eq('school_id', profile!.school_id!)
      .order('published_at', { ascending: false })
      .limit(50)
    setAnnouncements((data ?? []) as Announcement[])
    setLoading(false)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!profile?.school_id) return
    setSending(true)
    const { error } = await supabase
      .from('announcements')
      .insert({
        title,
        body,
        target_roles: audienceToRoles(audience),
        school_id:    profile.school_id!,
        author_id:    profile.id,
      })
    logSupabaseError('AdminAnnouncements.send', error)
    setSending(false)
    if (!error) {
      setSent(true)
      loadAnnouncements()
    }
  }

  function closeCompose() {
    setShowCompose(false)
    setSent(false)
    setTitle('')
    setBody('')
    setAudience('school-wide')
    setCategory('General')
    setPin(false)
  }

  const audienceOptions: { id: Audience; label: string; icon: typeof Users; desc: string }[] = [
    { id: 'school-wide', label: 'Whole School',   icon: Megaphone, desc: 'All students, teachers & parents' },
    { id: 'students',    label: 'Students Only',  icon: BookOpen,  desc: 'All enrolled students'            },
    { id: 'teachers',    label: 'Teachers Only',  icon: User,      desc: 'All teaching staff'               },
    { id: 'parents',     label: 'Parents Only',   icon: Users,     desc: 'All parents on record'            },
    { id: 'class',       label: 'Specific Class', icon: BookOpen,  desc: 'Target one class'                 },
  ]

  const q        = search.toLowerCase()
  const filtered = announcements.filter(a =>
    !q || a.title.toLowerCase().includes(q) || (a.body ?? '').toLowerCase().includes(q)
  )

  function openAnnouncement(id: string) {
    sessionStorage.setItem('learnora_selected_announcement', id)
    onNavigate('announcement-details')
  }

  return (
    <DashboardLayout
      activePage="announcements"
      onNavigate={onNavigate}
      title="Announcements"
      subtitle="Send school-wide notices to students, teachers, and parents"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[900px] flex flex-col gap-6">

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search announcements..."
              className="w-full h-11 pl-9 pr-4 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
          </div>
          <button onClick={() => { setShowCompose(true); setSent(false) }}
            className="flex items-center gap-2 h-11 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary">
            <Plus size={14} /> New Announcement
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Sent',    value: announcements.length },
            { label: 'School-Wide',   value: announcements.filter(a => rolesDisplay(a.target_roles) === 'Whole School').length },
            { label: 'To Parents',    value: announcements.filter(a => rolesDisplay(a.target_roles) === 'Parents').length },
            { label: 'To Teachers',   value: announcements.filter(a => rolesDisplay(a.target_roles) === 'Teachers').length },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-card shadow-sm p-4">
              <p className="text-2xl font-bold text-primary">{loading ? '…' : s.value}</p>
              <p className="text-xs text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted">Loading…</div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(a => {
              const aud = rolesDisplay(a.target_roles)
              return (
                <button key={a.id} onClick={() => openAnnouncement(a.id)}
                  className="bg-surface rounded-card shadow-sm p-6 text-left hover:shadow-md transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-foreground mb-1">{a.title}</h3>
                      <p className="text-sm text-muted line-clamp-2 leading-relaxed">{a.body}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted shrink-0 mt-1" />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1"><Users size={11} /> {aud}</span>
                    <span>·</span>
                    <span>{a.published_at ? fmtDate(a.published_at) : '—'}</span>
                  </div>
                </button>
              )
            })}

            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted">
                <Megaphone size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No announcements found.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeCompose} />
          <div className="relative z-10 bg-white rounded-card shadow-xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/8 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-foreground">{sent ? 'Announcement Sent' : 'New Announcement'}</h2>
              <button onClick={closeCompose} className="text-muted hover:text-foreground"><X size={18} /></button>
            </div>

            {sent ? (
              <div className="p-8 text-center">
                <div className="size-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={28} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Sent Successfully!</h3>
                <p className="text-sm text-muted mb-6">
                  <strong>"{title}"</strong> has been sent to{' '}
                  <strong>{audience.replace('-', ' ')}</strong>.
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => { setSent(false); setTitle(''); setBody('') }}
                    className="h-10 px-5 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors">
                    Write Another
                  </button>
                  <button onClick={closeCompose} className="h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSend} className="p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">Send To <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {audienceOptions.map(opt => {
                      const Icon   = opt.icon
                      const active = audience === opt.id
                      return (
                        <button key={opt.id} type="button" onClick={() => setAudience(opt.id)}
                          className={`flex items-center gap-3 p-3 rounded-card border-2 text-left transition-colors ${active ? 'border-primary bg-primary/5' : 'border-black/10 hover:border-primary/30'}`}>
                          <div className={`size-7 rounded-full flex items-center justify-center shrink-0 ${active ? 'bg-primary text-white' : 'bg-canvas text-muted'}`}><Icon size={13} /></div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground">{opt.label}</p>
                            <p className="text-[10px] text-muted">{opt.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {['General','Academic','Finance','Event'].map(cat => (
                      <button key={cat} type="button" onClick={() => setCategory(cat)}
                        className={`h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${category === cat ? 'border-primary bg-primary/8 text-primary' : 'border-black/15 text-muted hover:border-primary/40'}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Title <span className="text-red-500">*</span></label>
                  <input required value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. End-of-Term Examination Schedule"
                    className="h-11 px-4 border border-black/20 rounded-input text-sm outline-none focus:border-primary" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Message <span className="text-red-500">*</span></label>
                  <textarea required rows={5} value={body} onChange={e => setBody(e.target.value)}
                    placeholder="Write the full announcement content here…"
                    className="px-4 py-3 border border-black/20 rounded-input text-sm outline-none focus:border-primary resize-none leading-relaxed" />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <button type="button" role="switch" aria-checked={pin} onClick={() => setPin(!pin)}
                    className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${pin ? 'bg-primary' : 'bg-black/15'}`}>
                    <span className={`absolute inset-y-[2px] w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${pin ? 'left-[22px]' : 'left-[2px]'}`} />
                  </button>
                  <span className="text-sm text-foreground">Pin this announcement</span>
                </label>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeCompose}
                    className="h-11 px-5 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={sending}
                    className="flex-1 h-11 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary flex items-center justify-center gap-2 disabled:opacity-60">
                    <Send size={14} /> {sending ? 'Sending…' : 'Send Announcement'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
