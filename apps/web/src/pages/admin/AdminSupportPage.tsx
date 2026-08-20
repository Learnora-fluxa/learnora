import { useState, useEffect } from 'react'
import {
  HelpCircle, Plus, ChevronDown, ChevronUp, Loader2,
  CheckCircle2, Clock, MessageSquare, X,
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props  = { onNavigate: (page: string) => void }
type Tab    = 'tickets' | 'faq'
type Status = 'open' | 'in_progress' | 'resolved' | 'closed'
type Prio   = 'low' | 'medium' | 'high'

interface Ticket {
  id:         string
  subject:    string
  body:       string | null
  status:     Status
  priority:   Prio
  created_at: string
  updated_at: string
}

const STATUS_CFG: Record<Status, { label: string; color: string; icon: React.ElementType }> = {
  open:        { label: 'Open',        color: 'bg-blue-50  text-blue-700',   icon: MessageSquare },
  in_progress: { label: 'In Progress', color: 'bg-amber-50 text-amber-700',  icon: Clock         },
  resolved:    { label: 'Resolved',    color: 'bg-green-50 text-green-700',  icon: CheckCircle2  },
  closed:      { label: 'Closed',      color: 'bg-canvas   text-muted',      icon: X             },
}

const PRIO_CFG: Record<Prio, { label: string; color: string }> = {
  low:    { label: 'Low',    color: 'text-muted' },
  medium: { label: 'Medium', color: 'text-amber-600' },
  high:   { label: 'High',   color: 'text-red-600' },
}

const FAQS = [
  { q: 'How do I add a new student or teacher?',
    a: 'Go to Users in the sidebar → "Add User", fill in the details, and choose the credential delivery method.' },
  { q: 'How do I create a new class?',
    a: 'Go to Classes → "New Class". Select the level, arm, form teacher, and subjects, then submit.' },
  { q: 'How do I send an announcement to the whole school?',
    a: 'Open Announcements → "New Announcement", set audience to "Whole School", compose your message, and post.' },
  { q: 'How do I view attendance across classes?',
    a: 'Open Attendance. The By Class tab shows all classes with present/absent/late counts and rates.' },
  { q: 'How do I manage the school subscription?',
    a: 'Go to Subscription in the sidebar to view your current plan and billing history.' },
  { q: 'How do I approve teacher-uploaded resources?',
    a: 'When a teacher submits a resource it appears as Pending. Open Teacher Resources (or check notifications) to approve or reject.' },
  { q: 'Where do I set up offline/bank transfer fee payments?',
    a: 'Go to Fee Setup → Bank Account tab, enter your school account details. Parents will see them when choosing Bank Transfer.' },
]

export default function AdminSupportPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [tab,      setTab]      = useState<Tab>('tickets')
  const [tickets,  setTickets]  = useState<Ticket[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showNew,  setShowNew]  = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [openFaq,  setOpenFaq]  = useState<number | null>(null)

  const [form, setForm] = useState({ subject: '', body: '', priority: 'medium' as Prio })

  useEffect(() => { if (profile?.school_id) loadTickets() }, [profile?.school_id])

  async function loadTickets() {
    setLoading(true)
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id, subject, body, status, priority, created_at, updated_at')
      .eq('school_id', profile!.school_id!)
      .order('created_at', { ascending: false })

    if (error) { logSupabaseError('AdminSupport/load', error); setLoading(false); return }
    setTickets((data ?? []) as Ticket[])
    setLoading(false)
  }

  async function submitTicket() {
    if (!form.subject.trim()) return
    setSaving(true)
    const { error } = await supabase.from('support_tickets').insert({
      school_id:  profile!.school_id,
      subject:    form.subject.trim(),
      body:       form.body.trim() || null,
      priority:   form.priority,
      created_by: profile!.id,
      status:     'open',
    })
    if (error) { logSupabaseError('AdminSupport/create', error); setSaving(false); return }
    setForm({ subject: '', body: '', priority: 'medium' })
    setShowNew(false)
    setSaving(false)
    loadTickets()
  }

  const open       = tickets.filter(t => t.status === 'open').length
  const inProgress = tickets.filter(t => t.status === 'in_progress').length
  const resolved   = tickets.filter(t => t.status === 'resolved').length

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <DashboardLayout
      activePage="admin-support"
      onNavigate={onNavigate}
      title="Support"
      subtitle="Raise tickets with Learnora or browse FAQs"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[800px] flex flex-col gap-6">

        {/* Tabs */}
        <div className="flex gap-1 bg-canvas rounded-card p-1 w-fit">
          {([['tickets', 'My Tickets'], ['faq', 'FAQ']] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`h-9 px-5 rounded-md text-sm font-semibold transition-colors ${tab === key ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Tickets tab ── */}
        {tab === 'tickets' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Open',        value: open,       color: 'text-blue-600'  },
                { label: 'In Progress', value: inProgress, color: 'text-amber-600' },
                { label: 'Resolved',    value: resolved,   color: 'text-green-600' },
              ].map(s => (
                <div key={s.label} className="bg-surface rounded-card shadow-sm p-4">
                  <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
                  <p className="text-xs text-muted mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* New Ticket button / form */}
            {!showNew ? (
              <button
                onClick={() => setShowNew(true)}
                className="flex items-center gap-2 h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary w-fit"
              >
                <Plus size={14} /> New Support Ticket
              </button>
            ) : (
              <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-4 border border-primary/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground">New Support Ticket</h2>
                  <button onClick={() => setShowNew(false)} className="text-muted hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">Subject <span className="text-red-500">*</span></label>
                  <input
                    value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Briefly describe your issue"
                    className="w-full h-11 px-4 border border-black/20 rounded-card text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">Details (optional)</label>
                  <textarea
                    rows={4}
                    value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                    placeholder="Provide any relevant context, steps to reproduce, or error messages…"
                    className="w-full border border-black/20 rounded-card px-4 py-3 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">Priority</label>
                  <select
                    value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Prio }))}
                    className="w-full h-11 px-3 border border-black/20 rounded-card text-sm text-foreground outline-none focus:border-primary bg-white appearance-none"
                  >
                    <option value="low">Low — general question or minor issue</option>
                    <option value="medium">Medium — affecting some users</option>
                    <option value="high">High — blocking critical operations</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowNew(false)}
                    className="h-10 px-5 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:bg-canvas transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={submitTicket}
                    disabled={saving || !form.subject.trim()}
                    className="flex items-center gap-2 h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                    {saving ? 'Submitting…' : 'Submit Ticket'}
                  </button>
                </div>
              </div>
            )}

            {/* Ticket list */}
            <div className="bg-surface rounded-card shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-black/6">
                <h2 className="text-sm font-bold text-foreground">
                  {loading ? 'Loading…' : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`}
                </h2>
              </div>

              {loading ? (
                <div className="py-12 text-center text-sm text-muted">Loading tickets…</div>
              ) : tickets.length === 0 ? (
                <div className="py-12 text-center">
                  <HelpCircle size={28} className="mx-auto mb-3 text-muted opacity-30" />
                  <p className="text-sm text-muted">No tickets yet.</p>
                  <p className="text-xs text-muted mt-1">Submit one above and our team will respond.</p>
                </div>
              ) : (
                <div className="divide-y divide-black/4">
                  {tickets.map(t => {
                    const cfg  = STATUS_CFG[t.status]
                    const prio = PRIO_CFG[t.priority]
                    const open = expanded === t.id

                    return (
                      <div key={t.id}>
                        <button
                          onClick={() => setExpanded(open ? null : t.id)}
                          className="w-full flex items-start gap-4 px-6 py-4 text-left hover:bg-canvas/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.color}`}>
                                {cfg.label}
                              </span>
                              <span className={`text-xs font-semibold ${prio.color}`}>
                                {prio.label} priority
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-foreground leading-snug">{t.subject}</p>
                            {!open && t.body && (
                              <p className="text-xs text-muted mt-0.5 line-clamp-1">{t.body}</p>
                            )}
                            <p className="text-xs text-muted mt-1">{fmt(t.created_at)}</p>
                          </div>
                          {open ? <ChevronUp size={15} className="text-muted shrink-0 mt-1" /> : <ChevronDown size={15} className="text-muted shrink-0 mt-1" />}
                        </button>

                        {open && t.body && (
                          <div className="px-6 pb-5">
                            <div className="bg-canvas rounded-card p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                              {t.body}
                            </div>
                            {t.status === 'resolved' && (
                              <div className="flex items-center gap-2 mt-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-card px-3 py-2">
                                <CheckCircle2 size={13} /> This ticket has been resolved by the Learnora team.
                              </div>
                            )}
                            {t.status === 'in_progress' && (
                              <div className="flex items-center gap-2 mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-card px-3 py-2">
                                <Clock size={13} /> Our team is working on this.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── FAQ tab ── */}
        {tab === 'faq' && (
          <div className="bg-surface rounded-card shadow-sm divide-y divide-black/4 overflow-hidden">
            {FAQS.map((f, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-canvas/50 transition-colors"
                >
                  <p className="text-sm font-semibold text-foreground">{f.q}</p>
                  {openFaq === i
                    ? <ChevronUp size={15} className="text-muted shrink-0" />
                    : <ChevronDown size={15} className="text-muted shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-muted leading-relaxed">{f.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Contact info */}
        <div className="bg-canvas border border-black/8 rounded-card px-5 py-4">
          <p className="text-xs text-muted">
            Need urgent help? Email us at{' '}
            <a href="mailto:support@learnora.io" className="text-primary font-semibold hover:underline">
              support@learnora.io
            </a>
            {' '}or call <span className="font-semibold text-foreground">+234 800 LEARNORA</span>.
          </p>
        </div>

      </div>
    </DashboardLayout>
  )
}
