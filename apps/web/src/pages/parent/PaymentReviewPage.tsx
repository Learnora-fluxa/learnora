import { useState, useEffect } from 'react'
import { ChevronLeft, Loader2 } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { parentNav } from '../../components/layout/Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { getParentPaymentContext, initializeParentPayment } from '../../lib/financeApi'

type Props = { onNavigate: (page: string) => void }

function fmt(n: number) { return '₦' + n.toLocaleString('en-NG') }

export default function PaymentReviewPage({ onNavigate }: Props) {
  const { profile, session } = useAuth()

  const [confirmed, setConfirmed] = useState(false)
  const [amount, setAmount] = useState(0)
  const [ref, setRef] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [authorizationUrl, setAuthorizationUrl] = useState('')
  const [callbackUrl, setCallbackUrl] = useState('')
  const [initializing, setInitializing] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('learnora_pending_payment_amount')
    const total = sessionStorage.getItem('learnora_pending_payment_total')
    const resolvedAmount = stored ? Number(stored) : total ? Number(total) : 0
    setAmount(resolvedAmount)
    setDateStr(new Date().toLocaleString('en-NG', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }))

    if (profile?.school_id && session && resolvedAmount > 0) {
      const childId = sessionStorage.getItem('learnora_selected_child')
      Promise.all([
        getParentPaymentContext(session, childId),
        initializeParentPayment(session, {
          childId,
          amount: resolvedAmount,
          method: 'paystack',
        }),
      ]).then(([data, initialized]) => {
        setRef(initialized.reference)
        setCallbackUrl(initialized.callbackUrl)
        setAuthorizationUrl(initialized.authorizationUrl)
        sessionStorage.setItem('learnora_pending_payment_ref', initialized.reference)
        if (data.childId) {
          sessionStorage.setItem('learnora_selected_child', data.childId)
        }
      }).catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Could not initialize payment.')
      }).finally(() => {
        setInitializing(false)
      })
    } else {
      setInitializing(false)
    }
  }, [profile?.school_id, session])

  function handlePay() {
    if (!confirmed) return
    if (!authorizationUrl) {
      setError('Payment session is not ready yet. Please refresh and try again.')
      return
    }

    setPaying(true)
    sessionStorage.setItem('learnora_payment_mode', 'paid')
    if (callbackUrl) {
      sessionStorage.setItem('learnora_callback_url', callbackUrl)
    }
    window.location.assign(authorizationUrl)
  }

  const userName = profile?.full_name ?? 'Parent User'
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'P'

  function renderContent(showBackButton: boolean) {
    return (
      <div className="flex min-h-full flex-col px-5 pb-8 pt-5 lg:px-0 lg:pb-0 lg:pt-0">
        {showBackButton && (
          <button onClick={() => onNavigate('parent/payment')} className="mb-6">
            <ChevronLeft size={22} />
          </button>
        )}

        <h1 className="mb-2 text-2xl font-bold text-primary">Review and Confirm</h1>
        <p className="mb-8 text-sm leading-relaxed text-muted">
          Please verify your school fee payment details before proceeding to Paystack checkout.
        </p>

        <div className="mb-8 flex flex-col gap-5">
          {[
            { label: 'Amount', value: fmt(amount) },
            { label: 'Reference ID', value: ref || 'Generating…' },
            { label: 'Date & Time', value: dateStr },
          ].map(field => (
            <div key={field.label} className="border-b border-black/8 pb-4">
              <p className="mb-1 text-sm font-bold text-foreground">{field.label}</p>
              <p className="text-base text-foreground">{field.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-10 flex items-start gap-3">
          <button
            onClick={() => setConfirmed(!confirmed)}
            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
              confirmed ? 'border-primary bg-primary' : 'border-black/20'
            }`}
          >
            {confirmed && <span className="text-xs font-bold text-white">✓</span>}
          </button>
          <p className="text-sm leading-relaxed text-muted">
            I confirm that the payment details above are correct and I authorise this school fee payment.
          </p>
        </div>

        {error && <p className="mb-4 text-xs text-red-500">{error}</p>}

        <div className="flex-1" />

        <button
          disabled={!confirmed || paying || initializing || !authorizationUrl}
          onClick={handlePay}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-white transition-colors hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          {(paying || initializing) && <Loader2 size={18} className="animate-spin" />}
          {initializing ? 'Preparing checkout…' : paying ? 'Redirecting…' : 'Continue to Paystack'}
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="lg:hidden">
        <MobileLayout activePage="parent/home" onNavigate={onNavigate} nav={parentMobileNav}>
          {renderContent(true)}
        </MobileLayout>
      </div>

      <div className="hidden lg:block">
        <DashboardLayout
          activePage="parent/fees"
          onNavigate={onNavigate}
          title="Review and Confirm"
          subtitle="Confirm the fee payment details before starting hosted checkout."
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
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/70">Payment Snapshot</p>
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Amount</span>
                    <span className="text-sm font-semibold text-foreground">{fmt(amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Reference</span>
                    <span className="text-sm font-semibold text-foreground">{ref || 'Generating…'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Checkout</span>
                    <span className="text-sm font-semibold text-foreground">
                      {initializing ? 'Preparing…' : authorizationUrl ? 'Hosted Paystack ready' : 'Unavailable'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] bg-primary p-6 text-white shadow-lg shadow-primary/20">
                <p className="text-sm font-semibold">Secure hosted checkout</p>
                <p className="mt-2 text-sm leading-6 text-white/85">
                  Learnora will redirect you to Paystack&apos;s hosted payment page. After payment, Paystack returns to the API callback and then back to your receipt screen.
                </p>
              </div>
            </aside>
          </div>
        </DashboardLayout>
      </div>
    </>
  )
}
