import { useState, useEffect } from 'react'
import { BookOpen, TrendingUp, ChevronRight, Plus, X, CheckCircle2, Circle } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

const ONBOARDING_STEPS = [
  { id: 'registered', label: 'School registered on Learnora',  page: ''                   },
  { id: 'teachers',   label: 'Add your first teacher',          page: 'user-management'    },
  { id: 'classes',    label: 'Create your first class',         page: 'classes-management' },
  { id: 'fees',       label: 'Set up your fee structure',       page: 'admin-fee-setup'    },
  { id: 'parents',    label: 'Invite parents to the platform',  page: 'user-management'    },
]

interface Stats {
  students:       number
  teachers:       number
  classes:        number
  attendanceRate: number | null
  outstandingFees: number
}

interface RecentUser {
  id: string
  full_name: string | null
  email: string | null
  role: string
  created_at: string
  class_enrollments?: { classes: { name: string } | null }[]
}

export default function AdminDashboardPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const schoolId    = profile?.school_id

  const [stats,       setStats]       = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showChecklist, setShowChecklist] = useState(true)
  const [done, setDone] = useState<Set<string>>(new Set(['registered']))

  useEffect(() => { if (schoolId) loadDashboard() }, [schoolId])

  async function loadDashboard() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const [studRes, teachRes, clsRes, recentRes, attRes, feeRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('school_id', schoolId!).eq('role', 'student'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('school_id', schoolId!).eq('role', 'teacher'),
      supabase.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', schoolId!),
      supabase.from('profiles')
        .select('id, full_name, email, role, created_at, class_enrollments(classes(name))')
        .eq('school_id', schoolId!)
        .in('role', ['student', 'teacher', 'parent'])
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('attendance_records').select('status').eq('school_id', schoolId!).eq('date', today),
      supabase.from('invoices').select('amount, paid_amount').eq('school_id', schoolId!),
    ])

    const attRows = (attRes.data ?? []) as { status: string }[]
    const attendanceRate = attRows.length > 0
      ? Math.round((attRows.filter(r => r.status === 'present').length / attRows.length) * 100)
      : null

    const feeInvoices = (feeRes.data ?? []) as { amount: number; paid_amount: number | null }[]
    const outstandingFees = feeInvoices.reduce(
      (s, r) => s + Math.max(0, (r.amount ?? 0) - (r.paid_amount ?? 0)), 0
    )

    setStats({
      students:        studRes.count  ?? 0,
      teachers:        teachRes.count ?? 0,
      classes:         clsRes.count   ?? 0,
      attendanceRate,
      outstandingFees,
    })
    setRecentUsers((recentRes.data as unknown as RecentUser[]) ?? [])

    const completedSteps = new Set<string>(['registered'])
    if ((teachRes.count ?? 0) > 0) completedSteps.add('teachers')
    if ((clsRes.count ?? 0) > 0)   completedSteps.add('classes')
    setDone(completedSteps)

    setLoading(false)
  }

  function getClassLabel(u: RecentUser) {
    if (u.role === 'teacher') return 'Teacher'
    if (u.role === 'parent')  return 'Parent'
    return u.class_enrollments?.[0]?.classes?.name ?? '—'
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })

  const completedCount = done.size
  const totalSteps = ONBOARDING_STEPS.length

  const sidebarUser = profileToSidebarUser(profile)
  const schoolName = loading ? 'Your School' : 'School Overview'

  return (
    <DashboardLayout
      activePage="admin-dashboard"
      onNavigate={onNavigate}
      title="Admin Dashboard"
      subtitle={schoolName}
      nav={adminNav}
      user={sidebarUser}
    >
      <div className="max-w-[1300px] flex flex-col gap-6">

        {/* Onboarding checklist */}
        {showChecklist && completedCount < totalSteps && (
          <div className="bg-primary/5 border border-primary/20 rounded-card p-5 relative">
            <button onClick={() => setShowChecklist(false)} className="absolute top-4 right-4 text-muted hover:text-foreground">
              <X size={15} />
            </button>
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-base">🏫</span>
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <p className="text-sm font-bold text-foreground">Get your school set up</p>
                <p className="text-xs text-muted mt-0.5 mb-3">Complete these steps to start using Learnora for your school.</p>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted font-medium">{completedCount} of {totalSteps} complete</span>
                    <span className="text-xs font-bold text-primary">{Math.round((completedCount / totalSteps) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-primary/15 rounded-full">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(completedCount / totalSteps) * 100}%` }} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {ONBOARDING_STEPS.map(step => {
                    const isDone = done.has(step.id)
                    return (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className="shrink-0">
                          {isDone
                            ? <CheckCircle2 size={17} className="text-primary" />
                            : <Circle       size={17} className="text-muted/40" />}
                        </div>
                        <span className={`text-sm flex-1 ${isDone ? 'line-through text-muted' : 'text-foreground'}`}>{step.label}</span>
                        {!isDone && step.page && (
                          <button onClick={() => onNavigate(step.page)} className="text-xs text-primary font-semibold hover:underline shrink-0">Go →</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Students', value: loading ? '—' : String(stats?.students ?? 0),  color: 'text-primary',    bg: 'bg-primary/10'    },
            { label: 'Total Teachers', value: loading ? '—' : String(stats?.teachers ?? 0),  color: 'text-teal-600',   bg: 'bg-teal-50'       },
            { label: 'Active Classes', value: loading ? '—' : String(stats?.classes ?? 0),   color: 'text-foreground', bg: 'bg-canvas'        },
            { label: 'Attendance Rate', value: loading ? '—' : (stats?.attendanceRate != null ? `${stats.attendanceRate}%` : 'No data'), color: 'text-green-600', bg: 'bg-green-50' },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-card shadow-sm p-5">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

          {/* Recent users */}
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-black/6">
              <h3 className="text-base font-bold text-foreground">Recent Users</h3>
              <div className="flex gap-2">
                <button onClick={() => onNavigate('user-management')}
                  className="flex items-center gap-1.5 h-8 px-3 bg-primary text-white text-xs font-semibold rounded-pill hover:bg-primary-deep transition-colors">
                  <Plus size={11} /> Add
                </button>
                <button onClick={() => onNavigate('user-management')}
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                  View all <ChevronRight size={12} />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/6 bg-canvas/40">
                    {['Name', 'Role', 'Class', 'Joined'].map(h => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-muted">Loading...</td></tr>
                  ) : recentUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-4xl">👥</span>
                          <p className="text-sm font-semibold text-foreground mt-1">No users yet</p>
                          <p className="text-xs text-muted">Invite teachers and students to get started.</p>
                          <button onClick={() => onNavigate('user-management')}
                            className="mt-2 flex items-center gap-1.5 h-8 px-4 bg-primary text-white text-xs font-semibold rounded-pill hover:bg-primary-deep transition-colors">
                            <Plus size={11} /> Add Users
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : recentUsers.map(u => (
                    <tr key={u.id} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                            {(u.full_name ?? u.email ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">{u.full_name || u.email || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-muted capitalize">{u.role}</td>
                      <td className="px-6 py-3.5 text-muted">{getClassLabel(u)}</td>
                      <td className="px-6 py-3.5 text-muted text-xs">{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick actions + module summary */}
          <div className="flex flex-col gap-4">
            <div className="bg-surface rounded-card shadow-sm p-6">
              <h3 className="text-base font-bold text-foreground mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Add Student',    page: 'user-management',   icon: Plus      },
                  { label: 'Add Teacher',    page: 'user-management',   icon: Plus      },
                  { label: 'Manage Classes', page: 'classes-management', icon: BookOpen  },
                  { label: 'View Finance',   page: 'finance',            icon: TrendingUp },
                ].map(a => {
                  const Icon = a.icon
                  return (
                    <button key={a.label} onClick={() => onNavigate(a.page)}
                      className="flex flex-col items-center gap-2 p-4 rounded-card bg-canvas hover:bg-primary/8 hover:text-primary transition-colors text-muted text-center">
                      <Icon size={18} />
                      <span className="text-xs font-medium leading-tight">{a.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-surface rounded-card shadow-sm p-6">
              <h3 className="text-base font-bold text-foreground mb-4">Module Overview</h3>
              <div className="flex flex-col gap-3 text-sm">
                {[
                  { label: 'Classes',  value: loading ? '—' : `${stats?.classes ?? 0} active`,   page: 'classes-management' },
                  { label: 'Students', value: loading ? '—' : `${stats?.students ?? 0} enrolled`,  page: 'user-management'   },
                  { label: 'Teachers', value: loading ? '—' : `${stats?.teachers ?? 0} on staff`, page: 'user-management'   },
                  { label: 'Finance',  value: loading ? '—' : (stats ? (stats.outstandingFees > 0 ? `₦${Math.round(stats.outstandingFees).toLocaleString('en-NG')} owed` : 'All fees paid') : '—'), page: 'finance' },
                ].map(m => (
                  <button key={m.label} onClick={() => onNavigate(m.page)}
                    className="flex items-center justify-between p-3 rounded-card bg-canvas hover:bg-primary/8 transition-colors text-left">
                    <span className="text-muted">{m.label}</span>
                    <span className="font-semibold text-foreground text-xs">{m.value}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
