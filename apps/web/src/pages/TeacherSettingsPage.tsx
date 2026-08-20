import { useState, useEffect } from 'react'
import { User, Bell, Lock, Palette, Globe, Smartphone } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

const sections = [
  { id: 'account',       label: 'Account',       icon: User,       desc: 'Manage your personal info and credentials' },
  { id: 'notifications', label: 'Notifications',  icon: Bell,       desc: 'Configure how and when you get notified'  },
  { id: 'security',      label: 'Security',       icon: Lock,       desc: 'Password, 2FA and session management'     },
  { id: 'appearance',    label: 'Appearance',     icon: Palette,    desc: 'Theme and display preferences'           },
  { id: 'language',      label: 'Language',       icon: Globe,      desc: 'Language and region settings'            },
  { id: 'mobile',        label: 'Mobile & Sync',  icon: Smartphone, desc: 'Mobile app and device sync settings'    },
]

const notifItems = [
  { label: 'New assignment submissions', key: 'submissions' },
  { label: 'Student messages',           key: 'messages'    },
  { label: 'Parent messages',            key: 'parent_msgs' },
  { label: 'School announcements',       key: 'announce'    },
  { label: 'Live class reminders',       key: 'live'        },
  { label: 'Admin feedback on uploads',  key: 'feedback'    },
]

export default function TeacherSettingsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [active, setActive]   = useState('account')
  const [name,   setName]     = useState('Mr Johnson')
  const [email,  setEmail]    = useState('johnson@school.edu.ng')
  const [phone,  setPhone]    = useState('+234 812 345 6789')
  const [theme,  setTheme]    = useState<'light' | 'dark' | 'system'>(
    () => (localStorage.getItem('learnora-theme') as 'light' | 'dark' | 'system') ?? 'light'
  )
  const [lang,   setLang]     = useState('English (Nigeria)')
  const [notifs, setNotifs]   = useState<Record<string, boolean>>({
    submissions: true, messages: true, parent_msgs: true, announce: true, live: true, feedback: false,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark')
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) root.setAttribute('data-theme', 'dark')
      else root.removeAttribute('data-theme')
    } else {
      root.removeAttribute('data-theme')
    }
    localStorage.setItem('learnora-theme', theme)
  }, [theme])

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const renderContent = () => {
    switch (active) {
      case 'account':
        return (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4 p-5 bg-canvas rounded-card">
              <div className="size-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold shrink-0">MJ</div>
              <div>
                <p className="font-semibold text-foreground">{name}</p>
                <p className="text-sm text-muted">Class Teacher, SS2A</p>
                <button className="text-xs text-primary font-semibold mt-1 hover:underline">Change photo</button>
              </div>
            </div>
            {[
              { label: 'Full Name', value: name, set: setName, type: 'text' },
              { label: 'Email Address', value: email, set: setEmail, type: 'email' },
              { label: 'Phone Number', value: phone, set: setPhone, type: 'tel' },
            ].map(f => (
              <div key={f.label} className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">{f.label}</label>
                <input
                  type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
                  className="h-11 px-4 border border-black/20 rounded-input text-sm outline-none focus:border-primary"
                />
              </div>
            ))}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Subject(s)</label>
              <input readOnly value="Mathematics, Physics" className="h-11 px-4 border border-black/10 rounded-input text-sm bg-canvas text-muted" />
              <p className="text-xs text-muted">Subject assignments are managed by the admin.</p>
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">Choose which events trigger notifications for you.</p>
            {notifItems.map(n => (
              <div key={n.key} className="flex items-center justify-between py-3 border-b border-black/6 last:border-0">
                <span className="text-sm text-foreground">{n.label}</span>
                <button
                  onClick={() => setNotifs(prev => ({ ...prev, [n.key]: !prev[n.key] }))}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${notifs[n.key] ? 'bg-primary' : 'bg-black/15'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 size-5 bg-white rounded-full shadow transition-transform ${notifs[n.key] ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        )

      case 'security':
        return (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Current Password</label>
              <input type="password" placeholder="••••••••" className="h-11 px-4 border border-black/20 rounded-input text-sm outline-none focus:border-primary" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">New Password</label>
              <input type="password" placeholder="••••••••" className="h-11 px-4 border border-black/20 rounded-input text-sm outline-none focus:border-primary" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Confirm New Password</label>
              <input type="password" placeholder="••••••••" className="h-11 px-4 border border-black/20 rounded-input text-sm outline-none focus:border-primary" />
            </div>
            <div className="p-4 border border-black/10 rounded-card flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Two-Factor Authentication</p>
                <p className="text-xs text-muted mt-0.5">Add an extra layer of security to your account</p>
              </div>
              <button className="h-9 px-4 border border-primary text-primary text-xs font-semibold rounded-pill hover:bg-primary hover:text-white transition-colors">
                Enable 2FA
              </button>
            </div>
          </div>
        )

      case 'appearance':
        return (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-muted">Choose your preferred theme for the Learnora interface.</p>
            <div className="grid grid-cols-3 gap-3">
              {(['light', 'dark', 'system'] as const).map(t => (
                <button
                  key={t} onClick={() => setTheme(t)}
                  className={`p-4 rounded-card border-2 text-sm font-semibold capitalize text-center transition-colors ${theme === t ? 'border-primary text-primary bg-primary/8' : 'border-black/15 text-muted hover:border-primary/40'}`}
                >
                  {t === 'light' ? '☀️ Light' : t === 'dark' ? '🌙 Dark' : '💻 System'}
                </button>
              ))}
            </div>
          </div>
        )

      case 'language':
        return (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Interface Language</label>
              <select value={lang} onChange={e => setLang(e.target.value)}
                className="h-11 px-4 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary">
                {['English (Nigeria)', 'English (UK)', 'English (US)', 'Yoruba', 'Igbo', 'Hausa'].map(l =>
                  <option key={l}>{l}</option>
                )}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Time Zone</label>
              <select className="h-11 px-4 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary">
                <option>Africa/Lagos (WAT +01:00)</option>
                <option>Africa/Abidjan (GMT +00:00)</option>
              </select>
            </div>
          </div>
        )

      case 'mobile':
        return (
          <div className="flex flex-col gap-4">
            <div className="p-4 border border-black/10 rounded-card">
              <p className="text-sm font-semibold text-foreground mb-1">Learnora Mobile App</p>
              <p className="text-xs text-muted mb-3">Download the Learnora teacher app to manage classes on the go.</p>
              <div className="flex gap-2">
                <button className="h-9 px-4 bg-foreground text-white text-xs font-semibold rounded-pill">App Store</button>
                <button className="h-9 px-4 bg-foreground text-white text-xs font-semibold rounded-pill">Google Play</button>
              </div>
            </div>
            <div className="p-4 border border-black/10 rounded-card flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Push Notifications</p>
                <p className="text-xs text-muted mt-0.5">Receive push notifications on your mobile device</p>
              </div>
              <button className="relative inline-flex h-6 w-11 rounded-full bg-primary transition-colors">
                <span className="absolute top-0.5 left-0.5 size-5 bg-white rounded-full shadow translate-x-5" />
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <DashboardLayout
      activePage="teacher-settings"
      onNavigate={onNavigate}
      title="Settings"
      subtitle="Manage your account and preferences"
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[900px] flex flex-col md:flex-row gap-6">

        {/* Sidebar nav */}
        <div className="w-full md:w-[220px] shrink-0 flex flex-col gap-1">
          {sections.map(s => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-input text-sm text-left transition-colors ${active === s.id ? 'bg-primary/10 text-primary font-semibold' : 'text-muted hover:bg-canvas hover:text-foreground'}`}
              >
                <Icon size={15} />
                {s.label}
              </button>
            )
          })}
        </div>

        {/* Content panel */}
        <div className="flex-1 bg-surface rounded-card shadow-sm p-6 flex flex-col gap-6">
          <div>
            <h2 className="text-base font-bold text-foreground">{sections.find(s => s.id === active)?.label}</h2>
            <p className="text-sm text-muted mt-0.5">{sections.find(s => s.id === active)?.desc}</p>
          </div>
          <div className="border-t border-black/6" />

          {renderContent()}

          {active !== 'mobile' && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                className="h-10 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary"
              >
                {saved ? 'Saved ✓' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
