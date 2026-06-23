import { useState } from 'react'
import { ChevronRight, Eye, EyeOff, CheckCircle2, Copy, Building2 } from 'lucide-react'
import AuthHeroPanel from '../components/auth/AuthHeroPanel'
import { supabase } from '../lib/supabase'
import { generateSchoolCode } from '../lib/auth'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type Step = 'school' | 'admin' | 'done'

const steps: { key: Step; label: string }[] = [
  { key: 'school', label: 'School Info' },
  { key: 'admin',  label: 'Admin Setup' },
  { key: 'done',   label: 'All Set'     },
]

const nigerianStates = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT (Abuja)','Gombe',
  'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos',
  'Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto',
  'Taraba','Yobe','Zamfara',
]

export default function SchoolSignUpPage({ onNavigate }: Props) {
  const [step, setStep]       = useState<Step>('school')
  const [showPw, setShowPw]   = useState(false)
  const [showCPw, setShowCPw] = useState(false)
  const [copied, setCopied]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // School fields
  const [schoolName,    setSchoolName]    = useState('')
  const [schoolEmail,   setSchoolEmail]   = useState('')
  const [schoolPhone,   setSchoolPhone]   = useState('')
  const [schoolAddress, setSchoolAddress] = useState('')
  const [schoolState,   setSchoolState]   = useState('')

  // Admin fields
  const [adminName,  setAdminName]  = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPhone, setAdminPhone] = useState('')
  const [password,   setPassword]   = useState('')
  const [confirmPw,  setConfirmPw]  = useState('')

  // Stored after successful registration
  const [schoolCode, setSchoolCode] = useState('')

  const stepIndex = steps.findIndex(s => s.key === step)

  function copyCode() {
    navigator.clipboard.writeText(schoolCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPw) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: adminEmail,
        password,
        options: { data: { full_name: adminName } },
      })
      if (signUpError) throw signUpError
      if (!authData.user) throw new Error('Sign up failed — no user returned.')

      const userId = authData.user.id

      // 2. Generate school ID + code client-side to avoid the RLS chicken-and-egg:
      //    the schools_read policy checks get_my_school_id(), but the profile hasn't
      //    been updated with school_id yet at this point, so a SELECT after INSERT
      //    would return 0 rows. Pre-generating the ID lets us skip the SELECT entirely.
      const schoolId = crypto.randomUUID()
      const code     = generateSchoolCode(schoolName)
      const { error: schoolError } = await supabase
        .from('schools')
        .insert({
          id:      schoolId,
          name:    schoolName,
          code,
          email:   schoolEmail,
          phone:   schoolPhone,
          address: schoolAddress,
          state:   schoolState,
        })

      if (schoolError) throw schoolError

      // 3. Update profile with school_id, role, name, phone
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          school_id: schoolId,
          role:      'admin',
          full_name: adminName,
          email:     adminEmail,
          phone:     adminPhone,
        })
        .eq('id', userId)

      if (profileError) throw profileError

      // Auto-seed: term, subjects, starter class
      const now = new Date()
      const yr  = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
      await supabase.from('terms').insert({
        school_id:  schoolId,
        name:       `First Term ${yr}/${yr + 1}`,
        start_date: `${yr}-09-01`,
        end_date:   `${yr + 1}-01-31`,
        is_current: true,
      })

      const defaultSubjects = [
        'Mathematics', 'English Language', 'Basic Science', 'Social Studies',
        'Civic Education', 'Computer Science', 'French', 'Physical Education',
        'Christian Religious Studies', 'Further Mathematics',
      ]
      const { data: subRows } = await supabase
        .from('subjects')
        .insert(defaultSubjects.map(name => ({ name, school_id: schoolId })))
        .select('id, name')

      // One starter class (SS1A) with all subjects
      if (subRows && subRows.length > 0) {
        const { data: cls } = await supabase
          .from('classes')
          .insert({ school_id: schoolId, name: 'SS1A', level: 'SS1', arm: 'A' })
          .select('id')
          .single()
        if (cls) {
          await supabase.from('class_subjects').insert(
            subRows.map((s: { id: string; name: string }) => ({
              class_id: cls.id, subject_id: s.id, school_id: schoolId,
            }))
          )
        }
      }

      setSchoolCode(code)
      setStep('done')
    } catch (err: unknown) {
      logSupabaseError('SchoolSignUp', err as any)
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      {/* Hero panel */}
      <div className="lg:w-[52%] lg:flex-shrink-0 p-3 lg:p-6">
        <AuthHeroPanel />
      </div>

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-8 lg:px-12">
        <div className="w-full max-w-[500px]">

          {/* Stepper */}
          {step !== 'done' && (
            <div className="flex items-center gap-2 mb-8">
              {steps.filter(s => s.key !== 'done').map((s, i) => {
                const idx     = steps.findIndex(x => x.key === s.key)
                const past    = stepIndex > idx
                const current = stepIndex === idx
                return (
                  <div key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
                    <div className={`flex items-center gap-2 ${current || past ? 'text-primary' : 'text-muted'}`}>
                      <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        past || current ? 'bg-primary text-white' : 'bg-canvas text-muted border border-black/15'
                      }`}>
                        {past ? '✓' : i + 1}
                      </div>
                      <span className="text-xs font-semibold hidden sm:block">{s.label}</span>
                    </div>
                    {i < 1 && <div className={`flex-1 h-0.5 rounded-full ${past ? 'bg-primary' : 'bg-black/10'}`} />}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Step 1: School Info ── */}
          {step === 'school' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="size-11 rounded-card bg-primary/10 flex items-center justify-center">
                  <Building2 size={20} className="text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground leading-tight">Register Your School</h1>
                  <p className="text-sm text-muted">Step 1 of 2 — School information</p>
                </div>
              </div>

              <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setStep('admin') }}>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">School Name <span className="text-red-500">*</span></label>
                  <input
                    required value={schoolName} onChange={e => setSchoolName(e.target.value)}
                    placeholder="e.g. Greenfield Academy"
                    className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors bg-surface"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">School Email <span className="text-red-500">*</span></label>
                  <input
                    required type="email" value={schoolEmail} onChange={e => setSchoolEmail(e.target.value)}
                    placeholder="info@yourschool.edu.ng"
                    className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors bg-surface"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">Phone Number <span className="text-red-500">*</span></label>
                  <input
                    required type="tel" value={schoolPhone} onChange={e => setSchoolPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors bg-surface"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">School Address <span className="text-red-500">*</span></label>
                  <input
                    required value={schoolAddress} onChange={e => setSchoolAddress(e.target.value)}
                    placeholder="Street, City"
                    className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors bg-surface"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">State <span className="text-red-500">*</span></label>
                  <select
                    required value={schoolState} onChange={e => setSchoolState(e.target.value)}
                    className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground bg-surface outline-none focus:border-primary transition-colors appearance-none"
                  >
                    <option value="">Select state</option>
                    {nigerianStates.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full h-12 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors shadow-primary flex items-center justify-center gap-2 mt-2"
                >
                  Continue <ChevronRight size={15} />
                </button>
              </form>

              <p className="text-sm text-center text-foreground mt-5">
                Already have an account?{' '}
                <button onClick={() => onNavigate('login')} className="font-semibold text-primary hover:underline">
                  Sign in
                </button>
              </p>
            </>
          )}

          {/* ── Step 2: Admin Setup ── */}
          {step === 'admin' && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground leading-tight mb-1">Admin Account</h1>
                <p className="text-sm text-muted">Step 2 of 2 — Primary administrator for {schoolName || 'your school'}.</p>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form className="flex flex-col gap-4" onSubmit={handleRegister}>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">Full Name <span className="text-red-500">*</span></label>
                  <input
                    required value={adminName} onChange={e => setAdminName(e.target.value)}
                    placeholder="e.g. Mr Emmanuel Okafor"
                    className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors bg-surface"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">Admin Email <span className="text-red-500">*</span></label>
                  <input
                    required type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                    placeholder="admin@yourschool.edu.ng"
                    className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors bg-surface"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">Admin Phone</label>
                  <input
                    type="tel" value={adminPhone} onChange={e => setAdminPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors bg-surface"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      required type={showPw ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full h-12 px-4 pr-11 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors bg-surface"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-foreground">Confirm Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      required type={showCPw ? 'text' : 'password'}
                      value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                      placeholder="Repeat your password"
                      className="w-full h-12 px-4 pr-11 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors bg-surface"
                    />
                    <button type="button" onClick={() => setShowCPw(!showCPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                      {showCPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => { setStep('school'); setError('') }}
                    className="h-12 px-5 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-12 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors shadow-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Registering…' : <><span>Register School</span><ChevronRight size={15} /></>}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Step 3: Done ── */}
          {step === 'done' && (
            <div className="text-center">
              <div className="size-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={28} className="text-green-600" />
              </div>

              <h1 className="text-3xl font-semibold text-foreground mb-2">You're registered!</h1>
              <p className="text-sm text-muted mb-8 max-w-[380px] mx-auto">
                <strong>{schoolName}</strong> has been created. Check your inbox at <strong>{adminEmail}</strong> to confirm your email, then log in.
              </p>

              {/* School code box */}
              <div className="bg-canvas rounded-card border border-black/10 p-5 mb-6 text-left">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Your School Login Code</p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-2xl font-bold text-primary tracking-widest">{schoolCode}</code>
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1.5 h-9 px-4 border border-black/15 rounded-full text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Copy size={12} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-muted mt-3 leading-relaxed">
                  Share this code with students, teachers, and parents so they can find your school at login.
                </p>
              </div>

              {/* What happens next */}
              <div className="bg-surface rounded-card border border-black/8 p-5 mb-8 text-left">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">What happens next</p>
                <div className="flex flex-col gap-3">
                  {[
                    { n: '1', text: 'Confirm your email address by clicking the link we sent.' },
                    { n: '2', text: 'Log in with your admin email and password.' },
                    { n: '3', text: 'Add students, teachers, and parents — they receive login credentials automatically.' },
                  ].map(item => (
                    <div key={item.n} className="flex items-start gap-3">
                      <div className="size-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {item.n}
                      </div>
                      <p className="text-sm text-foreground">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onNavigate('login')}
                className="w-full h-12 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors shadow-primary"
              >
                Go to Login
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
