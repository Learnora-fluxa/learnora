import { useState, useEffect } from 'react'
import { Plus, Search } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface AssignmentRow {
  id:           string
  title:        string
  class_name:   string
  subject_name: string
  due_date:     string | null
  is_published: boolean
  subCount:     number
  enrollCount:  number
  status:       string
  action:       string
}

const statusStyle: Record<string, string> = {
  Active:    'bg-primary/10 text-primary',
  Upcoming:  'bg-gray-100 text-gray-500',
  Pending:   'bg-amber-50 text-amber-700',
  Completed: 'bg-green-50 text-green-700',
}

const actionStyle: Record<string, string> = {
  Review:  'bg-amber-500 text-white hover:bg-amber-600',
  Grade:   'bg-primary text-white hover:bg-primary-deep',
  View:    'text-primary hover:bg-primary/8',
  Preview: 'text-muted hover:bg-canvas',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function computeStatus(dueDate: string | null, subCount: number, isPublished: boolean): string {
  if (!isPublished) return 'Pending'
  const due = dueDate ? new Date(dueDate).getTime() : Infinity
  if (due > Date.now() && subCount === 0) return 'Upcoming'
  if (due > Date.now() && subCount > 0)  return 'Active'
  return 'Completed'
}

function computeAction(status: string): string {
  if (status === 'Active')    return 'Review'
  if (status === 'Completed') return 'Grade'
  return 'Preview'
}

export default function ExaminationsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')

  useEffect(() => { if (profile?.id) loadAssignments() }, [profile?.id])

  async function loadAssignments() {
    setLoading(true)
    const { data: aData, error: aErr } = await supabase
      .from('assignments')
      .select('id, title, due_date, is_published, class_id, classes!class_id(name), subjects!subject_id(name)')
      .eq('teacher_id', profile!.id)
      .order('due_date', { ascending: false })

    if (aErr) { logSupabaseError('Examinations/assignments', aErr); setLoading(false); return }

    type ARaw = {
      id: string; title: string; due_date: string | null; is_published: boolean; class_id: string
      classes: { name: string } | null; subjects: { name: string } | null
    }

    const aRows = (aData ?? []) as unknown as ARaw[]
    if (aRows.length === 0) { setLoading(false); return }

    const assignmentIds = aRows.map(r => r.id)
    const classIds      = [...new Set(aRows.map(r => r.class_id).filter(Boolean))]

    const [subRes, enrollRes] = await Promise.all([
      supabase.from('assignment_submissions').select('assignment_id').in('assignment_id', assignmentIds),
      supabase.from('class_enrollments').select('class_id').in('class_id', classIds),
    ])

    if (subRes.error)    logSupabaseError('Examinations/subs',   subRes.error)
    if (enrollRes.error) logSupabaseError('Examinations/enroll', enrollRes.error)

    const subCountMap = new Map<string, number>()
    for (const s of (subRes.data ?? []) as { assignment_id: string }[]) {
      subCountMap.set(s.assignment_id, (subCountMap.get(s.assignment_id) ?? 0) + 1)
    }

    const enrollCountMap = new Map<string, number>()
    for (const e of (enrollRes.data ?? []) as { class_id: string }[]) {
      enrollCountMap.set(e.class_id, (enrollCountMap.get(e.class_id) ?? 0) + 1)
    }

    const rows: AssignmentRow[] = aRows.map(r => {
      const subCount   = subCountMap.get(r.id) ?? 0
      const enrollCount = enrollCountMap.get(r.class_id) ?? 0
      const status     = computeStatus(r.due_date, subCount, r.is_published)
      return {
        id:           r.id,
        title:        r.title,
        class_name:   r.classes?.name ?? '—',
        subject_name: r.subjects?.name ?? '—',
        due_date:     r.due_date,
        is_published: r.is_published,
        subCount,
        enrollCount,
        status,
        action: computeAction(status),
      }
    })

    setAssignments(rows)
    setLoading(false)
  }

  function handleAction(row: AssignmentRow) {
    sessionStorage.setItem('learnora_selected_assignment', row.id)
    if (row.action === 'Review' || row.action === 'Grade' || row.action === 'View') {
      onNavigate('submissions-inbox')
    } else {
      onNavigate('assignment-builder')
    }
  }

  const filtered = assignments.filter(a => a.title.toLowerCase().includes(search.toLowerCase()))

  const total     = assignments.length
  const active    = assignments.filter(a => a.status === 'Active').length
  const pending   = assignments.filter(a => a.status === 'Pending').length
  const completed = assignments.filter(a => a.status === 'Completed').length

  return (
    <DashboardLayout
      activePage="examinations"
      onNavigate={onNavigate}
      title="Examinations"
      subtitle="Manage assessments and track student submissions"
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-6 max-w-[1200px]">

        {/* Header */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-foreground">Assessment Management</h2>
              <p className="text-sm text-muted mt-1">Create, distribute, and review examinations and assignments for your classes.</p>
            </div>
            <button
              onClick={() => onNavigate('create-assessment')}
              className="flex items-center gap-2 h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary shrink-0"
            >
              <Plus size={15} /> New Assessment
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
            {[
              { label: 'Total',     value: loading ? '—' : String(total),    color: 'text-foreground' },
              { label: 'Active',    value: loading ? '—' : String(active),   color: 'text-primary'    },
              { label: 'Pending',   value: loading ? '—' : String(pending),  color: 'text-amber-600'  },
              { label: 'Completed', value: loading ? '—' : String(completed),color: 'text-green-600'  },
            ].map(s => (
              <div key={s.label} className="bg-canvas rounded-card p-4">
                <p className="text-xs text-muted">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2.5 h-10 px-4 bg-canvas border border-black/8 rounded-input mt-5 max-w-sm">
            <Search size={15} className="text-muted shrink-0" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search assessments..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/6 bg-canvas/60">
                  {['Assignment', 'Class', 'Deadline', 'Submissions', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-muted">Loading assessments…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-muted">
                    {search ? 'No assessments match your search.' : 'No assessments yet. Create your first one.'}
                  </td></tr>
                ) : filtered.map(a => (
                  <tr key={a.id} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{a.title}</p>
                      <p className="text-xs text-muted mt-0.5">{a.subject_name}</p>
                    </td>
                    <td className="px-6 py-4 text-muted">{a.class_name}</td>
                    <td className="px-6 py-4 text-muted text-xs">{fmtDate(a.due_date)}</td>
                    <td className="px-6 py-4 text-foreground font-medium">
                      {a.enrollCount > 0 ? `${a.subCount}/${a.enrollCount}` : `${a.subCount}`}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-xs ${statusStyle[a.status] ?? 'bg-canvas text-muted'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleAction(a)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xs transition-colors ${actionStyle[a.action] ?? 'text-muted hover:bg-canvas'}`}
                      >
                        {a.action}
                      </button>
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
