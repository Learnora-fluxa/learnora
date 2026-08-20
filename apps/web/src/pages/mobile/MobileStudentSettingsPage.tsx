import { useState } from 'react'
import { ChevronLeft, ChevronRight, Moon, Sun, Bell, Shield, User, HelpCircle, LogOut } from 'lucide-react'
import MobileLayout, { studentMobileNav } from '../../components/layout/MobileLayout'
import { useAuth } from '../../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

export default function MobileStudentSettingsPage({ onNavigate }: Props) {
  const { signOut }  = useAuth()
  const [darkMode, setDarkMode] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark')

  function toggleDark() {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('learnora-theme', next ? 'dark' : 'light')
  }

  const sections = [
    {
      title: 'Account',
      items: [
        { label: 'Profile Settings',       icon: User,    page: 'profile-settings'   },
        { label: 'Notification Settings',  icon: Bell,    page: 'notif-settings'     },
        { label: 'Security & Password',    icon: Shield,  page: 'security-settings'  },
      ],
    },
    {
      title: 'Support',
      items: [
        { label: 'Help & Support', icon: HelpCircle, page: 'support' },
      ],
    },
  ]

  return (
    <MobileLayout activePage="m/profile" onNavigate={onNavigate} nav={studentMobileNav}>
      <div className="px-5 pt-5 pb-28 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('m/profile')} className="text-muted hover:text-foreground">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
        </div>

        {/* Dark mode toggle */}
        <div className="bg-surface rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            {darkMode ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-amber-500" />}
            <div>
              <p className="text-sm font-semibold text-foreground">Dark Mode</p>
              <p className="text-xs text-muted">{darkMode ? 'On' : 'Off'}</p>
            </div>
          </div>
          <button
            onClick={toggleDark}
            className={`w-12 h-6 rounded-full relative transition-colors ${darkMode ? 'bg-primary' : 'bg-black/15'}`}
            aria-label="Toggle dark mode"
          >
            <span className={`absolute inset-y-[3px] size-[18px] rounded-full bg-white shadow-sm transition-all duration-200 ${darkMode ? 'left-[26px]' : 'left-[3px]'}`} />
          </button>
        </div>

        {/* Settings sections */}
        {sections.map(section => (
          <div key={section.title}>
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2 px-1">{section.title}</p>
            <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
              {section.items.map(({ label, icon: Icon, page }, i, arr) => (
                <button
                  key={page}
                  onClick={() => onNavigate(page)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground hover:bg-canvas transition-colors text-left ${i < arr.length - 1 ? 'border-b border-black/6' : ''}`}
                >
                  <Icon size={16} className="text-muted shrink-0" />
                  <span className="flex-1">{label}</span>
                  <ChevronRight size={14} className="text-muted" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Sign out */}
        <button
          onClick={() => signOut()}
          className="w-full h-12 border border-red-200 text-red-500 text-sm font-bold rounded-2xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={15} /> Sign Out
        </button>

      </div>
    </MobileLayout>
  )
}
