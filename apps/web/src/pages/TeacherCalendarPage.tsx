import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Video, FileText, ClipboardCheck, Calendar } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

type EventType = 'assessment' | 'attendance' | 'live-class' | 'meeting'

interface CalEvent {
  id:    string
  day:   number
  month: number
  year:  number
  title: string
  time:  string
  type:  EventType
  cls:   string
}

const eventTypeStyle: Record<EventType, string> = {
  'assessment': 'bg-amber-50 text-amber-700 border-amber-200',
  'attendance': 'bg-green-50 text-green-700 border-green-200',
  'live-class': 'bg-primary/10 text-primary border-primary/20',
  'meeting':    'bg-purple-50 text-purple-700 border-purple-200',
}

const eventIcon: Record<EventType, typeof Video> = {
  'assessment': FileText,
  'attendance': ClipboardCheck,
  'live-class': Video,
  'meeting':    Calendar,
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December']

function buildDays(year: number, month: number) {
  const firstDOW = (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0
  const total    = new Date(year, month + 1, 0).getDate()
  return { firstDOW, total }
}

export default function TeacherCalendarPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const now = new Date()
  const [year,        setYear]        = useState(now.getFullYear())
  const [month,       setMonth]       = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate())
  const [events,      setEvents]      = useState<CalEvent[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => { if (profile?.id) loadEvents() }, [profile?.id, year, month])

  async function loadEvents() {
    setLoading(true)
    const teacherId = profile!.id
    const schoolId  = profile!.school_id!

    const monthStr = String(month + 1).padStart(2, '0')
    const startStr = `${year}-${monthStr}-01`
    const endStr   = `${year}-${monthStr}-${new Date(year, month + 1, 0).getDate().toString().padStart(2, '0')}`

    const [asgnRes, taRes] = await Promise.all([
      supabase.from('assignments')
        .select('id, title, due_date, classes(name)')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)
        .gte('due_date', startStr)
        .lte('due_date', endStr),
      supabase.from('attendance_records')
        .select('date, classes(name)')
        .eq('teacher_id', teacherId)
        .gte('date', startStr)
        .lte('date', endStr),
    ])

    const evts: CalEvent[] = []

    for (const a of (asgnRes.data ?? []) as unknown as { id: string; title: string; due_date: string; classes: { name: string } | null }[]) {
      if (!a.due_date) continue
      const d = new Date(a.due_date + 'T00:00:00')
      evts.push({ id: a.id, day: d.getDate(), month: d.getMonth(), year: d.getFullYear(), title: a.title, time: 'Due', type: 'assessment', cls: a.classes?.name ?? '' })
    }

    for (const r of (taRes.data ?? []) as unknown as { date: string; classes: { name: string } | null }[]) {
      if (!r.date) continue
      const d = new Date(r.date + 'T00:00:00')
      evts.push({ id: r.date, day: d.getDate(), month: d.getMonth(), year: d.getFullYear(), title: 'Mark Attendance', time: '8:00 AM', type: 'attendance', cls: r.classes?.name ?? '' })
    }

    setEvents(evts)
    setLoading(false)
  }

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const { firstDOW, total } = buildDays(year, month)
  const dayEvents = (d: number) => events.filter(e => e.day === d && e.month === month && e.year === year)
  const selectedEvents = selectedDay ? dayEvents(selectedDay) : []
  const isToday = (d: number) => d === now.getDate() && month === now.getMonth() && year === now.getFullYear()

  return (
    <DashboardLayout
      activePage="teacher-calendar"
      onNavigate={onNavigate}
      title="Calendar"
      subtitle="Your teaching schedule and upcoming events"
      nav={teacherNav}
      user={sidebarUser}
    >
      <div className="flex flex-col gap-5 max-w-[1100px]">

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button onClick={prev} className="size-9 rounded-full border border-black/15 flex items-center justify-center text-muted hover:border-primary hover:text-primary transition-colors">
              <ChevronLeft size={15} />
            </button>
            <span className="text-base font-bold text-foreground min-w-[140px] text-center">{MONTHS[month]} {year}</span>
            <button onClick={next} className="size-9 rounded-full border border-black/15 flex items-center justify-center text-muted hover:border-primary hover:text-primary transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
          <button
            onClick={() => onNavigate('schedule-class')}
            className="flex items-center gap-1.5 h-9 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary ml-auto"
          >
            <Plus size={13} /> Schedule Class
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
          {/* Calendar grid */}
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b border-black/8">
              {WEEKDAYS.map(d => <div key={d} className="py-3 text-center text-xs font-semibold text-muted">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDOW }).map((_, i) => (
                <div key={`e${i}`} className="h-[90px] border-b border-r border-black/4 bg-canvas/30" />
              ))}
              {Array.from({ length: total }).map((_, i) => {
                const day   = i + 1
                const evts  = dayEvents(day)
                const today = isToday(day)
                const sel   = day === selectedDay
                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`h-[90px] border-b border-r border-black/4 p-1.5 cursor-pointer transition-colors ${sel ? 'bg-primary/5' : 'hover:bg-canvas/60'}`}
                  >
                    <div className={`text-xs font-bold mb-1 size-5 flex items-center justify-center rounded-full ${today ? 'bg-primary text-white' : 'text-foreground'}`}>
                      {day}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {evts.slice(0, 2).map((ev, ei) => (
                        <div key={ei} className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate border ${eventTypeStyle[ev.type]}`}>
                          {ev.title}
                        </div>
                      ))}
                      {evts.length > 2 && <div className="text-[9px] text-muted font-semibold">+{evts.length - 2} more</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected day panel */}
          <div className="bg-surface rounded-card shadow-sm">
            <div className="px-5 py-4 border-b border-black/6">
              <p className="text-sm font-bold text-foreground">
                {selectedDay ? `${MONTHS[month]} ${selectedDay}, ${year}` : 'Select a day'}
              </p>
              <p className="text-xs text-muted mt-0.5">{loading ? '…' : `${selectedEvents.length} event${selectedEvents.length !== 1 ? 's' : ''}`}</p>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {loading ? (
                <div className="text-center py-8 text-sm text-muted">Loading…</div>
              ) : selectedEvents.length === 0 ? (
                <div className="py-8 text-center">
                  <Calendar size={28} className="mx-auto mb-2 text-muted opacity-30" />
                  <p className="text-sm text-muted">No events this day.</p>
                </div>
              ) : selectedEvents.map((ev, ei) => {
                const Icon  = eventIcon[ev.type]
                const style = eventTypeStyle[ev.type]
                return (
                  <div key={ei} className={`p-3 rounded-card border ${style}`}>
                    <div className="flex items-start gap-2.5">
                      <div className={`size-7 rounded-full flex items-center justify-center shrink-0 ${style}`}>
                        <Icon size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-snug">{ev.title}</p>
                        <p className="text-xs opacity-70 mt-0.5">{ev.time}{ev.cls ? ` · ${ev.cls}` : ''}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="px-5 pb-5 pt-2 border-t border-black/6">
              <p className="text-xs font-semibold text-muted mb-2">Legend</p>
              <div className="flex flex-col gap-1.5">
                {(Object.entries(eventTypeStyle) as [EventType, string][]).map(([type, style]) => {
                  const Icon = eventIcon[type]
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <div className={`size-5 rounded flex items-center justify-center border ${style}`}><Icon size={10} /></div>
                      <span className="text-xs text-muted capitalize">{type.replace('-', ' ')}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
