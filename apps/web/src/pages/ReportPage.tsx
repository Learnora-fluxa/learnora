import { useEffect, useMemo, useState } from 'react'
import { Download, FileBarChart, Plus, Clock, ChevronRight, ExternalLink } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

type ReportRow = {
  id: string
  name: string
  type: string
  date: string | null
  status: 'Published' | 'Draft'
  pdfUrl: string | null
  studentName: string
  termName: string
}

const statusStyle: Record<ReportRow['status'], string> = {
  Published: 'bg-green-50 text-green-700',
  Draft: 'bg-amber-50 text-amber-700',
}

const templates = [
  { label: 'Progress Report', icon: '📊' },
  { label: 'Attendance', icon: '📋' },
  { label: 'Grade Summary', icon: '🎓' },
  { label: 'Subject Report', icon: '📚' },
]

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function estimateSize(url: string | null) {
  if (!url) return '—'
  return 'PDF'
}

export default function ReportPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile?.id) void loadReports()
  }, [profile?.id])

  async function loadReports() {
    setLoading(true)
    setError('')

    const teacherId = profile!.id

    const { data: teacherAssignments, error: teacherAssignmentsError } = await supabase
      .from('teacher_assignments')
      .select('class_id')
      .eq('teacher_id', teacherId)

    if (teacherAssignmentsError) {
      logSupabaseError('ReportPage/teacherAssignments', teacherAssignmentsError)
      setError(teacherAssignmentsError.message)
      setLoading(false)
      return
    }

    const classIds = [...new Set((teacherAssignments ?? []).map((row: { class_id: string }) => row.class_id))]
    if (classIds.length === 0) {
      setReports([])
      setLoading(false)
      return
    }

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('class_enrollments')
      .select('student_id')
      .in('class_id', classIds)

    if (enrollmentsError) {
      logSupabaseError('ReportPage/enrollments', enrollmentsError)
      setError(enrollmentsError.message)
      setLoading(false)
      return
    }

    const studentIds = [...new Set((enrollments ?? []).map((row: { student_id: string }) => row.student_id))]
    if (studentIds.length === 0) {
      setReports([])
      setLoading(false)
      return
    }

    const { data, error: reportsError } = await supabase
      .from('report_cards')
      .select('id, status, pdf_url, published_at, generated_at, student_id, profiles!student_id(full_name), terms(name)')
      .in('student_id', studentIds)
      .eq('school_id', profile!.school_id!)
      .order('generated_at', { ascending: false })

    if (reportsError) {
      logSupabaseError('ReportPage/reportCards', reportsError)
      setError(reportsError.message)
      setLoading(false)
      return
    }

    const rows = (data ?? []) as unknown as Array<{
      id: string
      status: string | null
      pdf_url: string | null
      published_at: string | null
      generated_at: string | null
      student_id: string
      profiles: { full_name: string | null } | null
      terms: { name: string | null } | null
    }>

    setReports(rows.map((row) => {
      const studentName = row.profiles?.full_name ?? 'Student'
      const termName = row.terms?.name ?? 'Current Term'
      const isPublished = row.status === 'published'

      return {
        id: row.id,
        name: `${studentName} ${termName} Report Card`,
        type: 'Report Card',
        date: row.published_at ?? row.generated_at,
        status: isPublished ? 'Published' : 'Draft',
        pdfUrl: row.pdf_url,
        studentName,
        termName,
      }
    }))
    setLoading(false)
  }

  const summary = useMemo(() => {
    const published = reports.filter((report) => report.status === 'Published').length
    const drafts = reports.filter((report) => report.status === 'Draft').length
    return {
      total: reports.length,
      published,
      drafts,
    }
  }, [reports])

  function exportPage() {
    window.print()
  }

  return (
    <DashboardLayout
      activePage="reports"
      onNavigate={onNavigate}
      title="Reports Center"
      subtitle="View and export report cards for students in your classes"
      nav={teacherNav}
      user={sidebarUser}
    >
      <div className="flex flex-col gap-6 max-w-[1200px]">
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h2 className="text-xl font-bold text-foreground mb-1">Report Management</h2>
          <p className="text-sm text-muted mb-6 max-w-xl">
            Review generated report cards for students in your assigned classes and export available documents.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('teacher-dashboard')}
              className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary"
            >
              <Plus size={16} />
              Back to Dashboard
            </button>
            <button
              onClick={exportPage}
              className="flex items-center gap-2 h-11 px-6 border border-muted text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors"
            >
              <Download size={16} />
              Export View
            </button>
            <button
              onClick={() => onNavigate('teacher-calendar')}
              className="flex items-center gap-2 h-11 px-6 border border-muted text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors"
            >
              <Clock size={16} />
              Open Calendar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Reports', value: loading ? '…' : String(summary.total), sub: 'Visible to you', color: 'text-foreground' },
            { label: 'Published', value: loading ? '…' : String(summary.published), sub: 'Ready to download', color: 'text-green-600' },
            { label: 'Drafts', value: loading ? '…' : String(summary.drafts), sub: 'Not yet published', color: 'text-amber-600' },
            { label: 'Students Covered', value: loading ? '…' : String(new Set(reports.map((report) => report.studentName)).size), sub: 'Across your classes', color: 'text-primary' },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface rounded-card shadow-sm p-5">
              <p className="text-sm text-muted">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="bg-surface rounded-card shadow-sm p-6">
          <h3 className="text-base font-bold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {templates.map((template) => (
              <button
                key={template.label}
                onClick={() => onNavigate('teacher-dashboard')}
                className="flex items-center gap-3 p-4 border border-black/8 rounded-card hover:border-primary hover:bg-primary/4 transition-colors text-left group"
              >
                <span className="text-2xl select-none">{template.icon}</span>
                <span className="flex-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {template.label}
                </span>
                <ChevronRight size={14} className="text-muted group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-black/6">
            <div className="flex items-center gap-2">
              <FileBarChart size={18} className="text-primary" />
              <h3 className="text-base font-bold text-foreground">Recent Reports</h3>
            </div>
          </div>

          {error && (
            <div className="px-6 py-4 text-sm text-red-500 border-b border-black/6">{error}</div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/6 bg-canvas/40">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Report Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">File</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted">Loading reports…</td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted">No report cards found for your students yet.</td>
                  </tr>
                ) : reports.map((report) => (
                  <tr key={report.id} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{report.name}</td>
                    <td className="px-6 py-4 text-muted">{report.type}</td>
                    <td className="px-6 py-4 text-muted">{fmtDate(report.date)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-xs ${statusStyle[report.status]}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted">{estimateSize(report.pdfUrl)}</td>
                    <td className="px-6 py-4">
                      {report.pdfUrl ? (
                        <a
                          href={report.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          <ExternalLink size={12} />
                          Open
                        </a>
                      ) : (
                        <span className="text-xs text-muted">No file</span>
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
