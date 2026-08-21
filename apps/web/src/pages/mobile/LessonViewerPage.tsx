import { useState, useEffect } from 'react'
import { ChevronLeft, BookOpen, Video, FileText } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface LessonItem {
  id: string; title: string; type: string; course_id: string; position: number
}

const TYPE_LABEL: Record<string, string> = {
  video: 'Video Lesson',
  pdf:   'Reading Material',
  text:  'Text Lesson',
  quiz:  'Quiz',
}

function TypeIcon({ type }: { type: string }) {
  if (type === 'video') return <Video size={20} className="text-white" />
  if (type === 'pdf' || type === 'text') return <FileText size={20} className="text-white" />
  return <BookOpen size={20} className="text-white" />
}

export default function LessonViewerPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [lessons,     setLessons]     = useState<LessonItem[]>([])
  const [lessonIdx,   setLessonIdx]   = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [completing,  setCompleting]  = useState(false)

  useEffect(() => { if (profile?.id) loadLessons() }, [profile?.id])

  async function loadLessons() {
    setLoading(true)
    const courseId = sessionStorage.getItem('learnora_selected_course')
    if (!courseId) { setLoading(false); return }

    const { data: lData } = await supabase
      .from('lessons')
      .select('id, title, type, course_id, position')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .order('position', { ascending: true })

    const list = (lData ?? []) as LessonItem[]
    setLessons(list)

    // Find first incomplete lesson
    if (list.length > 0 && profile?.id) {
      const lessonIds = list.map(l => l.id)
      const { data: pData } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('student_id', profile.id)
        .eq('completed', true)
        .in('lesson_id', lessonIds)
      const completedIds = new Set((pData ?? []).map((p: { lesson_id: string }) => p.lesson_id))
      const firstIncomplete = list.findIndex(l => !completedIds.has(l.id))
      setLessonIdx(firstIncomplete >= 0 ? firstIncomplete : 0)
    }
    setLoading(false)
  }

  async function markCompleteAndNext() {
    const lesson = lessons[lessonIdx]
    if (!lesson || !profile?.id) return
    setCompleting(true)

    await supabase.from('lesson_progress').upsert({
      lesson_id:  lesson.id,
      student_id: profile.id,
      school_id:  profile.school_id!,
      completed:  true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'lesson_id,student_id' })

    setCompleting(false)

    if (lessonIdx < lessons.length - 1) {
      setLessonIdx(i => i + 1)
    } else {
      onNavigate('m/lesson-complete')
    }
  }

  const lesson  = lessons[lessonIdx]
  const total   = lessons.length
  const current = lessonIdx + 1

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-muted">Loading lesson…</p>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-5">
        <p className="text-sm text-muted text-center">No lessons available for this course yet.</p>
        <button onClick={() => onNavigate('m/learn')} className="h-12 px-6 bg-primary text-white rounded-full text-sm font-semibold">
          Back to Learn
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[430px] mx-auto px-5 pt-5 pb-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => onNavigate('m/learn')}><ChevronLeft size={22} className="text-foreground" /></button>
        <h1 className="text-base font-bold text-foreground flex-1 text-center truncate">{lesson.title}</h1>
      </div>

      {/* Progress */}
      <div className="relative mb-6">
        <div className="h-1.5 bg-black/8 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: total > 0 ? `${(current / total) * 100}%` : '0%' }} />
        </div>
        <span className="absolute right-0 -top-5 text-[10px] font-bold bg-foreground text-white px-2 py-0.5 rounded-full">
          {current}/{total}
        </span>
      </div>

      {/* Content card */}
      <div className="bg-primary rounded-3xl p-5 mb-5 relative flex-1 min-h-[220px] flex flex-col">
        <p className="text-sm text-white/80 mb-2">{TYPE_LABEL[lesson.type] ?? 'Lesson'}</p>
        <h2 className="text-xl font-bold text-white mb-4">{lesson.title}</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="size-16 rounded-full bg-white/20 flex items-center justify-center">
            <TypeIcon type={lesson.type} />
          </div>
        </div>
        {lesson.type === 'video' && (
          <p className="text-xs text-white/70 text-center mt-4">Tap to open video player</p>
        )}
        {(lesson.type === 'pdf' || lesson.type === 'text') && (
          <p className="text-xs text-white/70 text-center mt-4">Tap to open reading material</p>
        )}
      </div>

      {/* Info card */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8">
        <p className="text-sm font-bold text-amber-700 mb-1">Lesson {current} of {total}</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          Complete this lesson to unlock the next one and track your progress.
        </p>
      </div>

      {/* Navigation buttons */}
      <div className="flex flex-col gap-3 mt-auto">
        <button
          onClick={markCompleteAndNext}
          disabled={completing}
          className="h-14 bg-primary text-white text-base font-bold rounded-full hover:bg-primary-deep transition-colors disabled:opacity-60"
        >
          {completing ? 'Saving…' : lessonIdx < total - 1 ? 'Mark Complete & Next' : 'Complete Course'}
        </button>
        <button
          onClick={() => setLessonIdx(i => Math.max(0, i - 1))}
          disabled={lessonIdx === 0}
          className="h-14 bg-white border-2 border-black/12 text-foreground text-base font-bold rounded-full disabled:opacity-40"
        >
          Previous
        </button>
      </div>
    </div>
  )
}
