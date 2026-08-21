import { useState, useEffect } from 'react'
import { Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

type Status = 'present' | 'absent' | 'late' | 'excused'

interface AttendRow {
  id:       string
  date:     string
  student:  string
  class:    string
  status:   Status
}

const STATUS_META: { [K in Status]: { label: string; color: string; Icon: typeof CheckCircle2 } } = {
  present: { label: 'Present', color: 'text-green-600 bg-green-50',  Icon: CheckCircle2 },
  absent:  { label: 'Absent',  color: 'text-red-500 bg-red-50',     Icon: XCircle       },
  late:    { label: 'Late',    color: 'text-amber-600 bg-amber-50', Icon: Clock         },
  excused: { label: 'Excused', color: 'text-muted bg-canvas',       Icon: Calendar      },
}

const db = supabase as unknown as { from: (t: string) => any }

export default function AttendanceHistoryPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [records,  setRecords]  = useState<AttendRow[]>([])
  const [filter,   setFilter]   = useState<Status | 'all'>('all')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    setLoading(true)
    const schoolId = profile!.school_id!

    // Fetch teacher's class enrollments to scope attendance
    const ceRes = await db.from('teacher_assignments')
      .select('class_id')
      .eq('teacher_id', profile!.id)
      .eq('school_id', schoolId)
    const classIds = ((ceRes.data ?? []) as { class_id: string }[]).map(r => r.class_id)

    if (classIds.length === 0) { setLoading(false); return }

    const { data } = await supabase
      .from('attendance_records')
      .select('id, date, status, student_id, class_id')
      .in('class_id', classIds)
      .eq('school_id', schoolId)
      .order('date', { ascending: false })
      .limit(100)

    if (!data || data.length === 0) { setLoading(false); return }

    // Batch fetch student names
    const studentIds = [...new Set(data.map((r: any) => r.student_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds)
    const nameMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.full_name ?? 'Unknown']))

    // Batch fetch class names
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name')
      .in('id', classIds)
    const classMap = Object.fromEntries((classes ?? []).map((c: any) => [c.id, c.name ?? 'Class']))

    setRecords((data as any[]).map((r: any) => ({
      id:      r.id,
      date:    r.date,
      student: nameMap[r.student_id] ?? 'Unknown',
      class:   classMap[r.class_id]  ?? 'Unknown',
      status:  (r.status ?? 'present') as Status,
    })))
    setLoading(false)
  }

  const visible = filter === 'all' ? records : records.filter(r => r.status === filter)

  const counts = {
    present: records.filter(r => r.status === 'present').length,
    absent:  records.filter(r => r.status === 'absent').length,
    late:    records.filter(r => r.status === 'late').length,
    excused: records.filter(r => r.status === 'excused').length,
  }

  return (
    <DashboardLayout
      activePage="attendance"
      onNavigate={onNavigate}
      title="Attendance History"
      subtitle="Full log of all recorded attendance"
      user={sidebarUser}
    >
      <div className="max-w-[860px] flex flex-col gap-5">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.entries(counts) as [Status, number][]).map(([s, n]) => {
            const { label, color } = STATUS_META[s]
            return (
              <div key={s} className="bg-surface rounded-card shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{n}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
              </div>
            )
          })}
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'present', 'absent', 'late', 'excused'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`h-8 px-3.5 rounded-full text-xs font-semibold capitalize transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-foreground shadow-sm'}`}>
              {f === 'all' ? 'All records' : f}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-sm text-muted">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <Calendar size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No records found.</p>
          </div>
        ) : (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/6 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-muted">Date</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted">Student</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted">Class</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/4">
                {visible.map(r => {
                  const { label, color, Icon } = STATUS_META[r.status]
                  return (
                    <tr key={r.id} className="hover:bg-canvas/40 transition-colors">
                      <td className="px-5 py-3 text-xs text-muted whitespace-nowrap">
                        {new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3 font-medium text-foreground">{r.student}</td>
                      <td className="px-5 py-3 text-xs text-muted">{r.class}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${color}`}>
                          <Icon size={10} /> {label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
