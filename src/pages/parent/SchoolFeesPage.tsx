import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Banknote,
  Check,
  CheckCircle2,
  ChevronLeft,
  Copy,
  CreditCard,
  Download,
  MoreHorizontal,
} from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { parentNav } from '../../components/layout/Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

type FilterKey = 'all' | 'academics' | 'attendance' | 'assignments' | 'updates' | 'behaviour' | 'fees'

interface FeeItem {
  invoiceId: string
  label: string
  amount: number
  paid: number
}

interface Payment {
  ref: string
  amount: number
  date: string
  method: string
  items: string
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'academics', label: 'Academics' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'updates', label: 'School Updates' },
  { key: 'behaviour', label: 'Behaviour' },
  { key: 'fees', label: 'Fees' },
]

const FALLBACK_FEES: FeeItem[] = [
  { invoiceId: 'demo-fee-1', label: 'Tuition Fee', amount: 70000, paid: 35000 },
  { invoiceId: 'demo-fee-2', label: 'Books & Materials', amount: 10000, paid: 3000 },
  { invoiceId: 'demo-fee-3', label: 'Development Levy', amount: 20000, paid: 0 },
]

const FALLBACK_PAYMENTS: Payment[] = [
  { ref: 'demo-ref-35000', amount: 35000, date: 'May 01, 2026', method: 'Paystack', items: 'Tuition Fee' },
  { ref: 'demo-ref-3000', amount: 3000, date: 'May 01, 2026', method: 'Bank Transfer', items: 'Books & Materials' },
  { ref: 'demo-ref-30000', amount: 30000, date: 'April 18, 2026', method: 'Paystack', items: 'Previous Term Balance' },
]

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtShort(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

function dueInLabel(iso: string | null) {
  if (!iso) return 'No due date'
  const due = new Date(`${iso}T00:00:00`)
  const today = new Date('2026-08-04T00:00:00')
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000)

  if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`
  if (diffDays === 0) return 'Due Today'
  if (diffDays === 1) return 'Due Tomorrow'
  return `Due in ${diffDays} Days`
}

function PaymentHistoryRow({ payment }: { payment: Payment }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lime-100 text-lime-600">
          <Check size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-foreground">{fmtShort(payment.amount)}</p>
          <p className="truncate text-[12px] text-muted">{payment.date}</p>
        </div>
      </div>
      <button
        type="button"
        title="Receipt download coming soon"
        className="flex size-[27px] shrink-0 items-center justify-center rounded-[5px] border border-primary/50 bg-primary/10 text-primary opacity-70"
      >
        <Download size={14} />
      </button>
    </div>
  )
}

export default function SchoolFeesPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [filter, setFilter] = useState<FilterKey>('all')
  const [copied, setCopied] = useState(false)
  const [showOffline, setShowOffline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [childName, setChildName] = useState('Child')
  const [className, setClassName] = useState('')
  const [feeItems, setFeeItems] = useState<FeeItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [nearestDue, setNearestDue] = useState<string | null>(null)
  const [schoolBank, setSchoolBank] = useState({ name: '', acct: '', acctName: '' })

  useEffect(() => {
    if (profile?.id) loadFees()
  }, [profile?.id, profile?.school_id])

  async function loadFees() {
    setLoading(true)

    if (!profile?.school_id) {
      useFallbackData()
      return
    }

    const schoolId = profile.school_id
    let childId = sessionStorage.getItem('learnora_selected_child')

    if (!childId) {
      const { data: linkData } = await supabase
        .from('parent_student_links')
        .select('student_id')
        .eq('parent_id', profile.id)
        .eq('school_id', schoolId)
        .limit(1)
        .maybeSingle()

      if (linkData) childId = (linkData as { student_id: string }).student_id
    }

    if (!childId) {
      useFallbackData()
      return
    }

    const [profileRes, enrollRes, invoiceRes, paymentRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', childId).maybeSingle(),
      supabase.from('class_enrollments').select('classes(name)').eq('student_id', childId).limit(1).maybeSingle(),
      supabase.from('invoices')
        .select('id, amount, status, due_date, fee_structures(name)')
        .eq('student_id', childId)
        .eq('school_id', schoolId),
      supabase.from('payments')
        .select('invoice_id, amount, paystack_reference, paystack_status, paid_at')
        .eq('student_id', childId),
      supabase.from('school_settings')
        .select('bank_name, account_number, account_name')
        .eq('school_id', schoolId)
        .maybeSingle(),
    ])

    if (profileRes.data) {
      const data = profileRes.data as { full_name: string | null }
      setChildName(data.full_name ?? 'Child')
    }

    if (enrollRes.data) {
      const data = enrollRes.data as { classes: { name: string } | null }
      setClassName(data.classes?.name ?? '')
    }

    const invoices = (invoiceRes.data ?? []) as {
      id: string
      amount: string | number
      status: string
      due_date: string | null
      fee_structures: { name: string } | null
    }[]

    const paymentRows = (paymentRes.data ?? []) as {
      invoice_id: string
      amount: string | number
      paystack_reference: string | null
      paystack_status: string | null
      paid_at: string
    }[]

    if (!invoices.length) {
      useFallbackData()
      return
    }

    const paidByInvoice: Record<string, number> = {}
    for (const payment of paymentRows) {
      paidByInvoice[payment.invoice_id] = (paidByInvoice[payment.invoice_id] ?? 0) + Number(payment.amount)
    }

    const items: FeeItem[] = invoices.map(invoice => ({
      invoiceId: invoice.id,
      label: invoice.fee_structures?.name ?? 'Fee',
      amount: Number(invoice.amount),
      paid: paidByInvoice[invoice.id] ?? 0,
    }))

    const paidList: Payment[] = paymentRows.map(payment => ({
      ref: payment.paystack_reference ?? 'N/A',
      amount: Number(payment.amount),
      date: new Date(payment.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      method: payment.paystack_status === 'success' ? 'Paystack' : 'Bank Transfer',
      items: invoices.find(item => item.id === payment.invoice_id)?.fee_structures?.name ?? 'Payment',
    }))

    const unpaidDues = invoices
      .filter(invoice => invoice.status !== 'paid' && invoice.status !== 'waived' && invoice.due_date)
      .map(invoice => invoice.due_date!)
      .sort()

    const bank = settingsRes.data as { bank_name: string | null; account_number: string | null; account_name: string | null } | null

    setFeeItems(items)
    setPayments(paidList)
    setNearestDue(unpaidDues[0] ?? null)
    setSchoolBank({
      name: bank?.bank_name ?? 'First Learnora Bank',
      acct: bank?.account_number ?? '0123456789',
      acctName: bank?.account_name ?? 'Learnora Academy',
    })
    setUsingFallback(false)
    setLoading(false)
  }

  function useFallbackData() {
    setChildName('Olive Princely Ashuma')
    setClassName('Primary 5A')
    setFeeItems(FALLBACK_FEES)
    setPayments(FALLBACK_PAYMENTS)
    setNearestDue('2026-08-09')
    setSchoolBank({
      name: 'First Learnora Bank',
      acct: '0123456789',
      acctName: 'Learnora Academy',
    })
    setUsingFallback(true)
    setLoading(false)
  }

  function copyAcct() {
    navigator.clipboard.writeText(schoolBank.acct).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalFee = feeItems.reduce((sum, item) => sum + item.amount, 0)
  const totalPaid = feeItems.reduce((sum, item) => sum + item.paid, 0)
  const totalBalance = totalFee - totalPaid
  const pct = totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 100
  const dueLabel = dueInLabel(nearestDue)
  const visiblePayments = useMemo(() => payments.slice(0, 3), [payments])
  const userName = profile?.full_name ?? 'Parent User'
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'P'

  function renderHeader(showBack: boolean) {
    return (
      <div>
        {showBack && (
          <button type="button" onClick={() => onNavigate('parent/home')} className="mb-6 text-foreground">
            <ChevronLeft size={24} />
          </button>
        )}
        <h1 className="text-[24px] font-semibold text-primary">School Fees</h1>
        <p className="mt-2 text-[12px] leading-6 text-foreground">
          Manage and track your child&apos;s school payments.
        </p>
      </div>
    )
  }

  function renderFilters() {
    return (
      <div className="no-scrollbar -mx-1 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-3 px-1">
          {FILTERS.map(item => {
            const active = filter === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-[6px] border px-4 py-2.5 text-[14px] transition-colors ${
                  active ? 'border-primary bg-primary text-white' : 'border-black/55 bg-white text-foreground'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderBalanceCard() {
    return (
      <section className="relative overflow-hidden rounded-[18px] bg-primary p-5 text-white shadow-[0_14px_28px_rgba(75,117,255,0.32)]">
        <button type="button" className="absolute right-4 top-4 text-white/90">
          <MoreHorizontal size={20} />
        </button>
        <p className="text-[14px] text-white/90">Outstanding Balance</p>
        <p className="mt-2 text-[32px] font-semibold leading-none">{fmt(totalBalance)}</p>
        <div className="mt-2 inline-flex rounded-[6px] bg-amber-400 px-3 py-1 text-[12px] font-bold text-white">
          {dueLabel}
        </div>
        <div className="mt-4">
          <div className="h-[7px] rounded-full bg-amber-100/80">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-right text-[10px] text-white/85">{pct}%</div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('parent/payment-method')}
          className="mt-2 rounded-[10px] border-2 border-amber-400 px-8 py-2.5 text-[14px] font-semibold text-white"
        >
          Pay Now
        </button>
      </section>
    )
  }

  function renderHistoryCard() {
    return (
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[20px] font-semibold text-foreground">Payment History</h2>
          <button type="button" className="text-[14px] text-foreground">
            View all
          </button>
        </div>
        <div className="overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-[0_8px_20px_rgba(0,0,0,0.10)]">
          {visiblePayments.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">No payments recorded yet.</div>
          ) : (
            visiblePayments.map((payment, index) => (
              <div key={payment.ref}>
                <PaymentHistoryRow payment={payment} />
                {index < visiblePayments.length - 1 && <div className="border-t border-black/10" />}
              </div>
            ))
          )}
        </div>
      </section>
    )
  }

  function renderBreakdown() {
    if (!feeItems.length) return null
    return (
      <section className="rounded-[18px] border border-black/10 bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
        <div className="space-y-4">
          {feeItems.map(item => {
            const balance = item.amount - item.paid
            const percentPaid = item.amount > 0 ? Math.round((item.paid / item.amount) * 100) : 100
            return (
              <div key={item.invoiceId} className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/10">
                      <div className="h-full rounded-full bg-lime-500" style={{ width: `${percentPaid}%` }} />
                    </div>
                    <span className="text-[11px] text-muted">{percentPaid}% paid</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-foreground">{fmtShort(item.amount)}</p>
                  <p className={`text-[11px] ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {balance > 0 ? `${fmtShort(balance)} left` : 'Cleared'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  function renderOfflineBox() {
    if (!showOffline) return null
    return (
      <div className="rounded-[18px] border border-black/10 bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">School Bank Details</p>
        <div className="mt-4 space-y-3">
          {[
            { label: 'Bank', value: schoolBank.name },
            { label: 'Account Name', value: schoolBank.acctName },
            { label: 'Account Number', value: schoolBank.acct, mono: true },
            { label: 'Amount', value: fmt(totalBalance) },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted">{item.label}</span>
              <span className={`text-sm font-semibold text-foreground ${item.mono ? 'font-mono' : ''}`}>{item.value}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={copyAcct}
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-canvas text-sm font-semibold text-foreground"
        >
          {copied ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy Account Number'}
        </button>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-[11px] leading-5 text-amber-800">
            After transferring, keep your bank receipt and inform the school office. Payments are confirmed within 1 to 2 business days.
          </p>
        </div>
      </div>
    )
  }

  function renderPayActions() {
    if (totalBalance <= 0) {
      return (
        <div className="flex items-center justify-center gap-2 rounded-[18px] border border-green-200 bg-green-50 px-4 py-4 text-green-700">
          <CheckCircle2 size={18} />
          <span className="text-sm font-semibold">All fees cleared for this term</span>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onNavigate('parent/payment-method')}
          className="flex h-12 w-full items-center justify-center rounded-[14px] bg-primary text-[16px] font-semibold text-white"
        >
          Pay Fee
        </button>
        <button
          type="button"
          onClick={() => setShowOffline(value => !value)}
          className="flex w-full items-center gap-3 rounded-[14px] border border-black/10 bg-white px-4 py-4 text-left shadow-sm"
        >
          <Banknote size={18} className="shrink-0 text-foreground" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Pay Offline / Bank Transfer</p>
            <p className="text-xs text-muted">Transfer directly to the school account</p>
          </div>
        </button>
        {renderOfflineBox()}
      </div>
    )
  }

  function renderBody() {
    if (loading) {
      return <div className="py-12 text-center text-sm text-muted">Loading fee records…</div>
    }

    if (!feeItems.length && !usingFallback) {
      return (
        <div className="rounded-[18px] border border-green-200 bg-green-50 px-4 py-6 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-3 text-green-500" />
          <p className="text-sm font-semibold text-green-700">No fee records found.</p>
          <p className="mt-1 text-xs text-muted">Contact the school if this is unexpected.</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {usingFallback && (
          <div className="rounded-[18px] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary">
            Preview mode: showing fallback fee data because this parent has no linked live invoice records yet.
          </div>
        )}
        {renderFilters()}
        {renderBalanceCard()}
        {renderHistoryCard()}
        {renderBreakdown()}
        {renderPayActions()}
      </div>
    )
  }

  return (
    <>
      <div className="lg:hidden">
        <MobileLayout activePage="parent/fees" onNavigate={onNavigate} nav={parentMobileNav}>
          <div className="px-[18px] pt-14 pb-28">
            {renderHeader(true)}
            <div className="mt-6">{renderBody()}</div>
          </div>
        </MobileLayout>
      </div>

      <div className="hidden lg:block">
        <DashboardLayout
          activePage="parent/fees"
          onNavigate={onNavigate}
          title="School Fees"
          subtitle={`${childName}${className ? ` · ${className}` : ''}`}
          nav={parentNav}
          user={{ name: userName, role: 'Parent', initials: userInitials }}
          mainClassName="flex-1 overflow-y-auto p-6 xl:p-8"
        >
          <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
            <section className="rounded-[28px] bg-white p-6 shadow-sm xl:p-8">
              {renderHeader(false)}
              <div className="mt-6">{renderBody()}</div>
            </section>

            <aside className="space-y-5">
              <div className="rounded-[28px] bg-primary p-6 text-white shadow-[0_16px_34px_rgba(75,117,255,0.30)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Overview</p>
                <p className="mt-4 text-3xl font-semibold">{fmt(totalBalance)}</p>
                <p className="mt-2 text-sm text-white/80">Outstanding as of Tuesday, August 4, 2026.</p>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-white/75">
                  <span>{fmt(totalPaid)} paid</span>
                  <span>{pct}% settled</span>
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-6 shadow-sm">
                <p className="text-lg font-semibold text-foreground">Quick Facts</p>
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Student</span>
                    <span className="text-sm font-semibold text-foreground">{childName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Class</span>
                    <span className="text-sm font-semibold text-foreground">{className || 'Primary 5A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Nearest due</span>
                    <span className="text-sm font-semibold text-foreground">{dueLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Recent payments</span>
                    <span className="text-sm font-semibold text-foreground">{payments.length}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('parent/payment-method')}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/20"
              >
                <CreditCard size={16} />
                Continue to Payment
              </button>
            </aside>
          </div>
        </DashboardLayout>
      </div>
    </>
  )
}
