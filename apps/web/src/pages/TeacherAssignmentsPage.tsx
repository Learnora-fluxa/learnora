import { useState, useEffect } from 'react'
import { Search, Plus, Users, ClipboardList, TrendingUp, BookOpen } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }
type Status = 'Active' | 'Pending' | 'Completed'

interface AssignmentRow {
  id:          string
  title:       string
  className:   string
  deadline:    string
  submissions: number
  status:      Status
}

const statusBadge: Record<Status, string> = {
  Active:    'bg-primary/10 text-primary',
  Pending:   'bg-amber-50 text-amber-700',
  Completed: 'bg-green-50 text-green-700',
}

function fmtDue(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function deriveStatus(dueDate: string | null): Status {
  if (!dueDate) return 'Pending'
  const due = new Date(dueDate)
  const now = new Date()
  if (due < now) return 'Completed'
  const threeDays = new Date(); threeDays.setDate(threeDays.getDate() + 3)
  return due <= threeDays ? 'Active' : 'Pending'
}

export default function TeacherAssignmentsPage({ onNavigate }: Props) {
  const { profile }      = useAuth()
  const sidebarUser      = profileToSidebarUser(profile)

  const [assignments,    setAssignments]    = useState<AssignmentRow[]>([])
  const [totalStudents,  setTotalStudents]  = useState(0)
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')

  useEffect(() => { if (profile?.id) loadData() }, [profile?.id])

  async function loadData() {
    setLoading(true)
    const teacherId = profile!.id

    const { data: aData } = await supabase
      .from('assignments')
      .select('id, title, due_date, class_id, classes(name)')
      .eq('teacher_id', teacherId)
      .eq('school_id', profile!.school_id!)
      .order('created_at', { ascending: false })

    const rawAssign = (aData ?? []) as unknown as {
      id: string; title: string; due_date: string | null
      class_id: string; classes: { name: string } | null
    }[]

    if (rawAssign.length > 0) {
      const assignIds = rawAssign.map(a => a.id)
      const classIds  = [...new Set(rawAssign.map(a => a.class_id))]

      const [subRes, ceRes] = await Promise.all([
        supabase
          .from('assignment_submissions')
          .select('assignment_id')
          .in('assignment_id', assignIds)
          .in('status', ['submitted', 'graded']),
        supabase
          .from('class_enrollments')
          .select('student_id', { count: 'exact', head: true })
          .in('class_id', classIds),
      ])

      const subCounts: Record<string, number> = {}
      for (const s of (subRes.data ?? []) as { assignment_id: string }[]) {
        subCounts[s.assignment_id] = (subCounts[s.assignment_id] ?? 0) + 1
      }

      setTotalStudents(ceRes.count ?? 0)
      setAssignments(rawAssign.map(a => ({
        id:          a.id,
        title:       a.title,
        className:   a.classes?.name ?? '—',
        deadline:    fmtDue(a.due_date),
        submissions: subCounts[a.id] ?? 0,
        status:      deriveStatus(a.due_date),
      })))
    }
    setLoading(false)
  }

  const visible   = assignments.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.className.toLowerCase().includes(search.toLowerCase())
  )
  const active    = assignments.filter(a => a.status === 'Active').length
  const pending   = assignments.filter(a => a.status === 'Pending').length

  return (
    <DashboardLayout
      activePage="teacher-assignments"
      onNavigate={onNavigate}
      title="Assignments"
      subtitle="Create, review and manage student assignments efficiently"
      nav={teacherNav}
      user={sidebarUser}
    >
      <div className="flex flex-col gap-6 max-w-[1300px]">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total',    value: loading ? '—' : assignments.length, icon: ClipboardList, color: 'text-primary'    },
            { label: 'Active',   value: loading ? '—' : active,            icon: TrendingUp,    color: 'text-green-600'  },
            { label: 'Pending',  value: loading ? '—' : pending,           icon: BookOpen,      color: 'text-amber-600'  },
            { label: 'Students', value: loading ? '—' : totalStudents,     icon: Users,         color: 'text-foreground' },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-surface rounded-card shadow-sm p-5 flex items-start gap-3">
                <div className="size-[35px] rounded-md bg-canvas flex items-center justify-center text-primary shrink-0">
                  <Icon size={16} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted mt-0.5">{s.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 h-11 px-4 bg-surface border border-black/8 rounded-input flex-1 min-w-[200px] max-w-lg shadow-sm">
            <Search size={15} className="text-muted shrink-0" />
            <input
              type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search assignments"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
            />
          </div>
          <button
            onClick={() => onNavigate('assignment-builder')}
            className="flex items-center gap-2 h-11 px-4 bg-primary text-white text-sm font-semibold rounded-input shadow-primary hover:bg-primary-deep transition-colors shrink-0"
          >
            <Plus size={15} /> New Assignment
          </button>
        </div>

        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-black/6">
            <h3 className="text-base font-bold text-foreground">Assignment Table</h3>
          </div>
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
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-muted">Loading…</td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-muted">
                    {search ? 'No assignments match your search.' : 'No assignments yet. Create one to get started.'}
                  </td></tr>
                ) : visible.map(a => (
                  <tr key={a.id} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{a.title}</td>
                    <td className="px-6 py-4 text-muted">{a.className}</td>
                    <td className="px-6 py-4 text-muted whitespace-nowrap">{a.deadline}</td>
                    <td className="px-6 py-4 text-foreground">{a.submissions}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-xs ${statusBadge[a.status]}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => onNavigate('submissions-inbox')}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xs bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                      >
                        View Submissions
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
