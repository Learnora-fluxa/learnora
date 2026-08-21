import { useState, useEffect } from 'react'
import { Target, Plus, CheckCircle2, Circle, Trash2, Calendar } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Goal {
  id: string
  title: string
  subject: string
  target_label: string | null
  deadline_label: string | null
  progress: number
  done: boolean
}

const subjectColor: Record<string, string> = {
  Physics:     'bg-primary/10 text-primary',
  Mathematics: 'bg-accent-mint/10 text-accent-mint',
  English:     'bg-amber-50 text-amber-600',
  General:     'bg-canvas text-muted',
}

const db = supabase as unknown as { from: (t: string) => any }

export default function AcademicGoalsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [goals,    setGoals]    = useState<Goal[]>([])
  const [loading,  setLoading]  = useState(true)
  const [adding,   setAdding]   = useState(false)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => { if (profile?.id) loadGoals() }, [profile?.id])

  async function loadGoals() {
    setLoading(true)
    const { data } = await db.from('student_goals')
      .select('id, title, subject, target_label, deadline_label, progress, done')
      .eq('student_id', profile!.id)
      .eq('school_id', profile!.school_id)
      .order('created_at', { ascending: false })
    setGoals((data ?? []) as Goal[])
    setLoading(false)
  }

  async function addGoal() {
    if (!newTitle.trim()) return
    const { data } = await db.from('student_goals').insert({
      student_id: profile!.id,
      school_id: profile!.school_id,
      title: newTitle.trim(),
      subject: 'General',
      progress: 0,
      done: false,
    }).select().single()
    if (data) setGoals(prev => [data as Goal, ...prev])
    setNewTitle('')
    setAdding(false)
  }

  async function toggleDone(id: string, current: boolean) {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, done: !current } : g))
    await db.from('student_goals').update({ done: !current }).eq('id', id)
  }

  async function remove(id: string) {
    setGoals(prev => prev.filter(g => g.id !== id))
    await db.from('student_goals').delete().eq('id', id)
  }

  const active    = goals.filter(g => !g.done)
  const completed = goals.filter(g => g.done)

  return (
    <DashboardLayout activePage="analysis" onNavigate={onNavigate} title="Academic Goals" subtitle="Set and track your personal learning targets" user={sidebarUser}>
      <div className="max-w-[720px] flex flex-col gap-6">

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Active Goals', value: active.length,    color: 'text-primary'   },
            { label: 'Completed',    value: completed.length, color: 'text-green-600' },
            { label: 'On Track',     value: active.filter(g => g.progress >= 70).length, color: 'text-amber-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface rounded-card shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Active goals */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-black/6 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Target size={15} className="text-primary" /> Active Goals
            </h2>
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 h-8 px-3 bg-primary/10 text-primary text-xs font-semibold rounded-full hover:bg-primary/20 transition-colors"
            >
              <Plus size={12} /> Add Goal
            </button>
          </div>

          {adding && (
            <div className="px-6 py-4 border-b border-black/6 flex gap-3">
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addGoal(); if (e.key === 'Escape') setAdding(false) }}
                placeholder="Enter your goal..."
                className="flex-1 h-9 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
              />
              <button onClick={addGoal} className="h-9 px-4 bg-primary text-white text-xs font-semibold rounded-card hover:bg-primary-deep transition-colors">Add</button>
              <button onClick={() => setAdding(false)} className="h-9 px-3 border border-black/15 text-muted text-xs rounded-card hover:bg-canvas transition-colors">Cancel</button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-sm text-muted">Loading goals…</div>
          ) : active.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted">No active goals yet. Add one above.</div>
          ) : (
            <div className="divide-y divide-black/4">
              {active.map(g => (
                <div key={g.id} className="px-6 py-4 group">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleDone(g.id, g.done)} className="mt-0.5 shrink-0">
                      <Circle size={18} className="text-muted/40 hover:text-primary transition-colors" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground">{g.title}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${subjectColor[g.subject] ?? 'bg-canvas text-muted'}`}>{g.subject}</span>
                      </div>
                      {(g.target_label || g.deadline_label) && (
                        <div className="flex items-center gap-3 text-xs text-muted mb-3">
                          {g.target_label && <span>Target: <strong>{g.target_label}</strong></span>}
                          {g.deadline_label && <span className="flex items-center gap-1"><Calendar size={10} /> {g.deadline_label}</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-black/8 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${g.progress >= 90 ? 'bg-green-500' : g.progress >= 70 ? 'bg-primary' : 'bg-amber-400'}`}
                            style={{ width: `${g.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-foreground">{g.progress}%</span>
                      </div>
                    </div>
                    <button onClick={() => remove(g.id)} className="size-7 rounded-full flex items-center justify-center text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed */}
        {completed.length > 0 && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-black/6">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" /> Completed Goals
              </h2>
            </div>
            <div className="divide-y divide-black/4">
              {completed.map(g => (
                <div key={g.id} className="flex items-center gap-3 px-6 py-3.5 opacity-60">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  <p className="text-sm text-foreground line-through flex-1">{g.title}</p>
                  <button onClick={() => remove(g.id)} className="size-7 rounded-full flex items-center justify-center text-muted hover:text-red-500 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
