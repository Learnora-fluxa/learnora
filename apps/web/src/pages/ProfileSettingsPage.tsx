import { useState, useEffect } from 'react'
import { Camera, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav, adminNav, superAdminNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

export default function ProfileSettingsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)
  const settingsPage = profile?.role === 'teacher' ? 'teacher-settings' : profile?.role === 'super_admin' ? 'platform-settings' : 'settings'
  const settingsNav  = profile?.role === 'teacher' ? teacherNav : profile?.role === 'admin' ? adminNav : profile?.role === 'super_admin' ? superAdminNav : undefined

  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [phone,     setPhone]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    const parts = (profile.full_name ?? '').trim().split(' ')
    setFirstName(parts[0] ?? '')
    setLastName(parts.slice(1).join(' '))
    setPhone(profile.phone ?? '')
  }, [profile?.id])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    if (!firstName.trim()) { setError('First name is required.'); return }
    setError(null)
    setSaving(true)
    const full_name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || null
    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name, phone: phone.trim() || null })
      .eq('id', profile.id)
    setSaving(false)
    if (err) { logSupabaseError('ProfileSettings.save', err); setError(err.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const initials = sidebarUser.initials

  return (
    <DashboardLayout
      activePage={settingsPage}
      onNavigate={onNavigate}
      title="Profile Settings"
      subtitle="Update your personal information"
      nav={settingsNav}
      user={sidebarUser}
    >
      <div className="max-w-[640px] flex flex-col gap-6">

        <button onClick={() => onNavigate(settingsPage)} className="flex items-center gap-2 text-sm text-muted hover:text-foreground w-fit">
          <ChevronLeft size={16} /> Back to Settings
        </button>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertCircle size={15} className="shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={save} className="flex flex-col gap-6">

          {/* Avatar */}
          <div className="bg-surface rounded-card shadow-sm p-6 flex items-center gap-5">
            <div className="relative">
              <div className="size-20 rounded-full bg-primary text-white text-3xl font-bold flex items-center justify-center">
                {initials}
              </div>
              <button type="button" className="absolute bottom-0 right-0 size-7 rounded-full bg-primary text-white flex items-center justify-center border-2 border-white hover:bg-primary-deep transition-colors">
                <Camera size={12} />
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Profile Photo</p>
              <p className="text-xs text-muted mt-0.5">JPG or PNG. Max 2MB.</p>
              <button type="button" className="text-xs text-primary font-semibold mt-1 hover:underline">Upload photo</button>
            </div>
          </div>

          {/* Personal info */}
          <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-5">
            <h2 className="text-base font-bold text-foreground">Personal Information</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">First Name</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Last Name</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)}
                  className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground outline-none focus:border-primary" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Email Address</label>
              <input type="email" disabled value={profile?.email ?? ''}
                className="h-12 px-4 border border-black/10 rounded-input text-sm text-muted bg-canvas cursor-not-allowed" />
              <p className="text-xs text-muted">Email is managed by your school. Contact admin to change.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234 800 000 0000"
                className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground outline-none focus:border-primary" />
            </div>
          </div>

          <button type="submit" disabled={saving}
            className={`flex items-center gap-2 h-12 px-6 rounded-pill text-sm font-semibold transition-colors self-start disabled:opacity-60 disabled:cursor-not-allowed ${
              saved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary-deep shadow-primary'
            }`}>
            {saved && <CheckCircle2 size={15} />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>

        </form>
      </div>
    </DashboardLayout>
  )
}
