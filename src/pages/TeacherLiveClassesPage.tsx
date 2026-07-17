import { useState, useEffect } from 'react'
import { Video, Plus, Play, Clock, Users, Calendar, Mic, MicOff, Loader2, AlertCircle } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError, functionErrorMessage } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type Status = 'live' | 'upcoming' | 'ended'

interface Session {
  id:               string
  topic:            string
  subject_name:     string
  class_id:         string
  class_name:       string
  scheduled_at:     string
  duration_minutes: number
  status:           Status
  enrolled:         number
}

const subjectColor: Record<string, string> = {
  Physics:     'bg-primary/10 text-primary',
  Mathematics: 'bg-accent-mint/10 text-accent-mint',
  English:     'bg-amber-50 text-amber-600',
  Chemistry:   'bg-red-50 text-red-500',
}

function colorFor(subject: string): string {
  return subjectColor[subject] ?? 'bg-canvas text-muted'
}

function formatScheduled(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  const dateLabel = day.getTime() === today.getTime()    ? 'Today'
                  : day.getTime() === tomorrow.getTime() ? 'Tomorrow'
                  : d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
  const timeLabel = d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true })
  return { date: dateLabel, time: timeLabel }
}

export default function TeacherLiveClassesPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [tab,      setTab]      = useState<'upcoming' | 'recordings'>('upcoming')
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading,  setLoading]  = useState(true)
  const [starting, setStarting] = useState<Set<string>>(new Set())
  const [startErr, setStartErr] = useState('')

  useEffect(() => { if (profile?.id) loadSessions() }, [profile?.id])

  async function loadSessions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('live_sessions')
      .select('id, topic, scheduled_at, duration_minutes, status, classes!class_id(id, name), subjects!subject_id(name)')
      .eq('teacher_id', profile!.id)
      .order('scheduled_at', { ascending: false })

    if (error) { logSupabaseError('TeacherLiveClasses/sessions', error); setLoading(false); return }

    type SRaw = {
      id: string; topic: string; scheduled_at: string; duration_minutes: number; status: string
      classes: { id: string; name: string } | null
      subjects: { name: string } | null
    }

    const items: Session[] = ((data ?? []) as unknown as SRaw[]).map(r => ({
      id:               r.id,
      topic:            r.topic,
      subject_name:     r.subjects?.name ?? '—',
      class_id:         r.classes?.id ?? '',
      class_name:       r.classes?.name ?? '—',
      scheduled_at:     r.scheduled_at,
      duration_minutes: r.duration_minutes ?? 60,
      status:           (r.status as Status) ?? 'upcoming',
      enrolled:         0,
    }))

    setSessions(items)
    setLoading(false)
  }

  async function startOrEnter(session: Session) {
    setStartErr('')
    setStarting(prev => new Set([...prev, session.id]))
    const { data, error } = await supabase.functions.invoke('daily-token', {
      body: { action: 'create', session_id: session.id },
    })
    setStarting(prev => { const n = new Set(prev); n.delete(session.id); return n })

    if (error || !data?.token) {
      setStartErr(
        error
          ? await functionErrorMessage(error, 'Could not start the session.')
          : (data?.error ?? 'Could not start the session. Check your Daily.co setup.')
      )
      return
    }
    sessionStorage.setItem('learnora_session_id',       session.id)
    sessionStorage.setItem('learnora_daily_token',      data.token)
    sessionStorage.setItem('learnora_daily_room_url',   data.room_url)
    sessionStorage.setItem('learnora_session_topic',    session.topic)
    sessionStorage.setItem('learnora_session_class',    session.class_name)
    sessionStorage.setItem('learnora_session_class_id', session.class_id)
    sessionStorage.setItem('learnora_session_is_teacher', 'true')
    onNavigate('pre-class-lobby')
  }

  async function endSession(sessionId: string) {
    await supabase.from('live_sessions').update({ status: 'ended' }).eq('id', sessionId)
    loadSessions()
  }

  const liveSession  = sessions.find(s => s.status === 'live')
  const upcoming     = sessions.filter(s => s.status === 'upcoming').sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )
  const ended        = sessions.filter(s => s.status === 'ended')
  const totalStudents = sessions.reduce((s, c) => s + c.enrolled, 0)

  return (
    <DashboardLayout
      activePage="live-classes"
      onNavigate={onNavigate}
      title="Live Classes"
      subtitle="Manage and host your live teaching sessions"
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[1000px] flex flex-col gap-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Live Now',      value: loading ? '—' : liveSession ? 1 : 0, color: 'text-red-600'   },
            { label: 'Upcoming',      value: loading ? '—' : upcoming.length,      color: 'text-primary'   },
            { label: 'Recordings',    value: loading ? '—' : ended.length,         color: 'text-green-600' },
            { label: 'Total Students',value: loading ? '—' : totalStudents,        color: 'text-foreground'},
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-card shadow-sm p-5">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Error toast */}
        {startErr && (
          <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-card text-sm text-red-700">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {startErr}
          </div>
        )}

        {/* Live now banner */}
        {!loading && liveSession && (
          <div className="bg-red-50 border border-red-200 rounded-card p-5">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-red-600 uppercase tracking-wide">LIVE NOW</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-foreground">{liveSession.topic}</p>
                <p className="text-xs text-muted mt-0.5">
                  {liveSession.subject_name} · {liveSession.class_name} · {liveSession.duration_minutes} min
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startOrEnter(liveSession)}
                  disabled={starting.has(liveSession.id)}
                  className="flex items-center gap-1.5 h-10 px-5 bg-red-600 text-white text-sm font-semibold rounded-pill hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {starting.has(liveSession.id)
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Mic size={14} />
                  }
                  {starting.has(liveSession.id) ? 'Joining…' : 'Enter Class'}
                </button>
                <button
                  onClick={() => endSession(liveSession.id)}
                  className="flex items-center gap-1.5 h-10 px-4 border border-red-300 text-red-600 text-sm font-semibold rounded-pill hover:bg-red-50 transition-colors"
                >
                  <MicOff size={14} /> End Session
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab + Schedule button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-canvas rounded-card p-1">
            {(['upcoming', 'recordings'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 h-9 text-sm font-semibold rounded-md transition-colors ${tab === t ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}>
                {t === 'upcoming'
                  ? `Upcoming Sessions${!loading ? ` (${upcoming.length})` : ''}`
                  : `Recordings${!loading ? ` (${ended.length})` : ''}`}
              </button>
            ))}
          </div>
          <button
            onClick={() => onNavigate('schedule-class')}
            className="flex items-center gap-1.5 h-9 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary ml-auto"
          >
            <Plus size={13} /> Schedule New Session
          </button>
        </div>

        {loading && (
          <div className="py-16 text-center text-sm text-muted">Loading your sessions…</div>
        )}

        {/* Upcoming */}
        {!loading && tab === 'upcoming' && (
          <div className="flex flex-col gap-4">
            {upcoming.length === 0 ? (
              <div className="text-center py-16 text-muted">
                <Video size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No upcoming sessions.</p>
                <button onClick={() => onNavigate('schedule-class')} className="mt-3 text-sm text-primary font-semibold hover:underline">
                  Schedule a session
                </button>
              </div>
            ) : upcoming.map(cls => {
              const { date, time } = formatScheduled(cls.scheduled_at)
              return (
                <div key={cls.id} className="bg-surface rounded-card shadow-sm p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className={`size-11 rounded-card flex items-center justify-center shrink-0 ${colorFor(cls.subject_name)}`}>
                      <Video size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${colorFor(cls.subject_name)}`}>{cls.subject_name}</span>
                        <span className="text-xs text-muted font-semibold">{cls.class_name}</span>
                      </div>
                      <h3 className="text-base font-bold text-foreground leading-snug">{cls.topic}</h3>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted">
                        <span className="flex items-center gap-1"><Calendar size={11} /> {date}</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {time} · {cls.duration_minutes} min</span>
                        {cls.enrolled > 0 && (
                          <span className="flex items-center gap-1"><Users size={11} /> {cls.enrolled} students</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => onNavigate('schedule-class')}
                        className="h-9 px-4 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => startOrEnter(cls)}
                        disabled={starting.has(cls.id)}
                        className="flex items-center gap-1.5 h-9 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-60"
                      >
                        {starting.has(cls.id)
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Play size={13} />
                        }
                        {starting.has(cls.id) ? 'Starting…' : 'Start'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Recordings (ended sessions) */}
        {!loading && tab === 'recordings' && (
          <div className="flex flex-col gap-3">
            {ended.length === 0 ? (
              <div className="text-center py-16 text-muted">
                <Video size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No past sessions yet.</p>
              </div>
            ) : ended.map(r => {
              const { date } = formatScheduled(r.scheduled_at)
              return (
                <div key={r.id} className="bg-surface rounded-card shadow-sm p-5 flex flex-wrap items-center gap-4">
                  <div className={`size-11 rounded-card flex items-center justify-center shrink-0 ${colorFor(r.subject_name)}`}>
                    <Video size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{r.topic}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted">
                      <span>{r.subject_name} · {r.class_name}</span>
                      <span>{date}</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {r.duration_minutes} min</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('class-recordings')}
                    className="flex items-center gap-1.5 h-9 px-4 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors"
                  >
                    <Play size={13} /> Play
                  </button>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
