import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor, Type, Eye, Save, CheckCircle2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }
type Theme    = 'light' | 'dark' | 'system'
type FontSize = 'small' | 'medium' | 'large'

const PREFS_KEY = 'learnora_appearance'

export default function AppearanceSettingsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [theme,       setTheme]       = useState<Theme>('light')
  const [fontSize,    setFontSize]    = useState<FontSize>('medium')
  const [compact,     setCompact]     = useState(false)
  const [animations,  setAnimations]  = useState(true)
  const [highContrast,setHighContrast]= useState(false)
  const [saved,       setSaved]       = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY)
      if (raw) {
        const p = JSON.parse(raw)
        if (p.theme)       setTheme(p.theme)
        if (p.fontSize)    setFontSize(p.fontSize)
        if (p.compact     !== undefined) setCompact(p.compact)
        if (p.animations  !== undefined) setAnimations(p.animations)
        if (p.highContrast !== undefined) setHighContrast(p.highContrast)
      }
    } catch {}
  }, [])

  function handleSave() {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ theme, fontSize, compact, animations, highContrast }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const themeOptions: { id: Theme; label: string; icon: typeof Sun; desc: string }[] = [
    { id: 'light',  label: 'Light',  icon: Sun,     desc: 'Default white theme'       },
    { id: 'dark',   label: 'Dark',   icon: Moon,    desc: 'Easy on the eyes at night' },
    { id: 'system', label: 'System', icon: Monitor, desc: 'Follows your device theme' },
  ]

  const fontOptions: { id: FontSize; label: string; size: string }[] = [
    { id: 'small',  label: 'Small',  size: 'text-xs'  },
    { id: 'medium', label: 'Medium', size: 'text-sm'  },
    { id: 'large',  label: 'Large',  size: 'text-base'},
  ]

  return (
    <DashboardLayout
      activePage="settings"
      onNavigate={onNavigate}
      title="Appearance"
      subtitle="Customise how Learnora looks for you"
      user={sidebarUser}
    >
      <div className="max-w-[600px] flex flex-col gap-6">

        {/* Theme */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Sun size={14} className="text-primary" /> Theme
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {themeOptions.map(opt => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-card border-2 transition-all ${theme === opt.id ? 'border-primary bg-primary/4' : 'border-black/10 hover:border-black/25'}`}
                >
                  <div className={`size-10 rounded-full flex items-center justify-center ${theme === opt.id ? 'bg-primary text-white' : 'bg-canvas text-muted'}`}>
                    <Icon size={18} />
                  </div>
                  <p className="text-sm font-bold text-foreground">{opt.label}</p>
                  <p className="text-[10px] text-muted text-center">{opt.desc}</p>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted mt-3 flex items-center gap-1.5">
            <Monitor size={11} /> Dark mode preview coming — currently light only.
          </p>
        </div>

        {/* Font size */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Type size={14} className="text-primary" /> Text Size
          </h2>
          <div className="flex gap-3">
            {fontOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setFontSize(opt.id)}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-card border-2 transition-all ${fontSize === opt.id ? 'border-primary bg-primary/4' : 'border-black/10 hover:border-black/25'}`}
              >
                <span className={`font-bold text-foreground ${opt.size}`}>Aa</span>
                <p className="text-xs font-semibold text-muted">{opt.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Eye size={14} className="text-primary" /> Display Options
          </h2>
          <div className="flex flex-col divide-y divide-black/6">
            {[
              { label: 'Compact Mode',       desc: 'Reduce spacing and card sizes for denser layouts', value: compact,      set: setCompact      },
              { label: 'Animations',         desc: 'Enable page transitions and micro-animations',     value: animations,   set: setAnimations   },
              { label: 'High Contrast',      desc: 'Increase contrast for better readability',         value: highContrast, set: setHighContrast },
            ].map(({ label, desc, value, set }) => (
              <div key={label} className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => set(!value)}
                  className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${value ? 'bg-primary' : 'bg-black/15'}`}
                >
                  <span className={`absolute inset-y-[2px] w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${value ? 'left-[22px]' : 'left-[2px]'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-surface rounded-card shadow-sm p-5 border-2 border-primary/10">
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Preview</p>
          <div className="bg-canvas rounded-card p-4 flex flex-col gap-2">
            <div className="h-3 w-2/3 bg-foreground/15 rounded" />
            <div className="h-2.5 w-full bg-black/8 rounded" />
            <div className="h-2.5 w-4/5 bg-black/8 rounded" />
            <div className="h-8 w-24 bg-primary/20 rounded-full mt-1" />
          </div>
          <p className="text-xs text-muted mt-2">Theme: <strong>{theme}</strong> · Text: <strong>{fontSize}</strong>{compact ? ' · compact' : ''}{highContrast ? ' · high contrast' : ''}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors"
          >
            <Save size={15} /> Save Preferences
          </button>
          {saved && <span className="flex items-center gap-1.5 text-green-600 text-sm font-semibold"><CheckCircle2 size={15} /> Saved!</span>}
        </div>
      </div>
    </DashboardLayout>
  )
}
