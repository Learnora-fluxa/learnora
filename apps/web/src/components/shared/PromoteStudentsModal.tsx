import { useState, useEffect } from 'react'
import { X, ArrowRight, Loader2, CheckCircle2, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = {
  open:      boolean
  students:  { id: string; name: string }[]
  onClose:   () => void
  onDone:    () => void   // called after a successful promotion so the parent can reload
}

interface ClassOpt { id: string; name: string }

// Moves the selected students into the target class: removes their existing
// class_enrollments rows and inserts one row per student for the new class.
export default function PromoteStudentsModal({ open, students, onClose, onDone }: Props) {
  const { profile } = useAuth()
  const [classes,  setClasses]  = useState<ClassOpt[]>([])
  const [targetId, setTargetId] = useState('')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!open || !profile?.school_id) return
    setDone(false); setError(''); setTargetId('')
    async function loadClasses() {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', profile!.school_id!)
        .order('name')
      if (err) { logSupabaseError('Promote/classes', err); setError(err.message) }
      setClasses(((data ?? []) as ClassOpt[]))
      setLoading(false)
    }
    loadClasses()
  }, [open, profile?.school_id])

  async function promote() {
    if (!targetId || students.length === 0) return
    setSaving(true)
    setError('')
    const ids = students.map(s => s.id)

    // Remove old enrollments, then enroll everyone in the target class
    const { error: delErr } = await supabase
      .from('class_enrollments')
      .delete()
      .in('student_id', ids)
      .eq('school_id', profile!.school_id!)
    if (delErr) {
      logSupabaseError('Promote/delete', delErr)
      setError(delErr.message); setSaving(false); return
    }

    const rows = ids.map(id => ({
      school_id:  profile!.school_id!,
      class_id:   targetId,
      student_id: id,
    }))
    const { error: insErr } = await supabase.from('class_enrollments').insert(rows)
    if (insErr) {
      logSupabaseError('Promote/insert', insErr)
      setError(insErr.message); setSaving(false); return
    }

    setSaving(false)
    setDone(true)
    setTimeout(() => { onDone(); onClose() }, 1200)
  }

  if (!open) return null

  const targetName = classes.find(c => c.id === targetId)?.name

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={saving ? undefined : onClose} />
      <div className="relative bg-white rounded-card shadow-xl w-full max-w-md p-6">
        <button onClick={onClose} disabled={saving} className="absolute top-4 right-4 text-muted hover:text-foreground">
          <X size={16} />
        </button>

        <h2 className="text-lg font-bold text-foreground mb-1">Promote Students</h2>
        <p className="text-xs text-muted mb-4">
          Move {students.length} student{students.length !== 1 ? 's' : ''} to another class. Their current class enrollment will be replaced.
        </p>

        {/* Selected students */}
        <div className="max-h-32 overflow-y-auto bg-canvas rounded-card p-3 mb-4 flex flex-wrap gap-1.5">
          {students.map(s => (
            <span key={s.id} className="text-xs font-semibold bg-white px-2.5 py-1 rounded-full text-foreground shadow-sm">{s.name}</span>
          ))}
        </div>

        {/* Target class */}
        <label className="block text-xs font-semibold text-muted mb-1.5">Promote to class</label>
        {loading ? (
          <p className="text-sm text-muted py-2">Loading classes…</p>
        ) : (
          <div className="relative mb-4">
            <select
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              className="w-full h-11 pl-4 pr-10 border border-black/20 rounded-card text-sm bg-white outline-none focus:border-primary appearance-none"
            >
              <option value="">— Select target class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        )}

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        {done && (
          <p className="flex items-center gap-2 text-sm text-green-600 font-semibold mb-3">
            <CheckCircle2 size={15} /> Promoted to {targetName}.
          </p>
        )}

        <button
          onClick={promote}
          disabled={saving || !targetId || done}
          className="w-full h-11 flex items-center justify-center gap-2 bg-primary text-white text-sm font-bold rounded-pill shadow-primary hover:bg-primary-deep transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          {saving ? 'Promoting…' : `Promote${targetName ? ` to ${targetName}` : ''}`}
        </button>
      </div>
    </div>
  )
}
