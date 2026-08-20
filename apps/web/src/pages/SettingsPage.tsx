import { User, Bell, Shield, ChevronRight, LogOut, Palette, Wifi, Lock, Smartphone, Link2, HardDrive, RefreshCw } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav, adminNav, superAdminNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { signOut } from '../lib/auth'

type Props = { onNavigate: (page: string) => void }

const sections = [
  {
    title: 'Account',
    items: [
      { icon: User,       label: 'Profile Settings',      sub: 'Update your name, photo and bio',          page: 'profile-settings'   },
      { icon: Bell,       label: 'Notification Settings', sub: 'Manage how you receive notifications',      page: 'notif-settings'     },
      { icon: Shield,     label: 'Security Settings',     sub: 'Password, 2FA and active sessions',        page: 'security-settings'  },
    ],
  },
  {
    title: 'Privacy & Devices',
    items: [
      { icon: Lock,       label: 'Privacy Settings',      sub: 'Control who can see your profile and data', page: 'privacy-settings'   },
      { icon: Smartphone, label: 'Connected Devices',     sub: 'Manage sessions on your devices',           page: 'connected-devices'  },
      { icon: Link2,      label: 'Linked Accounts',       sub: 'Connect Google, Microsoft or Apple',        page: 'linked-accounts'    },
    ],
  },
  {
    title: 'Appearance & Offline',
    items: [
      { icon: Palette,    label: 'Theme',                 sub: 'Light mode (Dark mode coming soon)',        page: 'appearance-settings'},
      { icon: HardDrive,  label: 'Storage Management',   sub: 'See what is taking up space',               page: 'storage-management' },
      { icon: RefreshCw,  label: 'Offline Sync',         sub: 'View items waiting to sync',                page: 'offline-sync'       },
      { icon: Wifi,       label: 'Downloads',            sub: 'Manage offline content',                    page: 'downloads'          },
    ],
  },
]

export default function SettingsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)
  const settingsPage = profile?.role === 'teacher' ? 'teacher-settings' : profile?.role === 'super_admin' ? 'platform-settings' : 'settings'
  const settingsNav  = profile?.role === 'teacher' ? teacherNav : profile?.role === 'admin' ? adminNav : profile?.role === 'super_admin' ? superAdminNav : undefined
  const displayName  = profile?.full_name ?? sidebarUser.name
  const displayEmail = profile?.email ?? ''
  const displayRole  = profile ? (profile.role.charAt(0).toUpperCase() + profile.role.slice(1).replace('_', ' ')) : ''

  return (
    <DashboardLayout
      activePage={settingsPage}
      onNavigate={onNavigate}
      title="Settings"
      subtitle="Manage your account and preferences"
      nav={settingsNav}
      user={sidebarUser}
    >
      <div className="max-w-[700px] flex flex-col gap-6">

        {/* Profile summary */}
        <div className="bg-surface rounded-card shadow-sm p-6 flex items-center gap-5">
          <div className="size-16 rounded-full bg-primary text-white text-2xl font-bold flex items-center justify-center shrink-0">
            {sidebarUser.initials}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
            <p className="text-sm text-muted capitalize">{displayRole}</p>
            {displayEmail && <p className="text-xs text-muted mt-0.5">{displayEmail}</p>}
          </div>
          <button onClick={() => onNavigate('profile-settings')}
            className="h-9 px-4 border border-primary text-primary text-sm font-semibold rounded-pill hover:bg-primary hover:text-white transition-colors shrink-0">
            Edit Profile
          </button>
        </div>

        {/* Sections */}
        {sections.map(section => (
          <div key={section.title} className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-black/6">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">{section.title}</p>
            </div>
            <div className="divide-y divide-black/4">
              {section.items.map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    onClick={() => onNavigate(item.page)}
                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-canvas/50 transition-colors text-left"
                  >
                    <div className="size-9 rounded-card bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted mt-0.5">{item.sub}</p>
                    </div>
                    <ChevronRight size={15} className="text-muted shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* Danger zone */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-black/6">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Session</p>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-red-50/50 transition-colors text-left"
          >
            <div className="size-9 rounded-card bg-red-50 flex items-center justify-center shrink-0">
              <LogOut size={16} className="text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-600">Sign Out</p>
              <p className="text-xs text-muted mt-0.5">Sign out of your account on this device</p>
            </div>
            <ChevronRight size={15} className="text-muted shrink-0" />
          </button>
        </div>

        <p className="text-center text-xs text-muted pb-4">Learnora v1.0.0 · Terms · Privacy</p>

      </div>
    </DashboardLayout>
  )
}
