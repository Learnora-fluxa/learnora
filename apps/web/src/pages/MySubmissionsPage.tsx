import { useState, useEffect } from 'react'
import { FileText, CheckCircle2, Clock, Search, ChevronRight, Star } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }
type Filter = 'All' | 'submitted' | 'graded' | 'late'

interface Submission {
  id:           string
  title:        string
  subject:      string
  submittedOn:  string | null
  dueDate:      string | null
  status:       string | null
  maxScore:     number | null
  scoreText:    string | null
}

const statusConfig: Record<string, { color: string; icon: typeof FileText; label: string }> = {
  submitted: { color: 'bg-primary/10 text-primary', icon: Clock,        label: 'Submitted' },
  graded:    { color: 'bg-green-50 text-green-700', icon: CheckCircle2, label: 'Graded'    },
  late:      { color: 'bg-amber-50 text-amber-700', icon: Clock,        label: 'Late'      },
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function parseScore(text: string | null): { score: number; max: number } | null {
  if (!text) return null
  const m = text.match(/Quiz:\s*(\d+)\/(\d+)/)
  if (m) return { score: parseInt(m[1]), max: parseInt(m[2]) }
  return null
}

export default function MySubmissionsPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState<Filter>('All')
  const [query,       setQuery]       = useState('')
  const [expanded,    setExpanded]    = useState<string | null>(null)

  useEffect(() => { if (profile?.id) loadSubmissions() }, [profile?.id])

  async function loadSubmissions() {
    setLoading(true)
    const { data } = await supabase
      .from('assignment_submissions')
      .select('id, status, submitted_at, submission_text, assignments(title, due_date, max_score, subjects(name))')
      .eq('student_id', profile!.id)
      .eq('school_id', profile!.school_id!)
      .order('submitted_at', { ascending: false })

    const rows = (data ?? []) as unknown as {
      id:             string
      status:         string | null
      submitted_at:   string | null
      submission_text: string | null
      assignments: {
        title:    string
        due_date: string | null
        max_score: number | null
        subjects: { name: string } | null
      } | null
    }[]

    setSubmissions(rows.map(r => ({
      id:          r.id,
      title:       r.assignments?.title ?? 'Assignment',
      subject:     r.assignments?.subjects?.name ?? '—',
      submittedOn: r.submitted_at,
      dueDate:     r.assignments?.due_date ?? null,
      status:      r.status,
      maxScore:    r.assignments?.max_score ?? null,
      scoreText:   r.submission_text,
    })))
    setLoading(false)
  }

  const filtered = submissions.filter(s =>
    (filter === 'All' || s.status === filter) &&
    (!query || s.title.toLowerCase().includes(query.toLowerCase()) || s.subject.toLowerCase().includes(query.toLowerCase()))
  )

  const gradedRows = submissions.filter(s => s.status === 'graded')

  return (
    <DashboardLayout
      activePage="assignments"
      onNavigate={onNavigate}
      title="My Submissions"
      subtitle="All your submitted assignments and grades"
      user={sidebarUser}
    >
      <div className="flex flex-col gap-5 max-w-[860px]">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Submitted', value: submissions.length },
            { label: 'Graded',          value: gradedRows.length  },
            { label: 'Pending Review',  value: submissions.filter(s => s.status === 'submitted').length },
            { label: 'Late',            value: submissions.filter(s => s.status === 'late').length      },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface rounded-card shadow-sm p-4">
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters + search */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search submissions…"
              className="h-9 pl-9 pr-4 border border-black/20 rounded-full text-sm outline-none focus:border-primary w-52"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(['All', 'submitted', 'graded', 'late'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-8 px-3 rounded-full text-xs font-semibold capitalize transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-foreground shadow-sm'}`}
              >
                {f === 'All' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted">Loading submissions…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <FileText size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {query || filter !== 'All' ? 'No submissions match your filter.' : 'No submissions yet. Submit an assignment to see it here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/4">
              {filtered.map(sub => {
                const cfg    = statusConfig[sub.status ?? 'submitted'] ?? statusConfig.submitted
                const Icon   = cfg.icon
                const open   = expanded === sub.id
                const parsed = parseScore(sub.scoreText)
                return (
                  <div key={sub.id}>
                    <button
                      onClick={() => setExpanded(open ? null : sub.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-canvas/50 transition-colors"
                    >
                      <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{sub.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted flex-wrap">
                          <span>{sub.subject}</span>
                          <span>·</span>
                          <span>Submitted {fmtDate(sub.submittedOn)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {parsed && (
                          <div className="flex items-center gap-1">
                            <Star size={11} className="text-amber-400" fill="#fbbf24" />
                            <span className={`text-sm font-bold ${parsed.score / parsed.max >= 0.85 ? 'text-green-600' : parsed.score / parsed.max >= 0.7 ? 'text-primary' : 'text-amber-600'}`}>
                              {parsed.score}/{parsed.max}
                            </span>
                          </div>
                        )}
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                        <ChevronRight size={14} className={`text-muted transition-transform ${open ? 'rotate-90' : ''}`} />
                      </div>
                    </button>
                    {open && (
                      <div className="px-5 pb-4 pt-0 ml-[52px]">
                        <div className="bg-canvas rounded-card p-4 text-sm">
                          <div className="flex justify-between text-xs text-muted mb-2">
                            <span>Due: {fmtDate(sub.dueDate)}</span>
                            <span>Submitted: {fmtDate(sub.submittedOn)}</span>
                          </div>
                          {sub.scoreText && (
                            <div>
                              <p className="text-xs font-bold text-muted mb-1">Submission</p>
                              <p className="text-sm text-foreground leading-relaxed">{sub.scoreText}</p>
                            </div>
                          )}
                          {(sub.status === 'submitted' || !sub.scoreText) && (
                            <p className="text-xs text-muted italic">Awaiting teacher review.</p>
                          )}
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
