import { useState } from 'react'
import { Save, CheckCircle2, Upload, Globe, Mail, Phone, Building2 } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

export default function SchoolSystemSettingsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [saved, setSaved] = useState(false)

  const [school, setSchool] = useState({
    name:       'Greenfield Academy',
    tagline:    'Excellence in Education',
    code:       'GFA-001',
    email:      'admin@greenfield.edu.ng',
    phone:      '+234 801 234 5678',
    address:    '12 Okpara Avenue, Enugu State',
    website:    'www.greenfield.edu.ng',
    subdomain:  'greenfield',
    primaryColor: '#4b75ff',
    timezone:   'Africa/Lagos',
    currency:   'NGN',
    term:       'First Term 2025/2026',
  })

  function update(key: keyof typeof school, value: string) {
    setSchool(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <DashboardLayout
      activePage="settings"
      onNavigate={onNavigate}
      title="School Settings"
      subtitle="Manage your school's profile, branding, and system configuration"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[760px] flex flex-col gap-6">

        {/* School Logo */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Building2 size={14} className="text-primary" /> School Branding
          </h2>
          <div className="flex items-center gap-5 mb-5">
            <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
              G
            </div>
            <div>
              <button className="flex items-center gap-2 h-9 px-4 border border-black/20 rounded-full text-sm font-semibold hover:bg-canvas transition-colors">
                <Upload size={13} /> Upload Logo
              </button>
              <p className="text-xs text-muted mt-1.5">PNG or SVG · Max 2MB · Recommended 256×256px</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">School Name</label>
              <input
                value={school.name}
                onChange={e => update('name', e.target.value)}
                className="w-full h-10 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Tagline / Motto</label>
              <input
                value={school.tagline}
                onChange={e => update('tagline', e.target.value)}
                className="w-full h-10 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Brand Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={school.primaryColor}
                  onChange={e => update('primaryColor', e.target.value)}
                  className="size-10 rounded-card border border-black/20 cursor-pointer p-0.5"
                />
                <input
                  value={school.primaryColor}
                  onChange={e => update('primaryColor', e.target.value)}
                  className="flex-1 h-10 px-3 border border-black/20 rounded-card text-sm font-mono outline-none focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">School Code</label>
              <input
                value={school.code}
                readOnly
                className="w-full h-10 px-3 border border-black/20 rounded-card text-sm font-mono bg-canvas text-muted outline-none"
              />
              <p className="text-[10px] text-muted mt-1">Used by students to join your school. Contact Learnora to change.</p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Phone size={14} className="text-primary" /> Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">School Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={school.email}
                  onChange={e => update('email', e.target.value)}
                  className="w-full h-10 pl-9 pr-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={school.phone}
                  onChange={e => update('phone', e.target.value)}
                  className="w-full h-10 pl-9 pr-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Website</label>
              <div className="relative">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={school.website}
                  onChange={e => update('website', e.target.value)}
                  className="w-full h-10 pl-9 pr-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Learnora Subdomain</label>
              <div className="flex items-center">
                <input
                  value={school.subdomain}
                  onChange={e => update('subdomain', e.target.value)}
                  className="flex-1 h-10 px-3 border border-black/20 rounded-l-card text-sm font-mono outline-none focus:border-primary"
                />
                <span className="h-10 px-3 flex items-center bg-canvas border border-l-0 border-black/20 rounded-r-card text-xs text-muted">.learnora.io</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted mb-1.5">School Address</label>
              <input
                value={school.address}
                onChange={e => update('address', e.target.value)}
                className="w-full h-10 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* System Config */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h2 className="text-sm font-bold text-foreground mb-4">System Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Timezone',         key: 'timezone',  opts: ['Africa/Lagos', 'Africa/Nairobi', 'Africa/Accra', 'Europe/London', 'UTC'] },
              { label: 'Currency',         key: 'currency',  opts: ['NGN', 'GHS', 'KES', 'USD', 'GBP'] },
              { label: 'Current Term',     key: 'term',      opts: ['First Term 2025/2026', 'Second Term 2025/2026', 'Third Term 2025/2026'] },
            ].map(({ label, key, opts }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-muted mb-1.5">{label}</label>
                <select
                  value={school[key as keyof typeof school]}
                  onChange={e => update(key as keyof typeof school, e.target.value)}
                  className="w-full h-10 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
                >
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors"
          >
            <Save size={15} /> Save Settings
          </button>
          {saved && (
            <span className="flex items-center gap-2 text-green-600 text-sm font-semibold">
              <CheckCircle2 size={16} /> Saved!
            </span>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
