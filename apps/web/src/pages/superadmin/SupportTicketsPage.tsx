import { useState, useEffect } from 'react'
import { Search, MessageSquare, Clock, CheckCircle2, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { superAdminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type Status   = 'all' | 'open' | 'in-progress' | 'resolved'
type Priority = 'high' | 'medium' | 'low'
type TicketStatus = 'open' | 'in-progress' | 'resolved'

interface Ticket {
  id:       string
  school:   string
  schoolId: string | null
  subject:  string
  body:     string | null
  priority: Priority
  status:   TicketStatus
  date:     string
  lastReply: string
}

const priorityStyle: Record<Priority, string> = {
  high:   'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  low:    'bg-canvas text-muted',
}

const statusStyle: Record<string, string> = {
  open:          'bg-primary/10 text-primary',
  'in-progress': 'bg-amber-50 text-amber-600',
  resolved:      'bg-green-50 text-green-700',
}

const statusIcon: Record<string, typeof MessageSquare> = {
  open:          AlertCircle,
  'in-progress': Clock,
  resolved:      CheckCircle2,
}

const STATUS_CYCLE: TicketStatus[] = ['open', 'in-progress', 'resolved']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const db = supabase as unknown as { from: (t: string) => any }

export default function SupportTicketsPage({ onNavigate }: Props) {
  const { profile }   = useAuth()
  const sidebarUser   = profileToSidebarUser(profile)
  const [filter, setFilter]   = useState<Status>('all')
  const [query, setQuery]     = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => { loadTickets() }, [])

  async function loadTickets() {
    setLoading(true)
    const { data, error } = await db.from('support_tickets')
      .select('id, subject, body, priority, status, created_at, updated_at, school_id, schools(name)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) { logSupabaseError('SupportTickets/load', error); setLoading(false); return }

    type Raw = {
      id: string; subject: string; body: string | null
      priority: string; status: string
      created_at: string; updated_at: string
      school_id: string | null
      schools: { name: string } | null
    }

    setTickets(((data ?? []) as unknown as Raw[]).map(r => ({
      id:       r.id,
      school:   r.schools?.name ?? '—',
      schoolId: r.school_id,
      subject:  r.subject,
      body:     r.body,
      priority: (r.priority as Priority) ?? 'medium',
      status:   (r.status as TicketStatus) ?? 'open',
      date:     fmtDate(r.created_at),
      lastReply: r.updated_at !== r.created_at ? fmtDate(r.updated_at) : '—',
    })))
    setLoading(false)
  }

  async function cycleStatus(ticket: Ticket) {
    const nextIdx = (STATUS_CYCLE.indexOf(ticket.status) + 1) % STATUS_CYCLE.length
    const next    = STATUS_CYCLE[nextIdx]
    setUpdatingId(ticket.id)
    const { error } = await db.from('support_tickets')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', ticket.id)
    if (error) {
      logSupabaseError('SupportTickets/updateStatus', error)
    } else {
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: next } : t))
    }
    setUpdatingId(null)
  }

  const filtered = tickets.filter(t => {
    const matchStatus = filter === 'all' || t.status === filter
    const matchQuery  = !query || t.subject.toLowerCase().includes(query.toLowerCase()) || t.school.toLowerCase().includes(query.toLowerCase())
    return matchStatus && matchQuery
  })

  const openCount       = tickets.filter(t => t.status === 'open').length
  const inProgressCount = tickets.filter(t => t.status === 'in-progress').length
  const resolvedCount   = tickets.filter(t => t.status === 'resolved').length

  const tabs: { id: Status; label: string }[] = [
    { id: 'all',         label: 'All'         },
    { id: 'open',        label: 'Open'        },
    { id: 'in-progress', label: 'In Progress' },
    { id: 'resolved',    label: 'Resolved'    },
  ]

  return (
    <DashboardLayout
      activePage="support-tickets"
      onNavigate={onNavigate}
      title="Support Tickets"
      subtitle="School support requests and issue tracking"
      nav={superAdminNav}
      user={sidebarUser}
    >
      <div className="flex flex-col gap-5">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Open',        count: openCount,        Icon: AlertCircle,  color: 'bg-primary/10 text-primary'  },
            { label: 'In Progress', count: inProgressCount,  Icon: Clock,        color: 'bg-amber-50 text-amber-600'  },
            { label: 'Resolved',    count: resolvedCount,    Icon: CheckCircle2, color: 'bg-green-50 text-green-600'  },
          ].map(({ label, count, Icon, color }) => (
            <div key={label} className="bg-surface rounded-card shadow-sm p-5 flex items-center gap-4">
              <div className={`size-10 rounded-card ${color} flex items-center justify-center shrink-0`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{loading ? '—' : count}</p>
                <p className="text-xs text-muted">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & search */}
        <div className="bg-surface rounded-card shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-1 bg-canvas rounded-pill p-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setFilter(t.id)}
                className={`h-8 px-4 text-xs font-semibold rounded-full transition-colors ${filter === t.id ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search tickets..."
              className="w-full h-9 pl-9 pr-4 border border-black/15 rounded-pill text-sm placeholder:text-muted outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Ticket list */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-sm text-muted">Loading tickets…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{tickets.length === 0 ? 'No support tickets yet.' : 'No tickets match your filters.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-black/4">
              {filtered.map(ticket => {
                const StatusIcon = statusIcon[ticket.status]
                const isOpen     = expanded === ticket.id
                return (
                  <div key={ticket.id}>
                    <div
                      className="flex items-center gap-4 px-6 py-4 hover:bg-canvas/60 transition-colors cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : ticket.id)}
                    >
                      <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${statusStyle[ticket.status]}`}>
                        <StatusIcon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-mono text-muted">{ticket.id.slice(0, 8)}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${priorityStyle[ticket.priority]}`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground truncate">{ticket.subject}</p>
                        <p className="text-xs text-muted mt-0.5">{ticket.school} · {ticket.date}</p>
                      </div>
                      <div className="text-right shrink-0 hidden sm:block">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusStyle[ticket.status]}`}>
                          {ticket.status.replace('-', ' ')}
                        </span>
                      </div>
                      {isOpen ? <ChevronDown size={14} className="text-muted shrink-0" /> : <ChevronRight size={14} className="text-muted shrink-0" />}
                    </div>

                    {isOpen && (
                      <div className="px-6 pb-5 pt-1 bg-canvas/40 border-t border-black/4">
                        {ticket.body && (
                          <p className="text-sm text-foreground leading-relaxed mb-4 whitespace-pre-wrap">{ticket.body}</p>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted font-medium">Change status:</span>
                          {STATUS_CYCLE.map(s => (
                            <button
                              key={s}
                              disabled={ticket.status === s || updatingId === ticket.id}
                              onClick={e => { e.stopPropagation(); cycleStatus({ ...ticket, status: s as TicketStatus }) }}
                              className={`h-7 px-3 rounded-full text-xs font-semibold transition-colors ${ticket.status === s ? `${statusStyle[s]} opacity-100 cursor-default` : 'bg-canvas text-muted hover:text-foreground disabled:opacity-40'}`}
                            >
                              {s.replace('-', ' ')}
                            </button>
                          ))}
                          {updatingId === ticket.id && <span className="text-xs text-muted">Updating…</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
