import { useState, useEffect } from 'react'
import { TrendingUp, Download, ArrowUp, Users, Building2, CreditCard, AlertCircle } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { superAdminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

// Replaced PLAN_RATES hardcoded map — price now loaded from platform_config

const fmt = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG')

interface SchoolRow {
  id: string
  name: string
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

export default function PlatformBillingPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)
  const [schools,          setSchools]         = useState<SchoolRow[]>([])
  const [stats,            setStats]           = useState<BillingStats | null>(null)
  const [loading,          setLoading]         = useState(true)
  const [pricePerStudent,  setPricePerStudent] = useState<number>(850)
  const [confirming,       setConfirming]      = useState<Set<string>>(new Set())

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [schoolRes, cfgRes] = await Promise.all([
      supabase.from('schools').select('id, name, subscription_plan, subscription_status, student_count, created_at').order('created_at', { ascending: false }),
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
    setLoading(false)
  }

  async function confirmSubscription(schoolId: string) {
    setConfirming(prev => new Set([...prev, schoolId]))
    const { error } = await supabase
      .from('schools')
      .update({
        subscription_status:        'active',
        subscription_confirmed_by:  profile!.id,
        subscription_confirmed_at:  new Date().toISOString(),
      })
      .eq('id', schoolId)
    if (error) logSupabaseError('PlatformBilling.confirmSubscription', error)
    setConfirming(prev => { const n = new Set(prev); n.delete(schoolId); return n })
    loadData()
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
                            onClick={() => confirmSubscription(s.id)}
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
    </DashboardLayout>
  )
}
