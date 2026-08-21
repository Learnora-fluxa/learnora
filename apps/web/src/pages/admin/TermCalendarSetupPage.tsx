import { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, Save, CheckCircle2 } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Term {
  id:         string
  name:       string
  start_date: string
  end_date:   string
  is_current: boolean | null
  _local?:    boolean
}

export default function TermCalendarSetupPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [terms,   setTerms]   = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => { if (profile?.school_id) loadTerms() }, [profile?.school_id])

  async function loadTerms() {
    setLoading(true)
    const { data } = await supabase
      .from('terms')
      .select('id, name, start_date, end_date, is_current')
      .eq('school_id', profile!.school_id!)
      .order('start_date', { ascending: true })

    setTerms((data ?? []) as Term[])
    setLoading(false)
  }

  function addTerm() {
    const now  = new Date()
    const yr   = now.getFullYear()
    setTerms(prev => [...prev, {
      id:         `local-${Date.now()}`,
      name:       `New Term ${yr}/${yr + 1}`,
      start_date: `${yr}-09-01`,
      end_date:   `${yr + 1}-01-31`,
      is_current: false,
      _local:     true,
    }])
  }

  function updateTerm(id: string, field: keyof Term, val: string | boolean) {
    setTerms(prev => prev.map(t => t.id === id ? { ...t, [field]: val } : t))
  }

  async function setActive(id: string) {
    setTerms(prev => prev.map(t => ({ ...t, is_current: t.id === id })))
    const schoolId = profile!.school_id!
    await supabase.from('terms').update({ is_current: false }).eq('school_id', schoolId)
    if (!id.startsWith('local-')) {
      await supabase.from('terms').update({ is_current: true }).eq('id', id)
    }
  }

  async function deleteTerm(id: string) {
    if (id.startsWith('local-')) {
      setTerms(prev => prev.filter(t => t.id !== id))
      return
    }
    await supabase.from('terms').delete().eq('id', id)
    setTerms(prev => prev.filter(t => t.id !== id))
  }

  async function saveAll() {
    setSaving(true)
    setError('')
    const schoolId = profile!.school_id!

    for (const t of terms) {
      if (!t.name.trim() || !t.start_date || !t.end_date) continue
      if (t._local || t.id.startsWith('local-')) {
        await supabase.from('terms').insert({
          school_id:  schoolId,
          name:       t.name.trim(),
          start_date: t.start_date,
          end_date:   t.end_date,
          is_current: t.is_current ?? false,
        })
      } else {
        await supabase.from('terms').update({
          name:       t.name.trim(),
          start_date: t.start_date,
          end_date:   t.end_date,
          is_current: t.is_current ?? false,
        }).eq('id', t.id)
      }
    }

    await loadTerms()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <DashboardLayout
      activePage="timetable"
      onNavigate={onNavigate}
      title="Term & Calendar Setup"
      subtitle="Configure academic terms"
      nav={adminNav}
      user={sidebarUser}
    >
      <div className="max-w-[820px] flex flex-col gap-6">

        {/* Terms */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-black/6 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Calendar size={15} className="text-primary" /> Academic Terms
            </h2>
            <button
              onClick={addTerm}
              className="flex items-center gap-1.5 h-8 px-3 bg-primary/10 text-primary text-xs font-semibold rounded-full hover:bg-primary/20 transition-colors"
            >
              <Plus size={12} /> Add Term
            </button>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-muted">Loading…</div>
          ) : (
            <div className="divide-y divide-black/4">
              {terms.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-muted">
                  No terms configured yet. Click "Add Term" to create one.
                </div>
              )}
              {terms.map(t => (
                <div key={t.id} className="flex items-center gap-5 px-6 py-4">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted mb-1 uppercase tracking-wider">Term Name</label>
                      <input
                        value={t.name}
                        onChange={e => updateTerm(t.id, 'name', e.target.value)}
                        className="w-full h-9 px-3 border border-black/15 rounded-card text-sm outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted mb-1 uppercase tracking-wider">Start Date</label>
                      <input
                        type="date"
                        value={t.start_date}
                        onChange={e => updateTerm(t.id, 'start_date', e.target.value)}
                        className="w-full h-9 px-3 border border-black/15 rounded-card text-sm outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted mb-1 uppercase tracking-wider">End Date</label>
                      <input
                        type="date"
                        value={t.end_date}
                        onChange={e => updateTerm(t.id, 'end_date', e.target.value)}
                        className="w-full h-9 px-3 border border-black/15 rounded-card text-sm outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setActive(t.id)}
                      className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors ${
                        t.is_current
                          ? 'bg-green-500 text-white'
                          : 'bg-canvas text-muted hover:bg-primary/10 hover:text-primary'
                      }`}
                    >
                      {t.is_current ? 'Active' : 'Set Active'}
                    </button>
                    <button
                      onClick={() => deleteTerm(t.id)}
                      className="size-8 rounded-full flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            onClick={saveAll}
            disabled={saving}
            className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors disabled:opacity-50"
          >
            <Save size={15} /> {saving ? 'Saving…' : 'Save Terms'}
          </button>
          {saved && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
              <CheckCircle2 size={16} /> Saved!
            </div>
          )}
        </div>

        {/* Info note */}
        <div className="bg-canvas rounded-card p-4 text-xs text-muted">
          <strong className="text-foreground">Tip:</strong> Only one term can be active at a time. Setting a term as active makes it the current term for attendance, gradebooks, and assignments.
        </div>
      </div>
    </DashboardLayout>
  )
}
