import { useState, useEffect } from 'react'
import { Plus, Trash2, Upload, Send, ChevronDown } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface ClassOpt { id: string; name: string }
interface InviteRow { _key: number; email: string; role: string; classId: string }

let _nextKey = 3

function makeInviteToken() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export default function InviteUsersPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [classes, setClasses] = useState<ClassOpt[]>([])
  const [invites, setInvites] = useState<InviteRow[]>([
    { _key: 1, email: '', role: 'Student', classId: '' },
    { _key: 2, email: '', role: 'Student', classId: '' },
  ])
  const [sent,    setSent]    = useState(false)
  const [sending, setSending] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => { if (profile?.school_id) loadClasses() }, [profile?.school_id])

  async function loadClasses() {
    const { data } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', profile!.school_id!)
      .order('name')
    const cls = (data ?? []) as ClassOpt[]
    setClasses(cls)
    if (cls.length > 0) {
      setInvites(prev => prev.map(i => ({ ...i, classId: i.classId || cls[0].id })))
    }
  }

  function addRow() {
    const classId = classes[0]?.id ?? ''
    setInvites(inv => [...inv, { _key: _nextKey++, email: '', role: 'Student', classId }])
  }

  function removeRow(key: number) {
    setInvites(inv => inv.filter(i => i._key !== key))
  }

  function update(key: number, field: keyof InviteRow, value: string) {
    setInvites(inv => inv.map(i => i._key === key ? { ...i, [field]: value } : i))
  }

  async function sendInvitations() {
    const valid = invites.filter(i => i.email.trim())
    if (valid.length === 0) { setError('Please enter at least one email address.'); return }
    setSending(true)
    setError('')

    const rows = valid.map(i => ({
      school_id:  profile!.school_id!,
      email:      i.email.trim().toLowerCase(),
      role:       i.role.toLowerCase(),
      class_id:   i.classId || null,
      token:      makeInviteToken(),
      status:     'pending',
    }))

    const db = supabase as unknown as { from: (t: string) => any }
    const { error: dbErr } = await db.from('invitations').insert(rows)

    if (dbErr) {
      logSupabaseError('InviteUsers.insert', dbErr)
      setError('Failed to save invitations. Please try again.')
      setSending(false)
      return
    }

    setSending(false)
    setSent(true)
  }

  const roles = ['Student', 'Teacher', 'Parent']

  return (
    <DashboardLayout
      activePage="user-management"
      onNavigate={onNavigate}
      title="Invite Users"
      subtitle="Send email invitations to join the school platform"
      nav={adminNav}
      user={sidebarUser}
    >
      <div className="max-w-[860px] flex flex-col gap-6">

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-card p-8 text-center">
            <Send size={32} className="text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Invitations Saved!</h2>
            <p className="text-sm text-muted mb-6">
              {invites.filter(i => i.email.trim()).length} invitation{invites.filter(i => i.email.trim()).length > 1 ? 's' : ''} queued successfully. Users will be set up when they join.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setSent(false); setInvites([{ _key: _nextKey++, email: '', role: 'Student', classId: classes[0]?.id ?? '' }]) }}
                className="h-11 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors"
              >
                Send More
              </button>
              <button onClick={() => onNavigate('user-management')} className="h-11 px-5 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
                View Users
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* CSV option */}
            <div className="bg-canvas border-2 border-dashed border-black/20 rounded-card p-6 flex flex-col items-center gap-3">
              <Upload size={22} className="text-muted" />
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Bulk invite via CSV</p>
                <p className="text-xs text-muted mt-1">Upload a CSV file with columns: email, role, class</p>
              </div>
              <button className="h-9 px-4 border border-black/20 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors">
                Choose CSV File
              </button>
            </div>

            <div className="flex items-center gap-4">
              <hr className="flex-1 border-black/10" />
              <span className="text-xs text-muted font-semibold">OR ADD MANUALLY</span>
              <hr className="flex-1 border-black/10" />
            </div>

            {/* Manual rows */}
            <div className="bg-surface rounded-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-black/6">
                <h2 className="text-sm font-bold text-foreground">Invite List</h2>
                <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
                  <Plus size={13} /> Add row
                </button>
              </div>

              <div className="grid grid-cols-[1fr_140px_160px_40px] gap-3 px-5 py-2.5 bg-canvas/40 border-b border-black/6 text-xs font-semibold text-muted uppercase tracking-wider">
                <span>Email Address</span><span>Role</span><span>Class</span><span />
              </div>

              <div className="divide-y divide-black/4">
                {invites.map(inv => (
                  <div key={inv._key} className="grid grid-cols-[1fr_140px_160px_40px] gap-3 items-center px-5 py-2.5">
                    <input
                      type="email" value={inv.email} onChange={e => update(inv._key, 'email', e.target.value)}
                      placeholder="email@example.com"
                      className="h-9 px-3 border border-black/15 rounded-md text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
                    />
                    <div className="relative">
                      <select value={inv.role} onChange={e => update(inv._key, 'role', e.target.value)}
                        className="w-full h-9 pl-3 pr-8 border border-black/15 rounded-md text-sm text-foreground bg-white outline-none focus:border-primary appearance-none">
                        {roles.map(r => <option key={r}>{r}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    </div>
                    <div className="relative">
                      <select value={inv.classId} onChange={e => update(inv._key, 'classId', e.target.value)}
                        className="w-full h-9 pl-3 pr-8 border border-black/15 rounded-md text-sm text-foreground bg-white outline-none focus:border-primary appearance-none">
                        <option value="">— None —</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    </div>
                    {invites.length > 1 ? (
                      <button onClick={() => removeRow(inv._key)} className="text-muted hover:text-red-500 transition-colors flex items-center justify-center">
                        <Trash2 size={14} />
                      </button>
                    ) : <span />}
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={sendInvitations}
                disabled={sending}
                className="flex items-center gap-2 h-12 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50"
              >
                <Send size={14} /> {sending ? 'Saving…' : 'Send Invitations'}
              </button>
              <button onClick={() => onNavigate('user-management')} className="h-12 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
                Cancel
              </button>
            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  )
}
