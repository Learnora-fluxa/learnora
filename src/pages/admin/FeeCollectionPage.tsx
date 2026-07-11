import { useState, useEffect } from 'react'
import {
  Search, Filter, Download, Plus, CheckCircle2,
  AlertCircle, Clock, XCircle, ChevronDown, X, Send, Loader2,
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type PayStatus = 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' | 'Pending'

interface DBStudent {
  id: string
  name: string
  className: string
  invoiceId: string | null
  expected: number
  paid: number
  lastPayment: string
  status: PayStatus
  hasPendingOffline: boolean
}

const statusConfig: Record<PayStatus, { color: string; icon: typeof CheckCircle2 }> = {
  Paid:    { color: 'bg-green-50 text-green-700',  icon: CheckCircle2 },
  Partial: { color: 'bg-amber-50 text-amber-700',  icon: Clock        },
  Unpaid:  { color: 'bg-red-50 text-red-600',      icon: XCircle      },
  Overdue: { color: 'bg-red-100 text-red-700',     icon: AlertCircle  },
  Pending: { color: 'bg-blue-50 text-blue-700',    icon: Clock        },
}

const FILTERS: (PayStatus | 'All')[] = ['All', 'Paid', 'Partial', 'Unpaid', 'Overdue', 'Pending']
const OFFLINE_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'POS']

function fmt(n: number) { return '₦' + n.toLocaleString('en-NG') }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
}

function deriveStatus(expected: number, paid: number): PayStatus {
  if (expected === 0) return 'Unpaid'
  if (paid >= expected) return 'Paid'
  if (paid > 0) return 'Partial'
  return 'Unpaid'
}

export default function FeeCollectionPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [students,      setStudents]      = useState<DBStudent[]>([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [filter,        setFilter]        = useState<PayStatus | 'All'>('All')
  const [selClass,      setSelClass]      = useState('All Classes')
  const [saving,        setSaving]        = useState(false)

  const [showOffline,   setShowOffline]   = useState(false)
  const [offStudent,    setOffStudent]    = useState<DBStudent | null>(null)
  const [offAmount,     setOffAmount]     = useState('')
  const [offMethod,     setOffMethod]     = useState('Cash')
  const [offNote,       setOffNote]       = useState('')
  const [offDone,       setOffDone]       = useState(false)

  const [confirming,    setConfirming]    = useState<Set<string>>(new Set())

  const [showReminder,  setShowReminder]  = useState(false)
  const [reminderSent,  setReminderSent]  = useState(false)

  useEffect(() => { if (profile?.school_id) loadData() }, [profile?.school_id])

  async function loadData() {
    setLoading(true)
    const schoolId = profile!.school_id!

    const { data: studentData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('school_id', schoolId)
      .eq('role', 'student')
    const studentProfiles = (studentData ?? []) as { id: string; full_name: string | null }[]
    const studentIds = studentProfiles.map(s => s.id)

    if (studentIds.length === 0) { setStudents([]); setLoading(false); return }

    const [ceRes, invRes] = await Promise.all([
      supabase
        .from('class_enrollments')
        .select('student_id, classes(name)')
        .in('student_id', studentIds),
      supabase
        .from('invoices')
        .select('id, student_id, amount, paid_amount, status, created_at, payment_method')
        .eq('school_id', schoolId),
    ])

    const ceRows = (ceRes.data ?? []) as unknown as { student_id: string; classes: { name: string } | null }[]
    const classMap: Record<string, string> = {}
    for (const e of ceRows) {
      if (!classMap[e.student_id]) classMap[e.student_id] = e.classes?.name ?? '—'
    }

    const invRows = (invRes.data ?? []) as {
      id: string; student_id: string; amount: number; paid_amount: number
      status: string; created_at: string | null; payment_method: string | null
    }[]
    const byStudent: Record<string, { invoiceId: string; expected: number; paid: number; lastIso: string; hasPendingOffline: boolean }> = {}
    for (const inv of invRows) {
      const sid = inv.student_id
      if (!byStudent[sid]) byStudent[sid] = { invoiceId: inv.id, expected: 0, paid: 0, lastIso: '', hasPendingOffline: false }
      if (inv.status === 'pending_offline') {
        byStudent[sid].hasPendingOffline = true
        byStudent[sid].expected += inv.amount ?? 0
      } else {
        byStudent[sid].expected += inv.amount ?? 0
        byStudent[sid].paid     += inv.paid_amount ?? 0
      }
      const iso = inv.created_at ?? ''
      if (iso > byStudent[sid].lastIso) byStudent[sid].lastIso = iso
    }

    const rows: DBStudent[] = studentProfiles.map(s => {
      const agg              = byStudent[s.id]
      const expected         = agg?.expected ?? 0
      const paid             = agg?.paid     ?? 0
      const hasPendingOffline = agg?.hasPendingOffline ?? false
      return {
        id:               s.id,
        name:             s.full_name ?? 'Unknown',
        className:        classMap[s.id] ?? '—',
        invoiceId:        agg?.invoiceId ?? null,
        expected,
        paid,
        lastPayment:      agg?.lastIso ? fmtDate(agg.lastIso) : '—',
        hasPendingOffline,
        status:           hasPendingOffline ? 'Pending' : deriveStatus(expected, paid),
      }
    })

    setStudents(rows)
    setLoading(false)
  }

  const classOptions = ['All Classes', ...[...new Set(students.map(s => s.className).filter(c => c !== '—'))].sort()]

  const visible = students.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.className.toLowerCase().includes(q)
    const matchFilter = filter === 'All' || s.status === filter
    const matchClass  = selClass === 'All Classes' || s.className === selClass
    return matchSearch && matchFilter && matchClass
  })

  const totalExpected = students.reduce((s, st) => s + st.expected, 0)
  const totalPaid     = students.reduce((s, st) => s + st.paid,     0)
  const totalBalance  = totalExpected - totalPaid
  const notPaid       = students.filter(s => s.status !== 'Paid' && s.status !== 'Pending').length
  const pendingCount  = students.filter(s => s.status === 'Pending').length

  function openOffline(student: DBStudent) {
    setOffStudent(student)
    setOffAmount(String(student.expected - student.paid))
    setOffMethod('Cash')
    setOffNote('')
    setOffDone(false)
    setShowOffline(true)
  }

  async function submitOffline(e: React.FormEvent) {
    e.preventDefault()
    if (!offStudent || !profile?.school_id) return
    setSaving(true)
    const amount   = parseFloat(offAmount) || 0
    const newPaid  = Math.min(offStudent.expected || amount, offStudent.paid + amount)
    const newStatus = newPaid >= (offStudent.expected || amount) ? 'paid' : 'partial'

    if (offStudent.invoiceId) {
      const { error } = await supabase
        .from('invoices')
        .update({ paid_amount: newPaid, status: newStatus })
        .eq('id', offStudent.invoiceId)
      logSupabaseError('FeeCollection.updateInvoice', error)
    } else {
      const { error } = await supabase
        .from('invoices')
        .insert({
          student_id: offStudent.id,
          school_id:  profile.school_id,
          amount:     offStudent.expected || amount,
          paid_amount: amount,
          status:     newStatus,
        })
      logSupabaseError('FeeCollection.insertInvoice', error)
    }

    setSaving(false)
    setOffDone(true)
    loadData()
  }

  async function confirmReceipt(student: DBStudent) {
    setConfirming(prev => new Set([...prev, student.id]))

    const { data: pendingInvs, error: fetchErr } = await supabase
      .from('invoices')
      .select('id, amount')
      .eq('student_id', student.id)
      .eq('school_id', profile!.school_id!)
      .eq('status', 'pending_offline')

    if (fetchErr) {
      logSupabaseError('FeeCollection.confirmReceipt/fetch', fetchErr)
      setConfirming(prev => { const n = new Set(prev); n.delete(student.id); return n })
      return
    }

    for (const inv of (pendingInvs ?? []) as { id: string; amount: number }[]) {
      const { error } = await supabase
        .from('invoices')
        .update({
          status:       'paid',
          paid_amount:  inv.amount,
          confirmed_by: profile!.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', inv.id)
      if (error) logSupabaseError('FeeCollection.confirmReceipt/update', error)
    }

    setConfirming(prev => { const n = new Set(prev); n.delete(student.id); return n })
    loadData()
  }

  function sendReminders() {
    setReminderSent(true)
    setTimeout(() => { setReminderSent(false); setShowReminder(false) }, 2000)
  }

  return (
    <DashboardLayout
      activePage="fee-collection"
      onNavigate={onNavigate}
      title="Fee Collection"
      subtitle="Track payments, record offline collections, and manage balances"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[1100px] flex flex-col gap-6">

        {!loading && pendingCount > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-card px-5 py-3.5 text-sm text-blue-800">
            <Clock size={15} className="text-blue-500 shrink-0" />
            <span><strong>{pendingCount} student{pendingCount !== 1 ? 's' : ''}</strong> submitted offline bank transfers awaiting your confirmation. Click <strong>Confirm Receipt</strong> once you've verified the transfer.</span>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Expected',  value: loading ? '…' : fmt(totalExpected), color: 'text-foreground'  },
            { label: 'Total Collected', value: loading ? '…' : fmt(totalPaid),     color: 'text-green-600'   },
            { label: 'Outstanding',     value: loading ? '…' : fmt(totalBalance),  color: 'text-red-500'     },
            { label: 'Pending Confirm', value: loading ? '…' : `${pendingCount} students`, color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-card shadow-sm p-5">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm font-semibold text-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search student or class..."
              className="w-full h-10 pl-9 pr-4 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
          </div>

          <div className="relative">
            <select value={selClass} onChange={e => setSelClass(e.target.value)}
              className="h-10 pl-4 pr-8 border border-black/15 rounded-input text-sm bg-white outline-none focus:border-primary appearance-none">
              {classOptions.map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>

          <div className="flex gap-1 bg-canvas rounded-input p-1">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 h-8 text-xs font-semibold rounded-[6px] transition-colors ${filter === f ? 'bg-white text-foreground shadow' : 'text-muted hover:text-foreground'}`}>
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setShowReminder(true)}
              className="flex items-center gap-1.5 h-10 px-4 border border-black/15 rounded-pill text-sm text-muted hover:text-primary hover:border-primary transition-colors">
              <Send size={13} /> Send Reminders
            </button>
            <button className="flex items-center gap-1.5 h-10 px-4 border border-black/15 rounded-pill text-sm text-muted hover:text-primary hover:border-primary transition-colors">
              <Download size={13} /> Export
            </button>
          </div>
        </div>

        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '780px' }}>
              <thead>
                <tr className="bg-canvas/60 border-b border-black/6">
                  {['Student', 'Class', 'Expected', 'Paid', 'Balance', 'Last Payment', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/4">
                {loading ? (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-muted">Loading…</td></tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm text-muted">
                      <Filter size={28} className="mx-auto mb-2 opacity-30" />
                      No students match your current filters.
                    </td>
                  </tr>
                ) : visible.map(s => {
                  const balance = s.expected - s.paid
                  const pct = s.expected > 0 ? Math.round((s.paid / s.expected) * 100) : 0
                  const { color, icon: Icon } = statusConfig[s.status]
                  return (
                    <tr key={s.id} className="hover:bg-canvas/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                            {s.name.charAt(0)}
                          </div>
                          <span className="font-medium text-foreground">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted">{s.className}</td>
                      <td className="px-5 py-3.5 font-semibold text-foreground">{s.expected > 0 ? fmt(s.expected) : '—'}</td>
                      <td className="px-5 py-3.5">
                        <div>
                          <span className="font-semibold text-green-600">{fmt(s.paid)}</span>
                          {s.expected > 0 && (
                            <div className="mt-1 h-1.5 w-20 bg-black/8 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-red-500">{balance > 0 ? fmt(balance) : '—'}</td>
                      <td className="px-5 py-3.5 text-muted text-xs">{s.lastPayment}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>
                          <Icon size={11} />{s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {s.status === 'Pending' ? (
                          <button
                            onClick={() => confirmReceipt(s)}
                            disabled={confirming.has(s.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:underline whitespace-nowrap disabled:opacity-50"
                          >
                            {confirming.has(s.id)
                              ? <><Loader2 size={11} className="animate-spin" /> Confirming…</>
                              : <><CheckCircle2 size={11} /> Confirm Receipt</>
                            }
                          </button>
                        ) : s.status !== 'Paid' ? (
                          <button onClick={() => openOffline(s)}
                            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline whitespace-nowrap">
                            <Plus size={11} /> Record Payment
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showOffline && offStudent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowOffline(false)} />
          <div className="relative z-10 bg-white rounded-card shadow-xl w-full max-w-[480px]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/8">
              <h2 className="text-base font-bold text-foreground">
                {offDone ? 'Payment Recorded' : 'Record Offline Payment'}
              </h2>
              <button onClick={() => setShowOffline(false)} className="text-muted hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            {offDone ? (
              <div className="p-8 text-center">
                <div className="size-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={24} className="text-green-600" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">Payment Recorded</h3>
                <p className="text-sm text-muted mb-1">
                  {fmt(Number(offAmount))} via {offMethod} for <strong>{offStudent.name}</strong>.
                </p>
                <p className="text-xs text-muted mb-6">The student payment record has been updated.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setOffDone(false)}
                    className="h-10 px-5 border border-black/15 text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
                    Record Another
                  </button>
                  <button onClick={() => setShowOffline(false)}
                    className="h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submitOffline} className="p-6 flex flex-col gap-4">
                <div className="bg-canvas rounded-card p-3.5 flex items-center gap-3">
                  <div className="size-9 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                    {offStudent.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{offStudent.name}</p>
                    <p className="text-xs text-muted">
                      {offStudent.className} &middot; Balance:{' '}
                      <span className="text-red-500 font-semibold">{fmt(offStudent.expected - offStudent.paid)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Amount Paid <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold">&#8358;</span>
                    <input required type="number" min={1} value={offAmount}
                      onChange={e => setOffAmount(e.target.value)}
                      className="h-11 w-full pl-8 pr-4 border border-black/20 rounded-input text-sm font-semibold outline-none focus:border-primary" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Payment Method</label>
                  <div className="flex flex-wrap gap-2">
                    {OFFLINE_METHODS.map(m => (
                      <button key={m} type="button" onClick={() => setOffMethod(m)}
                        className={`h-9 px-4 rounded-full text-xs font-bold border transition-colors ${offMethod === m ? 'border-primary bg-primary/8 text-primary' : 'border-black/15 text-muted hover:border-primary/40'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Note (optional)</label>
                  <input value={offNote} onChange={e => setOffNote(e.target.value)}
                    placeholder="e.g. receipt no., collector name"
                    className="h-11 px-4 border border-black/20 rounded-input text-sm outline-none focus:border-primary" />
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowOffline(false)}
                    className="h-11 px-5 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 h-11 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary flex items-center justify-center gap-2 disabled:opacity-60">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Confirm Payment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowReminder(false)} />
          <div className="relative z-10 bg-white rounded-card shadow-xl w-full max-w-[420px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">Send Payment Reminders</h2>
              <button onClick={() => setShowReminder(false)} className="text-muted hover:text-foreground"><X size={18} /></button>
            </div>
            <p className="text-sm text-muted mb-5">
              This will send a payment reminder to parents of all <strong>{notPaid} students</strong> who have not fully paid their fees.
            </p>
            <div className="bg-canvas rounded-card p-3.5 mb-5">
              <p className="text-xs text-muted">Reminder will be sent via:</p>
              <div className="flex gap-2 mt-2">
                {['App Notification', 'SMS', 'Email'].map(m => (
                  <span key={m} className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-full">{m}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReminder(false)}
                className="flex-1 h-11 border border-black/15 text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
                Cancel
              </button>
              <button onClick={sendReminders}
                className="flex-1 h-11 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary flex items-center justify-center gap-2">
                {reminderSent ? <><CheckCircle2 size={14} /> Sent!</> : <><Send size={14} /> Send Reminders</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
