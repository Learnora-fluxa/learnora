import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, BookOpen, Save, CheckCircle2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Note { id: string; timestamp: string; content: string }
interface LessonInfo { title: string; course: string; teacher: string }

const db = supabase as unknown as { from: (t: string) => any }

export default function LessonNotesPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [notes,      setNotes]      = useState<Note[]>([])
  const [lessonInfo, setLessonInfo] = useState<LessonInfo>({ title: '', course: '', teacher: '' })
  const [draft,      setDraft]      = useState('')
  const [stamp,      setStamp]      = useState('00:00')
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [loading,    setLoading]    = useState(true)

  const lessonId = sessionStorage.getItem('learnora_selected_lesson') ?? ''

  useEffect(() => { if (profile?.id) loadData() }, [profile?.id])

  async function loadData() {
    setLoading(true)

    // Load lesson info if lessonId is set
    if (lessonId) {
      const { data: lData } = await supabase
        .from('lessons')
        .select('title, modules!module_id(title, courses!course_id(title, profiles!teacher_id(full_name)))')
        .eq('id', lessonId)
        .maybeSingle()

      if (lData) {
        const raw = lData as unknown as {
          title: string
          modules: {
            title: string
            courses: {
              title: string
              profiles: { full_name: string | null } | null
            } | null
          } | null
        }
        setLessonInfo({
          title:   raw.title,
          course:  raw.modules?.courses?.title ?? '',
          teacher: raw.modules?.courses?.profiles?.full_name ?? '',
        })
      }

      // Load existing notes
      const { data: nData } = await db.from('lesson_notes')
        .select('id, timestamp_label, content')
        .eq('student_id', profile!.id)
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true })

      const rows = (nData ?? []) as { id: string; timestamp_label: string | null; content: string }[]
      setNotes(rows.map(r => ({ id: r.id, timestamp: r.timestamp_label ?? '—', content: r.content })))
    }

    setLoading(false)
  }

  async function addNote() {
    if (!draft.trim() || !lessonId) return
    const schoolId = profile!.school_id!

    const { data } = await db.from('lesson_notes').insert({
      student_id:      profile!.id,
      lesson_id:       lessonId,
      school_id:       schoolId,
      timestamp_label: stamp || null,
      content:         draft.trim(),
    }).select('id, timestamp_label, content').single()

    if (data) {
      const r = data as { id: string; timestamp_label: string | null; content: string }
      setNotes(prev => [...prev, { id: r.id, timestamp: r.timestamp_label ?? '—', content: r.content }])
    }
    setDraft('')
    setStamp('00:00')
  }

  async function deleteNote(id: string) {
    await db.from('lesson_notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  async function saveNotes() {
    setSaving(true)
    setSaved(false)
    await new Promise(r => setTimeout(r, 400))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <DashboardLayout
      activePage="courses"
      onNavigate={onNavigate}
      title="Lesson Notes"
      subtitle={lessonInfo.course ? `${lessonInfo.course} · ${lessonInfo.title}` : lessonInfo.title}
      user={sidebarUser}
    >
      <div className="max-w-[760px] flex flex-col gap-5">

        <button onClick={() => onNavigate('course-details')} className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors w-fit">
          <ArrowLeft size={14} /> Back to lesson
        </button>

        {lessonInfo.title && (
          <div className="bg-surface rounded-card shadow-sm p-5 flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{lessonInfo.title}</p>
              <p className="text-xs text-muted">{lessonInfo.course}{lessonInfo.teacher ? ` · ${lessonInfo.teacher}` : ''}</p>
            </div>
          </div>
        )}

        {!lessonId ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center text-sm text-muted">
            <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
            <p>Open a lesson first, then come back here to take notes.</p>
          </div>
        ) : (
          <>
            {/* Add note */}
            <div className="bg-surface rounded-card shadow-sm p-5 flex flex-col gap-3">
              <p className="text-xs font-bold text-muted uppercase tracking-wider">Add Note</p>
              <div className="flex gap-2 items-center">
                <label className="text-xs text-muted font-semibold shrink-0">Timestamp</label>
                <input
                  value={stamp}
                  onChange={e => setStamp(e.target.value)}
                  placeholder="mm:ss"
                  className="w-20 h-8 px-2 border border-black/20 rounded-card text-sm font-mono outline-none focus:border-primary"
                />
              </div>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
                placeholder="Type your note here… (Ctrl+Enter to add)"
                rows={3}
                className="w-full resize-none border border-black/20 rounded-card p-3 text-sm outline-none focus:border-primary"
              />
              <div className="flex justify-end">
                <button
                  onClick={addNote}
                  disabled={!draft.trim()}
                  className="flex items-center gap-2 h-9 px-4 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep disabled:opacity-40 transition-colors"
                >
                  <Plus size={14} /> Add Note
                </button>
              </div>
            </div>

            {/* Notes list */}
            <div className="bg-surface rounded-card shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-black/6 flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">{notes.length} Notes</h2>
                <div className="flex items-center gap-2">
                  {saved && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                      <CheckCircle2 size={12} /> Saved
                    </span>
                  )}
                  <button
                    onClick={saveNotes}
                    disabled={saving}
                    className="flex items-center gap-1.5 h-8 px-3 border border-black/20 rounded-full text-xs font-semibold text-foreground hover:bg-canvas transition-colors"
                  >
                    <Save size={12} /> {saving ? 'Saving…' : 'Save notes'}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12 text-sm text-muted">Loading…</div>
              ) : notes.length === 0 ? (
                <div className="text-center py-12 text-muted">
                  <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No notes yet. Add your first one above.</p>
                </div>
              ) : (
                <div className="divide-y divide-black/4">
                  {notes.map(note => (
                    <div key={note.id} className="flex items-start gap-4 px-5 py-4 group">
                      <span className="shrink-0 text-xs font-bold font-mono text-primary bg-primary/8 px-2 py-1 rounded-md mt-0.5">
                        {note.timestamp}
                      </span>
                      <p className="flex-1 text-sm text-foreground leading-relaxed">{note.content}</p>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
