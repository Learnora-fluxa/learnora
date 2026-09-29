import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, Download, ArrowUp, Users, Building2, CreditCard, AlertCircle, CheckCircle2, Copy, X } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { superAdminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'
import { confirmSchoolSubscription } from '../../lib/platformBilling'
import PendingTransfersPanel from '../../components/superadmin/PendingTransfersPanel'
import { approveSettlement, createSettlement, getSuperAdminSettlementOverview, listSuperAdminSettlements, markSettlementPaid } from '../../lib/financeApi'

type Props = { onNavigate: (page: string) => void }

// Replaced PLAN_RATES hardcoded map — price now loaded from platform_config

const fmt = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG')

interface SchoolRow {
  id: string
  name: string
  code: string
  email: string | null
  phone: string | null
  onboarding_admin_name: string | null
  onboarding_admin_email: string | null
  onboarding_admin_phone: string | null
  subscription_plan: string
  subscription_status: string
  student_count: number | null
  created_at: string
}

interface BillingStats {
  termRevenue:    number
  annualRunRate:  number
  billableSchools: number
  failedPayments: number
}

const revenueByTerm = [
  { label: 'T1 2025', value: 38   },
  { label: 'T2 2025', value: 40   },
  { label: 'T3 2025', value: 41   },
  { label: 'T1 2026', value: 43   },
  { label: 'T2 2026', value: 48.2 },
]
const maxRev = 52

type InvStatus = 'paid' | 'failed' | 'pending'
const statusStyle: Record<InvStatus, string> = {
  paid:    'bg-green-50 text-green-700',
  failed:  'bg-red-50 text-red-600',
  pending: 'bg-amber-50 text-amber-600',
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-card shadow-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

export default function PlatformBillingPage({ onNavigate }: Props) {
  const { profile, session }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)
  const [schools,          setSchools]         = useState<SchoolRow[]>([])
  const [stats,            setStats]           = useState<BillingStats | null>(null)
  const [loading,          setLoading]         = useState(true)
  const [pricePerStudent,  setPricePerStudent] = useState<number>(850)
  const [confirming,       setConfirming]      = useState<Set<string>>(new Set())
  const [selectedSchool,   setSelectedSchool]  = useState<SchoolRow | null>(null)
  const [confirmError,     setConfirmError]    = useState('')
  const [confirmSuccess,   setConfirmSuccess]  = useState<{ inviteLink: string; email: string; schoolName: string } | null>(null)
  const [paymentMethod,    setPaymentMethod]   = useState('bank_transfer')
  const [paymentReference, setPaymentReference]= useState('')
  const [paidAt,           setPaidAt]          = useState(new Date().toISOString().slice(0, 10))
  const [confirmNotes,     setConfirmNotes]    = useState('')
  const [adminName,        setAdminName]       = useState('')
  const [adminEmail,       setAdminEmail]      = useState('')
  const [adminPhone,       setAdminPhone]      = useState('')
  const [settlementOverview, setSettlementOverview] = useState<{
    totals: { availableBalance: number; unsettledPayments: number; pendingSettlements: number; paidSettlements: number }
    schoolBalances: Array<{ schoolId: string; schoolName: string; availableBalance: number; pendingSettlementCount: number }>
    recentSettlements: Array<{ id: string; schoolId: string; schoolName: string; netAmount: number; status: string; createdAt: string; paidAt: string | null }>
  } | null>(null)
  const [settlementRows, setSettlementRows] = useState<Array<{
    id: string
    schoolId: string
    schoolName: string
    periodStart: string | null
    periodEnd: string | null
    transactionCount: number
    grossAmount: number
    processorFeeAmount: number
    platformFeeAmount: number
    netAmount: number
    status: string
    payoutReference: string | null
    notes: string | null
    paidAt: string | null
    createdAt: string
  }>>([])
  const [settlementBusy, setSettlementBusy] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [schoolRes, cfgRes] = await Promise.all([
      supabase.from('schools').select('id, name, code, email, phone, onboarding_admin_name, onboarding_admin_email, onboarding_admin_phone, subscription_plan, subscription_status, student_count, created_at').order('created_at', { ascending: false }),
      supabase.from('platform_config').select('per_student_price').maybeSingle(),
    ])
    if (schoolRes.error) { logSupabaseError('PlatformBilling/schools', schoolRes.error); setLoading(false); return }
    if (cfgRes.error)    logSupabaseError('PlatformBilling/config', cfgRes.error)

    const price = (cfgRes.data as { per_student_price: number } | null)?.per_student_price ?? 850
    setPricePerStudent(price)

    const rows = (schoolRes.data ?? []) as SchoolRow[]
    setSchools(rows)

    const active = rows.filter(s => s.subscription_status === 'active')
    let termRevenue = 0
    for (const s of active) {
      termRevenue += (s.student_count ?? 0) * price
    }
    setStats({
      termRevenue,
      annualRunRate:   termRevenue * 3,
      billableSchools: active.length,
      failedPayments:  0,
    })
    if (session) {
      try {
        const [overview, settlementList] = await Promise.all([
          getSuperAdminSettlementOverview(session),
          listSuperAdminSettlements(session),
        ])
        setSettlementOverview(overview)
        setSettlementRows(settlementList.settlements)
      } catch {}
    }
    setLoading(false)
  }

  async function handleCreateSettlement(schoolId: string) {
    if (!session) return
    setSettlementBusy(`create:${schoolId}`)
    try {
      await createSettlement(session, { schoolId })
      await loadData()
    } finally {
      setSettlementBusy(null)
    }
  }

  async function handleApproveSettlement(settlementId: string) {
    if (!session) return
    setSettlementBusy(`approve:${settlementId}`)
    try {
      await approveSettlement(session, settlementId)
      await loadData()
    } finally {
      setSettlementBusy(null)
    }
  }

  async function handleMarkSettlementPaid(settlementId: string) {
    if (!session) return
    setSettlementBusy(`paid:${settlementId}`)
    try {
      await markSettlementPaid(session, settlementId, { paidAt: new Date().toISOString() })
      await loadData()
    } finally {
      setSettlementBusy(null)
    }
  }

  function openConfirmModal(school: SchoolRow) {
    setSelectedSchool(school)
    setPaymentMethod('bank_transfer')
    setPaymentReference('')
    setPaidAt(new Date().toISOString().slice(0, 10))
    setConfirmNotes('')
    setAdminName(school.onboarding_admin_name ?? '')
    setAdminEmail(school.onboarding_admin_email ?? school.email ?? '')
    setAdminPhone(school.onboarding_admin_phone ?? school.phone ?? '')
    setConfirmError('')
  }

  async function handleConfirmSubscription() {
    if (!selectedSchool) return

    setConfirming(prev => new Set([...prev, selectedSchool.id]))
    setConfirmError('')

    try {
      const amount = (selectedSchool.student_count ?? 0) * pricePerStudent
      const response = await confirmSchoolSubscription(session, selectedSchool.id, {
        amount,
        paymentMethod,
        reference: paymentReference.trim() || undefined,
        paidAt,
        notes: confirmNotes.trim() || undefined,
        adminName: adminName.trim() || undefined,
        adminEmail: adminEmail.trim() || undefined,
        adminPhone: adminPhone.trim() || undefined,
      })

      const inviteLink = `${window.location.origin}/invite?token=${response.invitation.token}`
      setConfirmSuccess({
        inviteLink,
        email: response.invitation.email,
        schoolName: response.school.name,
      })
      setSelectedSchool(null)
      await loadData()
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : 'Failed to confirm payment.')
    } finally {
      setConfirming(prev => {
        const next = new Set(prev)
        next.delete(selectedSchool.id)
        return next
      })
    }
  }

  async function copyInviteLink() {
    if (!confirmSuccess) return
    await navigator.clipboard.writeText(confirmSuccess.inviteLink).catch(() => {})
  }

  function exportCSV() {
    const header = 'School,Plan,Students,Rate/Student,Est. Term Total,Status'
    const rows   = schools.map(s => {
      const total = (s.student_count ?? 0) * pricePerStudent
      return `${s.name},${s.subscription_plan},${s.student_count ?? 0},${pricePerStudent},${total},${s.subscription_status}`
    }).join('\n')
    const blob = new Blob([`${header}\n${rows}`], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'platform_billing.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const statCards = [
    { label: 'Current Term Revenue',  value: loading ? '—' : (stats ? fmt(stats.termRevenue)   : '—'), Icon: TrendingUp,  color: 'bg-primary/10 text-primary'         },
    { label: 'Annual Run Rate',       value: loading ? '—' : (stats ? fmt(stats.annualRunRate)  : '—'), Icon: TrendingUp,  color: 'bg-green-50 text-green-600'         },
    { label: 'Billable Schools',      value: loading ? '—' : String(stats?.billableSchools ?? 0),        Icon: Building2,   color: 'bg-accent-mint/10 text-accent-mint' },
    { label: 'Failed Payments',       value: loading ? '—' : String(stats?.failedPayments ?? 0),         Icon: AlertCircle, color: 'bg-red-50 text-red-500'             },
  ]
  const selectedSchoolAmount = useMemo(
    () => (selectedSchool?.student_count ?? 0) * pricePerStudent,
    [pricePerStudent, selectedSchool],
  )

  return (
    <DashboardLayout
      activePage="platform-billing"
      onNavigate={onNavigate}
      title="Platform Billing"
      subtitle="Per-student, per-term revenue and payment history"
      nav={superAdminNav}
      user={sidebarUser}
    >
      <div className="flex flex-col gap-6 max-w-[1200px]">

        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-card px-5 py-3.5 text-sm text-blue-800">
          <Users size={15} className="text-blue-500 shrink-0 mt-0.5" />
          <span>Billing is <strong>per student per term</strong>. Each invoice = enrolled students × plan rate. Volume discounts apply within each plan.</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map(({ label, value, Icon, color }) => (
            <div key={label} className="bg-surface rounded-card shadow-sm p-5">
              <div className={`size-10 rounded-card ${color} flex items-center justify-center mb-3`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted mt-0.5">{label}</p>
              <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-green-600">
                <ArrowUp size={11} /> Live from DB
              </div>
            </div>
          ))}
        </div>

        <div className="bg-surface rounded-card shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-foreground">School Settlements</h2>
              <p className="text-xs text-muted mt-1">Learnora-led payout batches from parent payments to schools.</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4 mb-6">
            {[
              { label: 'Available Balance', value: fmt(settlementOverview?.totals.availableBalance ?? 0) },
              { label: 'Unsettled Payments', value: String(settlementOverview?.totals.unsettledPayments ?? 0) },
              { label: 'Pending Settlements', value: String(settlementOverview?.totals.pendingSettlements ?? 0) },
              { label: 'Paid Settlements', value: String(settlementOverview?.totals.paidSettlements ?? 0) },
            ].map(card => (
              <div key={card.label} className="rounded-card bg-canvas px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">Ready for Batch Creation</h3>
              <div className="space-y-3">
                {(settlementOverview?.schoolBalances ?? []).length === 0 ? (
                  <p className="text-sm text-muted">No schools currently have unsettled parent payments.</p>
                ) : (
                  (settlementOverview?.schoolBalances ?? []).map(row => (
                    <div key={row.schoolId} className="rounded-card border border-black/8 px-4 py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{row.schoolName}</p>
                        <p className="text-xs text-muted mt-1">{fmt(row.availableBalance)} available · {row.pendingSettlementCount} open batch{row.pendingSettlementCount === 1 ? '' : 'es'}</p>
                      </div>
                      <button
                        onClick={() => void handleCreateSettlement(row.schoolId)}
                        disabled={settlementBusy === `create:${row.schoolId}` || row.availableBalance <= 0}
                        className="h-9 px-4 rounded-pill bg-primary text-white text-xs font-semibold hover:bg-primary-deep disabled:opacity-40"
                      >
                        {settlementBusy === `create:${row.schoolId}` ? 'Creating…' : 'Create Batch'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">Recent Settlement Batches</h3>
              <div className="space-y-3">
                {settlementRows.slice(0, 6).map(row => (
                  <div key={row.id} className="rounded-card border border-black/8 px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{row.schoolName}</p>
                        <p className="text-xs text-muted mt-1">
                          {row.periodStart || row.periodEnd
                            ? `${row.periodStart ?? '—'} to ${row.periodEnd ?? '—'}`
                            : 'Auto period'}
                        </p>
                        <p className="text-xs text-muted mt-1">{row.transactionCount} payment{row.transactionCount === 1 ? '' : 's'} · {fmt(row.netAmount)}</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize bg-canvas text-foreground">{row.status}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {row.status === 'pending' && (
                        <button
                          onClick={() => void handleApproveSettlement(row.id)}
                          disabled={settlementBusy === `approve:${row.id}`}
                          className="h-8 px-3 rounded-pill border border-black/15 text-xs font-semibold hover:border-primary hover:text-primary disabled:opacity-40"
                        >
                          {settlementBusy === `approve:${row.id}` ? 'Approving…' : 'Approve'}
                        </button>
                      )}
                      {['approved', 'processing', 'pending'].includes(row.status) && (
                        <button
                          onClick={() => void handleMarkSettlementPaid(row.id)}
                          disabled={settlementBusy === `paid:${row.id}`}
                          className="h-8 px-3 rounded-pill bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-40"
                        >
                          {settlementBusy === `paid:${row.id}` ? 'Marking…' : 'Mark Paid'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {settlementRows.length === 0 && <p className="text-sm text-muted">No settlement batches yet.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Revenue chart (decorative — no billing history table yet) */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-foreground">Revenue per Term (₦M)</h2>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 h-9 px-4 border border-black/20 text-sm font-semibold text-foreground rounded-pill hover:bg-canvas transition-colors"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
          <div className="flex items-end gap-4 h-40">
            {revenueByTerm.map((r, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <span className="text-[10px] font-bold text-foreground">₦{r.value}M</span>
                <div className="w-full bg-primary rounded-t-lg" style={{ height: `${Math.round((r.value / maxRev) * 100)}%` }} />
                <span className="text-xs text-muted">{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        <PendingTransfersPanel onChange={loadData} />

        {/* School billing table */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-black/6 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Schools ({loading ? '…' : schools.length})</h2>
            <button className="flex items-center gap-2 h-9 px-4 bg-primary/10 text-primary text-xs font-semibold rounded-full hover:bg-primary/20 transition-colors" onClick={() => onNavigate('schools-list')}>
              <CreditCard size={12} /> Manage Schools
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-canvas">
                  {['School', 'Plan', 'Students', 'Rate/Student', 'Est. Term Total', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/4">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-muted">Loading…</td></tr>
                ) : schools.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-muted">No schools registered yet.</td></tr>
                ) : schools.map(s => {
                  const total   = (s.student_count ?? 0) * pricePerStudent
                  const isPendingPayment = s.subscription_status === 'pending_payment'
                  const status: InvStatus =
                    s.subscription_status === 'active'          ? 'paid'    :
                    s.subscription_status === 'trial'           ? 'pending' :
                    s.subscription_status === 'pending_payment' ? 'pending' :
                    'failed'
                  return (
                    <tr key={s.id} className={`hover:bg-canvas/50 transition-colors ${isPendingPayment ? 'bg-blue-50/40' : ''}`}>
                      <td className="px-6 py-3.5 font-semibold text-foreground">{s.name}</td>
                      <td className="px-6 py-3.5 text-muted capitalize">{s.subscription_plan}</td>
                      <td className="px-6 py-3.5 text-foreground">{(s.student_count ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-3.5 text-foreground">{fmt(pricePerStudent)}</td>
                      <td className="px-6 py-3.5 font-semibold text-foreground">{fmt(total)}</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${isPendingPayment ? 'bg-blue-50 text-blue-700' : statusStyle[status]}`}>
                          {isPendingPayment ? 'Pending Payment' : status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {isPendingPayment && (
                          <button
                            onClick={() => openConfirmModal(s)}
                            disabled={confirming.has(s.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:underline whitespace-nowrap disabled:opacity-50"
                          >
                            {confirming.has(s.id) ? 'Confirming…' : '✓ Confirm Payment'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedSchool && (
        <Modal onClose={() => setSelectedSchool(null)}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-foreground">Confirm School Payment</h2>
                <p className="text-xs text-muted mt-1">{selectedSchool.name} is pending bank-transfer confirmation.</p>
              </div>
              <button onClick={() => setSelectedSchool(null)} className="text-muted hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="bg-canvas rounded-card p-4 mb-5 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">School</span>
                <span className="font-semibold text-foreground">{selectedSchool.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">School code</span>
                <span className="font-semibold text-foreground">{selectedSchool.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Billable students</span>
                <span className="font-semibold text-foreground">{selectedSchool.student_count ?? 0}</span>
              </div>
              <div className="flex justify-between border-t border-black/8 pt-2 mt-1">
                <span className="font-bold text-foreground">Expected amount</span>
                <span className="font-bold text-primary">{fmt(selectedSchoolAmount)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted">Payment method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary bg-white">
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="paystack">Paystack</option>
                  <option value="manual">Manual confirmation</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted">Payment date</label>
                <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-xs font-semibold text-muted">Transaction reference</label>
              <input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Bank teller / transfer reference" className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted">Admin name</label>
                <input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="School admin full name" className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted">Admin phone</label>
                <input value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} placeholder="+234..." className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-xs font-semibold text-muted">Admin email</label>
              <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@school.edu" className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
            </div>

            <div className="flex flex-col gap-1.5 mb-5">
              <label className="text-xs font-semibold text-muted">Internal note</label>
              <textarea value={confirmNotes} onChange={(e) => setConfirmNotes(e.target.value)} rows={3} placeholder="Optional audit note for this confirmation" className="px-3 py-2.5 border border-black/15 rounded-input text-sm outline-none focus:border-primary resize-none" />
            </div>

            {confirmError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-card px-4 py-3 text-sm text-red-600">
                {confirmError}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setSelectedSchool(null)} className="flex-1 h-11 border border-black/15 text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
                Cancel
              </button>
              <button
                onClick={() => void handleConfirmSubscription()}
                disabled={confirming.has(selectedSchool.id) || !adminEmail.trim()}
                className="flex-1 h-11 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-40"
              >
                {confirming.has(selectedSchool.id) ? 'Confirming…' : 'Confirm Payment & Create Invite'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmSuccess && (
        <Modal onClose={() => setConfirmSuccess(null)}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 size={18} className="text-green-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Payment Confirmed</h2>
                  <p className="text-xs text-muted mt-1">{confirmSuccess.schoolName} is now active and the admin invite is ready.</p>
                </div>
              </div>
              <button onClick={() => setConfirmSuccess(null)} className="text-muted hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="bg-canvas rounded-card p-4 mb-5">
              <p className="text-xs text-muted mb-1">Admin invite email</p>
              <p className="text-sm font-semibold text-foreground">{confirmSuccess.email}</p>
            </div>

            <div className="bg-canvas rounded-card p-4 mb-5">
              <p className="text-xs text-muted mb-2">Invite link</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground break-all flex-1">{confirmSuccess.inviteLink}</span>
                <button onClick={() => void copyInviteLink()} className="shrink-0 size-9 rounded-full bg-white border border-black/10 flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <button onClick={() => setConfirmSuccess(null)} className="w-full h-11 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">
              Done
            </button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  )
}
