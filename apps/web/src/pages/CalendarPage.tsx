import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface CalEvent {
  id:         string
  title:      string
  start_date: string
  end_date:   string
  type:       string
}

type DayEntry = { d: number; mo: 'prev' | 'cur' | 'next' }

const typeColor: Record<string, string> = {
  exam:     'bg-red-400',
  holiday:  'bg-green-500',
  activity: 'bg-primary',
  deadline: 'bg-amber-500',
}
function eventColor(type: string) { return typeColor[type] ?? 'bg-primary' }

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildDays(year: number, month: number): DayEntry[] {
  const firstDOW      = new Date(year, month, 1).getDay()
  const daysInMonth   = new Date(year, month + 1, 0).getDate()
  const prevMonthLast = new Date(year, month, 0).getDate()
  const days: DayEntry[] = []
  for (let i = firstDOW - 1; i >= 0; i--) days.push({ d: prevMonthLast - i, mo: 'prev' })
  for (let d = 1; d <= daysInMonth; d++) days.push({ d, mo: 'cur' })
  let next = 1
  while (days.length < 35) days.push({ d: next++, mo: 'next' })
  while (days.length % 7 !== 0) days.push({ d: next++, mo: 'next' })
  return days
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function CalendarPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const now     = new Date()
  const [viewDate, setViewDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [events,   setEvents]   = useState<CalEvent[]>([])
  const [loading,  setLoading]  = useState(false)

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const days  = buildDays(year, month)

  const isTeacher = profile?.role === 'teacher'

  useEffect(() => { if (profile?.school_id) loadEvents() }, [profile?.school_id, year, month])

  async function loadEvents() {
    setLoading(true)
    const startStr = toDateStr(year, month, 1)
    const endStr   = toDateStr(year, month, new Date(year, month + 1, 0).getDate())

    const { data } = await supabase
      .from('calendar_events')
      .select('id, title, start_date, end_date, type')
      .eq('school_id', profile!.school_id!)
      .gte('start_date', startStr)
      .lte('start_date', endStr)
      .order('start_date', { ascending: true })

    setEvents((data ?? []) as unknown as CalEvent[])
    setLoading(false)
  }

  function goToPrev() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function goToNext() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }
  function goToday()  { setViewDate(new Date(now.getFullYear(), now.getMonth(), 1)) }

  function eventsOnDay(d: number) {
    const dateStr = toDateStr(year, month, d)
    return events.filter(e => e.start_date <= dateStr && e.end_date >= dateStr)
  }

  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate())

  const upcoming = events.filter(e => e.start_date >= toDateStr(year, month, now.getDate())).slice(0, 5)

  return (
    <DashboardLayout
      activePage="calendar"
      onNavigate={onNavigate}
      title="Calendar"
      subtitle="Academic Calendar · Track classes, deadlines and events"
      nav={isTeacher ? teacherNav : undefined}
      user={sidebarUser}
    >
      <div className="flex gap-6 min-h-full">

        {/* Calendar grid */}
        <div className="flex-1 min-w-0 bg-surface rounded-card shadow-sm p-6 self-start">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button onClick={goToPrev} className="p-1.5 hover:bg-canvas rounded-md transition-colors">
                <ChevronLeft size={18} className="text-muted" />
              </button>
              <h2 className="text-xl font-bold text-foreground">
                {loading ? '…' : `${MONTHS[month]} ${year}`}
              </h2>
              <button onClick={goToNext} className="p-1.5 hover:bg-canvas rounded-md transition-colors">
                <ChevronRight size={18} className="text-muted" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {isTeacher && (
                <button className="flex items-center gap-2 h-9 px-4 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors">
                  <Plus size={14} /> Add Event
                </button>
              )}
              <button onClick={goToday} className="h-9 px-4 border border-muted text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
                Today
              </button>
              <button className="flex items-center gap-1.5 h-9 px-4 border border-muted text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
                <Filter size={14} /> Filter
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-muted uppercase tracking-wide py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-t border-l border-black/6">
            {days.map((day, idx) => {
              const dayEvents = day.mo === 'cur' ? eventsOnDay(day.d) : []
              const dateStr   = day.mo === 'cur' ? toDateStr(year, month, day.d) : ''
              const isToday   = dateStr === todayStr
              return (
                <div key={idx} className={`min-h-[100px] p-2 flex flex-col gap-1 border-r border-b border-black/6
                  ${day.mo === 'cur' ? 'bg-surface' : 'bg-canvas/50'}`}>
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-primary text-white' : day.mo === 'cur' ? 'text-foreground' : 'text-muted/40'}`}>
                    {day.d}
                  </span>
                  {dayEvents.slice(0, 2).map((ev, ei) => (
                    <div key={ei} className={`${eventColor(ev.type)} text-white text-xs font-medium px-1.5 py-0.5 rounded truncate`}>
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] text-muted">+{dayEvents.length - 2} more</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 shrink-0 flex flex-col gap-4 self-start">
          <div className="bg-surface rounded-card shadow-sm p-5">
            <h3 className="text-base font-bold text-foreground mb-4">Upcoming Events</h3>
            <div className="flex flex-col gap-3">
              {upcoming.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted">No upcoming events.</div>
              ) : upcoming.map(ev => (
                <div key={ev.id} className={`p-4 rounded-card ${eventColor(ev.type) === 'bg-primary' ? 'bg-primary/8' : 'bg-canvas'} flex flex-col gap-1`}>
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${eventColor(ev.type)} shrink-0`} />
                    <p className="text-sm font-semibold text-foreground">{ev.title}</p>
                  </div>
                  <p className="text-xs text-muted pl-4">{new Date(ev.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                  <p className="text-xs text-muted pl-4 capitalize">{ev.type}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface rounded-card shadow-sm p-5">
            <h3 className="text-sm font-bold text-foreground mb-3">Event Types</h3>
            <div className="flex flex-col gap-2.5">
              {[
                { label: 'Exam',     color: 'bg-red-400'    },
                { label: 'Holiday',  color: 'bg-green-500'  },
                { label: 'Activity', color: 'bg-primary'    },
                { label: 'Deadline', color: 'bg-amber-500'  },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span className={`size-3 rounded-full ${item.color}`} />
                  <span className="text-xs text-muted">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
