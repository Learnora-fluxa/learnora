import { useState, useEffect } from 'react'
import { CheckCircle2, Link, Unlink, Info, Loader2, AlertCircle } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Provider {
  supabaseId: string
  name:       string
  icon:       string
}

const PROVIDERS: Provider[] = [
  { supabaseId: 'google', name: 'Google',    icon: '🔵' },
  { supabaseId: 'azure',  name: 'Microsoft', icon: '🟦' },
  { supabaseId: 'apple',  name: 'Apple',     icon: '⚫' },
]

export default function LinkedAccountsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [identities, setIdentities] = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [working,    setWorking]    = useState<string | null>(null) // supabaseId being processed
  const [error,      setError]      = useState('')

  useEffect(() => { loadIdentities() }, [])

  async function loadIdentities() {
    setLoading(true)
    const { data, error: err } = await supabase.auth.getUserIdentities()
    setLoading(false)
    if (err) { setError(err.message); return }
    setIdentities(data?.identities ?? [])
  }

  async function connect(supabaseId: string) {
    setWorking(supabaseId)
    setError('')
    // linkIdentity triggers an OAuth redirect — user comes back with identity linked
    const { error: err } = await supabase.auth.linkIdentity({ provider: supabaseId as any })
    if (err) {
      setError(err.message)
      setWorking(null)
    }
    // If no error, redirect is in progress — no state update needed
  }

  async function disconnect(identity: any) {
    setWorking(identity.provider)
    setError('')
    const { error: err } = await supabase.auth.unlinkIdentity(identity)
    setWorking(null)
    if (err) { setError(err.message); return }
    setIdentities(prev => prev.filter(i => i.identity_id !== identity.identity_id))
  }

  function getIdentity(supabaseId: string) {
    return identities.find(i => i.provider === supabaseId) ?? null
  }

  return (
    <DashboardLayout
      activePage="settings"
      onNavigate={onNavigate}
      title="Linked Accounts"
      subtitle="Connect third-party accounts to sign in easily"
      user={sidebarUser}
    >
      <div className="max-w-[640px] flex flex-col gap-5">

        {loading ? (
          <div className="bg-surface rounded-card shadow-sm p-10 flex items-center justify-center gap-2 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" /> Loading linked accounts…
          </div>
        ) : (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-black/6">
              <p className="text-xs font-bold text-muted uppercase tracking-wider">Social sign-in providers</p>
            </div>

            {error && (
              <div className="mx-5 mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-card p-3">
                <AlertCircle size={12} className="shrink-0" /> {error}
              </div>
            )}

            <div className="divide-y divide-black/4">
              {PROVIDERS.map(p => {
                const identity   = getIdentity(p.supabaseId)
                const connected  = identity !== null
                const isBusy     = working === p.supabaseId
                const email      = connected ? (identity.identity_data?.email as string | undefined) : undefined

                return (
                  <div key={p.supabaseId} className="flex items-center gap-4 px-5 py-4">
                    <div className="size-11 rounded-full bg-canvas flex items-center justify-center text-xl shrink-0 select-none">
                      {p.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{p.name}</p>
                      {connected
                        ? <p className="text-xs text-muted mt-0.5 truncate">{email ?? 'Connected'}</p>
                        : <p className="text-xs text-muted mt-0.5">Not connected</p>
                      }
                    </div>
                    <button
                      onClick={() => connected ? disconnect(identity) : connect(p.supabaseId)}
                      disabled={isBusy || loading}
                      className={`flex items-center gap-1.5 h-8 px-4 rounded-pill text-xs font-semibold border transition-colors disabled:opacity-50 shrink-0 ${
                        connected
                          ? 'border-red-200 text-red-500 hover:bg-red-50'
                          : 'border-primary/30 text-primary hover:bg-primary/5'
                      }`}
                    >
                      {isBusy
                        ? <Loader2 size={11} className="animate-spin" />
                        : connected
                        ? <><Unlink size={11} /> Unlink</>
                        : <><Link size={11} /> Connect</>
                      }
                    </button>
                    {connected && !isBusy && <CheckCircle2 size={16} className="text-green-500 shrink-0" />}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Info card */}
        <div className="bg-surface rounded-card shadow-sm p-5">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">SSO / Social login</p>
              <p className="text-xs text-muted leading-relaxed">
                Connecting an account lets you sign in to Learnora using that provider.
                Connecting redirects you to the provider to authorize — you will be brought back automatically.
                You must have at least one sign-in method to unlink all others.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
