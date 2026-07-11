import { useState, useEffect } from 'react'
import { Download, ChevronRight, AlertCircle } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type Tab   = 'overview' | 'invoices' | 'payments'

interface InvRow {
  id:           string
  amount:       number
  status:       string
  due_date:     string | null
  created_at:   string
  student_name: string
  class_name:   string
  fee_name:     string
}

interface PayRow {
  id:                  string
  amount:              number
  paid_at:             string | null
  paystack_reference:  string | null
  student_name:        string
}

interface ClassBucket { className: string; total: number; paid: number; amount: number }

interface Stats {
  expected: number; collected: number; outstanding: number
  overdue: number;  overdueCount: number; outstandingCount: number
}

const STATUS_LABEL: Record<string, string> = {
  unpaid: 'Unpaid', paid: 'Paid', partial: 'Partial', waived: 'Waived',
}

const statusStyle: Record<string, string> = {
  Paid:    'bg-green-50 text-green-700',
  Partial: 'bg-amber-50 text-amber-700',
  Unpaid:  'bg-red-50 text-red-600',
  Waived:  'bg-canvas text-muted',
}

function fmtMoney(n: number): string {
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000)     return `₦${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `₦${(n / 1_000).toFixed(1)}K`
  return `₦${n.toLocaleString()}`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function downloadCSV(headers: string[], rows: (string | number | null)[][], filename: string) {
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function FinanceManagementPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [tab,     setTab]     = useState<Tab>('overview')
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [buckets, setBuckets] = useState<ClassBucket[]>([])
  const [invRows, setInvRows] = useState<InvRow[]>([])
  const [payRows, setPayRows] = useState<PayRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile?.school_id) loadFinance() }, [profile?.school_id])

  async function loadFinance() {
    setLoading(true)
    const schoolId = profile!.school_id!

    const [invRes, payRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('id, amount, status, due_date, created_at, profiles!student_id(full_name), fee_structures!fee_structure_id(name, classes!class_id(name))')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select('id, amount, paid_at, paystack_reference, profiles!student_id(full_name)')
        .eq('school_id', schoolId)
        .order('paid_at', { ascending: false })
        .limit(100),
    ])

    if (invRes.error) logSupabaseError('Finance/invoices', invRes.error)
    if (payRes.error) logSupabaseError('Finance/payments', payRes.error)

    type IRaw = {
      id: string; amount: number; status: string; due_date: string | null; created_at: string
      profiles: { full_name: string } | null
      fee_structures: { name: string; classes: { name: string } | null } | null
    }
    type PRaw = {
      id: string; amount: number; paid_at: string | null; paystack_reference: string | null
      profiles: { full_name: string } | null
    }

    const invData = (invRes.data ?? []) as unknown as IRaw[]
    const payData = (payRes.data ?? []) as unknown as PRaw[]

    // Stats
    const thirty = new Date(); thirty.setDate(thirty.getDate() - 30)
    const expected       = invData.reduce((s, r) => s + r.amount, 0)
    const collected      = payData.reduce((s, r) => s + r.amount, 0)
    const outstanding    = Math.max(0, expected - collected)
    const overdueInvs    = invData.filter(r =>
      (r.status === 'unpaid' || r.status === 'partial') && r.due_date && new Date(r.due_date) < thirty
    )
    const outstandingCount = invData.filter(r => r.status !== 'paid' && r.status !== 'waived').length
    setStats({
      expected, collected, outstanding,
      overdue: overdueInvs.reduce((s, r) => s + r.amount, 0),
      overdueCount: overdueInvs.length,
      outstandingCount,
    })

    // Class breakdown
    const buckMap = new Map<string, ClassBucket>()
    for (const inv of invData) {
      const cn = inv.fee_structures?.classes?.name ?? 'General'
      const b  = buckMap.get(cn) ?? { className: cn, total: 0, paid: 0, amount: 0 }
      b.total++
      if (inv.status === 'paid') b.paid++
      b.amount += inv.amount
      buckMap.set(cn, b)
    }
    setBuckets([...buckMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 6))

    setInvRows(invData.map(r => ({
      id:           r.id,
      amount:       r.amount,
      status:       r.status,
      due_date:     r.due_date,
      created_at:   r.created_at,
      student_name: r.profiles?.full_name ?? '—',
      class_name:   r.fee_structures?.classes?.name ?? '—',
      fee_name:     r.fee_structures?.name ?? '—',
    })))

    setPayRows(payData.map(r => ({
      id:                 r.id,
      amount:             r.amount,
      paid_at:            r.paid_at,
      paystack_reference: r.paystack_reference,
      student_name:       r.profiles?.full_name ?? '—',
    })))

    setLoading(false)
  }

  function exportCSV() {
    if (tab === 'invoices') {
      downloadCSV(
        ['Student', 'Class', 'Fee', 'Amount', 'Status', 'Due Date'],
        invRows.map(r => [r.student_name, r.class_name, r.fee_name, r.amount, STATUS_LABEL[r.status] ?? r.status, r.due_date ?? '—']),
        'invoices.csv',
      )
    } else {
      downloadCSV(
        ['Student', 'Amount (₦)', 'Method', 'Date'],
        payRows.map(r => [r.student_name, r.amount, r.paystack_reference ? 'Online' : 'Manual', fmtDate(r.paid_at)]),
        'payments.csv',
      )
    }
  }

  const pct = stats ? Math.round(stats.collected / Math.max(stats.expected, 1) * 100) : 0

  return (
    <DashboardLayout
      activePage="finance"
      onNavigate={onNavigate}
      title="Finance Management"
      subtitle="School fees, collections and financial reports"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[1200px] flex flex-col gap-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Expected',   value: loading ? '—' : fmtMoney(stats?.expected ?? 0),    sub: 'This term',                                                    color: 'text-foreground' },
            { label: 'Total Collected',  value: loading ? '—' : fmtMoney(stats?.collected ?? 0),   sub: loading ? '—' : `${pct}% collection`,                           color: 'text-green-600'  },
            { label: 'Outstanding',      value: loading ? '—' : fmtMoney(stats?.outstanding ?? 0), sub: loading ? '—' : `${stats?.outstandingCount ?? 0} students`,      color: 'text-red-500'    },
            { label: 'Overdue 30+ days', value: loading ? '—' : fmtMoney(stats?.overdue ?? 0),     sub: loading ? '—' : `${stats?.overdueCount ?? 0} students`,          color: 'text-amber-600'  },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-card shadow-sm p-5">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm font-semibold text-foreground mt-1">{s.label}</p>
              <p className="text-xs text-muted mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Overdue alert */}
        {!loading && (stats?.overdueCount ?? 0) > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-card px-5 py-3.5 text-sm">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <p className="text-foreground">
              {stats!.overdueCount} student{stats!.overdueCount !== 1 ? 's have' : ' has'} payments overdue by 30+ days.{' '}
              <button onClick={() => onNavigate('fee-collection')} className="text-primary font-semibold hover:underline">View overdue list</button>
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-canvas rounded-card p-1 w-fit">
          {(['overview', 'invoices', 'payments'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 h-9 text-sm font-semibold rounded-md transition-colors capitalize ${tab === t ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Collection by class */}
            <div className="bg-surface rounded-card shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-foreground">Collection by Class</h3>
                <button
                  onClick={() => { setTab('invoices'); downloadCSV(['Class','Total','Paid','Amount'], buckets.map(b => [b.className, b.total, b.paid, fmtMoney(b.amount)]), 'collection-by-class.csv') }}
                  className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline"
                >
                  <Download size={13} /> Export
                </button>
              </div>
              {loading ? (
                <p className="text-sm text-muted">Loading…</p>
              ) : buckets.length === 0 ? (
                <p className="text-sm text-muted">No invoice data yet.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {buckets.map(b => (
                    <div key={b.className}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-semibold text-foreground">{b.className}</span>
                        <span className="text-muted">{b.paid}/{b.total} students · {fmtMoney(b.amount)}</span>
                      </div>
                      <div className="h-2 bg-black/8 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${b.total > 0 ? (b.paid / b.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex flex-col gap-4">
              {[
                { label: 'Fee Collection',    sub: 'Track payments & record offline',  page: 'fee-collection'  },
                { label: 'Set Fee Structure', sub: 'Configure fees per class/term',    page: 'admin-fee-setup' },
                { label: 'Bank & Paystack',   sub: 'School account & remittance',      page: 'admin-fee-setup' },
                { label: 'Download Report',   sub: 'Full collection report PDF',       page: 'admin-reports'   },
              ].map(a => (
                <button key={a.label} onClick={() => onNavigate(a.page)}
                  className="flex items-center justify-between bg-surface rounded-card shadow-sm p-4 hover:shadow-md transition-all text-left">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{a.label}</p>
                    <p className="text-xs text-muted mt-0.5">{a.sub}</p>
                  </div>
                  <ChevronRight size={15} className="text-muted shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {(tab === 'invoices' || tab === 'payments') && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/6">
              <h3 className="text-base font-bold text-foreground">
                {tab === 'payments' ? 'Recent Payments' : 'Outstanding Invoices'}
              </h3>
              <button onClick={exportCSV} className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline">
                <Download size={13} /> Export
              </button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-muted">Loading…</div>
            ) : tab === 'invoices' ? (
              invRows.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted">No invoices found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-black/6 bg-canvas/40">
                        {['Student', 'Class', 'Amount', 'Due Date', 'Status', ''].map(h => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invRows.map(r => {
                        const label = STATUS_LABEL[r.status] ?? r.status
                        return (
                          <tr key={r.id} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="size-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                                  {r.student_name.charAt(0)}
                                </div>
                                <span className="font-medium text-foreground">{r.student_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3.5 text-muted text-xs">{r.class_name}</td>
                            <td className="px-6 py-3.5 font-semibold text-foreground">{fmtMoney(r.amount)}</td>
                            <td className="px-6 py-3.5 text-muted text-xs">{fmtDate(r.due_date)}</td>
                            <td className="px-6 py-3.5">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-xs ${statusStyle[label] ?? 'bg-canvas text-muted'}`}>
                                {label}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <button onClick={() => onNavigate('fee-collection')} className="text-xs text-primary font-semibold hover:underline">View</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              payRows.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted">No payments recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-black/6 bg-canvas/40">
                        {['Student', 'Amount', 'Date', 'Method', ''].map(h => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payRows.map(r => (
                        <tr key={r.id} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="size-7 rounded-full bg-green-50 text-green-600 text-xs font-bold flex items-center justify-center">
                                {r.student_name.charAt(0)}
                              </div>
                              <span className="font-medium text-foreground">{r.student_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 font-semibold text-foreground">{fmtMoney(r.amount)}</td>
                          <td className="px-6 py-3.5 text-muted text-xs">{fmtDate(r.paid_at)}</td>
                          <td className="px-6 py-3.5 text-muted">{r.paystack_reference ? 'Online' : 'Manual'}</td>
                          <td className="px-6 py-3.5">
                            <span className="text-xs font-semibold bg-green-50 text-green-700 px-2.5 py-1 rounded-xs">Paid</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
