import { useState } from 'react'
import { Calendar, Clock, MapPin, Users, CheckCircle2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

type EventType = 'class' | 'exam' | 'holiday' | 'meeting' | 'other'

const TYPE_OPTIONS: { value: EventType; label: string; color: string }[] = [
  { value: 'class',   label: 'Class',    color: '#4b75ff' },
  { value: 'exam',    label: 'Exam',     color: '#ef4444' },
  { value: 'holiday', label: 'Holiday',  color: '#10b981' },
  { value: 'meeting', label: 'Meeting',  color: '#f59e0b' },
  { value: 'other',   label: 'Other',    color: '#8b5cf6' },
]

export default function AddEventPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const today = new Date().toISOString().slice(0, 10)
  const [title,     setTitle]     = useState('')
  const [date,      setDate]      = useState(today)
  const [startTime, setStart]     = useState('09:00')
  const [endTime,   setEnd]       = useState('10:00')
  const [type,      setType]      = useState<EventType>('class')
  const [location,  setLocation]  = useState('')
  const [notes,     setNotes]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)

  async function save() {
    if (!title.trim() || !date) return
    setSaving(true)
    const schoolId = profile!.school_id!
    const startAt  = `${date}T${startTime}:00`
    const endAt    = `${date}T${endTime}:00`

    const db = supabase as unknown as { from: (t: string) => any }
    const { error } = await db.from('live_sessions').insert({
      topic:      title.trim(),
      school_id:  schoolId,
      teacher_id: profile!.id,
      starts_at:  startAt,
      ends_at:    endAt,
      room_url:   location || null,
    })

    if (error) logSupabaseError('AddEvent save', error)
    else {
      setSaved(true)
      setTimeout(() => { setSaved(false); onNavigate('calendar') }, 1500)
    }
    setSaving(false)
  }

  return (
    <DashboardLayout
      activePage="calendar"
      onNavigate={onNavigate}
      title="Add Event"
      subtitle="Add a new event to the academic calendar"
      user={sidebarUser}
    >
      <div className="max-w-[600px] flex flex-col gap-5">
        <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-5">

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Event title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Mathematics Class"
              className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted">Type</label>
            <div className="flex gap-2 flex-wrap">
              {TYPE_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setType(o.value)}
                  className={`h-8 px-3.5 rounded-full text-xs font-semibold border transition-colors ${type === o.value ? 'text-white border-transparent' : 'border-black/12 text-muted hover:border-primary hover:text-primary'}`}
                  style={type === o.value ? { background: o.color, borderColor: o.color } : {}}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date + time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted flex items-center gap-1"><Calendar size={11} /> Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted flex items-center gap-1"><Clock size={11} /> Start</label>
              <input type="time" value={startTime} onChange={e => setStart(e.target.value)}
                className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted flex items-center gap-1"><Clock size={11} /> End</label>
              <input type="time" value={endTime} onChange={e => setEnd(e.target.value)}
                className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
            </div>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted flex items-center gap-1"><MapPin size={11} /> Location / Room</label>
            <input value={location} onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Room 301 or Zoom link"
              className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted flex items-center gap-1"><Users size={11} /> Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Additional details…"
              className="px-3 py-2.5 border border-black/15 rounded-input text-sm outline-none focus:border-primary resize-none" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button onClick={() => onNavigate('calendar')}
            className="h-10 px-5 border border-black/15 rounded-pill text-sm font-semibold text-muted hover:text-foreground transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={!title.trim() || !date || saving}
            className="flex items-center gap-2 h-10 px-6 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-40 shadow-primary">
            {saved ? <><CheckCircle2 size={14} /> Saved!</> : saving ? 'Saving…' : 'Add event'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
