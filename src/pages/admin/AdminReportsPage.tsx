import { useState, useEffect } from 'react'
import { FileBarChart, Users, TrendingUp, BookOpen, Download, Calendar, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }
type ReportType = 'attendance' | 'academic' | 'finance' | 'enrollment'

const reportTypes: { id: ReportType; label: string; description: string; Icon: typeof FileBarChart; color: string }[] = [
  { id: 'attendance', label: 'Attendance Report',    description: 'Daily, weekly, and term-level attendance by class and student.', Icon: Users,        color: 'bg-primary/10 text-primary'         },
  { id: 'academic',   label: 'Academic Performance', description: 'GPA trends, subject scores, and pass/fail breakdown.',           Icon: BookOpen,     color: 'bg-accent-mint/10 text-accent-mint' },
  { id: 'finance',    label: 'Finance Report',        description: 'Fee collection, outstanding invoices, and payment history.',     Icon: TrendingUp,   color: 'bg-amber-50 text-amber-600'         },
  { id: 'enrollment', label: 'Enrollment Report',     description: 'Student enrollment by class, gender, and entry term.',          Icon: FileBarChart, color: 'bg-red-50 text-red-500'             },
]

interface AttRow { className: string; total: number; present: number; absent: number; rate: number }
interface AcaRow { className: string; subject: string; avg: number; passRate: number; failRate: number }
interface FinRow { student: string; className: string; paid: number; unpaid: number }
interface EnrRow { className: string; total: number }
type ReportData = AttRow[] | AcaRow[] | FinRow[] | EnrRow[]

export default function AdminReportsPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [selected,   setSelected]   = useState<ReportType>('attendance')
  const [term,       setTerm]       = useState('2025/2026')
  const [cls,        setCls]        = useState('All Classes')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated,  setGenerated]  = useState(false)
  const [reportData, setReportData] = useState<ReportData>([])
  const [classes,    setClasses]    = useState<string[]>(['All Classes'])

  useEffect(() => {
    if (!profile?.school_id) return
    supabase.from('classes').select('name').eq('school_id', profile.school_id).order('name')
      .then(({ data }) => setClasses(['All Classes', ...(data ?? []).map((c: { name: string }) => c.name)]))
  }, [profile?.school_id])

  async function generate() {
    if (!profile?.school_id) return
    setGenerating(true)
    setGenerated(false)
    const schoolId = profile.school_id

    try {
      if (selected === 'attendance') {
        const { data: att } = await supabase
          .from('attendance_records')
          .select('status, class_enrollments!inner(classes!inner(name))')
          .eq('school_id', schoolId) as unknown as {
            data: { status: string; class_enrollments: { classes: { name: string } } }[] | null
          }
        const byClass: Record<string, { present: number; absent: number; total: number }> = {}
        for (const a of (att ?? [])) {
          const cn = a.class_enrollments?.classes?.name ?? '—'
          if (cls !== 'All Classes' && cn !== cls) continue
          if (!byClass[cn]) byClass[cn] = { present: 0, absent: 0, total: 0 }
          if (a.status !== 'holiday') byClass[cn].total++
          if (a.status === 'present') byClass[cn].present++
          if (a.status === 'absent')  byClass[cn].absent++
        }
        setReportData(Object.entries(byClass).map(([cn, v]) => ({
          className: cn, total: v.total, present: v.present, absent: v.absent,
          rate: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
        })))
      }

      else if (selected === 'academic') {
        const { data: gs } = await supabase
          .from('grade_summaries')
          .select('average_score, subjects(name), class_enrollments!inner(classes!inner(name))')
          .eq('school_id', schoolId) as unknown as {
            data: { average_score: number | null; subjects: { name: string } | null; class_enrollments: { classes: { name: string } } }[] | null
          }
        const byKey: Record<string, { sum: number; count: number; pass: number; fail: number }> = {}
        for (const g of (gs ?? [])) {
          const cn = g.class_enrollments?.classes?.name ?? '—'
          const sub = g.subjects?.name ?? '—'
          if (cls !== 'All Classes' && cn !== cls) continue
          const key = `${cn}||${sub}`
          if (!byKey[key]) byKey[key] = { sum: 0, count: 0, pass: 0, fail: 0 }
          const score = g.average_score ?? 0
          byKey[key].sum += score; byKey[key].count++
          if (score >= 50) byKey[key].pass++; else byKey[key].fail++
        }
        setReportData(Object.entries(byKey).map(([key, v]) => {
          const [cn, sub] = key.split('||')
          const avg = v.count > 0 ? Math.round(v.sum / v.count) : 0
          return { className: cn, subject: sub, avg, passRate: Math.round((v.pass / v.count) * 100), failRate: Math.round((v.fail / v.count) * 100) }
        }))
      }

      else if (selected === 'finance') {
        const { data: inv } = await supabase
          .from('invoices')
          .select('amount, status, student_id, profiles!inner(full_name)')
          .eq('school_id', schoolId) as unknown as {
            data: { amount: string | number; status: string; student_id: string; profiles: { full_name: string | null } }[] | null
          }
        const byStudent: Record<string, { paid: number; unpaid: number }> = {}
        for (const i of (inv ?? [])) {
          const name = i.profiles?.full_name ?? i.student_id
          if (!byStudent[name]) byStudent[name] = { paid: 0, unpaid: 0 }
          const amt = parseFloat(String(i.amount))
          if (i.status === 'paid') byStudent[name].paid += amt; else byStudent[name].unpaid += amt
        }
        setReportData(Object.entries(byStudent).map(([student, v]) => ({ student, className: '—', ...v })))
      }

      else {
        const { data: ce } = await supabase
          .from('class_enrollments')
          .select('class_id, classes!inner(name, school_id)')
          .eq('classes.school_id', schoolId) as unknown as {
            data: { class_id: string; classes: { name: string; school_id: string } }[] | null
          }
        const byClass: Record<string, number> = {}
        for (const e of (ce ?? [])) {
          const cn = e.classes?.name ?? '—'
          if (cls !== 'All Classes' && cn !== cls) continue
          byClass[cn] = (byClass[cn] ?? 0) + 1
        }
        setReportData(Object.entries(byClass).map(([cn, total]) => ({ className: cn, total })))
      }
    } finally {
      setGenerating(false)
      setGenerated(true)
    }
  }

  function downloadCSV() {
    let csv = ''
    if (selected === 'attendance') {
      csv = 'Class,Total,Present,Absent,Rate\n' + (reportData as AttRow[]).map(r => `${r.className},${r.total},${r.present},${r.absent},${r.rate}%`).join('\n')
    } else if (selected === 'academic') {
      csv = 'Class,Subject,Avg Score,Pass Rate,Fail Rate\n' + (reportData as AcaRow[]).map(r => `${r.className},${r.subject},${r.avg}%,${r.passRate}%,${r.failRate}%`).join('\n')
    } else if (selected === 'finance') {
      csv = 'Student,Paid (NGN),Outstanding (NGN)\n' + (reportData as FinRow[]).map(r => `${r.student},${r.paid},${r.unpaid}`).join('\n')
    } else {
      csv = 'Class,Total Students\n' + (reportData as EnrRow[]).map(r => `${r.className},${r.total}`).join('\n')
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${selected}_report_${term.replace('/', '-')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const reportLabel = reportTypes.find(r => r.id === selected)?.label ?? ''

  return (
    <DashboardLayout
      activePage="admin-reports"
      onNavigate={onNavigate}
      title="Reports"
      subtitle="Generate and download school reports"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-6 max-w-[900px]">

        {/* Report type selector */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h2 className="text-sm font-bold text-foreground mb-4">Select Report Type</h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {reportTypes.map(({ id, label, description, Icon, color }) => (
              <button
                key={id}
                onClick={() => { setSelected(id); setGenerated(false) }}
                className={`flex flex-col gap-3 p-4 rounded-card border-2 text-left transition-all ${
                  selected === id ? 'border-primary bg-primary/4' : 'border-black/8 hover:border-black/20'
                }`}
              >
                <div className={`size-10 rounded-card ${color} flex items-center justify-center`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{description}</p>
                </div>
                {selected === id && <CheckCircle2 size={16} className="text-primary self-end" />}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h2 className="text-sm font-bold text-foreground mb-4">Configure Report</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Academic Year</label>
              <div className="relative">
                <select value={term} onChange={e => { setTerm(e.target.value); setGenerated(false) }}
                  className="w-full h-11 pl-4 pr-10 border border-black/20 rounded-card text-sm text-foreground bg-white outline-none focus:border-primary appearance-none">
                  {['2025/2026', '2024/2025', '2023/2024'].map(t => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibond text-muted mb-1.5">Class</label>
              <div className="relative">
                <select value={cls} onChange={e => { setCls(e.target.value); setGenerated(false) }}
                  className="w-full h-11 pl-4 pr-10 border border-black/20 rounded-card text-sm text-foreground bg-white outline-none focus:border-primary appearance-none">
                  {classes.map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Date From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full h-11 pl-4 pr-4 border border-black/20 rounded-card text-sm text-foreground bg-white outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Date To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full h-11 pl-4 pr-4 border border-black/20 rounded-card text-sm text-foreground bg-white outline-none focus:border-primary" />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-black/6">
            <button
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Calendar size={15} />}
              {generating ? 'Generating…' : 'Generate Report'}
            </button>
            {generated && (
              <>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 h-11 px-6 border border-primary text-primary text-sm font-semibold rounded-pill hover:bg-primary/8 transition-colors"
                >
                  <Download size={15} /> Download PDF
                </button>
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 h-11 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-black/40 transition-colors"
                >
                  <Download size={15} /> Export CSV
                </button>
              </>
            )}
          </div>
        </div>

        {/* Report output */}
        {generated && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/6">
              <div>
                <p className="text-base font-bold text-foreground">{reportLabel}</p>
                <p className="text-xs text-muted mt-0.5">{term} · {cls}</p>
              </div>
              <span className="text-xs text-muted">{reportData.length} row{reportData.length !== 1 ? 's' : ''}</span>
            </div>

            {reportData.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm font-semibold text-foreground mb-1">No data found</p>
                <p className="text-xs text-muted">Try adjusting your filters or check that records exist for the selected period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {selected === 'attendance' && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-black/6 bg-canvas/40">
                        {['Class', 'Total Days', 'Present', 'Absent', 'Rate'].map(h => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData as AttRow[]).map((r, i) => (
                        <tr key={i} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                          <td className="px-6 py-3.5 font-semibold text-foreground">{r.className}</td>
                          <td className="px-6 py-3.5 text-foreground">{r.total}</td>
                          <td className="px-6 py-3.5 text-green-700 font-medium">{r.present}</td>
                          <td className="px-6 py-3.5 text-red-600">{r.absent}</td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 bg-black/8 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${r.rate}%` }} />
                              </div>
                              <span className={`text-xs font-bold ${r.rate >= 80 ? 'text-green-700' : r.rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{r.rate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {selected === 'academic' && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-black/6 bg-canvas/40">
                        {['Class', 'Subject', 'Avg Score', 'Pass Rate', 'Fail Rate', 'Rating'].map(h => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData as AcaRow[]).map((r, i) => (
                        <tr key={i} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                          <td className="px-6 py-3.5 font-semibold text-foreground">{r.className}</td>
                          <td className="px-6 py-3.5 text-foreground">{r.subject}</td>
                          <td className="px-6 py-3.5 font-bold text-primary">{r.avg}%</td>
                          <td className="px-6 py-3.5 text-green-700">{r.passRate}%</td>
                          <td className="px-6 py-3.5 text-red-600">{r.failRate}%</td>
                          <td className="px-6 py-3.5">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-xs ${r.avg >= 80 ? 'bg-green-50 text-green-700' : r.avg >= 65 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                              {r.avg >= 80 ? 'Good' : r.avg >= 65 ? 'Average' : 'Needs Work'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {selected === 'finance' && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-black/6 bg-canvas/40">
                        {['Student', 'Paid (₦)', 'Outstanding (₦)', 'Status'].map(h => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData as FinRow[]).map((r, i) => (
                        <tr key={i} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                          <td className="px-6 py-3.5 font-semibold text-foreground">{r.student}</td>
                          <td className="px-6 py-3.5 text-green-700 font-medium">₦{r.paid.toLocaleString()}</td>
                          <td className="px-6 py-3.5 text-red-600">₦{r.unpaid.toLocaleString()}</td>
                          <td className="px-6 py-3.5">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-xs ${r.unpaid === 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                              {r.unpaid === 0 ? 'Fully Paid' : 'Outstanding'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {selected === 'enrollment' && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-black/6 bg-canvas/40">
                        {['Class', 'Total Students'].map(h => (
                          <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData as EnrRow[]).map((r, i) => (
                        <tr key={i} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                          <td className="px-6 py-3.5 font-semibold text-foreground">{r.className}</td>
                          <td className="px-6 py-3.5 font-bold text-primary">{r.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
