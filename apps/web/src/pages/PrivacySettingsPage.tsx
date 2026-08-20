import { useState, useEffect } from 'react'
import { Eye, BarChart2, Bell, Share2, CheckCircle2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Toggle {
  id:       string
  label:    string
  desc:     string
  icon:     typeof Eye
  value:    boolean
}

const DEFAULTS: Toggle[] = [
  { id: 'profile_visible',    label: 'Profile visible to classmates',     desc: 'Other students can see your name and class.',          icon: Eye,       value: true  },
  { id: 'analytics_share',    label: 'Share performance with teachers',   desc: 'Teachers see your grades and attendance trends.',      icon: BarChart2, value: true  },
  { id: 'activity_status',    label: 'Show activity status',              desc: 'Others can see when you were last active.',            icon: Bell,      value: false },
  { id: 'data_collection',    label: 'Usage analytics for improvement',   desc: 'Help us improve Learnora by sharing anonymised data.', icon: Share2,    value: true  },
]

export default function PrivacySettingsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)
  const [saved, setSaved]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [toggles, setToggles] = useState<Toggle[]>(DEFAULTS)

  // Load saved prefs from auth user_metadata on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata?.privacy_prefs as Record<string, boolean> | undefined
      if (meta) {
        setToggles(prev => prev.map(t => ({ ...t, value: meta[t.id] ?? t.value })))
      }
    })
  }, [])

  function flip(id: string) {
    setToggles(prev => prev.map(t => t.id === id ? { ...t, value: !t.value } : t))
  }

  async function save() {
    setSaving(true)
    const prefs = Object.fromEntries(toggles.map(t => [t.id, t.value]))
    // Persist to Supabase auth user_metadata (no schema change required)
    await supabase.auth.updateUser({ data: { privacy_prefs: prefs } })
    localStorage.setItem('learnora_privacy', JSON.stringify(prefs))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <DashboardLayout
      activePage="settings"
      onNavigate={onNavigate}
      title="Privacy Settings"
      subtitle="Control how your data is used and who can see it"
      user={sidebarUser}
    >
      <div className="max-w-[640px] flex flex-col gap-5">

        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="divide-y divide-black/4">
            {toggles.map(t => {
              const Icon = t.icon
              return (
                <div key={t.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="size-9 rounded-full bg-canvas flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{t.label}</p>
                    <p className="text-xs text-muted mt-0.5">{t.desc}</p>
                  </div>
                  <button
                    onClick={() => flip(t.id)}
                    className={`w-10 h-5.5 rounded-full relative transition-colors shrink-0 ${t.value ? 'bg-primary' : 'bg-black/15'}`}
                  >
                    <span className={`absolute inset-y-[2px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${t.value ? 'left-[22px]' : 'left-[2px]'}`} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Data deletion */}
        <div className="bg-surface rounded-card shadow-sm p-5">
          <p className="text-sm font-bold text-foreground mb-1">Data & Account</p>
          <p className="text-xs text-muted mb-4">You can request a copy of your data or ask for your account to be deleted.</p>
          <div className="flex gap-3">
            <button className="h-9 px-4 border border-black/15 rounded-pill text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors">
              Download my data
            </button>
            <button className="h-9 px-4 border border-red-200 rounded-pill text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
              Delete account
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 h-10 px-6 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-60">
            {saved ? <><CheckCircle2 size={14} /> Saved</> : saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
