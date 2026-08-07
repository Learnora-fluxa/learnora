import { useState, useEffect } from 'react'
import { Search, Download, ScanSearch } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }
type FilterStatus = 'All' | 'submitted' | 'pending' | 'late' | 'graded'

interface Submission {
  id:              string
  studentName:     string
  assignmentTitle: string
  submittedAt:     string | null
  status:          string
}

const statusStyle: Record<string, string> = {
  submitted: 'bg-green-50 text-green-700',
  pending:   'bg-amber-50 text-amber-700',
  late:      'bg-red-50 text-red-600',
  graded:    'bg-primary/10 text-primary',
}

const statusLabel: Record<string, string> = {
  submitted: 'Submitted',
  pending:   'Pending',
  late:      'Late',
  graded:    'Graded',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function SubmissionsInboxPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [filter,      setFilter]      = useState<FilterStatus>('All')
  const [search,      setSearch]      = useState('')

  function openSubmission(page: 'grading-screen' | 'ai-assistant', submissionId: string) {
    sessionStorage.setItem('learnora_selected_submission', submissionId)
    onNavigate(page)
  }

  useEffect(() => { if (profile?.id) loadSubmissions() }, [profile?.id])

  async function loadSubmissions() {
    setLoading(true)
    setError('')

    const { data: aData, error: aErr } = await supabase
      .from('assignments')
      .select('id')
      .eq('teacher_id', profile!.id)

    if (aErr) { setError(aErr.message); setLoading(false); return }

    const assignIds = (aData ?? []).map((a: { id: string }) => a.id)
    if (assignIds.length === 0) { setSubmissions([]); setLoading(false); return }

    const { data, error: err } = await supabase
      .from('assignment_submissions')
      .select('id, submitted_at, status, student:profiles!student_id(full_name, email), assignment:assignments!assignment_id(title)')
      .in('assignment_id', assignIds)
      .order('submitted_at', { ascending: false })

    if (err) { setError(err.message); setLoading(false); return }

    const raw = (data ?? []) as unknown as {
      id:           string
      submitted_at: string | null
      status:       string
      student:      { full_name: string | null; email: string | null } | null
      assignment:   { title: string } | null
    }[]

    setSubmissions(raw.map(s => ({
      id:              s.id,
      studentName:     s.student?.full_name ?? s.student?.email ?? 'Student',
      assignmentTitle: s.assignment?.title ?? '—',
      submittedAt:     s.submitted_at,
      status:          s.status,
    })))
    setLoading(false)
  }

  const filtered = submissions.filter(s =>
    (filter === 'All' || s.status === filter) &&
    s.studentName.toLowerCase().includes(search.toLowerCase())
  )

  const counts = {
    submitted: submissions.filter(s => s.status === 'submitted').length,
    pending:   submissions.filter(s => s.status === 'pending').length,
    late:      submissions.filter(s => s.status === 'late').length,
  }

  return (
    <DashboardLayout
      activePage="teacher-assignments"
      onNavigate={onNavigate}
      title="Submissions Inbox"
      subtitle="All student submissions for your assignments"
      nav={teacherNav}
      user={sidebarUser}
    >
      <div className="max-w-[1100px] flex flex-col gap-6">

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-card p-5">
            <p className="text-3xl font-bold text-green-700">{counts.submitted}</p>
            <p className="text-sm text-green-600 mt-0.5">To Grade</p>
          </div>
          <div className="bg-amber-50 rounded-card p-5">
            <p className="text-3xl font-bold text-amber-600">{counts.pending}</p>
            <p className="text-sm text-amber-500 mt-0.5">Pending</p>
          </div>
          <div className="bg-red-50 rounded-card p-5">
            <p className="text-3xl font-bold text-red-600">{counts.late}</p>
            <p className="text-sm text-red-500 mt-0.5">Late</p>
          </div>
        </div>

        {/* Filters + search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by student name..."
              className="w-full h-10 pl-9 pr-4 border border-black/15 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-1 bg-canvas rounded-card p-1">
            {(['All', 'submitted', 'pending', 'late', 'graded'] as FilterStatus[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 h-8 text-xs font-semibold rounded-md transition-colors ${
                  filter === f ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'
                }`}>
                {f === 'All' ? 'All' : statusLabel[f]}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 h-10 px-4 border border-black/15 rounded-pill text-sm text-muted hover:text-foreground transition-colors">
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => onNavigate('plagiarism-check')}
            className="flex items-center gap-1.5 h-10 px-4 bg-amber-50 border border-amber-200 rounded-pill text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <ScanSearch size={14} /> Plagiarism Check
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Table */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/6 bg-canvas/40">
                  {['Student', 'Assignment', 'Submitted At', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-muted">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-muted">No submissions found.</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                          {s.studentName.charAt(0)}
                        </div>
                        <span className="font-medium text-foreground">{s.studentName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-muted text-xs">{s.assignmentTitle}</td>
                    <td className="px-6 py-3.5 text-muted text-xs">{fmtDate(s.submittedAt)}</td>
                    <td className="px-6 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-xs ${statusStyle[s.status] ?? ''}`}>
                        {statusLabel[s.status] ?? s.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      {s.status === 'submitted' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openSubmission('grading-screen', s.id)}
                            className="text-xs bg-primary text-white font-semibold px-3 py-1.5 rounded-xs hover:bg-primary-deep transition-colors"
                          >
                            Grade
                          </button>
                          <button
                            onClick={() => openSubmission('ai-assistant', s.id)}
                            className="text-xs border border-primary/25 text-primary font-semibold px-3 py-1.5 rounded-xs hover:bg-primary/5 transition-colors"
                          >
                            AI Review
                          </button>
                        </div>
                      )}
                      {s.status === 'graded' && (
                        <span className="text-xs text-green-600 font-semibold">Graded</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
