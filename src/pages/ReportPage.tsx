import { Plus, Download, Clock, ChevronRight, FileBarChart } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

const recentReports = [
  { name: 'Term 2 Academic Progress', type: 'Progress Report', date: 'May 28, 2026', status: 'Published', size: '1.2 MB' },
  { name: 'SS1A Midterm Results',     type: 'Exam Report',     date: 'May 15, 2026', status: 'Published', size: '842 KB' },
  { name: 'Attendance Summary – May', type: 'Attendance',      date: 'May 31, 2026', status: 'Draft',     size: '318 KB' },
  { name: 'Physics Lab Assessment',   type: 'Subject Report',  date: 'Jun 1, 2026',  status: 'Published', size: '560 KB' },
  { name: 'End-of-Term Gradebook',    type: 'Grade Report',    date: 'Jun 5, 2026',  status: 'Scheduled', size: '—'      },
]

const statusStyle: Record<string, string> = {
  Published: 'bg-green-50 text-green-700',
  Draft:     'bg-amber-50 text-amber-700',
  Scheduled: 'bg-primary/10 text-primary',
}

const templates = [
  { label: 'Progress Report',  icon: '📊' },
  { label: 'Exam Results',     icon: '📝' },
  { label: 'Attendance',       icon: '📋' },
  { label: 'Grade Summary',    icon: '🎓' },
  { label: 'Subject Report',   icon: '📚' },
  { label: 'Custom Report',    icon: '⚙️' },
]

export default function ReportPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  function printPage() { window.print() }

  return (
    <DashboardLayout
      activePage="reports"
      onNavigate={onNavigate}
      title="Reports Center"
      subtitle="Generate, export and schedule academic reports"
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-6 max-w-[1200px]">

        {/* Action bar */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h2 className="text-xl font-bold text-foreground mb-1">Report Management</h2>
          <p className="text-sm text-muted mb-6 max-w-xl">
            Create and distribute academic reports for students, parents and administrators.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onNavigate('report-builder')} className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary">
              <Plus size={16} />
              Generate Report
            </button>
            <button onClick={printPage} className="flex items-center gap-2 h-11 px-6 border border-muted text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
              <Download size={16} />
              Export Reports
            </button>
            <button onClick={() => onNavigate('teacher-calendar')} className="flex items-center gap-2 h-11 px-6 border border-muted text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
              <Clock size={16} />
              Schedule Report
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Reports', value: '24', sub: 'This term',   color: 'text-foreground' },
            { label: 'Published',     value: '18', sub: 'Distributed', color: 'text-green-600'  },
            { label: 'Drafts',        value: '3',  sub: 'In progress', color: 'text-amber-600'  },
            { label: 'Scheduled',     value: '3',  sub: 'Upcoming',    color: 'text-primary'    },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-card shadow-sm p-5">
              <p className="text-sm text-muted">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Quick generate templates */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h3 className="text-base font-bold text-foreground mb-4">Quick Generate</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {templates.map(tpl => (
              <button
                key={tpl.label}
                onClick={() => onNavigate('report-builder')}
                className="flex items-center gap-3 p-4 border border-black/8 rounded-card hover:border-primary hover:bg-primary/4 transition-colors text-left group"
              >
                <span className="text-2xl select-none">{tpl.icon}</span>
                <span className="flex-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {tpl.label}
                </span>
                <ChevronRight size={14} className="text-muted group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent reports table */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-black/6">
            <div className="flex items-center gap-2">
              <FileBarChart size={18} className="text-primary" />
              <h3 className="text-base font-bold text-foreground">Recent Reports</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/6 bg-canvas/40">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Report Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Size</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((r, i) => (
                  <tr key={i} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{r.name}</td>
                    <td className="px-6 py-4 text-muted">{r.type}</td>
                    <td className="px-6 py-4 text-muted">{r.date}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-xs ${statusStyle[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted">{r.size}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={r.status !== 'Scheduled' ? printPage : undefined}
                        disabled={r.status === 'Scheduled'}
                        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        <Download size={12} />
                        Download
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
