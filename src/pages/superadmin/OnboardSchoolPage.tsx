import { useState, useEffect } from 'react'
import { CheckCircle2, ChevronRight, Copy, CreditCard, Landmark, AlertCircle } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { superAdminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { generateSchoolCode } from '../../lib/auth'

type Props = { onNavigate: (page: string) => void }
type Step = 'school' | 'admin' | 'plan' | 'confirm'

const steps: { key: Step; label: string }[] = [
  { key: 'school',  label: 'School Info' },
  { key: 'admin',   label: 'Admin Setup' },
  { key: 'plan',    label: 'Select Plan' },
  { key: 'confirm', label: 'Confirm'     },
]

const plans = [
  { id: 'starter',      label: 'Starter',      price: '₦850/student/term', students: 'Up to 500',  features: ['Basic LMS', 'Parent Portal', 'Fee Payment'] },
  { id: 'professional', label: 'Professional', price: '₦850/student/term', students: 'Unlimited',  features: ['Everything in Starter', 'AI Tutor', 'Advanced Analytics', 'Custom Branding', 'Priority Support'] },
]

const nigerianStates = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT (Abuja)','Gombe',
  'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos',
  'Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto',
  'Taraba','Yobe','Zamfara',
]

export default function OnboardSchoolPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [step,      setStep]      = useState<Step>('school')
  const [plan,      setPlan]      = useState('professional')
  const [payMethod, setPayMethod] = useState<'paystack' | 'bank_transfer'>('paystack')
  const [loading,   setLoading]  = useState(false)
  const [error,     setError]    = useState('')
  const [done,      setDone]     = useState(false)
  const [schoolCode, setSchoolCode] = useState('')
  const [copied,    setCopied]   = useState(false)

  const [platformBank, setPlatformBank] = useState({ bankName: '', acctName: '', acctNumber: '' })

  // School fields
  const [schoolName,    setSchoolName]    = useState('')
  const [schoolState,   setSchoolState]   = useState('')
  const [schoolAddress, setSchoolAddress] = useState('')
  const [schoolEmail,   setSchoolEmail]   = useState('')
  const [schoolPhone,   setSchoolPhone]   = useState('')

  // Admin fields (informational — stored on school record for now)
  const [adminName,  setAdminName]  = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPhone, setAdminPhone] = useState('')

  const stepIndex = steps.findIndex(s => s.key === step)

  useEffect(() => {
    if (step === 'plan') loadPlatformBank()
  }, [step])

  async function loadPlatformBank() {
    const { data } = await supabase
      .from('platform_config')
      .select('bank_name, bank_account_name, bank_account_number')
      .maybeSingle()
    const d = data as { bank_name: string | null; bank_account_name: string | null; bank_account_number: string | null } | null
    if (d) setPlatformBank({ bankName: d.bank_name ?? '', acctName: d.bank_account_name ?? '', acctNumber: d.bank_account_number ?? '' })
  }

  function advance() {
    const nextStep = steps[stepIndex + 1]
    if (nextStep) setStep(nextStep.key)
  }

  function copyCode() {
    navigator.clipboard.writeText(schoolCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function createSchool() {
    setLoading(true)
    setError('')
    try {
      const code = generateSchoolCode(schoolName)
      const { error: insertError } = await supabase
        .from('schools')
        .insert({
          name:                         schoolName,
          code,
          state:                        schoolState   || null,
          address:                      schoolAddress || null,
          email:                        schoolEmail   || null,
          phone:                        schoolPhone   || null,
          subscription_plan:            plan,
          subscription_status:          payMethod === 'bank_transfer' ? 'pending_payment' : 'active',
          subscription_payment_method:  payMethod,
        })
      if (insertError) throw insertError
      setSchoolCode(code)
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create school.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setDone(false); setStep('school'); setSchoolCode('')
    setSchoolName(''); setSchoolState(''); setSchoolAddress(''); setSchoolEmail(''); setSchoolPhone('')
    setAdminName(''); setAdminEmail(''); setAdminPhone('')
    setPlan('professional'); setError('')
  }

  if (done) {
    return (
      <DashboardLayout activePage="schools-list" onNavigate={onNavigate} title="School Onboarded" nav={superAdminNav} user={sidebarUser}>
        <div className="max-w-[500px] text-center mt-10">
          <div className="size-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            {payMethod === 'bank_transfer' ? `${schoolName} is registered!` : `${schoolName} is live!`}
          </h1>
          <p className="text-sm text-muted mb-6">
            {payMethod === 'bank_transfer'
              ? 'The school has been registered and is pending payment confirmation. Confirm the bank transfer in Platform Billing to activate the school.'
              : 'The school has been added to the platform. Share the school code with the admin so they can complete setup.'
            }
          </p>
          <div className="flex items-center gap-2 bg-canvas border border-black/10 rounded-card px-4 py-3 mb-8 justify-center">
            <span className="text-lg font-bold text-primary tracking-widest">{schoolCode}</span>
            <button onClick={copyCode} className="ml-2 p-1.5 rounded-md hover:bg-black/5 text-muted hover:text-foreground transition-colors">
              {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          </div>
          {adminEmail && (
            <p className="text-xs text-muted mb-6">Admin email noted: <span className="font-semibold text-foreground">{adminEmail}</span>. Ask them to sign up at the school registration page using code <span className="font-semibold">{schoolCode}</span>.</p>
          )}
          <div className="flex gap-3 justify-center">
            <button onClick={() => onNavigate('schools-list')} className="h-11 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">
              View All Schools
            </button>
            <button onClick={reset} className="h-11 px-5 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
              Onboard Another
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      activePage="schools-list"
      onNavigate={onNavigate}
      title="Onboard New School"
      subtitle="Add a new school to the Learnora platform"
      nav={superAdminNav}
      user={sidebarUser}
    >
      <div className="max-w-[700px] flex flex-col gap-8">

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`flex items-center gap-2 ${i <= stepIndex ? 'text-primary' : 'text-muted'}`}>
                <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < stepIndex ? 'bg-primary text-white' :
                  i === stepIndex ? 'bg-primary text-white' :
                  'bg-canvas text-muted border border-black/15'
                }`}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                <span className="text-xs font-semibold hidden sm:block">{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 rounded-full ${i < stepIndex ? 'bg-primary' : 'bg-black/10'}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-5">

          {step === 'school' && (
            <>
              <h2 className="text-base font-bold text-foreground">School Information</h2>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">School Name *</label>
                <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g. Greenfield Academy"
                  className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">State</label>
                <select value={schoolState} onChange={e => setSchoolState(e.target.value)}
                  className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground outline-none focus:border-primary bg-white">
                  <option value="">Select state…</option>
                  {nigerianStates.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Address</label>
                <input value={schoolAddress} onChange={e => setSchoolAddress(e.target.value)} placeholder="Street, City"
                  className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">School Email</label>
                <input type="email" value={schoolEmail} onChange={e => setSchoolEmail(e.target.value)} placeholder="info@school.edu"
                  className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">School Phone</label>
                <input value={schoolPhone} onChange={e => setSchoolPhone(e.target.value)} placeholder="+234 800 000 0000"
                  className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary" />
              </div>
            </>
          )}

          {step === 'admin' && (
            <>
              <h2 className="text-base font-bold text-foreground">Admin Account</h2>
              <p className="text-sm text-muted">This person will manage the school. Share the school code with them so they can complete registration.</p>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Admin Full Name</label>
                <input value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="e.g. Mr Emmanuel Okafor"
                  className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Admin Email</label>
                <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@school.edu"
                  className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Admin Phone</label>
                <input value={adminPhone} onChange={e => setAdminPhone(e.target.value)} placeholder="+234 800 000 0000"
                  className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary" />
              </div>
            </>
          )}

          {step === 'plan' && (
            <>
              <h2 className="text-base font-bold text-foreground">Select Plan</h2>
              <div className="flex flex-col gap-3">
                {plans.map(p => (
                  <button key={p.id} onClick={() => setPlan(p.id)}
                    className={`text-left p-5 rounded-card border-2 transition-colors ${plan === p.id ? 'border-primary bg-primary/5' : 'border-black/10 hover:border-primary/40'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-bold text-foreground">{p.label}</span>
                      <span className="text-sm font-semibold text-primary">{p.price}</span>
                    </div>
                    <p className="text-xs text-muted mb-3">{p.students} students</p>
                    <div className="flex flex-col gap-1.5">
                      {p.features.map(f => (
                        <div key={f} className="flex items-center gap-2 text-xs text-foreground">
                          <CheckCircle2 size={12} className="text-green-500 shrink-0" />{f}
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-t border-black/8 pt-4 flex flex-col gap-3">
                <h3 className="text-sm font-bold text-foreground">Subscription Payment</h3>
                {[
                  { id: 'paystack' as const,      icon: CreditCard, label: 'Online (Paystack)',      sub: 'School is activated immediately after onboarding.' },
                  { id: 'bank_transfer' as const, icon: Landmark,   label: 'Bank Transfer (Offline)', sub: 'School is pending until you confirm receipt.' },
                ].map(m => (
                  <button key={m.id} onClick={() => setPayMethod(m.id)}
                    className={`flex items-center gap-4 p-4 rounded-card border-2 text-left transition-colors ${payMethod === m.id ? 'border-primary bg-primary/5' : 'border-black/10 hover:border-primary/40'}`}>
                    <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${payMethod === m.id ? 'bg-primary text-white' : 'bg-canvas text-muted'}`}>
                      <m.icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{m.label}</p>
                      <p className="text-xs text-muted mt-0.5">{m.sub}</p>
                    </div>
                    <div className={`size-5 rounded-full border-2 shrink-0 flex items-center justify-center ${payMethod === m.id ? 'border-primary bg-primary' : 'border-black/20'}`}>
                      {payMethod === m.id && <div className="size-2 bg-white rounded-full" />}
                    </div>
                  </button>
                ))}

                {payMethod === 'bank_transfer' && (
                  <div className="bg-canvas border border-black/10 rounded-card p-4 flex flex-col gap-2">
                    <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Transfer to Learnora</p>
                    {platformBank.acctNumber ? (
                      <>
                        {[
                          { label: 'Bank',           value: platformBank.bankName   || '—' },
                          { label: 'Account Name',   value: platformBank.acctName   || '—' },
                          { label: 'Account Number', value: platformBank.acctNumber        },
                        ].map(r => (
                          <div key={r.label} className="flex justify-between text-sm">
                            <span className="text-muted">{r.label}</span>
                            <span className={`font-bold text-foreground ${r.label === 'Account Number' ? 'font-mono tracking-widest' : ''}`}>{r.value}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="flex items-start gap-2">
                        <AlertCircle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-700">Bank details not set. Go to Platform Settings → add Learnora bank account before sending schools this option.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              <h2 className="text-base font-bold text-foreground">Review & Confirm</h2>
              <div className="flex flex-col gap-3 text-sm">
                {[
                  { label: 'School',   value: schoolName || '—' },
                  { label: 'State',    value: schoolState || '—' },
                  { label: 'Admin',    value: adminName   || '—' },
                  { label: 'Admin Email', value: adminEmail || '—' },
                  { label: 'Plan',     value: plan === 'professional' ? 'Professional' : 'Starter' },
                  { label: 'Payment',  value: payMethod === 'bank_transfer' ? 'Bank Transfer (pending activation)' : 'Online (Paystack)' },
                  { label: 'Billing',  value: '₦850/student/term · starts on activation' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between p-3 bg-canvas rounded-card">
                    <span className="text-muted">{r.label}</span>
                    <span className="font-semibold text-foreground">{r.value}</span>
                  </div>
                ))}
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <p className="text-xs text-muted">A school code will be generated. Share it with the admin to complete their account setup.</p>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            disabled={loading || (step === 'school' && !schoolName.trim())}
            onClick={step === 'confirm' ? createSchool : advance}
            className="flex items-center gap-2 h-12 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating…' : step === 'confirm' ? 'Create School' : 'Continue'} {!loading && <ChevronRight size={14} />}
          </button>
          {stepIndex > 0 && (
            <button onClick={() => setStep(steps[stepIndex - 1].key)}
              className="h-12 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
              Back
            </button>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
