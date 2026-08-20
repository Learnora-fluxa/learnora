import { useState, useEffect } from 'react'
import { Save, Trash2, CheckCircle2, BookOpen } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

export default function CourseSettingsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [title,       setTitle]       = useState('')
  const [description, setDesc]        = useState('')
  const [courseId,    setCourseId]    = useState<string | null>(null)
  const [saved,       setSaved]       = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    setLoading(true)
    const id = sessionStorage.getItem('learnora_selected_course')
    if (!id) { setLoading(false); return }
    setCourseId(id)

    const { data } = await supabase
      .from('courses')
      .select('id, title, description')
      .eq('id', id)
      .maybeSingle()

    if (data) {
      const c = data as { id: string; title: string | null; description: string | null }
      setTitle(c.title ?? '')
      setDesc(c.description ?? '')
    }
    setLoading(false)
  }

  async function save() {
    if (!courseId || !title.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('courses')
      .update({ title: title.trim(), description: description.trim() })
      .eq('id', courseId)

    if (error) logSupabaseError('CourseSettings save', error)
    else { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    setSaving(false)
  }

  async function deleteCourse() {
    if (!courseId) return
    const ok = window.confirm('Delete this course? This cannot be undone.')
    if (!ok) return
    await supabase.from('courses').delete().eq('id', courseId)
    onNavigate('course-builder')
  }

  if (loading) return (
    <DashboardLayout activePage="courses" onNavigate={onNavigate} title="Course Settings" user={sidebarUser}>
      <div className="text-center py-12 text-sm text-muted">Loading…</div>
    </DashboardLayout>
  )

  if (!courseId) return (
    <DashboardLayout activePage="courses" onNavigate={onNavigate} title="Course Settings" user={sidebarUser}>
      <div className="text-center py-12 text-muted">
        <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No course selected. Open a course first.</p>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout
      activePage="courses"
      onNavigate={onNavigate}
      title="Course Settings"
      subtitle="Edit details and visibility for this course"
      user={sidebarUser}
    >
      <div className="max-w-[640px] flex flex-col gap-5">

        <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-5">

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Course Title *</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary"
              placeholder="e.g. Mathematics — Senior Secondary"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Description</label>
            <textarea
              value={description} onChange={e => setDesc(e.target.value)}
              rows={4}
              className="px-3 py-2.5 border border-black/15 rounded-input text-sm outline-none focus:border-primary resize-none"
              placeholder="What students will learn in this course…"
            />
          </div>

        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <button onClick={deleteCourse}
            className="flex items-center gap-2 h-10 px-5 border border-red-200 text-red-500 text-sm font-semibold rounded-pill hover:bg-red-50 transition-colors">
            <Trash2 size={13} /> Delete course
          </button>
          <button onClick={save} disabled={!title.trim() || saving}
            className="flex items-center gap-2 h-10 px-6 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-40 shadow-primary">
            {saved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> {saving ? 'Saving…' : 'Save changes'}</>}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
