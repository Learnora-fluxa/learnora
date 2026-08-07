import { Home, BookOpen, MessageCircle, Calendar, User, TrendingUp, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type MobileNavItem = { icon: LucideIcon; label: string; page: string }

export const studentMobileNav: MobileNavItem[] = [
  { icon: Home,          label: 'Home',     page: 'm/home' },
  { icon: BookOpen,      label: 'Learn',    page: 'm/learn' },
  { icon: MessageCircle, label: 'Chat',     page: 'm/messages' },
  { icon: Calendar,      label: 'Calendar', page: 'm/calendar' },
  { icon: User,          label: 'Profile',  page: 'm/profile' },
]

export const parentMobileNav: MobileNavItem[] = [
  { icon: Home,          label: 'Home',     page: 'parent/home'         },
  { icon: TrendingUp,    label: 'Progress', page: 'parent/progress'     },
  { icon: MessageCircle, label: 'Chat',     page: 'parent/chat'         },
  { icon: Calendar,      label: 'Calendar', page: 'parent/calendar'     },
  { icon: User,          label: 'Profile',  page: 'parent/profile'      },
]

type Props = {
  children: React.ReactNode
  activePage: string
  onNavigate: (page: string) => void
  nav: MobileNavItem[]
  aiPage?: string
}

export default function MobileLayout({ children, activePage, onNavigate, nav, aiPage }: Props) {
  return (
    <div className="h-screen bg-white flex flex-col max-w-[430px] mx-auto">
      <main className="flex-1 overflow-y-auto relative">
        {children}
        {aiPage && (
          <button
            onClick={() => onNavigate(aiPage)}
            aria-label="Open AI Assistant"
            className="fixed bottom-20 right-4 z-50 size-12 bg-primary text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          >
            <Sparkles size={18} />
          </button>
        )}
      </main>
      <nav className="shrink-0 bg-white border-t border-black/8 px-2 py-1.5">
        <div className="flex items-end justify-around">
          {nav.map(item => {
            const Icon = item.icon
            const active = activePage === item.page
            return (
              <button
                key={item.page}
                type="button"
                onClick={() => onNavigate(item.page)}
                className="flex flex-col items-center gap-0.5 px-3 py-1"
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.5} className={active ? 'text-primary' : 'text-muted/40'} />
                <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-muted/40'}`}>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
