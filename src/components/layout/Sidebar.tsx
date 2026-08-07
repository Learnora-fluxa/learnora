import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard,
  BookOpen,
  PenLine,
  BarChart2,
  Video,
  MessageSquare,
  Sparkles,
  Calendar,
  Download,
  Settings,
  Users,
  ClipboardCheck,
  FileText,
  TrendingUp,
  FileBarChart,
  BarChart3,
  FolderOpen,
  Megaphone,
  HelpCircle,
  LogOut,
  AlertCircle,
  DollarSign,
  Shield,
  ScrollText,
  LayoutGrid,
  ToggleLeft,
  Mail,
  Award,
  MonitorCheck,
  X,
  type LucideIcon,
} from 'lucide-react'
import ConfirmDialog from '../shared/ConfirmDialog'

export type NavItem = {
  label: string
  icon: LucideIcon
  page: string
}

export const studentNav: NavItem[] = [
  { label: 'Dashboard',    icon: LayoutDashboard, page: 'dashboard' },
  { label: 'My Courses',   icon: BookOpen,        page: 'courses' },
  { label: 'Assignments',  icon: PenLine,         page: 'assignments' },
  { label: 'Analysis',     icon: BarChart2,       page: 'analysis' },
  { label: 'Live Classes', icon: Video,           page: 'live-classes' },
  { label: 'Messages',     icon: MessageSquare,   page: 'messages' },
  { label: 'AI Tutor',     icon: Sparkles,        page: 'ai-tutor' },
  { label: 'Calendar',     icon: Calendar,        page: 'calendar' },
  { label: 'Downloads',    icon: Download,        page: 'downloads' },
  { label: 'Settings',     icon: Settings,        page: 'settings' },
]

export const adminNav: NavItem[] = [
  { label: 'Dashboard',     icon: LayoutDashboard, page: 'admin-dashboard'      },
  { label: 'Users',         icon: Users,           page: 'user-management'      },
  { label: 'Classes',       icon: BookOpen,        page: 'classes-management'   },
  { label: 'Attendance',    icon: ClipboardCheck,  page: 'admin-attendance'     },
  { label: 'Finance',       icon: TrendingUp,      page: 'finance'              },
  { label: 'Fee Setup',     icon: DollarSign,      page: 'admin-fee-setup'      },
  { label: 'Fee Collection',icon: ClipboardCheck,  page: 'fee-collection'       },
  { label: 'Subscription',  icon: FileText,        page: 'subscription'         },
  { label: 'Analytics',     icon: BarChart2,       page: 'school-analytics'     },
  { label: 'Reports',       icon: FileBarChart,    page: 'admin-reports'        },
  { label: 'Report Builder',icon: BarChart3,       page: 'report-builder'       },
  { label: 'Results',       icon: Award,           page: 'admin-results'        },
  { label: 'Timetable',     icon: LayoutGrid,      page: 'timetable'            },
  { label: 'Integrations',  icon: FolderOpen,      page: 'integrations'         },
  { label: 'Announcements', icon: Megaphone,       page: 'admin-announcements'  },
  { label: 'Messages',      icon: MessageSquare,   page: 'admin-messages'       },
  { label: 'Roles',         icon: Shield,          page: 'roles-permissions'    },
  { label: 'Audit Logs',    icon: ScrollText,      page: 'audit-logs'           },
  { label: 'Settings',      icon: Settings,        page: 'settings'             },
  { label: 'Support',       icon: HelpCircle,      page: 'admin-support'        },
  { label: 'Logout',        icon: LogOut,          page: 'logout'               },
]

export const superAdminNav: NavItem[] = [
  { label: 'Platform',      icon: LayoutDashboard, page: 'super-dashboard'   },
  { label: 'Schools',       icon: BookOpen,        page: 'schools-list'      },
  { label: 'Users',         icon: Users,           page: 'super-users'       },
  { label: 'Billing',       icon: TrendingUp,      page: 'platform-billing'  },
  { label: 'Plans',         icon: FileText,        page: 'plans-pricing'     },
  { label: 'Analytics',     icon: BarChart2,       page: 'platform-analytics'},
  { label: 'Broadcast',     icon: Megaphone,       page: 'broadcast'         },
  { label: 'Messages',      icon: MessageSquare,   page: 'super-messages'    },
  { label: 'Feature Flags', icon: ToggleLeft,      page: 'feature-flags'     },
  { label: 'Email Templates',icon: Mail,           page: 'email-templates'   },
  { label: 'Audit Logs',    icon: ScrollText,      page: 'audit-logs'        },
  { label: 'Support',       icon: HelpCircle,      page: 'support-tickets'   },
  { label: 'Settings',      icon: Settings,        page: 'platform-settings' },
  { label: 'Logout',        icon: LogOut,          page: 'logout'            },
]

export const teacherNav: NavItem[] = [
  { label: 'Dashboard',     icon: LayoutDashboard, page: 'teacher-dashboard'     },
  { label: 'My Classes',    icon: BookOpen,        page: 'classes'               },
  { label: 'Students',      icon: Users,           page: 'students'              },
  { label: 'Assignments',   icon: PenLine,         page: 'teacher-assignments'   },
  { label: 'Attendance',    icon: ClipboardCheck,  page: 'attendance'            },
  { label: 'Examinations',  icon: FileText,        page: 'examinations'          },
  { label: 'CBT Exams',     icon: MonitorCheck,    page: 'cbt-exams'             },
  { label: 'Gradebook',     icon: BarChart3,       page: 'gradebook'             },
  { label: 'Analytics',     icon: TrendingUp,      page: 'analytics'             },
  { label: 'Performance',   icon: BarChart2,       page: 'class-performance'     },
  { label: 'Behavior',      icon: AlertCircle,     page: 'behavior-analytics'    },
  { label: 'Live Classes',  icon: Video,           page: 'teacher-live-classes'  },
  { label: 'Messages',      icon: MessageSquare,   page: 'teacher-messages'      },
  { label: 'Resources',     icon: FolderOpen,      page: 'resources'             },
  { label: 'Calendar',      icon: Calendar,        page: 'teacher-calendar'      },
  { label: 'Announcements', icon: Megaphone,       page: 'teacher-announcements' },
  { label: 'AI Assistant',  icon: Sparkles,        page: 'ai-assistant'          },
  { label: 'Reports',       icon: FileBarChart,    page: 'reports'               },
  { label: 'Settings',      icon: Settings,        page: 'teacher-settings'      },
  { label: 'Support',       icon: HelpCircle,      page: 'teacher-support'       },
  { label: 'Logout',        icon: LogOut,          page: 'logout'                },
]

export const parentNav: NavItem[] = [
  { label: 'Home',          icon: LayoutDashboard, page: 'parent/home'          },
  { label: 'Progress',      icon: TrendingUp,      page: 'parent/progress'      },
  { label: 'Messages',      icon: MessageSquare,   page: 'parent/chat'          },
  { label: 'Calendar',      icon: Calendar,        page: 'parent/calendar'      },
  { label: 'School Fees',   icon: DollarSign,      page: 'parent/fees'          },
  { label: 'Profile',       icon: Settings,        page: 'parent/profile'       },
  { label: 'Logout',        icon: LogOut,          page: 'logout'               },
]

type SidebarUser = { name: string; role: string; initials: string }

type Props = {
  activePage:  string
  onNavigate:  (page: string) => void
  nav?:        NavItem[]
  user?:       SidebarUser
  onClose?:    () => void
  showClose?:  boolean
}

const defaultUser: SidebarUser = { name: 'Olive Johnson', role: 'Student', initials: 'O' }

export default function Sidebar({
  activePage,
  onNavigate,
  nav = studentNav,
  user = defaultUser,
  onClose,
  showClose,
}: Props) {
  const { signOut } = useAuth()
  const [logoutOpen, setLogoutOpen] = useState(false)

  function handleNavClick(page: string) {
    if (page === 'logout') {
      setLogoutOpen(true)
      return
    }
    onNavigate(page)
    onClose?.()
  }

  return (
    <>
      <aside className="flex flex-col w-[280px] shrink-0 h-full bg-sidebar">
        {/* Wordmark + mobile close */}
        <div className="px-6 md:px-10 pt-8 pb-6 flex items-center justify-between">
          <span className="text-xl font-bold text-white tracking-tight">Learnora</span>
          {showClose && (
            <button onClick={onClose} className="text-white/60 hover:text-white lg:hidden">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-4 flex-1 overflow-y-auto">
          {nav.map(item => {
            const active = activePage === item.page
            const Icon = item.icon
            return (
              <button
                key={item.page}
                onClick={() => handleNavClick(item.page)}
                className={`
                  relative flex items-center gap-3 w-full px-4 py-2.5 rounded-md
                  text-sm font-normal text-left transition-colors
                  ${active
                    ? 'bg-sidebar-active text-sidebar-text-active font-semibold'
                    : 'text-sidebar-text hover:bg-white/8 hover:text-white'}
                `}
              >
                {active && (
                  <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-primary" />
                )}
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Bottom user stub */}
        <div className="px-6 py-6 mt-auto border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user.initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-sidebar-text truncate">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={logoutOpen}
        title="Log out?"
        body="You will be returned to the login screen. Any unsaved work may be lost."
        confirmLabel="Log out"
        cancelLabel="Stay"
        danger
        onConfirm={async () => { setLogoutOpen(false); await signOut(); onNavigate('login') }}
        onCancel={() => setLogoutOpen(false)}
      />
    </>
  )
}
