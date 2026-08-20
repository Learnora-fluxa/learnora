import { Play, Search, Clock, Calendar, BookOpen, X, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface Recording {
  id:          string
  path:        string          // storage path in class-recordings bucket
  topic:       string
  subject:     string
  teacher:     string
  className:   string
  date:        string
  durationMin: number | null
  color:       string
}

const COLORS = ['bg-primary', 'bg-accent-mint', 'bg-red-400', 'bg-amber-400', 'bg-green-500', 'bg-purple-500']

export default function ClassRecordingsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const isTeacher   = profile?.role === 'teacher'

  const [recordings, setRecordings] = useState<Recording[]>([])
  const [subjects,   setSubjects]   = useState<string[]>(['All'])
  const [loading,    setLoading]    = useState(true)
  const [query,      setQuery]      = useState('')
  const [subject,    setSubject]    = useState('All')
  const [playing,    setPlaying]    = useState<{ url: string; topic: string } | null>(null)
  const [opening,    setOpening]    = useState<string | null>(null)
  const [error,      setError]      = useState('')

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    setLoading(true)

    // Teachers see recordings of their own sessions; students see their classes'
    let classFilterIds: string[] | null = null
    if (!isTeacher) {
      const { data: ce } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', profile!.id)
      classFilterIds = ((ce ?? []) as { class_id: string }[]).map(r => r.class_id)
      if (classFilterIds.length === 0) { setLoading(false); return }
    }

    const { data, error: err } = await supabase
      .from('session_recordings')
      .select('id, recording_url, duration_seconds, created_at, live_sessions!session_id(topic, teacher_id, class_id, classes!class_id(name), subjects!subject_id(name), profiles!teacher_id(full_name))')
      .eq('school_id', profile!.school_id!)
      .order('created_at', { ascending: false })

    if (err) { logSupabaseError('Recordings/load', err); setError(err.message); setLoading(false); return }

    type Raw = {
      id: string; recording_url: string | null; duration_seconds: number | null; created_at: string
      live_sessions: {
        topic: string; teacher_id: string; class_id: string
        classes: { name: string } | null
        subjects: { name: string } | null
        profiles: { full_name: string | null } | null
      } | null
    }

    const rows = ((data ?? []) as unknown as Raw[])
      .filter(r => r.recording_url && r.live_sessions)
      .filter(r => isTeacher
        ? r.live_sessions!.teacher_id === profile!.id
        : classFilterIds!.includes(r.live_sessions!.class_id))

    const subjSet = new Set<string>()
    setRecordings(rows.map((r, i) => {
      const subj = r.live_sessions!.subjects?.name ?? '—'
      subjSet.add(subj)
      return {
        id:          r.id,
        path:        r.recording_url!,
        topic:       r.live_sessions!.topic,
        subject:     subj,
        teacher:     r.live_sessions!.profiles?.full_name ?? 'Teacher',
        className:   r.live_sessions!.classes?.name ?? '',
        date:        new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        durationMin: r.duration_seconds ? Math.max(1, Math.round(r.duration_seconds / 60)) : null,
        color:       COLORS[i % COLORS.length],
      }
    }))
    setSubjects(['All', ...subjSet])
    setLoading(false)
  }

  async function play(rec: Recording) {
    setOpening(rec.id)
    setError('')
    const { data, error: err } = await supabase.storage
      .from('class-recordings')
      .createSignedUrl(rec.path, 3600)
    setOpening(null)
    if (err || !data?.signedUrl) {
      setError(err?.message ?? 'Could not open the recording.')
      return
    }
    setPlaying({ url: data.signedUrl, topic: rec.topic })
  }

  const filtered = recordings.filter(r => {
    const matchSub   = subject === 'All' || r.subject === subject
    const matchQuery = !query || r.topic.toLowerCase().includes(query.toLowerCase())
    return matchSub && matchQuery
  })

  return (
    <DashboardLayout
      activePage={isTeacher ? 'teacher-live-classes' : 'live-classes'}
      onNavigate={onNavigate}
      title="Class Recordings"
      subtitle="Catch up on missed sessions"
      nav={isTeacher ? teacherNav : undefined}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-5">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search recordings..."
              className="w-full h-10 pl-10 pr-4 border border-black/20 rounded-pill text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {subjects.map(s => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`h-9 px-4 rounded-pill text-sm font-semibold transition-colors ${subject === s ? 'bg-primary text-white shadow-primary' : 'bg-canvas text-muted hover:text-foreground'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {loading ? (
          <div className="text-center py-16 text-sm text-muted">Loading recordings…</div>
        ) : (
          <>
            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map(r => (
                <div key={r.id} className="bg-surface rounded-card shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Thumbnail */}
                  <div
                    className={`h-40 ${r.color} relative flex items-center justify-center cursor-pointer`}
                    onClick={() => play(r)}
                  >
                    <button className="size-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur hover:bg-white/30 transition-colors">
                      {opening === r.id
                        ? <Loader2 size={22} className="text-white animate-spin" />
                        : <Play size={22} className="text-white ml-1" />}
                    </button>
                    {r.durationMin != null && (
                      <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock size={10} /> {r.durationMin} min
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">{r.subject}</span>
                      {r.className && <span className="text-xs text-muted font-semibold">{r.className}</span>}
                    </div>
                    <p className="text-sm font-bold text-foreground leading-snug mb-1">{r.topic}</p>
                    <p className="text-xs text-muted flex items-center gap-1">
                      <BookOpen size={11} /> {r.teacher}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted mt-3 pt-3 border-t border-black/6">
                      <Calendar size={11} /> {r.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted">
                <Play size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No recordings yet.</p>
                {isTeacher && (
                  <p className="text-xs mt-1">Use the Record button inside a live class to create one.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Player modal */}
      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setPlaying(null)} />
          <div className="relative w-full max-w-4xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-white text-sm font-semibold truncate">{playing.topic}</p>
              <button onClick={() => setPlaying(null)} className="text-white/60 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>
            <video src={playing.url} controls autoPlay className="w-full rounded-xl bg-black max-h-[75vh]" />
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
