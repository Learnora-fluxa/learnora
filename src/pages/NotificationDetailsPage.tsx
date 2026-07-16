import { ChevronLeft, BookOpen, Clock } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav, adminNav, superAdminNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

export default function NotificationDetailsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  return (
    <DashboardLayout
      activePage="notifications"
      onNavigate={onNavigate}
      title="Notification"
      subtitle="Assignment due reminder"
      nav={
        profile?.role === 'teacher'     ? teacherNav
        : profile?.role === 'admin'       ? adminNav
        : profile?.role === 'super_admin' ? superAdminNav
        : undefined
      }
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[700px] flex flex-col gap-6">

        <button
          onClick={() => onNavigate('notifications')}
          className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft size={16} /> Back to Notifications
        </button>

        <div className="bg-surface rounded-card shadow-sm p-8">
          {/* Icon + meta */}
          <div className="flex items-start gap-4 mb-6">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Assignment Due Tomorrow</h1>
              <p className="text-xs text-muted flex items-center gap-1 mt-1">
                <Clock size={11} /> 5 minutes ago · Academic
              </p>
            </div>
          </div>

          <hr className="border-black/6 mb-6" />

          <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
            <p className="mb-4">
              This is a reminder that your <strong>Mathematics Quiz</strong> is due tomorrow, <strong>June 8, 2026 at 11:59 PM</strong>.
            </p>
            <p className="mb-4">
              Please ensure you submit your work before the deadline. Late submissions will not be accepted without a valid excuse approved by your class teacher.
            </p>
            <div className="bg-canvas rounded-card p-4 mb-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Assignment Details</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted text-xs">Subject</p>
                  <p className="font-semibold text-foreground">Mathematics</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Teacher</p>
                  <p className="font-semibold text-foreground">Mrs Nnduka Kisha</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Due Date</p>
                  <p className="font-semibold text-foreground">June 8, 2026 — 11:59 PM</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Max Score</p>
                  <p className="font-semibold text-foreground">100 points</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted">
              If you have any questions about this assignment, contact Mrs Kisha through the Messages section.
            </p>
          </div>

          <div className="mt-8 flex gap-3 flex-wrap">
            <button
              onClick={() => onNavigate('assignments')}
              className="h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary"
            >
              Go to Assignment
            </button>
            <button
              onClick={() => onNavigate('messages')}
              className="h-11 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors"
            >
              Message Teacher
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
