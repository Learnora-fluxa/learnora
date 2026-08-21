import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, CheckCircle2, Clock, ExternalLink, FileText, Headphones, Loader2, Play, Video } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { resolveStorageUrl } from '../lib/storage'

type Props = { onNavigate: (page: string) => void }

interface LessonItem {
  id: string
  title: string
  type: string | null
  content_url: string | null
  duration_minutes: number | null
  module_id: string | null
}

function readSelectedLessonId(): string | null {
  const raw = sessionStorage.getItem('learnora_selected_lesson')
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.id === 'string') return parsed.id
  } catch {
    if (raw) return raw
  }

  return null
}

function saveSelectedLesson(lesson: LessonItem) {
  sessionStorage.setItem('learnora_selected_lesson', JSON.stringify({ id: lesson.id, title: lesson.title }))
}

function fmtDuration(mins: number | null) {
  if (!mins) return 'Self paced'
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export default function LessonPage({ onNavigate }: Props) {
  const { profile, session } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [courseTitle, setCourseTitle] = useState('')
  const [lessons, setLessons] = useState<LessonItem[]>([])
  const [lessonIdx, setLessonIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [resolvedContentUrl, setResolvedContentUrl] = useState<string | null>(null)
  const [resolvingContent, setResolvingContent] = useState(false)

  useEffect(() => {
    if (profile?.id) void loadLessonData()
  }, [profile?.id])

  async function loadLessonData() {
    setLoading(true)

    const courseId = sessionStorage.getItem('learnora_selected_course')
    if (!courseId || !profile?.id) {
      setLoading(false)
      return
    }

    const { data: courseData } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .maybeSingle()

    if (courseData) setCourseTitle((courseData as { title: string }).title)

    let lessonRows: LessonItem[] = []

    const { data: directLessonData } = await supabase
      .from('lessons')
      .select('id, title, type, content_url, duration_minutes, module_id, position')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .order('position', { ascending: true })

    lessonRows = (directLessonData ?? []) as unknown as LessonItem[]

    if (lessonRows.length === 0) {
      const { data: moduleData } = await supabase
        .from('modules')
        .select('id, position')
        .eq('course_id', courseId)
        .order('position', { ascending: true })

      const modules = (moduleData ?? []) as { id: string; position: number }[]
      const moduleIds = modules.map(module => module.id)

      if (moduleIds.length > 0) {
        const { data: nestedLessonData } = await supabase
          .from('lessons')
          .select('id, title, type, content_url, duration_minutes, module_id, position')
          .in('module_id', moduleIds)
          .eq('is_published', true)
          .order('position', { ascending: true })

        const nestedLessons = (nestedLessonData ?? []) as unknown as (LessonItem & { position?: number })[]
        const moduleOrder = new Map(modules.map((module, index) => [module.id, index]))
        lessonRows = nestedLessons.sort((a, b) => {
          const moduleDiff = (moduleOrder.get(a.module_id ?? '') ?? 0) - (moduleOrder.get(b.module_id ?? '') ?? 0)
          return moduleDiff
        })
      }
    }

    setLessons(lessonRows)

    if (lessonRows.length > 0) {
      const lessonIds = lessonRows.map(lesson => lesson.id)
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('student_id', profile.id)
        .eq('completed', true)
        .in('lesson_id', lessonIds)

      const completedIds = new Set((progressData ?? []).map((entry: { lesson_id: string }) => entry.lesson_id))
      const selectedLessonId = readSelectedLessonId()

      let nextIndex = selectedLessonId ? lessonRows.findIndex(lesson => lesson.id === selectedLessonId) : -1
      if (nextIndex < 0) nextIndex = lessonRows.findIndex(lesson => !completedIds.has(lesson.id))
      if (nextIndex < 0) nextIndex = 0

      setLessonIdx(nextIndex)
      saveSelectedLesson(lessonRows[nextIndex])
    }

    setLoading(false)
  }

  async function markCompleteAndNext() {
    const lesson = lessons[lessonIdx]
    if (!lesson || !profile?.id) return

    setCompleting(true)

    await supabase.from('lesson_progress').upsert({
      lesson_id: lesson.id,
      student_id: profile.id,
      school_id: profile.school_id!,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'lesson_id,student_id' })

    setCompleting(false)

    if (lessonIdx < lessons.length - 1) {
      const nextIndex = lessonIdx + 1
      setLessonIdx(nextIndex)
      saveSelectedLesson(lessons[nextIndex])
      return
    }

    onNavigate('lesson-complete')
  }

  const lesson = lessons[lessonIdx]
  const totalLessons = lessons.length
  const currentLesson = lessonIdx + 1
  const progress = totalLessons > 0 ? Math.round((currentLesson / totalLessons) * 100) : 0

  const resourceLabel = useMemo(() => {
    if (lesson?.type === 'audio') return 'Audio lesson ready'
    if (lesson?.type === 'pdf') return 'PDF lesson ready'
    if (lesson?.type === 'document') return 'Document lesson ready'
    return 'Lesson file ready'
  }, [lesson?.type])

  useEffect(() => {
    let cancelled = false

    async function loadSignedUrl() {
      if (!lesson?.content_url) {
        setResolvedContentUrl(null)
        return
      }

      setResolvingContent(true)

      try {
        const signedUrl = await resolveStorageUrl(session, lesson.content_url)
        if (!cancelled) setResolvedContentUrl(signedUrl)
      } catch (error) {
        console.error('LessonPage/resolveStorageUrl', error)
        if (!cancelled) setResolvedContentUrl(null)
      } finally {
        if (!cancelled) setResolvingContent(false)
      }
    }

    void loadSignedUrl()

    return () => {
      cancelled = true
    }
  }, [lesson?.content_url, session])

  if (loading) {
    return (
      <DashboardLayout activePage="courses" onNavigate={onNavigate} title="Lesson" user={sidebarUser}>
        <p className="text-sm text-muted py-8">Loading lesson…</p>
      </DashboardLayout>
    )
  }

  if (!lesson) {
    return (
      <DashboardLayout activePage="courses" onNavigate={onNavigate} title="Lesson" user={sidebarUser}>
        <div className="py-16 text-center text-sm text-muted">No lesson content is available for this course yet.</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      activePage="courses"
      onNavigate={onNavigate}
      title="Lesson"
      subtitle={courseTitle || lesson.title}
      nav={profile?.role === 'teacher' ? teacherNav : undefined}
      user={sidebarUser}
    >
      <div className="max-w-[1200px] grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="bg-surface rounded-card shadow-sm p-4 h-fit">
          <button
            onClick={() => onNavigate('course-details')}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft size={16} /> Back to Course
          </button>

          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Course Progress</p>
            <div className="mt-3 h-2 rounded-full bg-black/8 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">Lesson {currentLesson} of {totalLessons}</p>
          </div>

          <div className="flex flex-col gap-2">
            {lessons.map((item, index) => (
              <button
                key={item.id}
                onClick={() => {
                  setLessonIdx(index)
                  saveSelectedLesson(item)
                }}
                className={`w-full rounded-card border p-3 text-left transition-colors ${
                  index === lessonIdx
                    ? 'border-primary bg-primary/6'
                    : 'border-black/8 hover:border-primary/40 hover:bg-canvas'
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.type === 'video'
                    ? <Video size={14} className="text-primary shrink-0" />
                    : <FileText size={14} className="text-amber-600 shrink-0" />
                  }
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                </div>
                <p className="mt-1 text-xs text-muted">{fmtDuration(item.duration_minutes)}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex flex-col gap-6">
          <div className="bg-primary rounded-card p-6 md:p-8 text-white">
            <p className="text-sm text-white/70 mb-2">{lesson.type === 'video' ? 'Video lesson' : 'Lesson content'}</p>
            <h1 className="text-2xl md:text-3xl font-bold mb-3">{lesson.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-white/80">
              <span className="flex items-center gap-1.5"><Clock size={14} /> {fmtDuration(lesson.duration_minutes)}</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Step {currentLesson} of {totalLessons}</span>
            </div>
          </div>

          <div className="bg-surface rounded-card shadow-sm p-6 md:p-7">
            {lesson.content_url ? (
              <div className="rounded-card border border-black/8 bg-canvas p-6 flex flex-col gap-4">
                {resolvingContent ? (
                  <div className="rounded-card border border-dashed border-black/10 bg-white p-6 flex items-center gap-3 text-sm text-muted">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    Preparing secure lesson preview…
                  </div>
                ) : (
                  <>
                    {(lesson.type === 'video' || lesson.type === 'audio') && resolvedContentUrl ? (
                      lesson.type === 'video' ? (
                        <video controls className="w-full rounded-card bg-black max-h-[480px]" src={resolvedContentUrl} />
                      ) : (
                        <div className="rounded-card bg-white border border-black/8 p-5">
                          <div className="flex items-center gap-2 mb-4 text-foreground">
                            <Headphones size={18} className="text-teal-600" />
                            <span className="text-sm font-semibold">Audio lesson preview</span>
                          </div>
                          <audio controls className="w-full" src={resolvedContentUrl} />
                        </div>
                      )
                    ) : lesson.type === 'pdf' && resolvedContentUrl ? (
                      <iframe title={lesson.title} src={resolvedContentUrl} className="w-full h-[640px] rounded-card border border-black/8 bg-white" />
                    ) : (
                      <div className="size-14 rounded-full bg-primary text-white flex items-center justify-center">
                        <Play size={20} className="fill-current" />
                      </div>
                    )}

                    <div>
                      <p className="text-base font-bold text-foreground">{resourceLabel}</p>
                      <p className="text-sm text-muted mt-1">
                        {resolvedContentUrl
                          ? 'Preview prepared. Open the lesson resource in a new tab if you need a full-screen view.'
                          : 'This lesson file could not be previewed inline, but you can still open it securely in a new tab.'}
                      </p>
                    </div>

                    {resolvedContentUrl && (
                      <a
                        href={resolvedContentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-fit items-center gap-2 h-11 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors"
                      >
                        <ExternalLink size={14} /> Open Resource
                      </a>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-card border border-dashed border-black/12 p-6 text-sm text-muted">
                This lesson has no published body content yet. You can still mark it complete when you finish reviewing it.
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={markCompleteAndNext}
              disabled={completing}
              className="h-11 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep disabled:opacity-60 transition-colors"
            >
              {completing ? 'Saving…' : lessonIdx < totalLessons - 1 ? 'Mark Complete & Next' : 'Complete Course'}
            </button>
            <button
              onClick={() => onNavigate('lesson-notes')}
              className="h-11 px-5 border border-black/15 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors"
            >
              Open Notes
            </button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
