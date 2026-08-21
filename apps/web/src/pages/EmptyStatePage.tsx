import { BookOpen, PenLine, Bell, Search, WifiOff, FileQuestion, Lock, Wrench, CreditCard } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import DashboardLayout from '../components/layout/DashboardLayout'

type Props = { onNavigate: (page: string) => void }

type StateType = '404' | '403' | 'no-courses' | 'no-assignments' | 'no-notifications' | 'no-search' | 'offline' | 'maintenance' | 'subscription-expired'

const stateConfig: Record<StateType, {
  icon: typeof BookOpen; title: string; body: string; action?: string; actionPage?: string; color: string
}> = {
  'no-courses': {
    icon: BookOpen, color: 'bg-primary/10 text-primary',
    title: 'No Courses Yet',
    body: 'Your enrolled courses will appear here. Contact your teacher if you believe this is an error.',
    action: 'Browse Courses', actionPage: 'courses',
  },
  'no-assignments': {
    icon: PenLine, color: 'bg-amber-50 text-amber-600',
    title: 'No Assignments',
    body: "You're all caught up! There are no pending assignments right now.",
    action: 'View All', actionPage: 'assignments',
  },
  'no-notifications': {
    icon: Bell, color: 'bg-canvas text-muted',
    title: 'No Notifications',
    body: "You're up to date. New notifications will appear here.",
  },
  'no-search': {
    icon: Search, color: 'bg-canvas text-muted',
    title: 'No Results Found',
    body: 'Try different keywords or check the spelling.',
    action: 'Clear Search', actionPage: 'search',
  },
  'offline': {
    icon: WifiOff, color: 'bg-red-50 text-red-500',
    title: 'No Internet Connection',
    body: 'You are currently offline. Some features may not be available. Previously downloaded content is still accessible.',
    action: 'Try Again', actionPage: 'dashboard',
  },
  '404': {
    icon: FileQuestion, color: 'bg-canvas text-muted',
    title: 'Page Not Found',
    body: "The page you're looking for doesn't exist or may have been moved.",
    action: 'Go Home', actionPage: 'dashboard',
  },
  '403': {
    icon: Lock, color: 'bg-red-50 text-red-500',
    title: 'Access Denied',
    body: "You don't have permission to view this page. Contact your administrator if you believe this is a mistake.",
    action: 'Go Back', actionPage: 'dashboard',
  },
  'maintenance': {
    icon: Wrench, color: 'bg-amber-50 text-amber-600',
    title: 'Under Maintenance',
    body: "We're performing scheduled maintenance to improve Learnora. We'll be back shortly.",
  },
  'subscription-expired': {
    icon: CreditCard, color: 'bg-red-50 text-red-500',
    title: 'Subscription Expired',
    body: 'Your school subscription has expired. Contact your school administrator to renew.',
    action: 'Contact Admin', actionPage: 'support',
  },
}

export default function EmptyStatePage({ onNavigate }: Props) {
  const [searchParams] = useSearchParams()
  const raw  = searchParams.get('type') ?? '404'
  const type = (raw in stateConfig ? raw : '404') as StateType
  const cfg  = stateConfig[type]
  const Icon = cfg.icon

  return (
    <DashboardLayout
      activePage="dashboard"
      onNavigate={onNavigate}
      title={cfg.title}
    >
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className={`size-24 rounded-full ${cfg.color} flex items-center justify-center mb-6`}>
          <Icon size={36} />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">{cfg.title}</h1>
        <p className="text-sm text-muted max-w-[400px] leading-relaxed mb-8">{cfg.body}</p>
        {cfg.action && cfg.actionPage && (
          <button
            onClick={() => onNavigate(cfg.actionPage!)}
            className="h-12 px-8 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary"
          >
            {cfg.action}
          </button>
        )}
      </div>
    </DashboardLayout>
  )
}

export { stateConfig }
export type { StateType }
