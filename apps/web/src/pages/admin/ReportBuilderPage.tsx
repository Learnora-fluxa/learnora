import { useState, useEffect } from 'react'
import { FileBarChart, Download, Play, ChevronDown } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type Metric = 'grades' | 'attendance' | 'fees' | 'enrollment'

const metricLabels: Record<Metric, string> = {
  grades:     'Academic Grades',
  attendance: 'Attendance',
  fees:       'Fee Payments',
  enrollment: 'Enrollment',
}

interface GradeRow      { subject: string; avgScore: number; studentCount: number }
interface AttendanceRow { className: string; classId: string; total: number; present: number; absent: number; rate: number }
interface FeeRow        { name: string; className: string; amount: number; paidAmount: number; status: string }
interface EnrollmentRow { className: string; total: number }

type AnyRow = GradeRow | AttendanceRow | FeeRow | EnrollmentRow

function feeStyle(status: string) {
  return status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
}

export default function ReportBuilderPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const schoolId = profile?.school_id

  const [metric,          setMetric]          = useState<Metric>('grades')
  const [classes,         setClasses]         = useState<{ id: string; name: string }[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [rows,            setRows]            = useState<AnyRow[]>([])
  const [generated,       setGenerated]       = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')

  useEffect(() => { if (schoolId) loadClasses() }, [schoolId])

  async function loadClasses() {
    const { data, error: err } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', schoolId!)
      .order('name')
    if (err) { logSupabaseError('ReportBuilder/classes', err); return }
    setClasses((data ?? []) as { id: string; name: string }[])
  }

  async function generateReport() {
    if (!schoolId) return
    setLoading(true)
    setError('')
    setGenerated(false)

    if (metric === 'grades') {
      // Get grade_summaries per subject; optionally filter by class via class_enrollments
      let studentIds: string[] | null = null
      if (selectedClassId) {
        const { data: enroll } = await supabase
          .from('class_enrollments')
          .select('student_id')
          .eq('class_id', selectedClassId)
        studentIds = (enroll ?? []).map((r: { student_id: string }) => r.student_id)
        if (studentIds.length === 0) { setRows([]); setGenerated(true); setLoading(false); return }
      }

      let q = supabase
        .from('grade_summaries')
        .select('subject_id, average_score, subjects(name)')
        .eq('school_id', schoolId!)
      if (studentIds) q = q.in('student_id', studentIds)

      const { data, error: err } = await q
      if (err) { logSupabaseError('ReportBuilder/grades', err); setError(err.message); setLoading(false); return }

      type GRaw = { subject_id: string; average_score: number | null; subjects: { name: string } | null }
      const grouped: Record<string, { name: string; scores: number[] }> = {}
      for (const r of (data ?? []) as unknown as GRaw[]) {
        const name = r.subjects?.name ?? r.subject_id
        if (!grouped[name]) grouped[name] = { name, scores: [] }
        if (r.average_score != null) grouped[name].scores.push(r.average_score)
      }
      const gradeRows: GradeRow[] = Object.values(grouped).map(g => ({
        subject:      g.name,
        avgScore:     g.scores.length > 0 ? Math.round(g.scores.reduce((a, b) => a + b, 0) / g.scores.length) : 0,
        studentCount: g.scores.length,
      }))
      setRows(gradeRows)

    } else if (metric === 'attendance') {
      let q = supabase
        .from('attendance_records')
        .select('class_id, status, classes(name)')
        .eq('school_id', schoolId!)
      if (selectedClassId) q = q.eq('class_id', selectedClassId)

      const { data, error: err } = await q
      if (err) { logSupabaseError('ReportBuilder/attendance', err); setError(err.message); setLoading(false); return }

      type ARaw = { class_id: string; status: string; classes: { name: string } | null }
      const grouped: Record<string, { classId: string; name: string; present: number; absent: number; total: number }> = {}
      for (const r of (data ?? []) as unknown as ARaw[]) {
        const name = r.classes?.name ?? r.class_id
        if (!grouped[r.class_id]) grouped[r.class_id] = { classId: r.class_id, name, present: 0, absent: 0, total: 0 }
        grouped[r.class_id].total++
        if (r.status === 'present') grouped[r.class_id].present++
        else grouped[r.class_id].absent++
      }
      const attRows: AttendanceRow[] = Object.values(grouped).map(g => ({
        className: g.name,
        classId:   g.classId,
        total:     g.total,
        present:   g.present,
        absent:    g.absent,
        rate:      g.total > 0 ? Math.round((g.present / g.total) * 100) : 0,
      }))
      setRows(attRows)

    } else if (metric === 'fees') {
      let q = supabase
        .from('invoices')
        .select('student_id, amount, paid_amount, status, profiles!student_id(full_name, class_enrollments(classes(name)))')
        .eq('school_id', schoolId!)
      if (selectedClassId) {
        const { data: enroll } = await supabase
          .from('class_enrollments')
          .select('student_id')
          .eq('class_id', selectedClassId)
        const ids = (enroll ?? []).map((r: { student_id: string }) => r.student_id)
        if (ids.length > 0) q = q.in('student_id', ids)
        else { setRows([]); setGenerated(true); setLoading(false); return }
      }

      const { data, error: err } = await q.limit(100)
      if (err) { logSupabaseError('ReportBuilder/fees', err); setError(err.message); setLoading(false); return }

      type FRaw = {
        student_id: string
        amount: number
        paid_amount: number | null
        status: string
        profiles: { full_name: string | null; class_enrollments: { classes: { name: string } | null }[] } | null
      }
      const feeRows: FeeRow[] = ((data ?? []) as unknown as FRaw[]).map(r => ({
        name:       r.profiles?.full_name ?? '—',
        className:  r.profiles?.class_enrollments?.[0]?.classes?.name ?? '—',
        amount:     r.amount ?? 0,
        paidAmount: r.paid_amount ?? 0,
        status:     r.status ?? 'pending',
      }))
      setRows(feeRows)

    } else if (metric === 'enrollment') {
      let q = supabase
        .from('class_enrollments')
        .select('class_id, student_id, classes(name)')
      if (selectedClassId) q = q.eq('class_id', selectedClassId)
      // Filter by school via classes
      q = (q as ReturnType<typeof q['eq']>).eq('classes.school_id', schoolId!)

      // Simpler: get classes for school, then count enrollments per class
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId!)
        .then(r => r)

      const classIds = selectedClassId
        ? [selectedClassId]
        : (classData ?? []).map((c: { id: string }) => c.id)

      const classNameMap: Record<string, string> = {}
      for (const c of (classData ?? []) as { id: string; name: string }[]) {
        classNameMap[c.id] = c.name
      }

      const { data: enrollData, error: err } = await supabase
        .from('class_enrollments')
        .select('class_id, student_id')
        .in('class_id', classIds)
      if (err) { logSupabaseError('ReportBuilder/enrollment', err); setError(err.message); setLoading(false); return }

      const countMap: Record<string, number> = {}
      for (const e of (enrollData ?? []) as { class_id: string; student_id: string }[]) {
        countMap[e.class_id] = (countMap[e.class_id] ?? 0) + 1
      }
      const enrollRows: EnrollmentRow[] = Object.entries(countMap).map(([id, total]) => ({
        className: classNameMap[id] ?? id,
        total,
      }))
      setRows(enrollRows)
    }

    setGenerated(true)
    setLoading(false)
  }

  function exportCSV() {
    let csv = ''
    if (metric === 'grades') {
      csv = 'Subject,Avg Score,Students Graded\n' +
        (rows as GradeRow[]).map(r => `${r.subject},${r.avgScore},${r.studentCount}`).join('\n')
    } else if (metric === 'attendance') {
      csv = 'Class,Total Records,Present,Absent,Rate %\n' +
        (rows as AttendanceRow[]).map(r => `${r.className},${r.total},${r.present},${r.absent},${r.rate}`).join('\n')
    } else if (metric === 'fees') {
      csv = 'Student,Class,Amount,Paid,Status\n' +
        (rows as FeeRow[]).map(r => `${r.name},${r.className},${r.amount},${r.paidAmount},${r.status}`).join('\n')
    } else {
      csv = 'Class,Total Students\n' +
        (rows as EnrollmentRow[]).map(r => `${r.className},${r.total}`).join('\n')
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${metric}_report.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const selectedClassName = selectedClassId ? (classes.find(c => c.id === selectedClassId)?.name ?? 'Selected Class') : 'All Classes'

  return (
    <DashboardLayout
      activePage="admin-reports"
      onNavigate={onNavigate}
      title="Report Builder"
      subtitle="Build, filter, and export custom school reports"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-5 max-w-[1200px]">

        {/* Builder controls */}
        <div className="bg-surface rounded-card shadow-sm p-5 flex flex-col gap-4">
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileBarChart size={15} className="text-primary" /> Report Configuration
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Metric */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1 block">Report Type</label>
              <div className="relative">
                <select
                  value={metric}
                  onChange={e => { setMetric(e.target.value as Metric); setGenerated(false) }}
                  className="w-full h-10 pl-3 pr-8 border border-black/20 rounded-card text-sm outline-none focus:border-primary appearance-none"
                >
                  {(Object.entries(metricLabels) as [Metric, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>

            {/* Class */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1 block">Class</label>
              <div className="relative">
                <select
                  value={selectedClassId}
                  onChange={e => { setSelectedClassId(e.target.value); setGenerated(false) }}
                  className="w-full h-10 pl-3 pr-8 border border-black/20 rounded-card text-sm outline-none focus:border-primary appearance-none"
                >
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>

            {/* Generate */}
            <div className="flex flex-col justify-end">
              <button
                onClick={generateReport}
                disabled={loading}
                className="flex items-center justify-center gap-2 h-10 w-full bg-primary text-white text-sm font-semibold rounded-card hover:bg-primary-deep transition-colors disabled:opacity-60"
              >
                <Play size={13} /> {loading ? 'Generating…' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-card px-4 py-3">{error}</p>
        )}

        {/* Report output */}
        {generated && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/6">
              <div>
                <p className="text-sm font-bold text-foreground">{metricLabels[metric]} Report</p>
                <p className="text-xs text-muted mt-0.5">{selectedClassName} · {rows.length} row{rows.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={exportCSV}
                disabled={rows.length === 0}
                className="flex items-center gap-2 h-9 px-4 bg-primary text-white text-xs font-semibold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-50"
              >
                <Download size={13} /> Export CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              {rows.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted">No data found for the selected filters.</p>
              ) : metric === 'grades' ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/6 bg-canvas/50">
                      {['Subject', 'Avg Score', 'Students Graded', 'Rating'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(rows as GradeRow[]).map((r, i) => (
                      <tr key={i} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                        <td className="px-5 py-3 font-semibold text-foreground">{r.subject}</td>
                        <td className="px-5 py-3 font-bold text-primary">{r.avgScore}%</td>
                        <td className="px-5 py-3 text-muted">{r.studentCount}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-xs ${r.avgScore >= 80 ? 'bg-green-50 text-green-700' : r.avgScore >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                            {r.avgScore >= 80 ? 'Good' : r.avgScore >= 70 ? 'Average' : 'Needs Work'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : metric === 'attendance' ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/6 bg-canvas/50">
                      {['Class', 'Total Records', 'Present', 'Absent', 'Rate'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(rows as AttendanceRow[]).map((r, i) => (
                      <tr key={i} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                        <td className="px-5 py-3 font-semibold text-foreground">{r.className}</td>
                        <td className="px-5 py-3 text-foreground">{r.total}</td>
                        <td className="px-5 py-3 text-green-700 font-semibold">{r.present}</td>
                        <td className="px-5 py-3 text-red-600">{r.absent}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 bg-black/8 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${r.rate}%` }} />
                            </div>
                            <span className="text-xs font-bold text-primary">{r.rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : metric === 'fees' ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/6 bg-canvas/50">
                      {['Student', 'Class', 'Total (₦)', 'Paid (₦)', 'Status'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(rows as FeeRow[]).map((r, i) => (
                      <tr key={i} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                        <td className="px-5 py-3 font-semibold text-foreground">{r.name}</td>
                        <td className="px-5 py-3 text-muted">{r.className}</td>
                        <td className="px-5 py-3 text-foreground">{r.amount.toLocaleString('en-NG')}</td>
                        <td className="px-5 py-3 text-foreground">{r.paidAmount.toLocaleString('en-NG')}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-xs ${feeStyle(r.status)}`}>
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/6 bg-canvas/50">
                      {['Class', 'Total Students'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(rows as EnrollmentRow[]).map((r, i) => (
                      <tr key={i} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                        <td className="px-5 py-3 font-semibold text-foreground">{r.className}</td>
                        <td className="px-5 py-3 font-bold text-primary">{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
