import { useState, useEffect } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { superAdminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface School {
  id: string
  name: string
  state: string | null
  subscription_plan: string
  subscription_status: string
  student_count: number  // denormalized; we re-compute from profiles for accuracy
  created_at: string
}

function fmtStatus(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function SuperAdminDashboardPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)
  const [schools,       setSchools]       = useState<School[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalTeachers, setTotalTeachers] = useState(0)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    async function load() {
      const [schoolsRes, studentsRes, teachersRes] = await Promise.all([
        supabase
          .from('schools')
          .select('id, name, state, subscription_plan, subscription_status, student_count, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
      ])
      setSchools((schoolsRes.data as School[]) ?? [])
      setTotalStudents(studentsRes.count ?? 0)
      setTotalTeachers(teachersRes.count ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  const activeSchools = schools.filter(s => s.subscription_status === 'active').length

  const stats = [
    { label: 'Total Schools',  value: loading ? '…' : schools.length.toLocaleString(),    color: 'text-primary'    },
    { label: 'Active Schools', value: loading ? '…' : activeSchools.toLocaleString(),     color: 'text-accent-mint' },
    { label: 'Total Students', value: loading ? '…' : totalStudents.toLocaleString(),     color: 'text-foreground' },
    { label: 'Total Teachers', value: loading ? '…' : totalTeachers.toLocaleString(),     color: 'text-green-600'  },
  ]

  return (
    <DashboardLayout
      activePage="super-dashboard"
      onNavigate={onNavigate}
      title="Platform Dashboard"
      subtitle="Learnora — All Schools Overview"
      nav={superAdminNav}
      user={sidebarUser}
    >
      <div className="max-w-[1300px] flex flex-col gap-6">

        {/* Platform identity banner */}
        <div className="flex items-center gap-3 px-5 py-3 bg-indigo-950 rounded-card">
          <span className="size-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
          <p className="text-xs font-semibold tracking-widest uppercase text-indigo-300">
            Platform Administration — All Schools
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-surface rounded-card shadow-sm p-5">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Schools table */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-black/6">
            <h3 className="text-base font-bold text-foreground">Schools</h3>
            <div className="flex gap-2">
              <button onClick={() => onNavigate('onboard-school')} className="flex items-center gap-1.5 h-8 px-3 bg-primary text-white text-xs font-semibold rounded-pill hover:bg-primary-deep transition-colors">
                <Plus size={11} /> Onboard School
              </button>
              <button onClick={() => onNavigate('schools-list')} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                View all <ChevronRight size={12} />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/6 bg-canvas/40">
                  {['School', 'Location', 'Plan', 'Students', 'Status'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted">Loading…</td>
                  </tr>
                ) : schools.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted">No schools yet.</td>
                  </tr>
                ) : schools.slice(0, 10).map(s => {
                  const displayStatus = fmtStatus(s.subscription_status)
                  return (
                    <tr key={s.id} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors cursor-pointer" onClick={() => onNavigate('school-detail')}>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{s.name.charAt(0)}</div>
                          <span className="font-medium text-foreground">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-muted">{s.state ?? '—'}</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${s.subscription_plan === 'professional' ? 'bg-primary/10 text-primary' : 'bg-canvas text-muted border border-black/10'}`}>{s.subscription_plan}</span>
                      </td>
                      <td className="px-6 py-3.5 text-foreground">{s.student_count.toLocaleString()}</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          displayStatus === 'Active' ? 'bg-green-50 text-green-700' :
                          displayStatus === 'Trial'  ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-600'
                        }`}>{displayStatus}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
