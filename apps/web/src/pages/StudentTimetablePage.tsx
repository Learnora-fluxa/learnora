import { useState, useEffect } from 'react'
import { BookOpen, Clock, CalendarDays } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

const DAYS    = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAYS_S  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const COLORS = [
  'bg-primary/10 border-primary/20 text-primary',
  'bg-green-50 border-green-200 text-green-700',
  'bg-amber-50 border-amber-200 text-amber-700',
  'bg-red-50 border-red-200 text-red-600',
  'bg-purple-50 border-purple-200 text-purple-700',
  'bg-teal-50 border-teal-200 text-teal-700',
  'bg-orange-50 border-orange-200 text-orange-600',
  'bg-sky-50 border-sky-200 text-sky-700',
]
const colorCache: Record<string, string> = {}
function subjColor(name: string) {
  if (!colorCache[name]) colorCache[name] = COLORS[Object.keys(colorCache).length % COLORS.length]
  return colorCache[name]
}

interface Slot {
  period:     number
  startTime:  string
  endTime:    string
  subject:    string
}

const db = supabase as unknown as { from: (t: string) => any }

const todayIdx  = (() => { const d = new Date().getDay(); return d >= 1 && d <= 5 ? d - 1 : 0 })()

export default function StudentTimetablePage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [schedule,  setSchedule]  = useState<Record<string, Slot[]>>({})
  const [className, setClassName] = useState('')
  const [activeDay, setActiveDay] = useState(todayIdx)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    setLoading(true)
    // Get student's class
    const ceRes = await supabase
      .from('class_enrollments')
      .select('class_id, classes(name)')
      .eq('student_id', profile!.id)
      .limit(1)
      .maybeSingle()

    const ce = ceRes.data as unknown as { class_id: string; classes: { name: string } | null } | null
    setClassName(ce?.classes?.name ?? '')
    if (!ce?.class_id) { setLoading(false); return }

    const { data } = await db.from('timetable_entries')
      .select('day, period, start_time, end_time, subject_id, subjects(name)')
      .eq('class_id', ce.class_id)
      .order('period', { ascending: true })

    const rows = (data ?? []) as {
      day:        string
      period:     number
      start_time: string | null
      end_time:   string | null
      subjects:   { name: string } | null
    }[]

    const sched: Record<string, Slot[]> = {}
    DAYS.forEach(d => sched[d] = [])

    for (const r of rows) {
      const d = r.day
      if (!sched[d]) continue
      sched[d].push({
        period:    r.period,
        startTime: r.start_time ?? '',
        endTime:   r.end_time   ?? '',
        subject:   r.subjects?.name ?? 'Free Period',
      })
    }

    setSchedule(sched)
    setLoading(false)
  }

  function fmtTime(t: string) {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
  }

  // Collect all unique periods across all days for row headers
  const allPeriods = Array.from(
    new Set(Object.values(schedule).flatMap(slots => slots.map(s => s.period)))
  ).sort((a, b) => a - b)

  // Build slot lookup for grid: day → period → slot
  const slotMap: Record<string, Record<number, Slot>> = {}
  for (const [day, slots] of Object.entries(schedule)) {
    slotMap[day] = {}
    for (const s of slots) slotMap[day][s.period] = s
  }

  const isEmpty = Object.values(schedule).every(s => s.length === 0)

  return (
    <DashboardLayout
      activePage="calendar"
      onNavigate={onNavigate}
      title="My Timetable"
      subtitle={className ? `${className} — weekly schedule` : 'Weekly schedule'}
      user={sidebarUser}
    >
      <div className="flex flex-col gap-4">

        {/* Mobile day selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
          {DAYS.map((d, i) => (
            <button key={d} onClick={() => setActiveDay(i)}
              className={`flex-shrink-0 h-9 px-4 rounded-full text-xs font-semibold transition-colors
                ${activeDay === i ? 'bg-primary text-white' : 'bg-surface text-muted shadow-sm'}
                ${i === todayIdx ? 'ring-2 ring-primary/30' : ''}`}>
              {DAYS_S[i]}
              {i === todayIdx && <span className="ml-1 text-[8px] align-super">today</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center text-sm text-muted">Loading timetable…</div>
        ) : isEmpty ? (
          <div className="bg-surface rounded-card shadow-sm p-12 flex flex-col items-center gap-3 text-center">
            <CalendarDays size={36} className="text-muted opacity-30" />
            <p className="text-sm font-semibold text-foreground">No timetable set up yet</p>
            <p className="text-xs text-muted max-w-xs">Your school admin needs to configure the timetable. Check back later.</p>
          </div>
        ) : (
          <>
            {/* Desktop grid */}
            <div className="hidden md:block bg-surface rounded-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-black/6">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider w-24">Period</th>
                      {DAYS.map((d, i) => (
                        <th key={d}
                          className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider text-center ${i === todayIdx ? 'bg-primary/5 text-primary' : 'text-muted'}`}>
                          {DAYS_S[i]}
                          {i === todayIdx && <span className="ml-1 text-[8px] normal-case font-bold bg-primary text-white rounded px-1 py-0.5">today</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allPeriods.map(period => {
                      // Find time from any day's slot for this period
                      const sample = Object.values(slotMap).find(d => d[period])?.[period]
                      return (
                        <tr key={period} className="border-b border-black/4 last:border-0">
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center gap-1.5 text-xs text-muted">
                              <Clock size={10} />
                              <span className="font-mono">{sample ? `${fmtTime(sample.startTime)}` : `P${period + 1}`}</span>
                            </div>
                            {sample?.endTime && (
                              <p className="text-[10px] text-muted/60 font-mono mt-0.5 pl-3.5">–{fmtTime(sample.endTime)}</p>
                            )}
                          </td>
                          {DAYS.map((d, i) => {
                            const slot = slotMap[d]?.[period]
                            return (
                              <td key={d}
                                className={`px-2 py-2 text-center align-top ${i === todayIdx ? 'bg-primary/[0.03]' : ''}`}>
                                {slot ? (
                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-card border text-xs font-semibold ${subjColor(slot.subject)}`}>
                                    <BookOpen size={10} />
                                    {slot.subject}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted/30">—</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile list for active day */}
            <div className="md:hidden flex flex-col gap-3">
              {(schedule[DAYS[activeDay]] ?? []).length === 0 ? (
                <div className="bg-surface rounded-card shadow-sm p-8 text-center text-sm text-muted">
                  No classes scheduled for {DAYS_S[activeDay]}.
                </div>
              ) : (schedule[DAYS[activeDay]] ?? []).map((p, i, arr) => (
                <div key={i} className="bg-surface rounded-card shadow-sm p-4 flex gap-3">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={`size-9 rounded-full flex items-center justify-center border ${subjColor(p.subject)}`}>
                      <BookOpen size={14} />
                    </div>
                    {i < arr.length - 1 && <div className="w-px flex-1 bg-black/8 my-1" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{p.subject}</p>
                    {(p.startTime || p.endTime) && (
                      <p className="text-xs text-muted mt-1 flex items-center gap-1">
                        <Clock size={10} />
                        {fmtTime(p.startTime)} – {fmtTime(p.endTime)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
