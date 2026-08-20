import { useEffect, useMemo, useState } from 'react'
import { Building2, Download, Search, Shield, User, Users, X } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { superAdminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

type RoleFilter = 'All' | 'Student' | 'Teacher' | 'Parent' | 'Admin' | 'Super Admin'

interface UserRow {
  id: string
  full_name: string | null
  email: string | null
  role: 'student' | 'teacher' | 'parent' | 'admin' | 'super_admin'
  is_active: boolean
  created_at: string | null
  school_id: string | null
  school?: { name: string | null } | null
}

interface SchoolOption {
  id: string
  name: string
}

const roleLabel: Record<UserRow['role'], string> = {
  student: 'Student',
  teacher: 'Teacher',
  parent: 'Parent',
  admin: 'Admin',
  super_admin: 'Super Admin',
}

const roleStyle: Record<UserRow['role'], string> = {
  student: 'bg-primary/10 text-primary',
  teacher: 'bg-teal-50 text-teal-700',
  parent: 'bg-amber-50 text-amber-700',
  admin: 'bg-slate-100 text-slate-700',
  super_admin: 'bg-indigo-100 text-indigo-700',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SuperAdminUsersPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)
  const [users, setUsers] = useState<UserRow[]>([])
  const [schools, setSchools] = useState<SchoolOption[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<RoleFilter>('All')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [assignUser, setAssignUser] = useState<UserRow | null>(null)
  const [selectedSchoolId, setSelectedSchoolId] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUsers() {
      setLoading(true)
      const [usersRes, schoolsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, role, is_active, created_at, school_id, school:schools!profiles_school_id_fkey(name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('schools')
          .select('id, name')
          .order('name'),
      ])

      if (usersRes.error) setFetchError(usersRes.error.message)
      setUsers((usersRes.data as UserRow[]) ?? [])
      setSchools((schoolsRes.data as SchoolOption[]) ?? [])
      setLoading(false)
    }

    loadUsers()
  }, [])

  async function reloadUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at, school_id, school:schools!profiles_school_id_fkey(name)')
      .order('created_at', { ascending: false })

    if (error) {
      setSaveError(error.message)
      return
    }

    setUsers((data as UserRow[]) ?? [])
  }

  function openAssignModal(user: UserRow) {
    setAssignUser(user)
    setSelectedSchoolId(user.school_id ?? '')
    setSaveError(null)
  }

  function closeAssignModal() {
    setAssignUser(null)
    setSelectedSchoolId('')
    setSaveError(null)
    setAssigning(false)
  }

  async function saveAssignment() {
    if (!assignUser) return

    setAssigning(true)
    setSaveError(null)

    const { error } = await supabase
      .from('profiles')
      .update({ school_id: selectedSchoolId || null })
      .eq('id', assignUser.id)

    if (error) {
      setSaveError(error.message)
      setAssigning(false)
      return
    }

    await reloadUsers()
    closeAssignModal()
  }

  const filtered = useMemo(() => {
    return users.filter(user => {
      const matchRole = role === 'All' || roleLabel[user.role] === role
      const term = query.trim().toLowerCase()
        const matchQuery = !term
        || (user.full_name ?? '').toLowerCase().includes(term)
        || (user.email ?? '').toLowerCase().includes(term)
        || (user.school?.name ?? '').toLowerCase().includes(term)
        || roleLabel[user.role].toLowerCase().includes(term)
      return matchRole && matchQuery
    })
  }, [query, role, users])

  const stats = {
    total: users.length,
    active: users.filter(user => user.is_active).length,
    schools: new Set(users.map(user => user.school_id).filter(Boolean)).size,
    superAdmins: users.filter(user => user.role === 'super_admin').length,
  }

  return (
    <DashboardLayout
      activePage="super-users"
      onNavigate={onNavigate}
      title="All Users"
      subtitle="Platform-wide users across every school and role."
      nav={superAdminNav}
      user={sidebarUser}
    >
      <div className="flex max-w-[1320px] flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total Users', value: stats.total.toLocaleString(), color: 'text-primary' },
            { label: 'Active Users', value: stats.active.toLocaleString(), color: 'text-green-600' },
            { label: 'Schools Represented', value: stats.schools.toLocaleString(), color: 'text-foreground' },
            { label: 'Super Admins', value: stats.superAdmins.toLocaleString(), color: 'text-indigo-700' },
          ].map(item => (
            <div key={item.label} className="rounded-card bg-surface p-5 shadow-sm">
              <p className={`text-3xl font-bold ${item.color}`}>{loading ? '…' : item.value}</p>
              <p className="mt-1 text-sm text-muted">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search by name, email, school, or role..."
              className="h-10 w-full rounded-input border border-black/15 pl-9 pr-4 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-1 rounded-card bg-canvas p-1">
            {(['All', 'Student', 'Teacher', 'Parent', 'Admin', 'Super Admin'] as RoleFilter[]).map(item => (
              <button
                key={item}
                onClick={() => setRole(item)}
                className={`h-8 rounded-md px-3 text-xs font-semibold transition-colors ${
                  role === item ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <button className="flex h-10 items-center gap-2 rounded-pill border border-black/15 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-canvas">
            <Download size={14} /> Export
          </button>
        </div>

        <div className="overflow-hidden rounded-card bg-surface shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted">Loading…</div>
          ) : fetchError ? (
            <div className="px-6 py-5 text-sm text-red-600">Query error: {fetchError}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              <Users size={28} className="mx-auto mb-2 opacity-30" />
              No users match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-black/6 bg-canvas/40">
                    {['User', 'Role', 'School', 'Status', 'Joined', ''].map(header => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => (
                    <tr key={user.id} className="border-b border-black/4 last:border-0 hover:bg-canvas/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {(user.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{user.full_name ?? 'Unnamed User'}</p>
                            <p className="truncate text-xs text-muted">{user.email ?? 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleStyle[user.role]}`}>
                          {user.role === 'super_admin' ? <Shield size={11} className="mr-1.5 shrink-0" /> : <User size={11} className="mr-1.5 shrink-0" />}
                          {roleLabel[user.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-foreground">{user.school?.name ?? 'Platform / Unassigned'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted">{fmtDate(user.created_at)}</td>
                      <td className="px-6 py-4 text-right">
                        {user.role === 'admin' && (
                          <button
                            onClick={() => openAssignModal(user)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                          >
                            <Building2 size={12} />
                            {user.school_id ? 'Reassign School' : 'Assign School'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {assignUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={closeAssignModal} />
            <div className="relative z-10 w-full max-w-[520px] rounded-card bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-black/6 px-6 py-4">
                <div>
                  <p className="text-lg font-bold text-foreground">Assign Admin to School</p>
                  <p className="mt-1 text-sm text-muted">This updates the admin&apos;s `school_id` on their profile.</p>
                </div>
                <button onClick={closeAssignModal} className="text-muted hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 px-6 py-5">
                <div className="rounded-2xl bg-canvas px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{assignUser.full_name ?? 'Unnamed User'}</p>
                  <p className="mt-1 text-xs text-muted">{assignUser.email ?? 'No email'}</p>
                  <p className="mt-1 text-xs text-muted">Current school: {assignUser.school?.name ?? 'Unassigned'}</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">School</label>
                  <select
                    value={selectedSchoolId}
                    onChange={event => setSelectedSchoolId(event.target.value)}
                    className="h-11 w-full rounded-input border border-black/15 bg-white px-4 text-sm text-foreground outline-none focus:border-primary"
                  >
                    <option value="">Unassigned</option>
                    {schools.map(school => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                </div>

                {saveError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {saveError}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-black/6 px-6 py-4">
                <button
                  onClick={closeAssignModal}
                  className="h-10 rounded-pill border border-black/15 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAssignment}
                  disabled={assigning}
                  className="h-10 rounded-pill bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-deep disabled:opacity-50"
                >
                  {assigning ? 'Saving…' : 'Save Assignment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
