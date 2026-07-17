import { useState, useEffect } from 'react'
import { Video, Calendar, Clock, Users, Loader2, AlertCircle } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError, functionErrorMessage } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface LiveSession {
  id:               string
  topic:            string
  subject:          string
  teacherName:      string
  scheduledAt:      string
  durationMinutes:  number
  status:           'upcoming' | 'live' | 'ended'
  classId:          string
  className:        string
}

const subjectColor: Record<string, string> = {
  Physics:     'bg-primary/10 text-primary',
  Mathematics: 'bg-teal-50 text-teal-600',
  English:     'bg-amber-50 text-amber-600',
  Chemistry:   'bg-red-50 text-red-500',
  Biology:     'bg-green-50 text-green-600',
}

function colorFor(subject: string) {
  return subjectColor[subject] ?? 'bg-canvas text-muted'
}

function formatScheduled(iso: string) {
  const d   = new Date(iso)
  const now = new Date()
  const todayStr    = now.toDateString()
  const tomorrowStr = new Date(now.getTime() + 86400000).toDateString()
  const date = d.toDateString() === todayStr ? 'Today'
             : d.toDateString() === tomorrowStr ? 'Tomorrow'
             : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return { date, time }
}

export default function LiveClassesOverviewPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [joining,  setJoining]  = useState<Set<string>>(new Set())
  const [joinErr,  setJoinErr]  = useState('')

  useEffect(() => { if (profile?.id) loadSessions() }, [profile?.id])

  async function loadSessions() {
    setLoading(true)
    setError('')

    // Get student's enrolled class IDs
    const { data: enrollData, error: enrollErr } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', profile!.id)

    if (enrollErr) {
      logSupabaseError('LiveClassesOverview/enrollments', enrollErr)
      setError(enrollErr.message)
      setLoading(false)
      return
    }

    const classIds = (enrollData ?? []).map((r: { class_id: string }) => r.class_id)
    if (classIds.length === 0) { setLoading(false); return }

    // Query live + upcoming sessions, plus recent ended ones
    const { data, error: err } = await supabase
      .from('live_sessions')
      .select('id, topic, scheduled_at, duration_minutes, status, class_id, profiles!teacher_id(full_name), subjects(name), classes!class_id(name)')
      .in('class_id', classIds)
      .order('scheduled_at', { ascending: false })
      .limit(20)

    if (err) {
      logSupabaseError('LiveClassesOverview/sessions', err)
      setError(err.message)
      setLoading(false)
      return
    }

    type Raw = {
      id: string
      topic: string
      scheduled_at: string
      duration_minutes: number
      status: 'upcoming' | 'live' | 'ended'
      class_id: string
      profiles: { full_name: string | null } | null
      subjects: { name: string } | null
      classes: { name: string } | null
    }

    setSessions(((data ?? []) as unknown as Raw[]).map(r => ({
      id:              r.id,
      topic:           r.topic,
      subject:         r.subjects?.name ?? '—',
      teacherName:     r.profiles?.full_name ?? 'Teacher',
      scheduledAt:     r.scheduled_at,
      durationMinutes: r.duration_minutes,
      status:          r.status,
      classId:         r.class_id,
      className:       r.classes?.name ?? '',
    })))

    setLoading(false)
  }

  async function joinSession(session: LiveSession) {
    setJoinErr('')
    setJoining(prev => new Set([...prev, session.id]))
    const { data, error: invErr } = await supabase.functions.invoke('daily-token', {
      body: { action: 'join', session_id: session.id },
    })
    setJoining(prev => { const n = new Set(prev); n.delete(session.id); return n })

    if (invErr || !data?.token) {
      setJoinErr(
        invErr
          ? await functionErrorMessage(invErr, 'Could not join — the teacher may not have started yet.')
          : (data?.error ?? 'Could not join — the teacher may not have started yet.')
      )
      return
    }
    sessionStorage.setItem('learnora_session_id',         session.id)
    sessionStorage.setItem('learnora_daily_token',        data.token)
    sessionStorage.setItem('learnora_daily_room_url',     data.room_url)
    sessionStorage.setItem('learnora_session_topic',      session.topic)
    sessionStorage.setItem('learnora_session_class',      session.className)
    sessionStorage.setItem('learnora_session_class_id',   session.classId)
    sessionStorage.setItem('learnora_session_is_teacher', 'false')
    onNavigate('pre-class-lobby')
  }

  const liveSessions     = sessions.filter(s => s.status === 'live')
  const upcomingSessions = sessions.filter(s => s.status === 'upcoming')
  const pastSessions     = sessions.filter(s => s.status === 'ended').slice(0, 5)

  return (
    <DashboardLayout
      activePage="live-classes"
      onNavigate={onNavigate}
      title="Live Classes"
      subtitle="Join live sessions and review recordings"
    >
      <div className="flex flex-col gap-6">

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-card px-4 py-3">{error}</p>
        )}

        {joinErr && (
          <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-card text-sm text-red-700">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {joinErr}
          </div>
        )}

        {loading ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center text-muted text-sm">Loading sessions…</div>
        ) : (
          <>
            {/* Live now */}
            {liveSessions.map(cls => {
              const { time } = formatScheduled(cls.scheduledAt)
              return (
                <div key={cls.id} className="bg-primary rounded-card p-5 flex items-center gap-5">
                  <div className="size-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Video size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-full">
                        <span className="size-1.5 rounded-full bg-white animate-pulse" /> LIVE
                      </span>
                      <span className="text-xs text-white/70">{cls.subject}</span>
                    </div>
                    <p className="text-base font-bold text-white truncate">{cls.topic}</p>
                    <p className="text-xs text-white/70 mt-0.5">{cls.teacherName} · Started {time}</p>
                  </div>
                  <button
                    onClick={() => joinSession(cls)}
                    disabled={joining.has(cls.id)}
                    className="flex items-center gap-1.5 h-10 px-5 bg-white text-primary text-sm font-bold rounded-pill shrink-0 hover:bg-white/90 transition-colors disabled:opacity-60"
                  >
                    {joining.has(cls.id) ? <Loader2 size={14} className="animate-spin" /> : null}
                    {joining.has(cls.id) ? 'Joining…' : 'Join Now'}
                  </button>
                </div>
              )
            })}

            {/* Upcoming */}
            <div className="bg-surface rounded-card shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-black/6">
                <h2 className="text-base font-bold text-foreground">Upcoming Classes</h2>
              </div>
              {upcomingSessions.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted">No upcoming sessions scheduled.</p>
              ) : (
                <div className="divide-y divide-black/4">
                  {upcomingSessions.map(cls => {
                    const { date, time } = formatScheduled(cls.scheduledAt)
                    return (
                      <div key={cls.id} className="flex items-center gap-4 px-6 py-4 hover:bg-canvas/50 transition-colors">
                        <div className={`size-10 rounded-card flex items-center justify-center shrink-0 ${colorFor(cls.subject)}`}>
                          <Video size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{cls.topic}</p>
                          <p className="text-xs text-muted mt-0.5">{cls.subject} · {cls.teacherName}</p>
                        </div>
                        <div className="text-right shrink-0 hidden sm:block">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground justify-end">
                            <Calendar size={11} className="text-muted" /> {date}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted justify-end mt-0.5">
                            <Clock size={11} /> {time} · {cls.durationMinutes} min
                          </div>
                        </div>
                        <button
                          onClick={() => onNavigate('pre-class-lobby')}
                          className="h-8 px-4 border border-primary text-primary text-xs font-semibold rounded-full hover:bg-primary/8 transition-colors shrink-0"
                        >
                          Prepare
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Past sessions */}
            {pastSessions.length > 0 && (
              <div className="bg-surface rounded-card shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-black/6">
                  <h2 className="text-base font-bold text-foreground">Past Classes</h2>
                </div>
                <div className="divide-y divide-black/4">
                  {pastSessions.map(cls => {
                    const { date } = formatScheduled(cls.scheduledAt)
                    return (
                      <div key={cls.id} className="flex items-center gap-4 px-6 py-4">
                        <div className={`size-10 rounded-card flex items-center justify-center shrink-0 ${colorFor(cls.subject)}`}>
                          <Video size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{cls.topic}</p>
                          <p className="text-xs text-muted">{cls.subject} · {date} · {cls.durationMinutes} min</p>
                        </div>
                        <span className="text-xs text-muted shrink-0">No recording</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {sessions.length === 0 && !error && (
              <div className="bg-surface rounded-card shadow-sm p-12 text-center">
                <Users size={36} className="mx-auto mb-3 text-muted/30" />
                <p className="text-sm font-semibold text-foreground">No sessions yet</p>
                <p className="text-xs text-muted mt-1">Live classes scheduled by your teachers will appear here.</p>
              </div>
            )}
          </>
        )}

      </div>
    </DashboardLayout>
  )
}
