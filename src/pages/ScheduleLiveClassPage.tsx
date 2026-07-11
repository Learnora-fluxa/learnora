import { useState, useEffect } from 'react'
import { Video, CheckCircle2, Loader2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface ClassOpt   { id: string; name: string }
interface SubjectOpt { id: string; name: string }

const DURATIONS = [
  { label: '30 minutes', minutes: 30 },
  { label: '45 minutes', minutes: 45 },
  { label: '60 minutes', minutes: 60 },
  { label: '90 minutes', minutes: 90 },
  { label: '2 hours',   minutes: 120 },
]

export default function ScheduleLiveClassPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [loadingOpts, setLoadingOpts] = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [done,        setDone]        = useState(false)
  const [error,       setError]       = useState('')
  const [classes,     setClasses]     = useState<ClassOpt[]>([])
  const [subjects,    setSubjects]    = useState<SubjectOpt[]>([])

  const [form, setForm] = useState({
    title:      '',
    classId:    '',
    subjectId:  '',
    date:       '',
    time:       '',
    duration:   60,
    description:'',
    sendNotif:  true,
  })

  useEffect(() => { if (profile?.id) loadOptions() }, [profile?.id])

  async function loadOptions() {
    setLoadingOpts(true)
    const { data, error: err } = await supabase
      .from('teacher_assignments')
      .select('class_id, subject_id, classes!class_id(id, name), subjects!subject_id(id, name)')
      .eq('teacher_id', profile!.id)

    if (err) { logSupabaseError('ScheduleLiveClass/options', err); setLoadingOpts(false); return }

    type Row = {
      class_id: string; subject_id: string
      classes:  { id: string; name: string } | null
      subjects: { id: string; name: string } | null
    }

    const rows = (data ?? []) as unknown as Row[]
    const classMap:  Record<string, ClassOpt>   = {}
    const subjectMap: Record<string, SubjectOpt> = {}

    for (const r of rows) {
      if (r.classes)  classMap[r.class_id]    = r.classes
      if (r.subjects) subjectMap[r.subject_id] = r.subjects
    }

    const classList   = Object.values(classMap)
    const subjectList = Object.values(subjectMap)
    setClasses(classList)
    setSubjects(subjectList)
    setForm(f => ({
      ...f,
      classId:   classList[0]?.id   ?? '',
      subjectId: subjectList[0]?.id ?? '',
    }))
    setLoadingOpts(false)
  }

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit() {
    setError('')
    if (!form.title.trim()) { setError('Session title is required.'); return }
    if (!form.date)         { setError('Date is required.'); return }
    if (!form.time)         { setError('Time is required.'); return }
    if (!form.classId)      { setError('Select a class.'); return }
    if (!form.subjectId)    { setError('Select a subject.'); return }

    setSaving(true)
    const scheduledAt = new Date(`${form.date}T${form.time}`).toISOString()

    const { error: insertErr } = await supabase.from('live_sessions').insert({
      school_id:        profile!.school_id!,
      teacher_id:       profile!.id,
      class_id:         form.classId,
      subject_id:       form.subjectId,
      topic:            form.title.trim(),
      scheduled_at:     scheduledAt,
      duration_minutes: form.duration,
      status:           'upcoming',
    })

    if (insertErr) {
      logSupabaseError('ScheduleLiveClass/insert', insertErr)
      setError('Failed to schedule class. Please try again.')
      setSaving(false)
      return
    }

    setSaving(false)
    setDone(true)
  }

  if (done) {
    return (
      <DashboardLayout
        activePage="live-classes"
        onNavigate={onNavigate}
        title="Class Scheduled"
        nav={teacherNav}
        user={profileToSidebarUser(profile)}
      >
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4">
          <div className="size-24 rounded-full bg-green-50 flex items-center justify-center mb-6">
            <CheckCircle2 size={44} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Class Scheduled!</h1>
          <p className="text-sm text-muted max-w-[360px] mb-2">
            <span className="font-semibold text-foreground">{form.title}</span> has been scheduled.
            {form.sendNotif && ' Students will receive a notification.'}
          </p>
          <p className="text-xs text-muted mb-8">{form.date} · {form.time} · {DURATIONS.find(d => d.minutes === form.duration)?.label}</p>
          <div className="flex gap-3">
            <button
              onClick={() => onNavigate('teacher-live-classes')}
              className="h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors"
            >
              Back to Live Classes
            </button>
            <button
              onClick={() => { setDone(false); setForm(f => ({ ...f, title: '', date: '', time: '', description: '' })) }}
              className="h-11 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:bg-canvas transition-colors"
            >
              Schedule Another
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      activePage="live-classes"
      onNavigate={onNavigate}
      title="Schedule Live Class"
      subtitle="Set up an upcoming live session for your students"
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[680px] flex flex-col gap-6">

        {error && (
          <div className="px-4 py-3 rounded-card bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        {/* Basic info */}
        <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Video size={15} className="text-primary" /> Class Details
          </h2>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Session Title <span className="text-red-500">*</span></label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Newton's Laws — Live Revision"
              className="w-full h-11 px-4 border border-black/20 rounded-card text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Subject <span className="text-red-500">*</span></label>
              <select
                value={form.subjectId}
                onChange={e => set('subjectId', e.target.value)}
                disabled={loadingOpts}
                className="w-full h-11 px-3 border border-black/20 rounded-card text-sm text-foreground outline-none focus:border-primary bg-white appearance-none disabled:opacity-50"
              >
                {loadingOpts
                  ? <option>Loading…</option>
                  : subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                }
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Class <span className="text-red-500">*</span></label>
              <select
                value={form.classId}
                onChange={e => set('classId', e.target.value)}
                disabled={loadingOpts}
                className="w-full h-11 px-3 border border-black/20 rounded-card text-sm text-foreground outline-none focus:border-primary bg-white appearance-none disabled:opacity-50"
              >
                {loadingOpts
                  ? <option>Loading…</option>
                  : classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                }
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className="w-full h-11 px-3 border border-black/20 rounded-card text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Time <span className="text-red-500">*</span></label>
              <input
                type="time"
                value={form.time}
                onChange={e => set('time', e.target.value)}
                className="w-full h-11 px-3 border border-black/20 rounded-card text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Duration</label>
              <select
                value={form.duration}
                onChange={e => set('duration', Number(e.target.value))}
                className="w-full h-11 px-3 border border-black/20 rounded-card text-sm text-foreground outline-none focus:border-primary bg-white appearance-none"
              >
                {DURATIONS.map(d => <option key={d.minutes} value={d.minutes}>{d.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Description (optional)</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="What will you cover in this session?"
              className="w-full border border-black/20 rounded-card px-4 py-3 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary resize-none"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => set('sendNotif', !form.sendNotif)}
              className={`w-10 h-5.5 rounded-full relative transition-colors ${form.sendNotif ? 'bg-primary' : 'bg-black/15'}`}
            >
              <span className={`absolute inset-y-[2px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${form.sendNotif ? 'left-[20px]' : 'left-[2px]'}`} />
            </button>
            <div>
              <p className="text-sm font-semibold text-foreground">Notify students</p>
              <p className="text-xs text-muted">Students will receive a notification when the class is scheduled</p>
            </div>
          </label>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || loadingOpts}
          className="h-12 bg-primary text-white text-sm font-bold rounded-pill shadow-primary hover:bg-primary-deep transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 size={15} className="animate-spin" /> Scheduling…</> : 'Schedule Class'}
        </button>
      </div>
    </DashboardLayout>
  )
}
