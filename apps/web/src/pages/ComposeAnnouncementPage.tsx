import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronDown, Users, Globe, Send } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

const ROLE_MAP: Record<string, string[]> = {
  all:      ['student', 'teacher', 'parent'],
  students: ['student'],
  parents:  ['parent'],
  class:    ['student'],
}

const audiences = [
  { id: 'all',      label: 'All Students & Parents', icon: Globe,  sub: 'Everyone in the school' },
  { id: 'students', label: 'Students Only',           icon: Users,  sub: 'All enrolled students'  },
  { id: 'parents',  label: 'Parents Only',            icon: Users,  sub: 'All registered parents' },
  { id: 'class',    label: 'Specific Class',          icon: Users,  sub: 'Select class below'     },
]

export default function ComposeAnnouncementPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [title,           setTitle]           = useState('')
  const [body,            setBody]            = useState('')
  const [audience,        setAudience]        = useState('all')
  const [category,        setCategory]        = useState('Academic')
  const [pinned,          setPinned]          = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState('')
  const [classes,         setClasses]         = useState<{ id: string; name: string }[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')

  useEffect(() => { if (profile?.id) loadClasses() }, [profile?.id])

  async function loadClasses() {
    const { data, error: err } = await supabase
      .from('teacher_assignments')
      .select('class_id, classes(id, name)')
      .eq('teacher_id', profile!.id)
    if (err) { logSupabaseError('ComposeAnnouncement/classes', err); return }
    type Row = { class_id: string; classes: { id: string; name: string } | null }
    const seen = new Set<string>()
    const cls: { id: string; name: string }[] = []
    for (const r of (data ?? []) as unknown as Row[]) {
      if (r.classes && !seen.has(r.class_id)) {
        seen.add(r.class_id)
        cls.push({ id: r.class_id, name: r.classes.name })
      }
    }
    setClasses(cls)
    if (cls.length > 0) setSelectedClassId(cls[0].id)
  }

  async function handlePublish() {
    if (!title.trim() || !body.trim()) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('announcements').insert({
      school_id:    profile!.school_id!,
      author_id:    profile!.id,
      title:        title.trim(),
      body:         body.trim(),
      target_roles: ROLE_MAP[audience] ?? ['student'],
      published_at: new Date().toISOString(),
    })
    if (err) {
      logSupabaseError('ComposeAnnouncement/insert', err)
      setError(err.message)
      setSaving(false)
      return
    }
    onNavigate('teacher-announcements')
  }

  return (
    <DashboardLayout
      activePage="teacher-announcements"
      onNavigate={onNavigate}
      title="New Announcement"
      subtitle="Broadcast a message to students or parents"
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[800px] flex flex-col gap-6">

        <button onClick={() => onNavigate('teacher-announcements')} className="flex items-center gap-2 text-sm text-muted hover:text-foreground w-fit">
          <ChevronLeft size={16} /> Back to Announcements
        </button>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-card px-4 py-3">{error}</p>
        )}

        {/* Details */}
        <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-5">
          <h2 className="text-base font-bold text-foreground">Announcement Details</h2>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground">Title</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Sports Day Announcement"
              className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Category</label>
              <div className="relative">
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full h-12 pl-4 pr-10 border border-black/20 rounded-input text-sm text-foreground bg-white outline-none focus:border-primary appearance-none">
                  {['Academic', 'Event', 'Finance', 'Resource', 'General'].map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Schedule (optional)</label>
              <input type="datetime-local"
                className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground outline-none focus:border-primary" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground">Message</label>
            <textarea
              value={body} onChange={e => setBody(e.target.value)}
              rows={6} placeholder="Write your announcement here..."
              className="px-4 py-3 border border-black/20 rounded-card text-sm text-foreground placeholder:text-muted outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPinned(!pinned)}
              className={`size-5 rounded border-2 flex items-center justify-center transition-colors ${pinned ? 'border-primary bg-primary' : 'border-black/20'}`}
            >
              {pinned && <span className="text-white text-xs font-bold">✓</span>}
            </button>
            <span className="text-sm text-foreground">Pin this announcement to the top of the feed</span>
          </div>
        </div>

        {/* Audience */}
        <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-4">
          <h2 className="text-base font-bold text-foreground">Send To</h2>

          <div className="grid grid-cols-2 gap-3">
            {audiences.map(a => {
              const Icon = a.icon
              return (
                <button
                  key={a.id}
                  onClick={() => setAudience(a.id)}
                  className={`flex items-center gap-3 p-4 rounded-card border-2 text-left transition-colors ${
                    audience === a.id ? 'border-primary bg-primary/5' : 'border-black/10 hover:border-primary/40'
                  }`}
                >
                  <Icon size={18} className={audience === a.id ? 'text-primary' : 'text-muted'} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{a.label}</p>
                    <p className="text-xs text-muted">{a.sub}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {audience === 'class' && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Select Class</label>
              <div className="relative w-48">
                <select
                  value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                  className="w-full h-11 pl-4 pr-10 border border-black/20 rounded-input text-sm text-foreground bg-white outline-none focus:border-primary appearance-none"
                >
                  {classes.length > 0
                    ? classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                    : <option value="">No classes assigned</option>
                  }
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handlePublish}
            disabled={!title.trim() || !body.trim() || saving}
            className="flex items-center gap-2 h-12 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} /> {saving ? 'Publishing…' : 'Publish Now'}
          </button>
          <button
            onClick={() => onNavigate('teacher-announcements')}
            className="h-12 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
    </DashboardLayout>
  )
}
