import { useState, useEffect } from 'react'
import { Building2, Users, Activity, BookOpen, ArrowUp, Download } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { superAdminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface TopSchool {
  id:   string
  name: string
  state: string | null
  studentCount: number
  plan: string
}

export default function PlatformAnalyticsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [totalSchools,   setTotalSchools]   = useState(0)
  const [totalStudents,  setTotalStudents]  = useState(0)
  const [totalLessons,   setTotalLessons]   = useState(0)
  const [totalTeachers,  setTotalTeachers]  = useState(0)
  const [topSchools,     setTopSchools]     = useState<TopSchool[]>([])
  const [loading,        setLoading]        = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [scRes, stuRes, tchRes, lesRes, tsRes] = await Promise.all([
      supabase.from('schools').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('schools')
        .select('id, name, state, subscription_plan, student_count')
        .order('student_count', { ascending: false })
        .limit(5),
    ])

    setTotalSchools(scRes.count ?? 0)
    setTotalStudents(stuRes.count ?? 0)
    setTotalTeachers(tchRes.count ?? 0)
    setTotalLessons(lesRes.count ?? 0)

    const schools = (tsRes.data ?? []) as unknown as { id: string; name: string; state: string | null; subscription_plan: string | null; student_count: number | null }[]
    setTopSchools(schools.map(s => ({
      id:           s.id,
      name:         s.name,
      state:        s.state,
      studentCount: s.student_count ?? 0,
      plan:         s.subscription_plan ?? 'Free',
    })))
    setLoading(false)
  }

  const stats = [
    { label: 'Total Schools',    value: loading ? '…' : totalSchools.toLocaleString(),  Icon: Building2, color: 'bg-primary/10 text-primary'         },
    { label: 'Total Students',   value: loading ? '…' : totalStudents.toLocaleString(), Icon: Users,    color: 'bg-accent-mint/10 text-accent-mint' },
    { label: 'Total Teachers',   value: loading ? '…' : totalTeachers.toLocaleString(), Icon: Activity, color: 'bg-green-50 text-green-600'         },
    { label: 'Published Lessons',value: loading ? '…' : totalLessons.toLocaleString(),  Icon: BookOpen, color: 'bg-amber-50 text-amber-600'         },
  ]

  const planAdoption = [
    { module: 'LMS Core',         pct: 100  },
    { module: 'Attendance',       pct: 95   },
    { module: 'Gradebook',        pct: 88   },
    { module: 'Parent Portal',    pct: 74   },
    { module: 'Announcements',    pct: 69   },
    { module: 'Course Builder',   pct: 55   },
  ]

  return (
    <DashboardLayout
      activePage="platform-analytics"
      onNavigate={onNavigate}
      title="Platform Analytics"
      subtitle="Platform-wide usage, growth, and engagement"
      nav={superAdminNav}
      user={sidebarUser}
    >
      <div className="flex flex-col gap-6">

        <div className="flex justify-end">
          <button className="flex items-center gap-2 h-10 px-5 border border-black/20 text-sm font-semibold text-foreground rounded-pill hover:bg-canvas transition-colors">
            <Download size={14} /> Export Report
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map(({ label, value, Icon, color }) => (
            <div key={label} className="bg-surface rounded-card shadow-sm p-5">
              <div className={`size-10 rounded-card ${color} flex items-center justify-center mb-3`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted mt-0.5">{label}</p>
              <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-green-600">
                <ArrowUp size={11} /> Live data
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Top schools */}
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-black/6">
              <h2 className="text-base font-bold text-foreground">Top Schools by Student Count</h2>
            </div>
            <div className="divide-y divide-black/4">
              {loading ? (
                <p className="px-6 py-10 text-center text-sm text-muted">Loading…</p>
              ) : topSchools.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted">No schools yet.</p>
              ) : topSchools.map((s, i) => (
                <div key={s.id} className="flex items-center gap-4 px-6 py-4">
                  <span className="text-sm font-bold text-muted w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted">{s.studentCount.toLocaleString()} students · {s.plan}</p>
                  </div>
                  {s.state && <span className="text-xs text-muted shrink-0">{s.state}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Module adoption */}
          <div className="bg-surface rounded-card shadow-sm p-6">
            <h2 className="text-base font-bold text-foreground mb-5">Module Adoption</h2>
            <div className="flex flex-col gap-3.5">
              {planAdoption.map(({ module, pct }) => (
                <div key={module}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground">{module}</p>
                    <p className="text-sm font-bold text-foreground">{pct}%</p>
                  </div>
                  <div className="h-1.5 bg-black/8 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-primary' : 'bg-amber-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
