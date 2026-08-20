import { useState } from 'react'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import AuthHeroPanel from '../components/auth/AuthHeroPanel'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

export default function ResetPasswordPage({ onNavigate }: Props) {
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done,        setDone]        = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  const rules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter',  met: /[A-Z]/.test(password) },
    { label: 'One number',            met: /\d/.test(password) },
    { label: 'Passwords match',       met: confirm.length > 0 && password === confirm },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rules.every(r => r.met)) return
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      <div className="lg:w-[52%] lg:flex-shrink-0 p-3 lg:p-6">
        <AuthHeroPanel />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-0 lg:px-12">
        <div className="w-full max-w-[500px]">

          {done ? (
            <div className="text-center">
              <div className="size-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={28} className="text-green-600" />
              </div>
              <h1 className="text-3xl font-semibold text-foreground mb-3">Password Reset!</h1>
              <p className="text-base text-muted mb-8">Your password has been successfully updated. You can now sign in with your new password.</p>
              <button
                onClick={() => onNavigate('login')}
                className="w-full h-14 bg-primary text-white text-base font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-4xl font-semibold text-foreground mb-2 leading-tight">Reset Password</h1>
              <p className="text-base text-muted mb-8">Create a new strong password for your account.</p>

              <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-foreground">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full h-14 px-5 pr-12 border border-black/20 rounded-input text-base text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-foreground">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full h-14 px-5 pr-12 border border-black/20 rounded-input text-base text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Password rules */}
                <div className="flex flex-col gap-2 bg-canvas rounded-card p-4">
                  {rules.map(r => (
                    <div key={r.label} className="flex items-center gap-2.5">
                      <CheckCircle2 size={14} className={r.met ? 'text-green-500' : 'text-black/20'} />
                      <span className={`text-xs ${r.met ? 'text-green-700' : 'text-muted'}`}>{r.label}</span>
                    </div>
                  ))}
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={!rules.every(r => r.met) || loading}
                  className="h-14 bg-primary text-white text-base font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating…' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
