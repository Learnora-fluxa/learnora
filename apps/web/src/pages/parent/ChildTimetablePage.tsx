import { useState, useEffect } from 'react'
import { Clock, BookOpen } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

const DAYS    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

interface Period {
  subject:    string
  startTime:  string
  endTime:    string
  color:      string
}

const COLORS = [
  'bg-primary/10 text-primary',
  'bg-green-50 text-green-700',
  'bg-amber-50 text-amber-700',
  'bg-red-50 text-red-600',
  'bg-purple-50 text-purple-700',
  'bg-teal-50 text-teal-700',
  'bg-orange-50 text-orange-600',
  'bg-sky-50 text-sky-700',
]
const colorCache: Record<string, string> = {}
function subjColor(name: string) {
  if (!colorCache[name]) colorCache[name] = COLORS[Object.keys(colorCache).length % COLORS.length]
  return colorCache[name]
}

const db = supabase as unknown as { from: (t: string) => any }
const dayOfWeek = new Date().getDay()
const todayIndex = dayOfWeek >= 1 && dayOfWeek <= 5 ? dayOfWeek - 1 : 0

export default function ChildTimetablePage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [activeDay,  setActiveDay]  = useState(todayIndex)
  const [schedule,   setSchedule]   = useState<Record<string, Period[]>>({})
  const [childName,  setChildName]  = useState('')
  const [className,  setClassName]  = useState('')
  const [loading,    setLoading]    = useState(true)

  useEffect(() => { if (profile?.id) loadTimetable() }, [profile?.id])

  async function loadTimetable() {
    setLoading(true)
    const childId = sessionStorage.getItem('learnora_selected_child') ?? profile!.id

    // Get child's name and class
    const [childRes, ceRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', childId).maybeSingle(),
      supabase.from('class_enrollments').select('class_id, classes(id, name)').eq('student_id', childId).limit(1).maybeSingle(),
    ])
    const child = childRes.data as { full_name: string | null } | null
    const ce    = ceRes.data as unknown as { class_id: string; classes: { id: string; name: string } | null } | null

    setChildName(child?.full_name ?? '')
    setClassName(ce?.classes?.name ?? '')

    if (!ce?.class_id) { setLoading(false); return }

    // Load timetable entries
    const { data } = await db.from('timetable_entries')
      .select('day, period, start_time, end_time, subject_id, subjects(name)')
      .eq('class_id', ce.class_id)
      .order('period', { ascending: true })

    const rows = (data ?? []) as {
      day:        string
      period:     number
      start_time: string | null
      end_time:   string | null
      subject_id: string | null
      subjects:   { name: string } | null
    }[]

    const sched: Record<string, Period[]> = {}
    DAYS.forEach(d => sched[d] = [])

    for (const r of rows) {
      const dayAbbr = r.day.slice(0, 3)
      if (!sched[dayAbbr]) continue
      const name  = r.subjects?.name ?? 'Free'
      const start = r.start_time ?? ''
      const end   = r.end_time   ?? ''
      sched[dayAbbr].push({
        subject:   name,
        startTime: start,
        endTime:   end,
        color:     subjColor(name),
      })
    }

    setSchedule(sched)
    setLoading(false)
  }

  const periods = schedule[DAYS[activeDay]] ?? []

  function fmtTime(t: string) {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    const suffix = hr >= 12 ? 'PM' : 'AM'
    return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${suffix}`
  }

  return (
    <MobileLayout activePage="parent/dashboard" onNavigate={onNavigate} nav={parentMobileNav}>
      <div className="px-4 pt-5 pb-24">
        <h1 className="text-lg font-bold text-foreground mb-1">
          {childName ? `${childName.split(' ')[0]}'s Timetable` : 'Timetable'}
        </h1>
        <p className="text-sm text-muted mb-5">
          {className ? `${className} · ` : ''}Current week
        </p>

        {/* Day selector */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {DAYS.map((d, i) => (
            <button
              key={d}
              onClick={() => setActiveDay(i)}
              className={`flex-shrink-0 h-9 px-4 rounded-full text-xs font-semibold transition-colors
                ${activeDay === i ? 'bg-primary text-white' : 'bg-surface text-muted shadow-sm'}
                ${i === todayIndex ? 'ring-2 ring-primary/30' : ''}`}
            >
              {d}
              {i === todayIndex && <span className="ml-1 text-[8px] align-super">today</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted">Loading timetable…</div>
        ) : periods.length === 0 ? (
          <div className="flex flex-col gap-3">
            <div className="text-center py-12 text-muted text-sm">
              {Object.values(schedule).every(d => d.length === 0)
                ? 'No timetable has been set up yet. Ask your school admin to configure the timetable.'
                : 'No classes scheduled for this day.'}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {periods.map((p, i) => (
              <div key={i} className="bg-surface rounded-card shadow-sm p-4 flex gap-3">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`size-9 rounded-full flex items-center justify-center ${p.color}`}>
                    <BookOpen size={14} />
                  </div>
                  {i < periods.length - 1 && <div className="w-px flex-1 bg-black/8 my-1" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{p.subject}</p>
                  {(p.startTime || p.endTime) && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <Clock size={10} /> {fmtTime(p.startTime)} – {fmtTime(p.endTime)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
