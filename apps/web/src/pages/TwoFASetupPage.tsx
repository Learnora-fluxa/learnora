import { useState } from 'react'
import { Smartphone, Key, CheckCircle2, Copy, AlertCircle, Loader2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }
type Step  = 'choose' | 'app' | 'sms' | 'verify' | 'done'

function mkRecoveryCode() {
  const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${seg()}-${seg()}`
}

export default function TwoFASetupPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [step,          setStep]          = useState<Step>('choose')
  const [method,        setMethod]        = useState<'app' | 'sms'>('app')
  const [code,          setCode]          = useState('')
  const [copied,        setCopied]        = useState(false)
  const [enrolling,     setEnrolling]     = useState(false)
  const [verifying,     setVerifying]     = useState(false)
  const [factorId,      setFactorId]      = useState<string | null>(null)
  const [challengeId,   setChallengeId]   = useState<string | null>(null)
  const [qrCode,        setQrCode]        = useState<string | null>(null)
  const [totpSecret,    setTotpSecret]    = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [enrollError,   setEnrollError]   = useState('')
  const [verifyError,   setVerifyError]   = useState('')

  async function selectApp() {
    setMethod('app')
    setEnrolling(true)
    setEnrollError('')
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    setEnrolling(false)
    if (error || !data) {
      setEnrollError(error?.message ?? 'Failed to start 2FA setup. Try again.')
      return
    }
    const d = data as any
    setFactorId(d.id)
    setQrCode(d.totp?.qr_code ?? null)
    setTotpSecret(d.totp?.secret ?? '')
    setStep('app')
  }

  async function proceedToVerify() {
    if (!factorId) return
    setVerifying(true)
    setVerifyError('')
    const { data, error } = await supabase.auth.mfa.challenge({ factorId })
    setVerifying(false)
    if (error || !data) {
      setVerifyError(error?.message ?? 'Could not create challenge. Try again.')
      return
    }
    setChallengeId(data.id)
    setStep('verify')
  }

  async function verify() {
    if (!factorId || !challengeId || code.length < 6) return
    setVerifying(true)
    setVerifyError('')
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code })
    if (error) {
      setVerifyError(error.message)
      setVerifying(false)
      return
    }
    // Generate and persist recovery codes
    const codes = Array.from({ length: 6 }, mkRecoveryCode)
    setRecoveryCodes(codes)
    await supabase.auth.updateUser({ data: { totp_recovery_codes: codes } })
    setVerifying(false)
    setStep('done')
  }

  function copy() {
    const text = recoveryCodes.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const STEPS = ['choose', 'app', 'verify', 'done'] as const
  const stepIdx = (s: string) => STEPS.indexOf(s as typeof STEPS[number])

  return (
    <DashboardLayout
      activePage="settings"
      onNavigate={onNavigate}
      title="Two-Factor Authentication"
      subtitle="Add an extra layer of security to your account"
      user={sidebarUser}
    >
      <div className="max-w-[540px] flex flex-col gap-5">

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step === s          ? 'bg-primary text-white' :
                stepIdx(step) > i   ? 'bg-green-500 text-white' :
                                      'bg-canvas text-muted'
              }`}>{i + 1}</div>
              {i < 3 && <div className={`h-0.5 flex-1 rounded-full ${stepIdx(step) > i ? 'bg-green-400' : 'bg-canvas'}`} />}
            </div>
          ))}
        </div>

        {/* Choose step */}
        {step === 'choose' && (
          <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-foreground">Choose a method</h2>

            {enrollError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-card p-3">
                <AlertCircle size={12} className="shrink-0" /> {enrollError}
              </div>
            )}

            {/* App option */}
            <button onClick={selectApp} disabled={enrolling}
              className={`flex items-center gap-4 p-4 rounded-card border text-left transition-colors hover:border-primary ${method === 'app' ? 'border-primary bg-primary/4' : 'border-black/12'} disabled:opacity-60`}>
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {enrolling ? <Loader2 size={18} className="text-primary animate-spin" /> : <Key size={18} className="text-primary" />}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Authenticator App</p>
                <p className="text-xs text-muted mt-0.5">Use Google Authenticator, Authy, or similar app.</p>
              </div>
            </button>

            {/* SMS option — not supported by current stack */}
            <div className="flex items-center gap-4 p-4 rounded-card border border-black/8 opacity-50 cursor-not-allowed">
              <div className="size-10 rounded-full bg-canvas flex items-center justify-center shrink-0">
                <Smartphone size={18} className="text-muted" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">SMS Code</p>
                <p className="text-xs text-muted mt-0.5">Not available — requires a separate SMS provider.</p>
              </div>
            </div>
          </div>
        )}

        {/* App scan step */}
        {step === 'app' && (
          <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-foreground">Scan QR code</h2>
            <p className="text-xs text-muted">Open your authenticator app and scan the QR code below.</p>

            {qrCode ? (
              <img src={qrCode} alt="TOTP QR code" className="size-40 mx-auto rounded-card border border-black/10" />
            ) : (
              <div className="size-40 bg-canvas rounded-card mx-auto flex items-center justify-center">
                <Loader2 size={24} className="text-primary animate-spin" />
              </div>
            )}

            {totpSecret && (
              <p className="text-xs text-center text-muted">
                Manual key: <span className="font-mono font-bold text-foreground tracking-widest">{totpSecret}</span>
              </p>
            )}

            {verifyError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-card p-3">
                <AlertCircle size={12} className="shrink-0" /> {verifyError}
              </div>
            )}

            <button onClick={proceedToVerify} disabled={!qrCode || verifying}
              className="h-10 px-6 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50 flex items-center justify-center gap-2">
              {verifying && <Loader2 size={14} className="animate-spin" />}
              {verifying ? 'Please wait…' : "I've scanned it →"}
            </button>
          </div>
        )}

        {/* Verify step */}
        {step === 'verify' && (
          <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-foreground">Enter verification code</h2>
            <p className="text-xs text-muted">Enter the 6-digit code from your authenticator app.</p>
            <input
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setVerifyError('') }}
              placeholder="000000"
              maxLength={6}
              className="h-14 px-4 border border-black/15 rounded-input text-2xl font-mono text-center outline-none focus:border-primary tracking-[0.3em]"
            />
            {verifyError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-card p-3">
                <AlertCircle size={12} className="shrink-0" /> {verifyError}
              </div>
            )}
            <button onClick={verify} disabled={code.length < 6 || verifying}
              className="h-10 px-6 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-40 shadow-primary flex items-center justify-center gap-2">
              {verifying && <Loader2 size={14} className="animate-spin" />}
              {verifying ? 'Verifying…' : 'Verify'}
            </button>
          </div>
        )}

        {/* Done step */}
        {step === 'done' && (
          <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-5">
            <div className="text-center">
              <div className="size-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} className="text-green-600" />
              </div>
              <p className="text-base font-bold text-foreground">2FA enabled!</p>
              <p className="text-xs text-muted mt-1">Your account is now protected with two-factor authentication.</p>
            </div>

            {/* Recovery codes */}
            <div className="bg-canvas rounded-card p-4 border border-black/8">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-foreground">Recovery codes</p>
                <button onClick={copy}
                  className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
                  <Copy size={10} /> {copied ? 'Copied!' : 'Copy all'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {recoveryCodes.map(c => (
                  <span key={c} className="font-mono text-xs text-center bg-white border border-black/10 rounded py-1">{c}</span>
                ))}
              </div>
              <div className="flex items-start gap-2 mt-3">
                <AlertCircle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted leading-relaxed">Save these codes somewhere safe. Each can only be used once if you lose access to your device.</p>
              </div>
            </div>

            <button onClick={() => onNavigate('security-settings')}
              className="h-10 px-6 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors shadow-primary">
              Done
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
