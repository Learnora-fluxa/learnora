import { useState, useEffect } from 'react'
import { FileText, Video, Link2, Download, BookOpen } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

type RType = 'pdf' | 'video' | 'link' | 'note'

interface Resource {
  id:      string
  title:   string
  type:    RType
  desc:    string
  size?:   string
  url?:    string
}

const TYPE_META: Record<RType, { Icon: typeof FileText; color: string; bg: string; label: string }> = {
  pdf:   { Icon: FileText, color: 'text-red-500',   bg: 'bg-red-50',     label: 'PDF'   },
  video: { Icon: Video,    color: 'text-purple-500',bg: 'bg-purple-50',  label: 'Video' },
  link:  { Icon: Link2,    color: 'text-primary',   bg: 'bg-primary/10', label: 'Link'  },
  note:  { Icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50',   label: 'Note'  },
}

export default function CourseResourcesPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [resources, setResources] = useState<Resource[]>([])
  const [courseName, setCourseName] = useState('Course Resources')
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState<RType | 'all'>('all')

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    setLoading(true)
    const schoolId = profile!.school_id!
    const courseId = sessionStorage.getItem('learnora_selected_course')

    if (!courseId) { setLoading(false); return }

    const { data: course } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .maybeSingle()
    if (course) setCourseName((course as { title: string }).title)

    // Lessons as resources
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, title, description, video_url, content')
      .eq('course_id', courseId)
      .eq('school_id', schoolId)
      .order('position', { ascending: true })
      .limit(20)

    const result: Resource[] = (lessons ?? []).map((l: any) => ({
      id:    l.id,
      title: l.title,
      type:  l.video_url ? 'video' : 'note' as RType,
      desc:  l.description ?? '',
      url:   l.video_url ?? undefined,
    }))

    setResources(result)
    setLoading(false)
  }

  const visible = tab === 'all' ? resources : resources.filter(r => r.type === tab)

  return (
    <DashboardLayout
      activePage="courses"
      onNavigate={onNavigate}
      title="Course Resources"
      subtitle={courseName}
      nav={profile?.role === 'teacher' ? teacherNav : undefined}
      user={sidebarUser}
    >
      <div className="max-w-[780px] flex flex-col gap-5">

        {/* Type tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pdf', 'video', 'link', 'note'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`h-8 px-3.5 rounded-full text-xs font-semibold capitalize transition-colors ${tab === t ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-foreground shadow-sm'}`}>
              {t === 'all' ? 'All resources' : TYPE_META[t].label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-muted">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No resources available{tab !== 'all' ? ` for "${tab}"` : ''}.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map(r => {
              const { Icon, color, bg, label } = TYPE_META[r.type]
              return (
                <div key={r.id} className="bg-surface rounded-card shadow-sm flex items-center gap-4 px-5 py-4">
                  <div className={`size-11 rounded-card ${bg} flex items-center justify-center shrink-0`}>
                    <Icon size={18} className={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{r.title}</p>
                    {r.desc && <p className="text-xs text-muted mt-0.5 line-clamp-1">{r.desc}</p>}
                    <span className="text-[10px] text-muted">{label}{r.size ? ` · ${r.size}` : ''}</span>
                  </div>
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 h-8 px-3 bg-primary/10 text-primary text-xs font-semibold rounded-full hover:bg-primary hover:text-white transition-colors shrink-0">
                      <Download size={11} /> Open
                    </a>
                  ) : (
                    <button onClick={() => { sessionStorage.setItem('learnora_selected_lesson', JSON.stringify({ id: r.id, title: r.title })); onNavigate('m/lesson') }}
                      className="flex items-center gap-1.5 h-8 px-3 bg-primary/10 text-primary text-xs font-semibold rounded-full hover:bg-primary hover:text-white transition-colors shrink-0">
                      View
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
