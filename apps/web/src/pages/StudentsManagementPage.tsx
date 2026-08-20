import { useState, useEffect } from 'react'
import { Search, ChevronDown, Users, BookOpen, ClipboardList, TrendingUp, ArrowUpRight } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import PromoteStudentsModal from '../components/shared/PromoteStudentsModal'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Student {
  id:        string
  name:      string
  className: string
  email:     string | null
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('')
  return (
    <div className="size-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
      {initials || '?'}
    </div>
  )
}

export default function StudentsManagementPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [students,    setStudents]    = useState<Student[]>([])
  const [classNames,  setClassNames]  = useState<string[]>(['All'])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [search,      setSearch]      = useState('')
  const [classFilter, setClassFilter] = useState('All')
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [promoteOpen, setPromoteOpen] = useState(false)

  useEffect(() => { if (profile?.id) loadStudents() }, [profile?.id])

  async function loadStudents() {
    setLoading(true)
    setError('')

    const { data: taData, error: taErr } = await supabase
      .from('teacher_assignments')
      .select('class_id, classes(name)')
      .eq('teacher_id', profile!.id)

    if (taErr) { setError(taErr.message); setLoading(false); return }

    const rawTa = (taData ?? []) as unknown as { class_id: string; classes: { name: string } | null }[]
    const classIds = [...new Set(rawTa.map(r => r.class_id))]

    const classNameMap: Record<string, string> = {}
    for (const r of rawTa) {
      if (r.classes) classNameMap[r.class_id] = r.classes.name
    }
    setClassNames(['All', ...Object.values(classNameMap)])

    if (classIds.length === 0) { setStudents([]); setLoading(false); return }

    const { data: eData, error: eErr } = await supabase
      .from('class_enrollments')
      .select('student_id, class_id, profiles!student_id(id, full_name, email)')
      .in('class_id', classIds)

    if (eErr) { setError(eErr.message); setLoading(false); return }

    const raw = (eData ?? []) as unknown as {
      student_id: string
      class_id:   string
      profiles:   { id: string; full_name: string | null; email: string | null } | null
    }[]

    setStudents(raw.map(s => ({
      id:        s.student_id,
      name:      s.profiles?.full_name ?? s.profiles?.email ?? 'Unknown',
      className: classNameMap[s.class_id] ?? '—',
      email:     s.profiles?.email ?? null,
    })))
    setLoading(false)
  }

  const filtered = students.filter(s =>
    (classFilter === 'All' || s.className === classFilter) &&
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  function toggleSelectAll() {
    setSelected(prev =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map(s => s.id))
    )
  }

  const selectedStudents = students
    .filter(s => selected.has(s.id))
    .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)
    .map(s => ({ id: s.id, name: s.name }))

  return (
    <DashboardLayout
      activePage="students"
      onNavigate={onNavigate}
      title="Students"
      subtitle="Manage and monitor student performance and activity."
      nav={teacherNav}
      user={sidebarUser}
    >
      <div className="flex flex-col gap-6 max-w-[1300px]">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Students',   value: loading ? '…' : String(students.length), icon: Users,         color: 'text-primary'    },
            { label: 'Avg. Attendance',  value: '—',                                       icon: BookOpen,      color: 'text-green-600'  },
            { label: 'Top Performers',   value: '—',                                       icon: ClipboardList, color: 'text-foreground' },
            { label: 'At-Risk Students', value: '—',                                       icon: TrendingUp,    color: 'text-red-600'    },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-surface rounded-card shadow-sm p-5 flex items-start gap-3">
                <div className="size-[35px] rounded-md bg-canvas flex items-center justify-center text-primary shrink-0">
                  <Icon size={16} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted mt-0.5 leading-snug">{s.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Search + filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 h-11 px-4 bg-surface border border-black/8 rounded-input flex-1 min-w-[200px] max-w-lg shadow-sm">
            <Search size={15} className="text-muted shrink-0" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
            />
          </div>
          <div className="relative">
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="h-11 pl-4 pr-10 bg-surface border border-black/8 rounded-input text-sm text-foreground shadow-sm hover:border-primary transition-colors appearance-none"
            >
              {classNames.map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
          {selected.size > 0 && (
            <button
              onClick={() => setPromoteOpen(true)}
              className="flex items-center gap-1.5 h-11 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary"
            >
              <ArrowUpRight size={14} /> Promote ({selected.size})
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Table */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/6 bg-canvas/60">
                  <th className="px-4 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="size-4 accent-primary"
                      aria-label="Select all students"
                    />
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Student</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Class</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-muted">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-muted">No students found.</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        className="size-4 accent-primary"
                        aria-label={`Select ${s.name}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} />
                        <span className="font-medium text-foreground">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted">{s.className}</td>
                    <td className="px-6 py-4 text-muted text-xs">{s.email ?? '—'}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => onNavigate('student-profile')}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-black/4">
            <span className="text-sm text-muted">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

      </div>

      <PromoteStudentsModal
        open={promoteOpen}
        students={selectedStudents}
        onClose={() => setPromoteOpen(false)}
        onDone={() => { setSelected(new Set()); loadStudents() }}
      />
    </DashboardLayout>
  )
}
