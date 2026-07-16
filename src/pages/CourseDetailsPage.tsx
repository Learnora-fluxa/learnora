import { useState, useEffect } from 'react'
import { ChevronLeft, Play, CheckCircle2, Clock, BookOpen, Users, FileText, Download, Link, Video, File } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }
type Tab = 'content' | 'resources'
type ResourceType = 'pdf' | 'video' | 'link' | 'doc'

interface LessonItem {
  id:       string
  title:    string
  duration: number | null
  done:     boolean
}

interface ModuleItem {
  id:      string
  title:   string
  lessons: LessonItem[]
}

const typeIcon: Record<ResourceType, typeof FileText> = {
  pdf:   FileText,
  video: Video,
  link:  Link,
  doc:   File,
}

const typeBg: Record<ResourceType, string> = {
  pdf:   'bg-red-50 text-red-600',
  video: 'bg-primary/10 text-primary',
  link:  'bg-teal-50 text-teal-600',
  doc:   'bg-amber-50 text-amber-600',
}

export default function CourseDetailsPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [openModule,     setOpenModule]     = useState<number | null>(0)
  const [tab,            setTab]            = useState<Tab>('content')
  const [courseTitle,    setCourseTitle]    = useState('')
  const [courseSubject,  setCourseSubject]  = useState('')
  const [teacherName,    setTeacherName]    = useState('')
  const [description,    setDescription]   = useState('')
  const [modules,        setModules]        = useState<ModuleItem[]>([])
  const [loading,        setLoading]        = useState(true)

  useEffect(() => { if (profile?.id) loadCourse() }, [profile?.id])

  async function loadCourse() {
    setLoading(true)
    const studentId = profile!.id
    let courseId    = sessionStorage.getItem('learnora_selected_course')

    if (!courseId) {
      const { data: ceData } = await supabase
        .from('class_enrollments').select('class_id').eq('student_id', studentId)
      const classIds = (ceData ?? []).map((e: { class_id: string }) => e.class_id)
      if (classIds.length > 0) {
        const { data: cData } = await supabase
          .from('courses').select('id').in('class_id', classIds).eq('is_published', true).limit(1).maybeSingle()
        if (cData) {
          courseId = (cData as { id: string }).id
          sessionStorage.setItem('learnora_selected_course', courseId)
        }
      }
    }

    if (!courseId) { setLoading(false); return }
    await loadCourseById(courseId, studentId)
  }

  async function loadCourseById(courseId: string, studentId: string) {
    const { data: cData } = await supabase
      .from('courses')
      .select('id, title, description, subjects(name), profiles!teacher_id(full_name)')
      .eq('id', courseId)
      .maybeSingle()

    if (cData) {
      const raw = cData as unknown as {
        title: string; description: string | null
        subjects: { name: string } | null
        profiles: { full_name: string | null } | null
      }
      setCourseTitle(raw.title)
      setCourseSubject(raw.subjects?.name ?? '')
      setTeacherName(raw.profiles?.full_name ?? '')
      setDescription(raw.description ?? '')
    }

    const { data: mData } = await supabase
      .from('modules')
      .select('id, title, position')
      .eq('course_id', courseId)
      .order('position', { ascending: true })

    const rawModules = (mData ?? []) as { id: string; title: string; position: number }[]
    if (rawModules.length === 0) { setLoading(false); return }

    const moduleIds = rawModules.map(m => m.id)

    const { data: lData } = await supabase
      .from('lessons')
      .select('id, module_id, title, duration_minutes, position')
      .in('module_id', moduleIds)
      .eq('is_published', true)
      .order('position', { ascending: true })

    const rawLessons = (lData ?? []) as {
      id: string; module_id: string; title: string
      duration_minutes: number | null; position: number
    }[]

    const allLessonIds = rawLessons.map(l => l.id)
    const completedSet = new Set<string>()
    if (allLessonIds.length > 0) {
      const { data: pData } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('student_id', studentId)
        .eq('completed', true)
        .in('lesson_id', allLessonIds)

      for (const p of (pData ?? []) as { lesson_id: string }[]) {
        completedSet.add(p.lesson_id)
      }
    }

    const lessonsByModule: Record<string, LessonItem[]> = {}
    for (const l of rawLessons) {
      if (!lessonsByModule[l.module_id]) lessonsByModule[l.module_id] = []
      lessonsByModule[l.module_id].push({
        id:       l.id,
        title:    l.title,
        duration: l.duration_minutes,
        done:     completedSet.has(l.id),
      })
    }

    setModules(rawModules.map(m => ({ id: m.id, title: m.title, lessons: lessonsByModule[m.id] ?? [] })))
    setLoading(false)
  }

  function fmtDuration(mins: number | null) {
    if (!mins) return ''
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  const allLessons   = modules.flatMap(m => m.lessons)
  const totalLessons = allLessons.length
  const doneLessons  = allLessons.filter(l => l.done).length
  const progress     = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0

  return (
    <DashboardLayout
      activePage="courses"
      onNavigate={onNavigate}
      title="Course Details"
      subtitle={courseSubject ? `${courseTitle} — ${courseSubject}` : courseTitle}
      nav={profile?.role === 'teacher' ? teacherNav : undefined}
      user={sidebarUser}
    >
      <div className="max-w-[1100px] flex flex-col gap-6">

        <button
          onClick={() => onNavigate('courses')}
          className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft size={16} /> Back to Courses
        </button>

        {/* Hero card */}
        <div className="bg-primary rounded-card p-6 md:p-8 flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 text-white">
            {courseSubject && <p className="text-sm font-semibold text-white/70 mb-2">{courseSubject}</p>}
            <h1 className="text-2xl md:text-3xl font-bold mb-3">{courseTitle || 'Course'}</h1>
            {description && (
              <p className="text-sm text-white/80 mb-6 max-w-lg leading-relaxed">{description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-white/80">
              <span className="flex items-center gap-1.5"><BookOpen size={14} />{totalLessons} lessons</span>
              {teacherName && <span className="flex items-center gap-1.5"><Users size={14} />{teacherName}</span>}
              {totalLessons > 0 && (
                <span className="flex items-center gap-1.5"><Clock size={14} />~{Math.max(1, Math.ceil(totalLessons * 10 / 60))}h total</span>
              )}
            </div>
          </div>
          <button
            onClick={() => onNavigate('m/lesson')}
            className="flex items-center gap-2 h-12 px-6 bg-white text-primary text-sm font-bold rounded-pill hover:shadow-md transition-all shrink-0"
          >
            <Play size={14} className="fill-current" />
            Continue Learning
          </button>
        </div>

        {/* Progress */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Your Progress</p>
            <p className="text-sm font-bold text-primary">{doneLessons}/{totalLessons} lessons complete</p>
          </div>
          <div className="h-3 bg-black/8 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted mt-2">{progress}% complete</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-canvas rounded-card p-1 w-fit">
          {([['content', 'Course Content'], ['resources', 'Resources']] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              className={`px-5 h-9 text-sm font-semibold rounded-md transition-colors ${tab === id ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Course Content */}
        {tab === 'content' && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted">Loading…</div>
            ) : modules.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">No course content published yet.</div>
            ) : modules.map((mod, mi) => (
              <div key={mod.id} className="border-b border-black/4 last:border-0">
                <button
                  onClick={() => setOpenModule(openModule === mi ? null : mi)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-canvas/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{mod.title}</p>
                    <p className="text-xs text-muted mt-0.5">{mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronLeft
                    size={16}
                    className={`text-muted transition-transform shrink-0 ${openModule === mi ? '-rotate-90' : 'rotate-180'}`}
                  />
                </button>
                {openModule === mi && (
                  <div className="px-6 pb-4 flex flex-col gap-1">
                    {mod.lessons.map(lesson => (
                      <button
                        key={lesson.id}
                        onClick={() => onNavigate('m/lesson')}
                        className="flex items-center gap-4 p-3 rounded-card hover:bg-canvas transition-colors text-left"
                      >
                        <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${lesson.done ? 'bg-green-50' : 'bg-primary/8'}`}>
                          {lesson.done
                            ? <CheckCircle2 size={16} className="text-green-600" />
                            : <Play size={12} className="text-primary fill-current" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${lesson.done ? 'text-muted line-through' : 'text-foreground'}`}>
                            {lesson.title}
                          </p>
                        </div>
                        {lesson.duration !== null && (
                          <span className="text-xs text-muted shrink-0">{fmtDuration(lesson.duration)}</span>
                        )}
                        {lesson.done && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab: Resources */}
        {tab === 'resources' && (
          <div className="flex flex-col gap-3">
            <div className="py-8 text-center text-sm text-muted">No resources uploaded yet.</div>
            {/* Future: load from a course_resources table or lessons with resource type */}
            {([] as { title: string; type: ResourceType; size?: string; module: string }[]).map((r, i) => {
              const Icon = typeIcon[r.type]
              return (
                <div key={i} className="bg-surface rounded-card shadow-sm p-4 flex items-center gap-4">
                  <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${typeBg[r.type]}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{r.title}</p>
                    <p className="text-xs text-muted mt-0.5">{r.module}{r.size ? ` · ${r.size}` : ''}</p>
                  </div>
                  {r.type === 'link' ? (
                    <button className="flex items-center gap-1.5 h-8 px-3 border border-black/15 rounded-full text-xs font-semibold text-primary hover:bg-primary/8 transition-colors shrink-0">
                      <Link size={11} /> Open
                    </button>
                  ) : (
                    <button className="flex items-center gap-1.5 h-8 px-3 border border-black/15 rounded-full text-xs font-semibold text-muted hover:text-primary hover:border-primary transition-colors shrink-0">
                      <Download size={11} /> Download
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
