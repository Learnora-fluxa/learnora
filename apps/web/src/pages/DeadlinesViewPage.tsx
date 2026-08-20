import { useState, useEffect } from 'react'
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

type Urgency = 'overdue' | 'today' | 'week' | 'upcoming'

interface Deadline {
  id:       string
  title:    string
  subject:  string
  dueDate:  string
  urgency:  Urgency
  submitted: boolean
}

const URGENCY_META: Record<Urgency, { label: string; color: string; bg: string }> = {
  overdue:  { label: 'Overdue',  color: 'text-red-600',    bg: 'bg-red-50 border-red-200'    },
  today:    { label: 'Today',    color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  week:     { label: 'This week',color: 'text-primary',    bg: 'bg-primary/5 border-primary/20' },
  upcoming: { label: 'Upcoming', color: 'text-muted',      bg: 'bg-canvas border-black/10'   },
}

function getUrgency(dueDate: string): Urgency {
  const now   = new Date()
  const due   = new Date(dueDate)
  const diffH = (due.getTime() - now.getTime()) / 3600000
  if (diffH < 0)    return 'overdue'
  if (diffH < 24)   return 'today'
  if (diffH < 168)  return 'week'
  return 'upcoming'
}

export default function DeadlinesViewPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [filter,    setFilter]    = useState<'all' | Urgency>('all')
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    setLoading(true)
    const sid      = profile!.id
    const schoolId = profile!.school_id!

    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title, due_date, subject_id, subjects!subject_id(name)')
      .eq('school_id', schoolId)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })
      .limit(40)

    if (!assignments) { setLoading(false); return }

    // Check which are submitted
    const ids = assignments.map((a: any) => a.id)
    const { data: subs } = await supabase
      .from('assignment_submissions')
      .select('assignment_id')
      .eq('student_id', sid)
      .in('assignment_id', ids)
    const submittedSet = new Set((subs ?? []).map((s: any) => s.assignment_id))

    setDeadlines((assignments as any[]).map(a => ({
      id:       a.id,
      title:    a.title,
      subject:  (a.subjects as { name: string } | null)?.name ?? 'Subject',
      dueDate:  a.due_date,
      urgency:  getUrgency(a.due_date),
      submitted: submittedSet.has(a.id),
    })))
    setLoading(false)
  }

  const visible = filter === 'all' ? deadlines : deadlines.filter(d => d.urgency === filter)
  const counts  = {
    overdue:  deadlines.filter(d => d.urgency === 'overdue'  && !d.submitted).length,
    today:    deadlines.filter(d => d.urgency === 'today'    && !d.submitted).length,
    week:     deadlines.filter(d => d.urgency === 'week'     && !d.submitted).length,
    upcoming: deadlines.filter(d => d.urgency === 'upcoming' && !d.submitted).length,
  }

  return (
    <DashboardLayout
      activePage="calendar"
      onNavigate={onNavigate}
      title="Deadlines"
      subtitle="All upcoming assignment and assessment due dates"
      user={sidebarUser}
    >
      <div className="max-w-[760px] flex flex-col gap-5">

        {/* Summary */}
        {counts.overdue > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-card p-4 flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-700">{counts.overdue} overdue assignment{counts.overdue > 1 ? 's' : ''} — submit now!</p>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'overdue', 'today', 'week', 'upcoming'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`h-8 px-3.5 rounded-full text-xs font-semibold capitalize transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-foreground shadow-sm'}`}>
              {f === 'all' ? 'All deadlines' : URGENCY_META[f].label}
              {f !== 'all' && counts[f] > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{counts[f]}</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-sm text-muted">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <Clock size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No deadlines in this category.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map(d => {
              const { label, color, bg } = URGENCY_META[d.urgency]
              const fmtDate = new Date(d.dueDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              return (
                <div key={d.id}
                  className={`flex items-center gap-4 p-4 rounded-card border ${d.submitted ? 'bg-canvas border-black/8 opacity-60' : bg}`}
                >
                  <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${d.submitted ? 'bg-green-100' : 'bg-white/70'}`}>
                    {d.submitted ? <CheckCircle2 size={16} className="text-green-600" /> : <Clock size={15} className={color} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${d.submitted ? 'text-muted line-through' : 'text-foreground'}`}>{d.title}</p>
                    <p className="text-xs text-muted mt-0.5">{d.subject} · Due {fmtDate}</p>
                  </div>
                  {d.submitted ? (
                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2.5 py-1 rounded-full shrink-0">Submitted</span>
                  ) : (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${color} bg-white/60`}>{label}</span>
                  )}
                  {!d.submitted && (
                    <button onClick={() => onNavigate('assignments')}
                      className="h-8 px-3 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary-deep transition-colors shrink-0">
                      Submit
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
