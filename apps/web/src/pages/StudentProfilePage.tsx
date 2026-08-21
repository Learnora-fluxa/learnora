import { useState } from 'react'
import { ArrowLeft, MessageSquare, FileBarChart, Bell, Download } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

const perfStats = [
  { label: 'Attendance Rate',       value: '98%',    color: 'text-green-600'  },
  { label: 'Average Performance',   value: '88%',    color: 'text-primary'    },
  { label: 'Assignments Completed', value: '24',     color: 'text-foreground' },
  { label: 'Learning Streak',       value: '14 Days', color: 'text-amber-600' },
]

const actions = [
  { label: 'Message Student',     icon: MessageSquare, page: 'messages'     },
  { label: 'View Reports',        icon: FileBarChart,  page: 'reports'      },
  { label: 'Notify Parents',      icon: Bell,          page: 'announcements' },
  { label: 'Download Transcript', icon: Download,      page: ''             },
]

const tabs = ['Weekly', 'Monthly', 'Termly'] as const
type Tab = typeof tabs[number]

const chartPoints: Record<Tab, number[]> = {
  Weekly:  [72, 80, 75, 88, 84, 91, 88],
  Monthly: [65, 70, 75, 80, 78, 83, 88, 86, 90, 88, 92, 88],
  Termly:  [75, 82, 88],
}

const attendanceData = { present: 98, absent: 2 }

function DonutChart({ pct }: { pct: number }) {
  const r = 60
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" aria-label={`${pct}% attendance`}>
      <circle cx="80" cy="80" r={r} fill="none" stroke="#f4f6fb" strokeWidth="20" />
      <circle
        cx="80" cy="80" r={r} fill="none" stroke="#448aff" strokeWidth="20"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 80 80)"
      />
      <text x="80" y="76" textAnchor="middle" className="fill-foreground" fontSize="20" fontWeight="700" fontFamily="Poppins, sans-serif">{pct}%</text>
      <text x="80" y="97" textAnchor="middle" fill="#323232" fontSize="10" fontFamily="Poppins, sans-serif">Present</text>
    </svg>
  )
}

function LineChart({ points }: { points: number[] }) {
  const w = 600
  const h = 160
  const pad = { top: 16, bottom: 24, left: 8, right: 8 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const min = Math.min(...points) - 10
  const max = Math.max(...points) + 5

  const toX = (i: number) => pad.left + (i / (points.length - 1)) * chartW
  const toY = (v: number) => pad.top + chartH - ((v - min) / (max - min)) * chartH

  const pathD = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ')
  const areaD = pathD + ` L ${toX(points.length - 1)} ${h - pad.bottom} L ${toX(0)} ${h - pad.bottom} Z`

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#448aff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#448aff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#chartGrad)" />
      <path d={pathD} fill="none" stroke="#448aff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((v, i) => (
        <circle key={i} cx={toX(i)} cy={toY(v)} r="4" fill="white" stroke="#448aff" strokeWidth="2" />
      ))}
    </svg>
  )
}

export default function StudentProfilePage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('Monthly')

  return (
    <DashboardLayout
      activePage="students"
      onNavigate={onNavigate}
      title="Students"
      subtitle="Manage and monitor student performance and activity."
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-6 max-w-[1400px]">

        {/* Back button */}
        <button
          onClick={() => onNavigate('students')}
          className="flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors self-start"
        >
          <ArrowLeft size={16} />
          Back to Students
        </button>

        {/* Student header card */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          {/* Avatar + info */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="size-[120px] rounded-full bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center text-white text-3xl font-bold mb-4">
              DA
            </div>
            <h2 className="text-2xl font-bold text-foreground">Daniel .A. Johnson</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted">S.S.2</span>
              <span className="text-muted/40">·</span>
              <span className="text-sm text-muted font-mono">LRN 1237586970-8</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-black/6">
            {actions.map(a => {
              const Icon = a.icon
              return (
                <button
                  key={a.label}
                  onClick={() => a.page && onNavigate(a.page)}
                  className="flex items-center gap-2 h-10 px-4 border border-black/10 rounded-input text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Icon size={15} />
                  {a.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Performance + Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">

          {/* Performance Overview */}
          <div className="bg-surface rounded-card shadow-sm p-6">
            <h3 className="text-lg font-bold text-foreground mb-1">Performance Overview</h3>
            <p className="text-sm text-muted mb-5">Monitor overall academic performance and engagement.</p>
            <div className="grid grid-cols-2 gap-4">
              {perfStats.map(s => (
                <div key={s.label} className="bg-canvas rounded-card p-4">
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted mt-1 leading-snug">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance Insights */}
          <div className="bg-surface rounded-card shadow-sm p-6">
            <h3 className="text-lg font-bold text-foreground mb-1">Attendance Insights</h3>
            <p className="text-sm text-muted mb-5">Track attendance consistency and participation</p>
            <div className="flex flex-col items-center gap-4">
              <DonutChart pct={attendanceData.present} />
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-primary inline-block" />
                  <span className="text-muted">Present <span className="font-semibold text-foreground">{attendanceData.present}%</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-canvas border border-black/10 inline-block" />
                  <span className="text-muted">Absent <span className="font-semibold text-foreground">{attendanceData.absent}%</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Trend */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h3 className="text-lg font-bold text-foreground">Performance Trend</h3>
            <div className="flex items-center gap-1 bg-canvas rounded-input p-1">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    px-4 py-1.5 rounded-input text-sm font-medium transition-colors
                    ${activeTab === tab
                      ? 'bg-surface text-primary shadow-sm font-semibold'
                      : 'text-muted hover:text-foreground'}
                  `}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[180px]">
            <LineChart points={chartPoints[activeTab]} />
          </div>

          {/* Y-axis labels */}
          <div className="flex justify-between mt-2 px-2">
            {['20', '40', '60', '80', '100'].map(v => (
              <span key={v} className="text-xs text-muted">{v}</span>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
