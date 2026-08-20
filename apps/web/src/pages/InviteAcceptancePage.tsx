import { useState, useEffect } from 'react'
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import AuthHeroPanel from '../components/auth/AuthHeroPanel'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface InviteData {
  id: string
  school_id: string
  email: string | null
  full_name: string | null
  role: string
  class_id: string | null
  status: string
  school_name?: string
}

export default function InviteAcceptancePage({ onNavigate }: Props) {
  const [invite,    setInvite]    = useState<InviteData | null>(null)
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(true)

  const [fullName,  setFullName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [done,      setDone]      = useState(false)

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) { setError('No invite token found.'); setLoading(false); return }
    loadInvite(token)
  }, [])

  async function loadInvite(token: string) {
    const { data, error: err } = await supabase
      .from('invitations')
      .select('id, school_id, email, full_name, role, class_id, status, schools(name)')
      .eq('token', token)
      .single()

    if (err || !data) { setError('Invalid or expired invite link.'); setLoading(false); return }
    if (data.status === 'accepted') { setError('This invite has already been used.'); setLoading(false); return }

    const inv = {
      ...data,
      school_name: (data.schools as unknown as { name: string }[] | null)?.[0]?.name ?? 'Your School',
    } as InviteData & { school_name: string }

    setInvite(inv)
    setFullName(inv.full_name ?? '')
    setEmail(inv.email ?? '')
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!invite) return
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setError('')
    setSaving(true)

    try {
      // 1. Sign up the new user
      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (signUpErr) throw signUpErr
      const userId = authData.user?.id
      if (!userId) throw new Error('Signup failed — no user ID returned.')

      // 2. Update profile with school + role (trigger already created the profile row)
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          school_id: invite.school_id,
          role: invite.role,
          full_name: fullName,
        })
        .eq('id', userId)
      if (profErr) throw profErr

      // 3. Enrol student in class if class_id is set
      if (invite.class_id && invite.role === 'student') {
        await supabase.from('class_enrollments').insert({
          school_id: invite.school_id,
          student_id: userId,
          class_id: invite.class_id,
        })
      }

      // 4. Mark invite accepted
      await supabase.from('invitations').update({ status: 'accepted' }).eq('id', invite.id)

      setDone(true)
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const roleLabel = invite?.role
    ? invite.role.charAt(0).toUpperCase() + invite.role.slice(1)
    : 'User'

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      <div className="lg:w-[52%] lg:flex-shrink-0 p-3 lg:p-6">
        <AuthHeroPanel />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-0 lg:px-12">
        <div className="w-full max-w-[500px]">

          {loading ? (
            <p className="text-muted text-sm text-center">Loading invite...</p>

          ) : error && !invite ? (
            <div className="text-center">
              <div className="size-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={28} className="text-red-500" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground mb-3">Invalid Invite</h1>
              <p className="text-base text-muted mb-8">{error}</p>
              <button onClick={() => onNavigate('login')}
                className="h-12 px-8 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">
                Back to Login
              </button>
            </div>

          ) : done ? (
            <div className="text-center">
              <div className="size-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={28} className="text-green-600" />
              </div>
              <h1 className="text-3xl font-semibold text-foreground mb-3">You're all set!</h1>
              <p className="text-base text-muted mb-8">Your account has been activated. Welcome to Learnora!</p>
              <button onClick={() => onNavigate('login')}
                className="w-full h-14 bg-primary text-white text-base font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary">
                Sign In
              </button>
            </div>

          ) : (
            <>
              {invite && (
                <div className="flex items-center gap-3 bg-primary/8 rounded-card px-4 py-3 mb-6">
                  <div className="size-9 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {(invite.school_name ?? 'S').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{invite.school_name}</p>
                    <p className="text-xs text-muted">You've been invited as a {roleLabel}</p>
                  </div>
                </div>
              )}

              <h1 className="text-4xl font-semibold text-foreground mb-2 leading-tight">Accept Invitation</h1>
              <p className="text-base text-muted mb-8">Set up your account to get started.</p>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-card px-4 py-3 mb-5 text-sm text-red-700">
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-foreground">Full Name <span className="text-red-500">*</span></label>
                  <input required value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="h-14 px-5 border border-black/20 rounded-input text-base text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors" />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-foreground">Email Address <span className="text-red-500">*</span></label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="h-14 px-5 border border-black/20 rounded-input text-base text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors" />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-foreground">Create Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} required value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 characters"
                      className="w-full h-14 px-5 pr-12 border border-black/20 rounded-input text-base text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={saving}
                  className="h-14 bg-primary text-white text-base font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-60">
                  {saving ? 'Activating...' : 'Activate Account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
