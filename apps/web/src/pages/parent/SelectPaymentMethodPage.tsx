import { useState, useEffect } from 'react'
import { ChevronLeft, CreditCard, Landmark, Banknote, Copy, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { parentNav } from '../../components/layout/Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { getParentFees, submitParentOffline } from '../../lib/financeApi'

type Props = { onNavigate: (page: string) => void }
type Method = 'card' | 'bank' | 'offline'

function fmt(n: number) { return '₦' + n.toLocaleString('en-NG') }

interface BankDetails {
  bankName: string
  acctName: string
  acctNumber: string
}

export default function SelectPaymentMethodPage({ onNavigate }: Props) {
  const { profile, session } = useAuth()
  const [selected, setSelected] = useState<Method | null>(null)
  const [copied, setCopied] = useState(false)
  const [balance, setBalance] = useState(0)
  const [schoolName, setSchoolName] = useState('—')
  const [loading, setLoading] = useState(true)
  const [bankDetails, setBankDetails] = useState<BankDetails>({ bankName: '', acctName: '', acctNumber: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState<string | null>(null)

  useEffect(() => { if (profile?.id && session) loadBalance() }, [profile?.id, session])

  async function loadBalance() {
    if (!session) return
    setLoading(true)
    try {
      const preferredChildId = sessionStorage.getItem('learnora_selected_child')
      const data = await getParentFees(session, preferredChildId)
      const computedBalance = data.feeItems.reduce((sum, item) => sum + Math.max(item.amount - item.paid, 0), 0)
      setBalance(computedBalance)
      sessionStorage.setItem('learnora_pending_payment_total', String(computedBalance))
      setSchoolName(data.schoolName ?? '—')
      setBankDetails({
        bankName: data.schoolBank.name ?? '',
        acctName: data.schoolBank.acctName ?? '',
        acctNumber: data.schoolBank.acct ?? '',
      })
      if (data.childId) {
        sessionStorage.setItem('learnora_selected_child', data.childId)
      }
    } finally {
      setLoading(false)
    }
  }

  function copyAcct() {
    navigator.clipboard.writeText(bankDetails.acctNumber).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function submitOffline() {
    if (!session) return
    setSubmitting(true)
    setSubmitErr(null)

    try {
      const childId = sessionStorage.getItem('learnora_selected_child')
      const reply = await submitParentOffline(session, { childId })
      sessionStorage.setItem('learnora_selected_child', reply.childId)
      sessionStorage.setItem('learnora_payment_mode', 'pending')
      sessionStorage.setItem('learnora_pending_payment_amount', String(balance))
      onNavigate('parent/payment-success')
    } catch (error) {
      setSubmitErr(error instanceof Error ? error.message : 'Could not submit offline payment.')
    } finally {
      setSubmitting(false)
    }
  }

  const methods: { id: Method; icon: typeof CreditCard; label: string; sub: string }[] = [
    { id: 'card', icon: CreditCard, label: 'Card / USSD', sub: 'Pay securely via Paystack — card, USSD, bank app.' },
    { id: 'bank', icon: Landmark, label: 'Bank Transfer', sub: 'Generate a virtual account and transfer from your bank.' },
    { id: 'offline', icon: Banknote, label: 'Offline / Cash', sub: 'Pay cash at school or transfer directly to school account.' },
  ]

  function handleProceed() {
    if (selected === 'offline') return
    onNavigate('parent/payment')
  }

  const userName = profile?.full_name ?? 'Parent User'
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'P'

  function renderMethodList() {
    return (
      <div className="flex flex-col gap-3">
        {methods.map(method => {
          const Icon = method.icon
          const isSelected = selected === method.id
          return (
            <div key={method.id}>
              <button
                onClick={() => setSelected(isSelected ? null : method.id)}
                className={`w-full rounded-2xl border-2 px-5 py-4 text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/4 shadow-md'
                    : 'border-black/10 bg-white shadow-sm hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${isSelected ? 'bg-primary text-white' : 'bg-canvas text-foreground'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{method.label}</p>
                    <p className="mt-0.5 text-xs text-muted">{method.sub}</p>
                  </div>
                  <div className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? 'border-primary bg-primary' : 'border-black/20'}`}>
                    {isSelected && <div className="size-2 rounded-full bg-white" />}
                  </div>
                </div>
              </button>

              {method.id === 'offline' && isSelected && (
                <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-black/10 bg-canvas px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground">School Account Details</p>

                  {[
                    { label: 'Account Name', value: bankDetails.acctName || schoolName },
                    { label: 'Bank', value: bankDetails.bankName || '—' },
                    { label: 'Account Number', value: bankDetails.acctNumber || '—' },
                    { label: 'Amount', value: fmt(balance) },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-xs text-muted">{row.label}</span>
                      <span className={`text-sm font-bold text-foreground ${row.label === 'Account Number' ? 'font-mono tracking-widest' : ''}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}

                  {bankDetails.acctNumber && (
                    <button
                      onClick={copyAcct}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl border border-black/12 bg-white text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {copied
                        ? <><CheckCircle2 size={14} className="text-green-600" /> Copied!</>
                        : <><Copy size={14} /> Copy Account Number</>
                      }
                    </button>
                  )}

                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
                    <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-600" />
                    <p className="text-[11px] leading-snug text-amber-800">
                      After transferring, tap &quot;I&apos;ve Transferred&quot; below. Your payment will be marked as pending until the school admin confirms receipt within 1 to 2 business days.
                    </p>
                  </div>

                  {submitErr && (
                    <p className="text-xs font-medium text-red-600">{submitErr}</p>
                  )}

                  <button
                    onClick={submitOffline}
                    disabled={submitting || loading || balance === 0}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white transition-colors hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting
                      ? <><Loader2 size={15} className="animate-spin" /> Submitting…</>
                      : 'I\'ve Transferred — Submit'
                    }
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  function renderContent(showBackButton: boolean) {
    return (
      <div className="flex min-h-full flex-col px-5 pb-8 pt-5 lg:px-0 lg:pb-0 lg:pt-0">
        {showBackButton && (
          <button onClick={() => onNavigate('parent/fees')} className="mb-6">
            <ChevronLeft size={22} />
          </button>
        )}

        <h1 className="mb-1 text-2xl font-bold text-primary">Select Payment Method</h1>
        <p className="mb-6 text-sm text-muted">
          {loading
            ? 'Loading outstanding balance…'
            : <>Choose a payment method to pay <strong>{fmt(balance)}</strong></>
          }
        </p>

        <div className="flex-1">{renderMethodList()}</div>

        {selected && selected !== 'offline' && (
          <button
            onClick={handleProceed}
            className="mt-6 h-14 w-full rounded-2xl bg-primary text-base font-bold text-white transition-colors hover:bg-primary-deep"
          >
            Proceed to Pay {fmt(balance)}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="lg:hidden">
        <MobileLayout activePage="parent/fees" onNavigate={onNavigate} nav={parentMobileNav}>
          {renderContent(true)}
        </MobileLayout>
      </div>

      <div className="hidden lg:block">
        <DashboardLayout
          activePage="parent/fees"
          onNavigate={onNavigate}
          title="Select Payment Method"
          subtitle="Choose how you want to settle the current school fee balance."
          nav={parentNav}
          user={{ name: userName, role: 'Parent', initials: userInitials }}
          mainClassName="flex-1 overflow-y-auto p-6 xl:p-8"
        >
          <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1.15fr)_340px]">
            <section className="rounded-[30px] bg-white p-8 shadow-sm">
              {renderContent(false)}
            </section>

            <aside className="space-y-5">
              <div className="rounded-[30px] bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/70">Payment Summary</p>
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">School</span>
                    <span className="text-sm font-semibold text-foreground">{schoolName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Outstanding</span>
                    <span className="text-sm font-semibold text-foreground">{fmt(balance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Selected method</span>
                    <span className="text-sm font-semibold text-foreground">
                      {selected ? methods.find(item => item.id === selected)?.label ?? 'Not selected' : 'Not selected'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] bg-primary p-6 text-white shadow-lg shadow-primary/20">
                <p className="text-sm font-semibold">Need help before paying?</p>
                <p className="mt-2 text-sm leading-6 text-white/85">
                  Card and bank flows continue online. Offline submissions stay pending until the school confirms receipt.
                </p>
              </div>
            </aside>
          </div>
        </DashboardLayout>
      </div>
    </>
  )
}
