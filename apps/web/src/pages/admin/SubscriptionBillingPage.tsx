import { useState, useEffect } from 'react'
import { CheckCircle2, ChevronRight, CreditCard, Landmark, Clock, AlertCircle, Loader2 } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import {
  getSubscriptionOverview,
  startPaystackPayment,
  submitBankTransfer,
  trialDaysLeft,
  verifyPaystackPayment,
  type SubscriptionOverview,
} from '../../lib/schoolSubscription'

type Props = { onNavigate: (page: string) => void }
type PayMethod = 'paystack' | 'bank_transfer'

const PLAN_LABELS: Record<string, string> = {
  starter:      'Starter Plan',
  professional: 'Professional Plan',
  growth:       'Growth Plan',
  enterprise:   'Enterprise Plan',
  free:         'Free Trial',
}

const STATUS_LABELS: Record<string, string> = {
  active:          'Active',
  trial:           'Trial',
  pending_payment: 'Pending payment',
  suspended:       'Suspended',
}

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  confirmed:      { label: 'Paid',           className: 'bg-green-50 text-green-700' },
  pending_review: { label: 'Awaiting review', className: 'bg-amber-50 text-amber-700' },
  rejected:       { label: 'Rejected',       className: 'bg-red-50 text-red-600' },
}

const planFeatures = [
  'Unlimited students',
  'AI Tutor for all students',
  'Advanced analytics & reports',
  'Parent portal with fee payment',
  'Custom school branding',
  'Priority support',
  'SMS & email notifications',
  'Offline-first PWA access',
]

const naira = (n: number) => `₦${n.toLocaleString()}`
const today = () => new Date().toISOString().slice(0, 10)

export default function SubscriptionBillingPage({ onNavigate }: Props) {
  const { profile, session } = useAuth()
  const [data,     setData]     = useState<SubscriptionOverview | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice,   setNotice]   = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  // Payment form
  const [method,       setMethod]       = useState<PayMethod>('paystack')
  const [studentCount, setStudentCount] = useState('')
  const [reference,    setReference]    = useState('')
  const [paidAt,       setPaidAt]       = useState(today)
  const [submitting,   setSubmitting]   = useState(false)
  const [formError,    setFormError]    = useState('')
  const [refreshKey,   setRefreshKey]   = useState(0)
  const reload = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    if (!session) return
    let cancelled = false

    // Paystack sends the admin back here with ?reference=… (and ?trxref=…);
    // confirm that payment before loading, so the page shows the new status.
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('reference') || params.get('trxref')
    if (ref) window.history.replaceState(null, '', window.location.pathname)

    const verified = ref
      ? verifyPaystackPayment(session, ref)
          .then(res => { if (!cancelled) setNotice({ kind: 'success', text: res.message }) })
          .catch(err => { if (!cancelled) setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Could not verify payment.' }) })
      : Promise.resolve()

    verified
      .then(() => getSubscriptionOverview(session))
      .then(overview => {
        if (cancelled) return
        setData(overview)
        setLoadError('')
        setStudentCount(prev => prev || String(Math.max(overview.pricing.activeStudents, 1)))
        if (!overview.paystackEnabled && overview.bankDetails) setMethod('bank_transfer')
      })
      .catch(err => { if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load your subscription.') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [session, refreshKey])

  const rate    = data?.pricing.ratePerStudent ?? 0
  const count   = Number(studentCount)
  const countOk = Number.isInteger(count) && count > 0
  const total   = countOk ? count * rate : 0

  async function handlePaystack() {
    if (!countOk) { setFormError('Enter how many students you are paying for.'); return }
    setSubmitting(true)
    setFormError('')
    try {
      const { authorizationUrl } = await startPaystackPayment(session, {
        studentCount: count,
        callbackUrl:  `${window.location.origin}/subscription`,
      })
      window.location.assign(authorizationUrl)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not start payment.')
      setSubmitting(false)
    }
  }

  async function handleBankTransfer(e: React.FormEvent) {
    e.preventDefault()
    if (!countOk) { setFormError('Enter how many students you are paying for.'); return }
    setSubmitting(true)
    setFormError('')
    try {
      const res = await submitBankTransfer(session, { studentCount: count, reference: reference.trim(), paidAt })
      setNotice({ kind: 'success', text: res.message })
      setReference('')
      reload()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not submit transfer.')
    } finally {
      setSubmitting(false)
    }
  }

  const status    = data?.school.status ?? 'trial'
  const plan      = data?.school.plan ?? 'free'
  const daysLeft  = data ? trialDaysLeft(status, data.school.trialEndsAt) : null
  const isActive  = status === 'active'

  const statusBadge = isActive          ? 'bg-green-50 text-green-700' :
                      status === 'trial' ? 'bg-amber-50 text-amber-700' :
                                           'bg-red-50 text-red-600'

  return (
    <DashboardLayout
      activePage="subscription"
      onNavigate={onNavigate}
      title="Subscription & Billing"
      subtitle="Manage your school's Learnora subscription"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[900px] flex flex-col gap-6">

        {notice && (
          <div className={`flex items-start gap-2 rounded-card px-4 py-3 text-sm border ${
            notice.kind === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {notice.kind === 'success' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
            <p>{notice.text}</p>
          </div>
        )}

        {loadError && (
          <div className="rounded-card px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700">{loadError}</div>
        )}

        {/* Current plan */}
        <div className="bg-primary rounded-card p-6 text-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-white/70 mb-1">Current Plan</p>
              {loading ? (
                <div className="h-7 w-40 bg-white/20 rounded animate-pulse mb-1" />
              ) : (
                <h2 className="text-2xl font-bold mb-1">{PLAN_LABELS[plan] ?? `${plan} Plan`}</h2>
              )}
              {loading ? (
                <div className="h-4 w-56 bg-white/20 rounded animate-pulse" />
              ) : (
                <p className="text-sm text-white/80">
                  {data?.school.name ?? '—'} · {data?.pricing.activeStudents ?? 0} active students
                </p>
              )}
            </div>
            <div className="text-right">
              {loading ? (
                <div className="h-9 w-24 bg-white/20 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold">{naira(rate)}</p>
                  <p className="text-sm text-white/70">per student / term</p>
                </>
              )}
            </div>
          </div>
          <hr className="border-white/20 my-4" />
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
            <span>Status:</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusBadge}`}>
              {STATUS_LABELS[status] ?? status}
            </span>
            {daysLeft !== null && (
              <span>
                {daysLeft > 0
                  ? <>Trial ends in <span className="font-semibold text-white">{daysLeft} day{daysLeft === 1 ? '' : 's'}</span></>
                  : <span className="font-semibold text-white">Your trial has ended</span>}
              </span>
            )}
          </div>
        </div>

        {/* Pay / upgrade */}
        {!loading && data && (
          <div className="bg-surface rounded-card shadow-sm p-6">
            <h3 className="text-base font-bold text-foreground mb-1">
              {isActive ? 'Pay for another term' : 'Choose your subscription'}
            </h3>
            <p className="text-sm text-muted mb-5">
              Learnora is billed at {naira(rate)} per student, per term.
            </p>

            {data.pendingTransfer ? (
              <div className="flex items-start gap-3 p-4 rounded-card bg-amber-50 border border-amber-200">
                <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Bank transfer awaiting confirmation</p>
                  <p className="text-xs text-amber-800 mt-1">
                    We've received your transfer of {naira(data.pendingTransfer.amount)}
                    {data.pendingTransfer.reference ? ` (ref: ${data.pendingTransfer.reference})` : ''}. Learnora will
                    activate your subscription once it's confirmed.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-5">
                  <div className="flex flex-col gap-2 sm:w-56">
                    <label htmlFor="student-count" className="text-sm font-bold text-foreground">Number of students</label>
                    <input
                      id="student-count"
                      type="number"
                      min={1}
                      step={1}
                      value={studentCount}
                      onChange={e => setStudentCount(e.target.value)}
                      className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground outline-none focus:border-primary transition-colors bg-surface"
                    />
                  </div>
                  <div className="flex-1 sm:text-right">
                    <p className="text-xs text-muted">Total for this term</p>
                    <p className="text-2xl font-bold text-foreground">{naira(total)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  {([
                    { id: 'paystack',      icon: CreditCard, label: 'Pay online (Paystack)', sub: 'Card, bank or USSD. Activated immediately.', enabled: data.paystackEnabled },
                    { id: 'bank_transfer', icon: Landmark,   label: 'Bank transfer',         sub: 'Activated once Learnora confirms receipt.',  enabled: Boolean(data.bankDetails) },
                  ] as const).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={!m.enabled}
                      onClick={() => { setMethod(m.id); setFormError('') }}
                      className={`flex items-center gap-3 p-4 rounded-card border-2 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        method === m.id ? 'border-primary bg-primary/5' : 'border-black/10 hover:border-primary/30'
                      }`}
                    >
                      <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${method === m.id ? 'bg-primary text-white' : 'bg-canvas text-muted'}`}>
                        <m.icon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{m.label}</p>
                        <p className="text-xs text-muted mt-0.5">{m.enabled ? m.sub : 'Not available right now.'}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {formError && (
                  <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{formError}</div>
                )}

                {method === 'paystack' ? (
                  <button
                    type="button"
                    onClick={handlePaystack}
                    disabled={submitting || !countOk || !data.paystackEnabled}
                    className="w-full h-12 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors shadow-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? <><Loader2 size={15} className="animate-spin" /> Redirecting to Paystack…</> : <>Pay {naira(total)} with Paystack</>}
                  </button>
                ) : data.bankDetails ? (
                  <form onSubmit={handleBankTransfer} className="flex flex-col gap-4">
                    <div className="bg-canvas border border-black/10 rounded-card p-4 flex flex-col gap-2">
                      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Transfer {naira(total)} to Learnora</p>
                      {[
                        { label: 'Bank',           value: data.bankDetails.bankName    || '—' },
                        { label: 'Account Name',   value: data.bankDetails.accountName || '—' },
                        { label: 'Account Number', value: data.bankDetails.accountNumber },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between gap-4 text-sm">
                          <span className="text-muted">{r.label}</span>
                          <span className={`font-bold text-foreground text-right ${r.label === 'Account Number' ? 'font-mono tracking-widest' : ''}`}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted">After you've made the transfer, enter its details so we can match it.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label htmlFor="transfer-ref" className="text-sm font-bold text-foreground">Transfer reference</label>
                        <input
                          id="transfer-ref"
                          required
                          value={reference}
                          onChange={e => setReference(e.target.value)}
                          placeholder="e.g. session ID or narration"
                          className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors bg-surface"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label htmlFor="transfer-date" className="text-sm font-bold text-foreground">Date paid</label>
                        <input
                          id="transfer-date"
                          type="date"
                          required
                          max={today()}
                          value={paidAt}
                          onChange={e => setPaidAt(e.target.value)}
                          className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground outline-none focus:border-primary transition-colors bg-surface"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting || !countOk}
                      className="w-full h-12 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors shadow-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? <><Loader2 size={15} className="animate-spin" /> Submitting…</> : "I've made the transfer"}
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-muted">Bank details aren't set up yet. Contact Learnora support for payment instructions.</p>
                )}
              </>
            )}
          </div>
        )}

        {/* Plan features */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h3 className="text-base font-bold text-foreground mb-4">Included in your plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {planFeatures.map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Billing history */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/6">
            <h3 className="text-base font-bold text-foreground">Billing History</h3>
            <button onClick={() => onNavigate('admin-support')} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              Contact support <ChevronRight size={12} />
            </button>
          </div>
          {data && data.payments.length > 0 ? (
            <div className="divide-y divide-black/6">
              {data.payments.map(p => {
                const s = PAYMENT_STATUS[p.status] ?? { label: p.status, className: 'bg-canvas text-muted' }
                return (
                  <div key={p.id} className="flex items-center justify-between gap-4 px-6 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{naira(p.amount)}</p>
                      <p className="text-xs text-muted truncate">
                        {new Date(p.paidAt).toLocaleDateString()} · {p.method === 'paystack' ? 'Paystack' : 'Bank transfer'}
                        {p.reference ? ` · ${p.reference}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${s.className}`}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-sm text-muted">
              {loading ? 'Loading…' : 'No payments yet.'}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
