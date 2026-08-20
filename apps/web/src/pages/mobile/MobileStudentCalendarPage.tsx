import { useState, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import MobileLayout, { studentMobileNav } from '../../components/layout/MobileLayout'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }


interface Deadline {
  label:       string
  due:         string
  status:      string
  statusColor: string
}

const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function buildWeeks(year: number, month: number): (number | null)[][] {
  const firstDOW = new Date(year, month, 1).getDay()
  const total    = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDOW).fill(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const now = new Date()
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  if (d.toDateString() === now.toDateString()) return 'Due Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Due Tomorrow'
  return 'Due ' + d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

const ASGN_COLORS = ['bg-pink-400', 'bg-primary', 'bg-amber-400', 'bg-green-500', 'bg-purple-500']

export default function MobileStudentCalendarPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const now   = new Date()
  const [year,        setYear]        = useState(now.getFullYear())
  const [month,       setMonth]       = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState(now.getDate())
  const [deadlines,   setDeadlines]   = useState<Deadline[]>([])
  const [highlighted, setHighlighted] = useState<Record<number, string>>({})
  const [loading,     setLoading]     = useState(true)

  useEffect(() => { if (profile?.id) loadData() }, [profile?.id, year, month])

  async function loadData() {
    setLoading(true)
    const studentId = profile!.id
    const schoolId  = profile!.school_id!

    const monthStr = String(month + 1).padStart(2, '0')
    const startStr = `${year}-${monthStr}-01`
    const endStr   = `${year}-${monthStr}-${new Date(year, month + 1, 0).getDate().toString().padStart(2, '0')}`

    const { data: ceData } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', studentId)

    const classIds = (ceData ?? []).map((r: any) => r.class_id)

    let asgnData: any[] = []
    if (classIds.length > 0) {
      const { data } = await supabase
        .from('assignments')
        .select('id, title, due_date, subjects(name)')
        .eq('school_id', schoolId)
        .in('class_id', classIds)
        .gte('due_date', startStr)
        .lte('due_date', endStr)
        .order('due_date')
      asgnData = data ?? []
    }

    const hl: Record<number, string> = {}
    asgnData.forEach((a: any, i: number) => {
      if (a.due_date) {
        const d = new Date(a.due_date + 'T00:00:00').getDate()
        hl[d] = ASGN_COLORS[i % ASGN_COLORS.length]
      }
    })
    setHighlighted(hl)

    buildDeadlinesForDay(selectedDay, asgnData)
    setDeadlines(buildDeadlinesForDay(selectedDay, asgnData))
    setLoading(false)

    function buildDeadlinesForDay(day: number, asgns: any[]): Deadline[] {
      return asgns.map(a => {
        const due = a.due_date ? new Date(a.due_date + 'T00:00:00') : null
        const overdue = due && due < new Date()
        const status = overdue ? 'Overdue' : 'Pending'
        const statusColor = overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
        return {
          label:       a.title,
          due:         a.due_date ? fmtDate(a.due_date) : '—',
          status,
          statusColor,
        }
      }).filter(d => {
        const a = asgns.find(x => x.title === d.label)
        if (!a?.due_date) return false
        const dDate = new Date(a.due_date + 'T00:00:00')
        return dDate.getDate() === day && dDate.getMonth() === month && dDate.getFullYear() === year
      })
    }
  }

  function selectDay(day: number) {
    setSelectedDay(day)
  }

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const weeks = buildWeeks(year, month)
  const today = now.getDate()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  return (
    <MobileLayout activePage="m/calendar" onNavigate={onNavigate} nav={studentMobileNav}>
      <div className="px-5 pt-5 pb-24">

        <div className="flex items-center justify-between mb-1">
          <button onClick={() => onNavigate('m/home')}><ChevronLeft size={22} /></button>
          <button><Search size={18} className="text-foreground" /></button>
        </div>

        <h1 className="text-2xl font-bold text-primary mb-1">Calendar</h1>
        <p className="text-xs text-muted mb-5">Stay informed about your academic schedule and upcoming activities.</p>

        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prev} className="text-muted hover:text-primary transition-colors"><ChevronLeft size={18} /></button>
          <span className="text-sm font-bold text-foreground">{MONTHS[month]} {year}</span>
          <button onClick={next} className="text-muted hover:text-primary transition-colors"><ChevronRight size={18} /></button>
        </div>

        {/* Calendar grid */}
        <div className="bg-surface rounded-2xl shadow-sm overflow-hidden mb-5">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-black/6">
            {DAYS_SHORT.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-semibold text-muted">{d}</div>
            ))}
          </div>
          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((day, di) => {
                if (!day) return <div key={di} className="h-10" />
                const isToday   = isCurrentMonth && day === today
                const isSel     = day === selectedDay
                const hlColor   = highlighted[day]
                return (
                  <button
                    key={di}
                    onClick={() => selectDay(day)}
                    className={`h-10 flex flex-col items-center justify-center relative transition-colors
                      ${isSel ? 'bg-primary/10' : ''}`}
                  >
                    <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold
                      ${isToday ? 'bg-primary text-white' : isSel ? 'text-primary' : 'text-foreground'}
                    `}>
                      {day}
                    </div>
                    {hlColor && !isToday && (
                      <div className={`absolute bottom-1 size-1.5 rounded-full ${hlColor}`} />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Selected day deadlines */}
        {loading ? (
          <div className="text-center py-8 text-sm text-muted">Loading…</div>
        ) : deadlines.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted">No assignments due on this day.</div>
        ) : (
          <>
            <h3 className="text-xs font-bold text-muted uppercase tracking-wide mb-3">
              {MONTHS[month]} {selectedDay} · {deadlines.length} deadline{deadlines.length !== 1 ? 's' : ''}
            </h3>
            <div className="flex flex-col gap-3">
              {deadlines.map((dl, i) => (
                <div key={i} className="bg-surface rounded-xl shadow-sm p-4 flex items-center gap-3">
                  <div className={`w-1.5 self-stretch rounded-full ${ASGN_COLORS[i % ASGN_COLORS.length]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{dl.label}</p>
                    <p className="text-xs text-muted mt-0.5">{dl.due}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${dl.statusColor}`}>{dl.status}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </MobileLayout>
  )
}
