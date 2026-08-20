import { useState, useEffect } from 'react'
import { Users, Search, Download, TrendingDown, CheckCircle2, XCircle, Clock } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface ClassRow {
  id: string; name: string
  total: number; present: number; absent: number; late: number; rate: number
}
interface StudentRow {
  id: string; name: string; className: string
  present: number; absent: number; late: number; rate: number
}

const statusStyle: Record<string, string> = {
  Excellent: 'bg-green-50 text-green-700',
  Good:      'bg-primary/10 text-primary',
  Warning:   'bg-amber-50 text-amber-700',
  'At Risk': 'bg-orange-50 text-orange-600',
  Critical:  'bg-red-50 text-red-600',
}

function rateStatus(rate: number) {
  if (rate >= 95) return 'Excellent'
  if (rate >= 85) return 'Good'
  if (rate >= 75) return 'Warning'
  if (rate >= 60) return 'At Risk'
  return 'Critical'
}

export default function AdminAttendancePage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [classRows,     setClassRows]     = useState<ClassRow[]>([])
  const [studentRows,   setStudentRows]   = useState<StudentRow[]>([])
  const [tab,           setTab]           = useState<'overview' | 'students'>('overview')
  const [search,        setSearch]        = useState('')
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => { if (profile?.school_id) loadData() }, [profile?.school_id])

  async function loadData() {
    setLoading(true)
    const schoolId = profile!.school_id!
    const today    = new Date().toISOString().split('T')[0]

    // All classes for this school
    const { data: clsData } = await supabase
      .from('classes').select('id, name').eq('school_id', schoolId)
    const classes = (clsData ?? []) as { id: string; name: string }[]

    // Enrollment counts per class
    const { data: ceData } = await supabase
      .from('class_enrollments').select('class_id, student_id').in('class_id', classes.map(c => c.id))
    const ceRows = (ceData ?? []) as { class_id: string; student_id: string }[]
    const enrollByClass: Record<string, Set<string>> = {}
    for (const e of ceRows) {
      if (!enrollByClass[e.class_id]) enrollByClass[e.class_id] = new Set()
      enrollByClass[e.class_id].add(e.student_id)
    }

    // Today's attendance
    const { data: arData } = await supabase
      .from('attendance_records')
      .select('student_id, class_id, status')
      .eq('school_id', schoolId)
      .eq('date', today)
    const arRows = (arData ?? []) as { student_id: string; class_id: string; status: string }[]

    // Aggregate by class
    const rows: ClassRow[] = classes.map(c => {
      const enrolled = enrollByClass[c.id]?.size ?? 0
      const records  = arRows.filter(r => r.class_id === c.id)
      const present  = records.filter(r => r.status === 'present').length
      const absent   = records.filter(r => r.status === 'absent').length
      const late     = records.filter(r => r.status === 'late').length
      const rate     = enrolled > 0 ? Math.round(((present + late) / enrolled) * 100) : 0
      return { id: c.id, name: c.name, total: enrolled, present, absent, late, rate }
    })
    setClassRows(rows)

    // Student rows: aggregate per student across all days
    const { data: allAR } = await supabase
      .from('attendance_records')
      .select('student_id, class_id, status')
      .eq('school_id', schoolId)
      .limit(2000)
    const allARRows = (allAR ?? []) as { student_id: string; class_id: string; status: string }[]

    // Student names
    const allStudentIds = [...new Set(allARRows.map(r => r.student_id))]
    const nameMap: Record<string, string>  = {}
    const classMap: Record<string, string> = {}
    if (allStudentIds.length > 0) {
      const { data: profData } = await supabase
        .from('profiles').select('id, full_name').in('id', allStudentIds)
      for (const p of (profData ?? []) as { id: string; full_name: string | null }[]) {
        nameMap[p.id] = p.full_name ?? 'Unknown'
      }
      for (const e of ceRows) {
        if (!classMap[e.student_id]) {
          const cls = classes.find(c => c.id === e.class_id)
          if (cls) classMap[e.student_id] = cls.name
        }
      }
    }

    const byStudent: Record<string, { present: number; absent: number; late: number }> = {}
    for (const r of allARRows) {
      if (!byStudent[r.student_id]) byStudent[r.student_id] = { present: 0, absent: 0, late: 0 }
      if (r.status === 'present') byStudent[r.student_id].present++
      else if (r.status === 'absent') byStudent[r.student_id].absent++
      else if (r.status === 'late') byStudent[r.student_id].late++
    }
    const sRows: StudentRow[] = Object.entries(byStudent).map(([id, counts]) => {
      const total = counts.present + counts.absent + counts.late
      const rate  = total > 0 ? Math.round(((counts.present + counts.late) / total) * 100) : 0
      return { id, name: nameMap[id] ?? 'Unknown', className: classMap[id] ?? '—', ...counts, rate }
    })
    setStudentRows(sRows)
    setLoading(false)
  }

  const totalPresent  = classRows.reduce((s, c) => s + c.present, 0)
  const totalStudents = classRows.reduce((s, c) => s + c.total,   0)
  const schoolRate    = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0
  const atRisk        = studentRows.filter(s => s.rate < 75).length

  const q = search.toLowerCase()
  const filteredStudents = studentRows.filter(s => {
    const matchClass  = selectedClass ? s.className === selectedClass : true
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.className.toLowerCase().includes(q)
    return matchClass && matchSearch
  })

  return (
    <DashboardLayout
      activePage="attendance"
      onNavigate={onNavigate}
      title="Attendance Records"
      subtitle="School-wide attendance by class and student"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[1200px] flex flex-col gap-6">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'School Average',  value: loading ? '…' : `${schoolRate}%`, icon: CheckCircle2, color: 'text-green-600 bg-green-50'  },
            { label: 'Total Students',  value: loading ? '…' : totalStudents,     icon: Users,        color: 'text-primary bg-primary/10'  },
            { label: 'Present Today',   value: loading ? '…' : totalPresent,      icon: CheckCircle2, color: 'text-green-600 bg-green-50'  },
            { label: 'At Risk (<75%)',  value: loading ? '…' : atRisk,            icon: TrendingDown, color: 'text-red-600 bg-red-50'      },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-surface rounded-card shadow-sm p-5">
                <div className={`size-9 rounded-full flex items-center justify-center mb-2 ${s.color}`}><Icon size={16} /></div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted mt-0.5">{s.label}</p>
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-canvas rounded-card p-1">
            {(['overview', 'students'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 h-9 text-sm font-semibold rounded-md transition-colors ${tab === t ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}>
                {t === 'overview' ? 'By Class' : 'By Student'}
              </button>
            ))}
          </div>

          {tab === 'students' && (
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search student or class..."
                className="w-full h-10 pl-9 pr-4 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
            </div>
          )}

          <button className="flex items-center gap-1.5 h-10 px-4 border border-black/15 rounded-pill text-sm text-muted hover:text-foreground hover:border-primary transition-colors ml-auto">
            <Download size={13} /> Export
          </button>
        </div>

        {tab === 'overview' && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-black/6 bg-canvas/40">
                    {['Class', 'Total', 'Present', 'Absent', 'Late', 'Rate', 'Action'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/4">
                  {loading ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-muted">Loading…</td></tr>
                  ) : classRows.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-muted">No classes found.</td></tr>
                  ) : classRows.map(c => (
                    <tr key={c.id} className="hover:bg-canvas/40 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-foreground">{c.name}</td>
                      <td className="px-5 py-3.5 font-semibold text-foreground">{c.total}</td>
                      <td className="px-5 py-3.5"><span className="flex items-center gap-1 text-green-600 font-semibold"><CheckCircle2 size={12} /> {c.present}</span></td>
                      <td className="px-5 py-3.5"><span className="flex items-center gap-1 text-red-500 font-semibold"><XCircle size={12} /> {c.absent}</span></td>
                      <td className="px-5 py-3.5"><span className="flex items-center gap-1 text-amber-600 font-semibold"><Clock size={12} /> {c.late}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-canvas rounded-full min-w-[60px]">
                            <div className={`h-full rounded-full ${c.rate >= 90 ? 'bg-green-500' : c.rate >= 80 ? 'bg-primary' : c.rate >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${c.rate}%` }} />
                          </div>
                          <span className={`text-xs font-bold ${c.rate >= 90 ? 'text-green-600' : c.rate >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{c.rate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => { setSelectedClass(c.name); setTab('students'); setSearch('') }}
                          className="text-xs font-semibold text-primary hover:underline">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'students' && selectedClass && (
          <div className="flex items-center justify-between bg-primary/8 border border-primary/20 rounded-card px-4 py-3">
            <p className="text-sm font-semibold text-primary">Showing attendance for class <span className="font-bold">{selectedClass}</span></p>
            <button onClick={() => setSelectedClass(null)} className="text-xs text-primary hover:underline font-semibold">Show all classes</button>
          </div>
        )}

        {tab === 'students' && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-black/6 bg-canvas/40">
                    {['Student', 'Class', 'Present', 'Absent', 'Late', 'Rate', 'Status'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/4">
                  {loading ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-muted">Loading…</td></tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-muted">No students match.</td></tr>
                  ) : filteredStudents.map((s) => {
                    const st = rateStatus(s.rate)
                    return (
                      <tr key={s.id} className="hover:bg-canvas/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="size-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{s.name.charAt(0)}</div>
                            <span className="font-medium text-foreground">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-muted text-xs font-semibold">{s.className}</td>
                        <td className="px-5 py-3.5 text-green-600 font-semibold">{s.present}</td>
                        <td className="px-5 py-3.5 text-red-500 font-semibold">{s.absent}</td>
                        <td className="px-5 py-3.5 text-amber-600 font-semibold">{s.late}</td>
                        <td className="px-5 py-3.5"><span className={`text-xs font-bold ${s.rate >= 90 ? 'text-green-600' : s.rate >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{s.rate}%</span></td>
                        <td className="px-5 py-3.5"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyle[st]}`}>{st}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
