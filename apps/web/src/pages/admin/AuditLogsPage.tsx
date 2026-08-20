import { useState, useEffect } from 'react'
import { Search, Shield, Download, User, Settings, FileText, Trash2, LogIn } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav, superAdminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface LogEntry {
  id:         string
  action:     string
  type:       string
  module:     string | null
  created_at: string | null
  user:       string
}

const typeStyle: Record<string, { color: string; Icon: typeof Shield }> = {
  create: { color: 'bg-green-50 text-green-600', Icon: FileText },
  update: { color: 'bg-primary/10 text-primary',  Icon: Settings },
  delete: { color: 'bg-red-50 text-red-500',      Icon: Trash2   },
  system: { color: 'bg-canvas text-muted',        Icon: Shield   },
  login:  { color: 'bg-amber-50 text-amber-600',  Icon: LogIn    },
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).replace(',', ' ·')
}

export default function AuditLogsPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)
  const isSuperAdmin = profile?.role === 'super_admin'

  const [logs,    setLogs]    = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query,   setQuery]   = useState('')

  useEffect(() => {
    if (profile?.id) loadLogs()
  }, [profile?.id])

  async function loadLogs() {
    setLoading(true)
    // audit_logs is a new table not yet in generated types — cast via any
    const db = supabase as unknown as { from: (t: string) => any }
    let q = db
      .from('audit_logs')
      .select('id, action, type, module, created_at, profiles!user_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (!isSuperAdmin && profile?.school_id) {
      q = q.eq('school_id', profile.school_id)
    }

    const { data } = await q
    const rows = (data ?? []) as {
      id: string; action: string; type: string | null
      module: string | null; created_at: string | null
      profiles: { full_name: string | null } | null
    }[]

    setLogs(rows.map(r => ({
      id:         r.id,
      action:     r.action,
      type:       r.type ?? 'system',
      module:     r.module,
      created_at: r.created_at,
      user:       r.profiles?.full_name ?? 'System',
    })))
    setLoading(false)
  }

  const filtered = query
    ? logs.filter(l =>
        l.action.toLowerCase().includes(query.toLowerCase()) ||
        l.user.toLowerCase().includes(query.toLowerCase())
      )
    : logs

  return (
    <DashboardLayout
      activePage="audit-logs"
      onNavigate={onNavigate}
      title="Audit Logs"
      subtitle="Full history of admin and system actions"
      nav={isSuperAdmin ? superAdminNav : adminNav}
      user={sidebarUser}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search actions or users..."
              className="w-full h-10 pl-10 pr-4 border border-black/20 rounded-pill text-sm outline-none focus:border-primary"
            />
          </div>
          <button className="flex items-center gap-2 h-10 px-4 border border-black/20 rounded-pill text-sm font-semibold text-foreground hover:bg-canvas transition-colors">
            <Download size={13} /> Export CSV
          </button>
        </div>

        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted">Loading…</div>
          ) : (
            <div className="divide-y divide-black/4">
              {filtered.map(log => {
                const { color, Icon } = typeStyle[log.type] ?? typeStyle.system
                return (
                  <div key={log.id} className="flex items-start gap-4 px-6 py-4">
                    <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">{log.action}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted flex-wrap">
                        <span className="flex items-center gap-1"><User size={10} /> {log.user}</span>
                        {log.module && (
                          <span className="bg-canvas px-2 py-0.5 rounded-full">{log.module}</span>
                        )}
                        <span>{fmtTime(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted">
              <Shield size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {logs.length === 0 ? 'No audit logs yet.' : 'No logs match your search.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
