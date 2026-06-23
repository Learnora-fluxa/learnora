import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import AuthHeroPanel from '../components/auth/AuthHeroPanel'
import { signIn } from '../lib/auth'

type Props = { onNavigate: (page: string) => void }

export default function LoginPage({ onNavigate }: Props) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [errors,   setErrors]   = useState<{ email?: string; password?: string; general?: string }>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!email)    errs.email    = 'Email is required'
    if (!password) errs.password = 'Password is required'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setErrors({})
    setLoading(true)
    try {
      const { destination } = await signIn(email, password)
      onNavigate(destination)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.'
      setErrors({ general: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      {/* ── Left: hero panel ── */}
      <div className="lg:w-[52%] lg:flex-shrink-0 p-3 lg:p-6">
        <AuthHeroPanel />
      </div>

      {/* ── Right: form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-0 lg:px-12">
        <div className="w-full max-w-[500px]">

          <h1 className="text-4xl font-semibold text-foreground mb-2 leading-tight">
            Welcome Back!
          </h1>
          <p className="text-base font-normal text-foreground mb-8">
            Log in to your existing account
          </p>

          {errors.general && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {errors.general}
            </div>
          )}

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-base font-bold text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter email address"
                value={email}
                onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })) }}
                className={`
                  h-[41px] w-full border rounded-input px-4
                  text-sm font-light text-foreground placeholder:text-muted/70
                  outline-none focus:border-primary transition-colors bg-surface
                  ${errors.email ? 'border-red-400' : 'border-muted'}
                `}
              />
              {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-base font-bold text-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: undefined })) }}
                  className={`
                    h-[41px] w-full border rounded-input px-4 pr-10
                    text-sm font-light text-foreground placeholder:text-muted/70
                    outline-none focus:border-primary transition-colors bg-surface
                    ${errors.password ? 'border-red-400' : 'border-muted'}
                  `}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password}</p>}
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <span
                  role="checkbox"
                  aria-checked={remember}
                  tabIndex={0}
                  onKeyDown={e => e.key === ' ' && setRemember(r => !r)}
                  onClick={() => setRemember(r => !r)}
                  className={`
                    size-[22px] shrink-0 rounded-xs border flex items-center justify-center
                    transition-colors cursor-pointer
                    ${remember ? 'bg-primary border-primary' : 'bg-surface border-foreground'}
                  `}
                >
                  {remember && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="text-sm font-normal text-foreground">Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => onNavigate('forgot-password')}
                className="text-sm font-normal text-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full h-14 bg-primary text-white text-base font-bold
                rounded-pill border border-white
                hover:bg-primary-deep transition-colors shadow-primary
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              {loading ? 'Signing in…' : 'Log in'}
            </button>

            {/* Role entry points */}
            <div className="rounded-xl border border-black/10 bg-canvas p-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Who are you signing in as?</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { role: 'Student',  note: 'Use your invite email' },
                  { role: 'Teacher',  note: 'Use your invite email' },
                  { role: 'Parent',   note: 'Use your invite email' },
                  { role: 'Admin',    note: 'School administrator'  },
                ].map(r => (
                  <div key={r.role} className="flex flex-col gap-0.5 rounded-lg bg-surface border border-black/8 px-3 py-2">
                    <span className="text-xs font-bold text-foreground">{r.role}</span>
                    <span className="text-[11px] text-muted">{r.note}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                All roles use the same login form above. First time? Check your email for an invitation from your school. No invite?{' '}
                <span className="font-semibold text-foreground">Contact your school admin.</span>
              </p>
            </div>

            {/* Register school */}
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="text-sm font-semibold text-primary text-center hover:underline transition-colors"
            >
              Register a new school →
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-muted/30" />
              <span className="text-sm font-normal text-muted shrink-0">Or continue with</span>
              <div className="flex-1 h-px bg-muted/30" />
            </div>

            {/* Social buttons */}
            <button
              type="button"
              className="
                w-full h-[53px] border border-muted rounded-pill
                flex items-center justify-center gap-2.5
                text-sm font-normal text-foreground
                hover:border-primary hover:text-primary transition-colors
              "
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <button
              type="button"
              className="
                w-full h-[53px] border border-muted rounded-pill
                flex items-center justify-center gap-2.5
                text-sm font-normal text-foreground
                hover:border-primary hover:text-primary transition-colors
              "
            >
              <AppleIcon />
              Continue with Apple
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}
