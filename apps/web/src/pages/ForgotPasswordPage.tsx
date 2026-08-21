import { useState } from 'react'
import { Mail } from 'lucide-react'
import AuthHeroPanel from '../components/auth/AuthHeroPanel'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

export default function ForgotPasswordPage({ onNavigate }: Props) {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      <div className="lg:w-[52%] lg:flex-shrink-0 p-3 lg:p-6">
        <AuthHeroPanel />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-0 lg:px-12">
        <div className="w-full max-w-[500px]">

          {sent ? (
            <div className="text-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Mail size={28} className="text-primary" />
              </div>
              <h1 className="text-3xl font-semibold text-foreground mb-3">Check your email</h1>
              <p className="text-base text-muted mb-8">
                We sent a password reset link to <span className="font-semibold text-foreground">{email}</span>.
                Click the link in the email to set a new password.
              </p>
              <button
                onClick={() => onNavigate('login')}
                className="w-full h-14 bg-primary text-white text-base font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary"
              >
                Back to Sign In
              </button>
              <button
                onClick={() => { setSent(false); setError('') }}
                className="mt-4 w-full h-12 text-sm text-muted hover:text-foreground transition-colors"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-4xl font-semibold text-foreground mb-2 leading-tight">Forgot Password?</h1>
              <p className="text-base text-muted mb-8">
                Enter the email address associated with your account and we'll send you a reset link.
              </p>

              <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-base font-bold text-foreground">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-14 px-5 border border-black/20 rounded-input text-base text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors"
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="h-14 bg-primary text-white text-base font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-muted">
                Remember your password?{' '}
                <button onClick={() => onNavigate('login')} className="text-primary font-semibold hover:underline">
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
