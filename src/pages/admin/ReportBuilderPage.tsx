import { useState } from 'react'
import { FileBarChart, Download, Play, ChevronDown } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

type Metric = 'grades' | 'attendance' | 'fees' | 'enrollment'

const metricLabels: Record<Metric, string> = {
  grades:     'Academic Grades',
  attendance: 'Attendance',
  fees:       'Fee Payments',
  enrollment: 'Enrollment',
}

const gradeRows = [
  { class: 'SS1A', subject: 'Mathematics',  avg: 78, pass: 92, fail: 8 },
  { class: 'SS1A', subject: 'Physics',       avg: 74, pass: 85, fail: 15 },
  { class: 'SS1B', subject: 'English',       avg: 81, pass: 94, fail: 6 },
  { class: 'SS2A', subject: 'Chemistry',     avg: 70, pass: 80, fail: 20 },
  { class: 'SS2B', subject: 'Economics',     avg: 83, pass: 96, fail: 4 },
  { class: 'SS3A', subject: 'Government',    avg: 76, pass: 88, fail: 12 },
]

const attendanceRows = [
  { class: 'SS1A', students: 42, present: 38, absent: 4,  rate: 90 },
  { class: 'SS1B', students: 40, present: 35, absent: 5,  rate: 87 },
  { class: 'SS2A', students: 38, present: 34, absent: 4,  rate: 89 },
  { class: 'SS2B', students: 44, present: 39, absent: 5,  rate: 88 },
  { class: 'SS3A', students: 36, present: 32, absent: 4,  rate: 88 },
  { class: 'SS3B', students: 38, present: 36, absent: 2,  rate: 94 },
]

const feeRows = [
  { name: 'Amara Osei',       class: 'SS1A', term1: 'Paid', term2: 'Paid',    term3: 'Pending' },
  { name: 'Kofi Asante',      class: 'SS1B', term1: 'Paid', term2: 'Pending', term3: 'Pending' },
  { name: 'Yetunde Adesanya', class: 'SS2A', term1: 'Paid', term2: 'Paid',    term3: 'Paid'    },
  { name: 'James Owusu',      class: 'SS2B', term1: 'Paid', term2: 'Paid',    term3: 'Pending' },
  { name: 'Fatima Al-Rashid', class: 'SS3A', term1: 'Paid', term2: 'Paid',    term3: 'Paid'    },
]

const enrollmentRows = [
  { class: 'SS1A', boys: 22, girls: 20, total: 42, new: 5 },
  { class: 'SS1B', boys: 18, girls: 22, total: 40, new: 3 },
  { class: 'SS2A', boys: 20, girls: 18, total: 38, new: 0 },
  { class: 'SS2B', boys: 24, girls: 20, total: 44, new: 0 },
  { class: 'SS3A', boys: 16, girls: 20, total: 36, new: 0 },
]

function feeStyle(val: string) {
  return val === 'Paid'
    ? 'bg-green-50 text-green-700'
    : 'bg-amber-50 text-amber-700'
}

export default function ReportBuilderPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [metric,    setMetric]    = useState<Metric>('grades')
  const [classFilter, setClass]   = useState('All')
  const [termFilter,  setTerm]    = useState('2025/2026')
  const [generated,   setGenerated] = useState(true)

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Academic year */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1 block">Academic Year</label>
              <div className="relative">
                <select
                  value={termFilter}
                  onChange={e => { setTerm(e.target.value); setGenerated(false) }}
                  className="w-full h-10 pl-3 pr-8 border border-black/20 rounded-card text-sm outline-none focus:border-primary appearance-none"
                >
                  {['2025/2026', '2024/2025', '2023/2024'].map(t => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>

            {/* Class */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1 block">Class</label>
              <div className="relative">
                <select
                  value={classFilter}
                  onChange={e => { setClass(e.target.value); setGenerated(false) }}
                  className="w-full h-10 pl-3 pr-8 border border-black/20 rounded-card text-sm outline-none focus:border-primary appearance-none"
                >
                  {['All', 'SS1A', 'SS1B', 'SS2A', 'SS2B', 'SS3A', 'SS3B'].map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>

            {/* Generate */}
            <div className="flex flex-col justify-end">
              <button
                onClick={() => setGenerated(true)}
                className="flex items-center justify-center gap-2 h-10 w-full bg-primary text-white text-sm font-semibold rounded-card hover:bg-primary-deep transition-colors"
              >
                <Play size={13} /> Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* Report output */}
        {generated && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/6">
              <div>
                <p className="text-sm font-bold text-foreground">{metricLabels[metric]} Report</p>
                <p className="text-xs text-muted mt-0.5">{termFilter} · {classFilter === 'All' ? 'All Classes' : classFilter}</p>
              </div>
              <button
                onClick={() => {
                  let csv = ''
                  if (metric === 'grades') {
                    csv = 'Class,Subject,Avg Score,Pass Rate %,Fail Rate %\n' + gradeRows.filter(r => classFilter === 'All' || r.class === classFilter).map(r => `${r.class},${r.subject},${r.avg},${r.pass},${r.fail}`).join('\n')
                  } else if (metric === 'attendance') {
                    csv = 'Class,Total Students,Present,Absent,Rate %\n' + attendanceRows.filter(r => classFilter === 'All' || r.class === classFilter).map(r => `${r.class},${r.students},${r.present},${r.absent},${r.rate}`).join('\n')
                  } else if (metric === 'fees') {
                    csv = 'Student,Class,Term 1,Term 2,Term 3\n' + feeRows.filter(r => classFilter === 'All' || r.class === classFilter).map(r => `${r.name},${r.class},${r.term1},${r.term2},${r.term3}`).join('\n')
                  } else {
                    csv = 'Class,Boys,Girls,Total,New Students\n' + enrollmentRows.filter(r => classFilter === 'All' || r.class === classFilter).map(r => `${r.class},${r.boys},${r.girls},${r.total},${r.new}`).join('\n')
                  }
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = `${metric}_report_${termFilter.replace('/', '-')}.csv`; a.click(); URL.revokeObjectURL(url)
                }}
                className="flex items-center gap-2 h-9 px-4 bg-primary text-white text-xs font-semibold rounded-pill hover:bg-primary-deep transition-colors"
              >
                <Download size={13} /> Export CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              {metric === 'grades' && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/6 bg-canvas/50">
                      {['Class', 'Subject', 'Avg Score', 'Pass Rate %', 'Fail Rate %', 'Rating'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gradeRows.filter(r => classFilter === 'All' || r.class === classFilter).map((r, i) => (
                      <tr key={i} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                        <td className="px-5 py-3 font-semibold text-foreground">{r.class}</td>
                        <td className="px-5 py-3 text-foreground">{r.subject}</td>
                        <td className="px-5 py-3 font-bold text-primary">{r.avg}%</td>
                        <td className="px-5 py-3 text-green-700">{r.pass}%</td>
                        <td className="px-5 py-3 text-red-600">{r.fail}%</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-xs ${r.avg >= 80 ? 'bg-green-50 text-green-700' : r.avg >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                            {r.avg >= 80 ? 'Good' : r.avg >= 70 ? 'Average' : 'Needs Work'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {metric === 'attendance' && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/6 bg-canvas/50">
                      {['Class', 'Total Students', 'Present', 'Absent', 'Rate'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRows.filter(r => classFilter === 'All' || r.class === classFilter).map((r, i) => (
                      <tr key={i} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                        <td className="px-5 py-3 font-semibold text-foreground">{r.class}</td>
                        <td className="px-5 py-3 text-foreground">{r.students}</td>
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
              )}

              {metric === 'fees' && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/6 bg-canvas/50">
                      {['Student', 'Class', 'Term 1', 'Term 2', 'Term 3'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {feeRows.filter(r => classFilter === 'All' || r.class === classFilter).map((r, i) => (
                      <tr key={i} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                        <td className="px-5 py-3 font-semibold text-foreground">{r.name}</td>
                        <td className="px-5 py-3 text-muted">{r.class}</td>
                        {[r.term1, r.term2, r.term3].map((t, ti) => (
                          <td key={ti} className="px-5 py-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-xs ${feeStyle(t)}`}>{t}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {metric === 'enrollment' && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/6 bg-canvas/50">
                      {['Class', 'Boys', 'Girls', 'Total', 'New Students'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {enrollmentRows.filter(r => classFilter === 'All' || r.class === classFilter).map((r, i) => (
                      <tr key={i} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                        <td className="px-5 py-3 font-semibold text-foreground">{r.class}</td>
                        <td className="px-5 py-3 text-foreground">{r.boys}</td>
                        <td className="px-5 py-3 text-foreground">{r.girls}</td>
                        <td className="px-5 py-3 font-bold text-primary">{r.total}</td>
                        <td className="px-5 py-3">
                          {r.new > 0 ? (
                            <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">+{r.new}</span>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
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
