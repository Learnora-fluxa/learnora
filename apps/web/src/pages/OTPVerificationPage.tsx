import { useState, useRef, type KeyboardEvent } from 'react'
import AuthHeroPanel from '../components/auth/AuthHeroPanel'

type Props = { onNavigate: (page: string) => void }

export default function OTPVerificationPage({ onNavigate }: Props) {
  const [otp, setOtp] = useState(['', '', '', ''])
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  function handleChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[idx] = digit
    setOtp(next)
    if (digit && idx < 3) inputRefs[idx + 1].current?.focus()
  }

  function handleKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs[idx - 1].current?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4).split('')
    const next = ['', '', '', '']
    digits.forEach((d, i) => { next[i] = d })
    setOtp(next)
    const focus = Math.min(digits.length, 3)
    inputRefs[focus].current?.focus()
  }

  const filled = otp.every(d => d !== '')

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      <div className="lg:w-[52%] lg:flex-shrink-0 p-3 lg:p-6">
        <AuthHeroPanel />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-0 lg:px-12">
        <div className="w-full max-w-[500px]">
          <h1 className="text-4xl font-semibold text-foreground mb-2 leading-tight">
            Verify Your Email
          </h1>
          <p className="text-base font-normal text-foreground mb-10">
            We sent a verification code to your email address
          </p>

          <div className="flex justify-center gap-4 mb-10" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={inputRefs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                aria-label={`Verification digit ${i + 1}`}
                className={`
                  size-[70px] text-center text-2xl font-bold text-foreground
                  border-2 rounded-card outline-none transition-colors bg-surface
                  ${digit ? 'border-primary' : 'border-muted/50 focus:border-primary'}
                `}
              />
            ))}
          </div>

          <button
            onClick={() => onNavigate('role-select')}
            disabled={!filled}
            className="
              w-full h-14 bg-primary text-white text-base font-bold
              rounded-pill border border-white
              hover:bg-primary-deep transition-colors shadow-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
            "
          >
            Verify Account
          </button>

          <p className="text-center text-sm font-normal text-foreground mt-6">
            Didn't receive the code?{' '}
            <button
              type="button"
              className="text-primary font-semibold hover:underline"
            >
              Resend
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
