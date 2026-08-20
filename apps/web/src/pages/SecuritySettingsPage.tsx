import { useState } from 'react'
import { ChevronLeft, Eye, EyeOff, Shield, Monitor, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav, adminNav, superAdminNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

export default function SecuritySettingsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)
  const settingsPage = profile?.role === 'teacher' ? 'teacher-settings' : profile?.role === 'super_admin' ? 'platform-settings' : 'settings'
  const settingsNav  = profile?.role === 'teacher' ? teacherNav : profile?.role === 'admin' ? adminNav : profile?.role === 'super_admin' ? superAdminNav : undefined

  const [current,   setCurrent]   = useState('')
  const [newPw,     setNewPw]     = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [twoFA]     = useState(false)
  const [pwSaving,  setPwSaving]  = useState(false)
  const [pwSaved,   setPwSaved]   = useState(false)
  const [errors,    setErrors]    = useState<Record<string, string>>({})

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!profile?.email) return
    const errs: Record<string, string> = {}
    if (!current)          errs.current = 'Required'
    if (newPw.length < 8)  errs.newPw   = 'At least 8 characters'
    if (newPw !== confirm)  errs.confirm  = 'Passwords do not match'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setPwSaving(true)

    // Verify current password by re-authenticating
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email:    profile.email,
      password: current,
    })
    if (signInErr) {
      setPwSaving(false)
      setErrors({ current: 'Current password is incorrect' })
      return
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw })
    setPwSaving(false)
    if (updateErr) { setErrors({ general: updateErr.message }); return }

    setPwSaved(true)
    setCurrent(''); setNewPw(''); setConfirm('')
    setTimeout(() => setPwSaved(false), 2500)
  }

  // Active sessions list is illustrative — Supabase does not expose a client-side sessions API
  const sessions = [
    { device: 'Current session', location: '—', time: 'Now', current: true },
  ]

  return (
    <DashboardLayout
      activePage={settingsPage}
      onNavigate={onNavigate}
      title="Security Settings"
      subtitle="Password, two-factor authentication and active sessions"
      nav={settingsNav}
      user={sidebarUser}
    >
      <div className="max-w-[640px] flex flex-col gap-6">

        <button onClick={() => onNavigate(settingsPage)} className="flex items-center gap-2 text-sm text-muted hover:text-foreground w-fit">
          <ChevronLeft size={16} /> Back to Settings
        </button>

        {/* Change password */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h2 className="text-base font-bold text-foreground mb-5">Change Password</h2>

          {errors.general && (
            <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle size={15} className="shrink-0" /> {errors.general}
            </div>
          )}

          <form onSubmit={savePassword} className="flex flex-col gap-4">
            {[
              { label: 'Current Password', val: current, set: setCurrent, key: 'current' },
              { label: 'New Password',     val: newPw,   set: setNewPw,   key: 'newPw'   },
              { label: 'Confirm Password', val: confirm,  set: setConfirm, key: 'confirm'  },
            ].map(f => (
              <div key={f.label} className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">{f.label}</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={f.val}
                    onChange={e => { f.set(e.target.value); setErrors(p => ({ ...p, [f.key]: '', general: '' })) }}
                    className={`w-full h-12 px-4 pr-11 border rounded-input text-sm text-foreground outline-none focus:border-primary transition-colors ${errors[f.key] ? 'border-red-400' : 'border-black/20'}`}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors[f.key] && <p className="text-xs text-red-500">{errors[f.key]}</p>}
              </div>
            ))}
            <button type="submit" disabled={pwSaving}
              className={`flex items-center gap-2 h-11 px-5 rounded-pill text-sm font-semibold self-start transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                pwSaved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary-deep shadow-primary'
              }`}>
              {pwSaved && <CheckCircle2 size={14} />}
              {pwSaving ? 'Updating…' : pwSaved ? 'Password Updated!' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* 2FA */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-card bg-primary/10 flex items-center justify-center">
                <Shield size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Two-Factor Authentication</p>
                <p className="text-xs text-muted mt-0.5">{twoFA ? 'Enabled — extra protection active' : 'Disabled — add extra security'}</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('2fa-setup')}
              className="h-9 px-4 text-sm font-semibold rounded-pill border border-primary text-primary hover:bg-primary hover:text-white transition-colors shrink-0"
            >
              {twoFA ? 'Manage' : 'Set up'}
            </button>
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-black/6">
            <h2 className="text-base font-bold text-foreground">Active Sessions</h2>
          </div>
          <div className="divide-y divide-black/4">
            {sessions.map((s, i) => {
              const Icon = s.device.includes('iPhone') ? Smartphone : Monitor
              return (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Icon size={18} className={s.current ? 'text-primary' : 'text-muted'} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{s.device}</p>
                    <p className="text-xs text-muted mt-0.5">{s.location} · {s.time}</p>
                  </div>
                  {s.current
                    ? <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">Current</span>
                    : <button className="text-xs text-red-500 font-semibold hover:underline">Revoke</button>
                  }
                </div>
              )
            })}
          </div>
          <div className="px-6 py-4 border-t border-black/6">
            <button className="text-sm text-red-500 font-semibold hover:underline">Sign out of all other sessions</button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
