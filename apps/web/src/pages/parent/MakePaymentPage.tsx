import { useState, useEffect } from 'react'
import { ChevronLeft, MoreHorizontal } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { parentNav } from '../../components/layout/Sidebar'
import { useAuth } from '../../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

function fmt(n: number) { return '₦' + n.toLocaleString('en-NG') }

export default function MakePaymentPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [total, setTotal] = useState(0)
  const [amount, setAmount] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('learnora_pending_payment_total')
    setTotal(stored ? Number(stored) : 0)
  }, [])

  function setPercent(pct: number) {
    setAmount(String(Math.round(total * pct / 100)))
  }

  function proceed() {
    const nextAmount = Number(amount) || total
    sessionStorage.setItem('learnora_pending_payment_amount', String(nextAmount))
    onNavigate('parent/payment-review')
  }

  const userName = profile?.full_name ?? 'Parent User'
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'P'
  const enteredAmount = Number(amount) || total

  function renderContent(showBackButton: boolean) {
    return (
      <div className="flex min-h-full flex-col px-5 pb-4 pt-5 lg:px-0 lg:pb-0 lg:pt-0">
        {showBackButton && (
          <button onClick={() => onNavigate('parent/payment-method')} className="mb-6">
            <ChevronLeft size={22} />
          </button>
        )}

        <h1 className="mb-1 text-2xl font-bold text-primary">Make Payment</h1>
        <p className="mb-5 text-sm text-muted">Choose how much of the outstanding balance to pay right now.</p>

        <div className="relative mb-6 rounded-3xl bg-primary p-5">
          <button className="absolute right-4 top-4"><MoreHorizontal size={18} className="text-white/70" /></button>
          <p className="mb-1 text-xs text-white/70">Outstanding Summary</p>
          <p className="mb-2 text-3xl font-bold text-white">{total > 0 ? fmt(total) : '₦0'}</p>
          <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-white">Due Soon</span>
        </div>

        <p className="mb-3 text-base font-bold text-foreground">Amount Field</p>
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-black/15 px-4 py-3">
          <span className="text-base font-bold text-foreground">₦</span>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="00.00"
            className="flex-1 text-base text-foreground outline-none placeholder:text-muted"
          />
          <button
            onClick={() => setAmount(String(total))}
            className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white"
          >
            Full Payment
          </button>
        </div>

        <div className="mb-8 flex gap-3">
          {[25, 50, 75].map(percent => (
            <button
              key={percent}
              onClick={() => setPercent(percent)}
              className="h-11 flex-1 rounded-xl border-2 border-black/12 text-sm font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {percent}%
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button
          onClick={proceed}
          disabled={total === 0 && !amount}
          className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-white transition-colors hover:bg-primary-deep disabled:opacity-50"
        >
          Make Payment
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
          title="Make Payment"
          subtitle="Choose the amount to pay before reviewing and confirming."
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
                    <span className="text-sm text-muted">Outstanding</span>
                    <span className="text-sm font-semibold text-foreground">{fmt(total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Selected amount</span>
                    <span className="text-sm font-semibold text-foreground">{fmt(enteredAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Next step</span>
                    <span className="text-sm font-semibold text-foreground">Review</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] bg-primary p-6 text-white shadow-lg shadow-primary/20">
                <p className="text-sm font-semibold">Flexible payments</p>
                <p className="mt-2 text-sm leading-6 text-white/85">
                  You can pay the full balance or enter a partial amount before continuing to the review step.
                </p>
              </div>
            </aside>
          </div>
        </DashboardLayout>
      </div>
    </>
  )
}
