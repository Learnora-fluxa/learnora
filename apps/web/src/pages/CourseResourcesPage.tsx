import { useEffect, useState } from 'react'
import { BookOpen, Download, FileText, Headphones, Link2, Video } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { resolveStorageUrl } from '../lib/storage'

type Props = { onNavigate: (page: string) => void }
type RType = 'pdf' | 'video' | 'audio' | 'document' | 'link' | 'note'

interface Resource {
  id: string
  title: string
  type: RType
  desc: string
  url?: string
}

interface LessonRow {
  id: string
  title: string
  type: string | null
  content_url: string | null
}

const TYPE_META: Record<RType, { Icon: typeof FileText; color: string; bg: string; label: string }> = {
  pdf: { Icon: FileText, color: 'text-red-500', bg: 'bg-red-50', label: 'PDF' },
  video: { Icon: Video, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Video' },
  audio: { Icon: Headphones, color: 'text-teal-600', bg: 'bg-teal-50', label: 'Audio' },
  document: { Icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100', label: 'Document' },
  link: { Icon: Link2, color: 'text-primary', bg: 'bg-primary/10', label: 'Link' },
  note: { Icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Note' },
}

function toResourceType(type: string | null, contentUrl: string | null): RType {
  if (type === 'video') return 'video'
  if (type === 'pdf') return 'pdf'
  if (type === 'audio') return 'audio'
  if (type === 'document') return 'document'
  return contentUrl ? 'link' : 'note'
}

export default function CourseResourcesPage({ onNavigate }: Props) {
  const { profile, session } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [resources, setResources] = useState<Resource[]>([])
  const [courseName, setCourseName] = useState('Course Resources')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<RType | 'all'>('all')

  useEffect(() => {
    if (profile?.id) void load()
  }, [profile?.id, session])

  async function load() {
    setLoading(true)
    const schoolId = profile!.school_id!
    const courseId = sessionStorage.getItem('learnora_selected_course')

    if (!courseId) {
      setLoading(false)
      return
    }

    const { data: course } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .maybeSingle()

    if (course) setCourseName((course as { title: string }).title)

    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, title, type, content_url')
      .eq('course_id', courseId)
      .eq('school_id', schoolId)
      .order('position', { ascending: true })
      .limit(20)

    const rows = (lessons ?? []) as LessonRow[]
    const resolved = await Promise.all(rows.map(async (lesson) => {
      let signedUrl: string | undefined

      try {
        signedUrl = (await resolveStorageUrl(session, lesson.content_url)) ?? undefined
      } catch (error) {
        console.error('CourseResources/resolveStorageUrl', error)
      }

      return {
        id: lesson.id,
        title: lesson.title,
        type: toResourceType(lesson.type, lesson.content_url),
        desc: lesson.type ? `${lesson.type.charAt(0).toUpperCase()}${lesson.type.slice(1)} lesson resource` : '',
        url: signedUrl,
      } satisfies Resource
    }))

    setResources(resolved)
    setLoading(false)
  }

  const visible = tab === 'all' ? resources : resources.filter((resource) => resource.type === tab)

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
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pdf', 'video', 'audio', 'document', 'link', 'note'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`h-8 px-3.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                tab === value ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-foreground shadow-sm'
              }`}
            >
              {value === 'all' ? 'All resources' : TYPE_META[value].label}
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
            {visible.map((resource) => {
              const { Icon, color, bg, label } = TYPE_META[resource.type]
              return (
                <div key={resource.id} className="bg-surface rounded-card shadow-sm flex items-center gap-4 px-5 py-4">
                  <div className={`size-11 rounded-card ${bg} flex items-center justify-center shrink-0`}>
                    <Icon size={18} className={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{resource.title}</p>
                    {resource.desc && <p className="text-xs text-muted mt-0.5 line-clamp-1">{resource.desc}</p>}
                    <span className="text-[10px] text-muted">{label}</span>
                  </div>
                  {resource.url ? (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 h-8 px-3 bg-primary/10 text-primary text-xs font-semibold rounded-full hover:bg-primary hover:text-white transition-colors shrink-0"
                    >
                      <Download size={11} /> Open
                    </a>
                  ) : (
                    <button
                      onClick={() => {
                        sessionStorage.setItem('learnora_selected_lesson', JSON.stringify({ id: resource.id, title: resource.title }))
                        onNavigate('lesson')
                      }}
                      className="flex items-center gap-1.5 h-8 px-3 bg-primary/10 text-primary text-xs font-semibold rounded-full hover:bg-primary hover:text-white transition-colors shrink-0"
                    >
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
