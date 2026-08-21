import { useState } from 'react'
import { Plus, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

function roleDashboard(role: string | undefined): string {
  switch (role) {
    case 'teacher':     return 'teacher-dashboard'
    case 'admin':       return 'admin-dashboard'
    case 'parent':      return 'parent/home'
    case 'super_admin': return 'super-dashboard'
    default:            return 'dashboard'
  }
}

export default function CompleteProfilePage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone,    setPhone]    = useState(profile?.phone    ?? '')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setLoading(true)
    setError('')

    const updates: { full_name?: string | null; phone?: string | null; school_id?: string | null } = {
      full_name: fullName.trim() || null,
      phone:     phone.trim()    || null,
    }
    const schoolId = localStorage.getItem('learnora_selected_school_id')
    if (schoolId && !profile.school_id) updates.school_id = schoolId

    const { error: err } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)

    setLoading(false)
    if (err) { setError(err.message); return }

    localStorage.removeItem('learnora_selected_school_id')
    onNavigate(roleDashboard(profile.role))
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[900px]">

        <h1 className="text-4xl font-semibold text-foreground mb-1">Complete Your Profile</h1>
        <p className="text-base text-muted mb-8">Help us personalise your experience.</p>

        <div className="bg-surface rounded-card shadow-md p-10">

          <div className="flex items-center gap-5 mb-8">
            <div className="size-[120px] rounded-full border-2 border-dashed border-black/20 bg-canvas flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/4 transition-colors">
              <div className="flex flex-col items-center gap-1 text-muted hover:text-primary transition-colors">
                <Plus size={32} />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Add Photo</p>
              <p className="text-xs text-muted mt-0.5">JPG, PNG or GIF — max 2 MB</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">

            <div className="flex flex-col gap-2">
              <label htmlFor="fullName" className="text-sm font-bold text-foreground">Full Name</label>
              <input
                id="fullName"
                type="text"
                required
                placeholder="e.g. Olive Johnson"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="h-[70px] w-full border border-muted/40 rounded-card px-5 text-sm text-foreground placeholder:text-muted/70 outline-none focus:border-primary transition-colors bg-surface"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className="text-sm font-bold text-foreground">Phone Number</label>
              <input
                id="phone"
                type="tel"
                placeholder="+234 800 000 0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="h-[70px] w-full border border-muted/40 rounded-card px-5 text-sm text-foreground placeholder:text-muted/70 outline-none focus:border-primary transition-colors bg-surface"
              />
            </div>

            {profile && (
              <div className="flex flex-col gap-2 bg-canvas rounded-card p-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Your Account</p>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  <span className="text-foreground">
                    Role: <span className="font-semibold capitalize">{profile.role.replace('_', ' ')}</span>
                  </span>
                </div>
                {profile.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                    <span className="text-foreground">Email: <span className="font-semibold">{profile.email}</span></span>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading || !fullName.trim()}
              className="w-full h-[78px] bg-primary text-white text-base font-bold rounded-card hover:bg-primary-deep transition-colors shadow-primary mt-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {loading ? 'Saving…' : 'Finish Setup'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
