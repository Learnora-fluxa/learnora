import { useState, useEffect } from 'react'
import { Search, Plus, ChevronRight } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { superAdminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

type StatusFilter = 'All' | 'Active' | 'Trial' | 'Suspended'

interface School {
  id: string
  name: string
  state: string | null
  subscription_plan: string
  subscription_status: string
  student_count: number
  created_at: string
}

function fmtStatus(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
}

export default function SchoolsListPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState<StatusFilter>('All')
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, state, subscription_plan, subscription_status, student_count, created_at')
        .order('created_at', { ascending: false })
      if (error) setFetchError(error.message)
      setSchools((data as School[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = schools.filter(s => {
    const matchStatus = status === 'All' || fmtStatus(s.subscription_status) === status
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  function openSchoolDetail(schoolId: string) {
    sessionStorage.setItem('learnora_selected_school_id', schoolId)
    onNavigate('school-detail')
  }

  return (
    <DashboardLayout
      activePage="schools-list"
      onNavigate={onNavigate}
      title="Schools"
      subtitle="All schools on the Learnora platform"
      nav={superAdminNav}
      user={sidebarUser}
    >
      <div className="max-w-[1200px] flex flex-col gap-6">

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search schools..."
              className="w-full h-10 pl-9 pr-4 border border-black/15 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary" />
          </div>
          <div className="flex gap-1 bg-canvas rounded-card p-1">
            {(['All', 'Active', 'Trial', 'Suspended'] as StatusFilter[]).map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 h-8 text-xs font-semibold rounded-md transition-colors ${status === s ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}>{s}</button>
            ))}
          </div>
          <button onClick={() => onNavigate('onboard-school')} className="flex items-center gap-1.5 h-10 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary ml-auto">
            <Plus size={13} /> Onboard School
          </button>
        </div>

        {/* School cards */}
        <div className="flex flex-col gap-3">
          {loading && (
            <div className="bg-surface rounded-card shadow-sm py-12 text-center text-sm text-muted">Loading…</div>
          )}
          {fetchError && (
            <div className="bg-red-50 border border-red-200 rounded-card px-5 py-4 text-sm text-red-600">
              Query error: {fetchError}
            </div>
          )}
          {!loading && !fetchError && filtered.length === 0 && (
            <div className="bg-surface rounded-card shadow-sm py-12 text-center text-sm text-muted">No schools found.</div>
          )}
          {filtered.map(s => {
            const displayStatus = fmtStatus(s.subscription_status)
            return (
              <div key={s.id} className="bg-surface rounded-card shadow-sm p-5 flex flex-wrap items-center gap-4 hover:shadow-md transition-all cursor-pointer" onClick={() => openSchoolDetail(s.id)}>
                <div className="size-11 rounded-card bg-primary/10 text-primary text-lg font-bold flex items-center justify-center shrink-0">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className="text-base font-bold text-foreground">{s.name}</p>
                  <p className="text-xs text-muted mt-0.5">{s.state ?? '—'} · Since {fmtDate(s.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted">Plan</p>
                    <p className="font-semibold text-foreground capitalize">{s.subscription_plan}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Students</p>
                    <p className="font-semibold text-foreground">{s.student_count.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">MRR</p>
                    <p className="font-semibold text-foreground">—</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    displayStatus === 'Active'    ? 'bg-green-50 text-green-700' :
                    displayStatus === 'Trial'     ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-600'
                  }`}>{displayStatus}</span>
                  <ChevronRight size={16} className="text-muted" />
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </DashboardLayout>
  )
}
