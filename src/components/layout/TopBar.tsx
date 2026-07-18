import { useState } from 'react'
import { Search, Bell, MessageSquare, Calendar, Menu, ChevronDown, User, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import ConfirmDialog from '../shared/ConfirmDialog'

type SidebarUser = { name: string; role: string; initials: string }

type Props = {
  title:        string
  subtitle?:    string
  onMenuClick:  () => void
  onNavigate?:  (page: string) => void
  user?:        SidebarUser
}

// Role-aware top-bar destinations. null hides the icon for that role.
function roleNav(role: string | undefined) {
  switch (role) {
    case 'teacher':
      return { notifications: 'notifications',        messages: 'teacher-messages', calendar: 'teacher-calendar', settings: 'teacher-settings'  }
    case 'admin':
      return { notifications: 'notifications',        messages: 'admin-messages',   calendar: 'timetable',        settings: 'settings'          }
    case 'parent':
      return { notifications: 'parent/notifications', messages: 'parent/chat',      calendar: 'parent/calendar',  settings: 'settings'          }
    case 'super_admin':
      return { notifications: 'super-notifications',  messages: 'super-messages',   calendar: null,               settings: 'platform-settings' }
    default: // student
      return { notifications: 'notifications',        messages: 'messages',         calendar: 'calendar',         settings: 'settings'          }
  }
}

export default function TopBar({ title, subtitle, onMenuClick, onNavigate, user }: Props) {
  const { profile, signOut } = useAuth()
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const nav     = onNavigate ?? (() => {})
  const routes  = roleNav(profile?.role)

  return (
    <header className="flex items-center gap-3 md:gap-4 px-4 md:px-8 py-4 md:py-5 bg-surface border-b border-black/6 relative z-20">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-1 text-muted hover:text-foreground transition-colors shrink-0"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg md:text-2xl font-semibold text-foreground leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs md:text-sm text-muted mt-0.5 truncate">{subtitle}</p>}
      </div>

      {/* Search bar */}
      <div className="hidden md:flex items-center gap-2.5 h-11 px-4 bg-canvas border border-black/8 rounded-input w-72">
        <Search size={16} className="text-muted shrink-0" />
        <input
          type="search"
          placeholder="Search courses, lessons, or assignments"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
          onKeyDown={e => { if (e.key === 'Enter') nav('search') }}
        />
      </div>

      {/* Action icons */}
      <div className="flex items-center gap-1 md:gap-2">
        {routes.notifications && (
          <button
            onClick={() => nav(routes.notifications!)}
            className="relative p-2 text-muted hover:text-foreground transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full" />
          </button>
        )}
        {routes.messages && (
          <button
            onClick={() => nav(routes.messages!)}
            className="hidden sm:block p-2 text-muted hover:text-foreground transition-colors"
            aria-label="Messages"
          >
            <MessageSquare size={20} />
          </button>
        )}
        {routes.calendar && (
          <button
            onClick={() => nav(routes.calendar!)}
            className="hidden sm:block p-2 text-muted hover:text-foreground transition-colors"
            aria-label="Calendar"
          >
            <Calendar size={20} />
          </button>
        )}

        {/* Avatar + dropdown */}
        <div className="relative ml-1">
          <button
            onClick={() => setAvatarOpen(p => !p)}
            className="flex items-center gap-1.5"
            aria-label="Account menu"
          >
            <div className="size-9 md:size-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.initials ?? 'U'}
            </div>
            <ChevronDown
              size={14}
              className={`hidden md:block text-muted transition-transform duration-200 ${avatarOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {avatarOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAvatarOpen(false)} />
              <div className="absolute right-0 top-[calc(100%+8px)] w-52 bg-white rounded-card shadow-xl border border-black/8 py-1.5 z-50">
                {user && (
                  <div className="px-4 py-3 border-b border-black/6">
                    <p className="text-sm font-bold text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted truncate">{user.role}</p>
                  </div>
                )}
                <button
                  onClick={() => { setAvatarOpen(false); nav('profile-settings') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-canvas transition-colors text-left text-foreground"
                >
                  <User size={14} className="shrink-0" /> View Profile
                </button>
                <button
                  onClick={() => { setAvatarOpen(false); nav(routes.settings) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-canvas transition-colors text-left text-foreground"
                >
                  <Settings size={14} className="shrink-0" /> Settings
                </button>
                <button
                  onClick={() => { setAvatarOpen(false); setLogoutOpen(true) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-canvas transition-colors text-left text-red-500"
                >
                  <LogOut size={14} className="shrink-0" /> Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        title="Log out?"
        body="You will be returned to the login screen. Any unsaved work may be lost."
        confirmLabel="Log out"
        cancelLabel="Stay"
        danger
        onConfirm={async () => { setLogoutOpen(false); await signOut(); nav('login') }}
        onCancel={() => setLogoutOpen(false)}
      />
    </header>
  )
}
