import { useState, useEffect } from 'react'
import { X, Search, Loader2, MessageSquarePlus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getOrCreateDirectConversation, type Contact } from '../../lib/messaging'

type Props = {
  open:         boolean
  onClose:      () => void
  loadContacts: () => Promise<Contact[]>
  onOpened:     (conversationId: string) => void   // conversation ready — open it
}

const ROLE_LABEL: Record<string, string> = {
  teacher: 'Teachers', student: 'Students', parent: 'Parents',
  admin: 'School Admins', super_admin: 'Learnora',
}

export default function NewMessageModal({ open, onClose, loadContacts, onOpened }: Props) {
  const { profile } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [creating, setCreating] = useState<string | null>(null)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!open) return
    setSearch(''); setError('')
    setLoading(true)
    loadContacts()
      .then(setContacts)
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load contacts'))
      .finally(() => setLoading(false))
  }, [open])

  async function pick(c: Contact) {
    if (!profile?.id || creating) return
    setCreating(c.id)
    setError('')
    const result = await getOrCreateDirectConversation(profile.id, c.id, c.schoolId)
    setCreating(null)
    if ('error' in result) { setError(result.error); return }
    onOpened(result.id)
    onClose()
  }

  if (!open) return null

  const visible = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  const grouped: [string, Contact[]][] = Object.keys(ROLE_LABEL)
    .map(role => [ROLE_LABEL[role], visible.filter(c => c.role === role)] as [string, Contact[]])
    .filter(([, list]) => list.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-card shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/6">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <MessageSquarePlus size={16} className="text-primary" /> New Message
          </h2>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X size={16} /></button>
        </div>

        <div className="px-5 py-3 border-b border-black/6">
          <div className="flex items-center gap-2.5 h-10 px-4 bg-canvas border border-black/8 rounded-input">
            <Search size={14} className="text-muted shrink-0" />
            <input
              autoFocus
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search people…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <p className="text-center text-sm text-muted py-10">Loading contacts…</p>
          ) : error ? (
            <p className="text-center text-sm text-red-500 py-10 px-6">{error}</p>
          ) : grouped.length === 0 ? (
            <p className="text-center text-sm text-muted py-10">No contacts found.</p>
          ) : grouped.map(([label, list]) => (
            <div key={label}>
              <p className="px-5 pt-3 pb-1.5 text-xs font-bold text-muted uppercase tracking-wider">{label}</p>
              {list.map(c => (
                <button
                  key={c.id}
                  onClick={() => pick(c)}
                  disabled={creating !== null}
                  className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-canvas transition-colors text-left disabled:opacity-60"
                >
                  <div className="size-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                    {c.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    {c.detail && <p className="text-xs text-muted truncate">{c.detail}</p>}
                  </div>
                  {creating === c.id && <Loader2 size={14} className="animate-spin text-primary shrink-0" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
