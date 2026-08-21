import { CheckCircle2, ChevronLeft } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

function readLessonTitle() {
  const raw = sessionStorage.getItem('learnora_selected_lesson')
  if (!raw) return 'this lesson'

  try {
    const parsed = JSON.parse(raw)
    return typeof parsed?.title === 'string' && parsed.title ? parsed.title : 'this lesson'
  } catch {
    return 'this lesson'
  }
}

export default function LessonCompletePage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)
  const lessonTitle = readLessonTitle()

  return (
    <DashboardLayout
      activePage="courses"
      onNavigate={onNavigate}
      title="Lesson Complete"
      subtitle="Progress saved"
      user={sidebarUser}
    >
      <div className="max-w-[760px] mx-auto flex flex-col gap-6 py-6">
        <button
          onClick={() => onNavigate('course-details')}
          className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft size={16} /> Back to Course
        </button>

        <div className="bg-surface rounded-card shadow-sm p-8 md:p-10 text-center">
          <div className="mx-auto mb-5 size-20 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 size={36} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Lesson Completed</h1>
          <p className="text-sm text-muted max-w-[420px] mx-auto">
            Your progress has been saved for <span className="font-semibold text-foreground">{lessonTitle}</span>.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => onNavigate('course-details')}
              className="h-11 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors"
            >
              Back to Course
            </button>
            <button
              onClick={() => onNavigate('courses')}
              className="h-11 px-5 border border-black/15 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors"
            >
              Browse Courses
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
