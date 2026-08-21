import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Megaphone, Search, Users, FileText, ArrowRight } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { parentNav } from '../../components/layout/Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { resolveLinkedParentChild } from '../../lib/parentStudents'

type Props = { onNavigate: (page: string) => void }

interface CalendarItem {
  id: string
  title: string
  timeLabel: string
  subLabel: string
  tone: string
  icon: 'assignment' | 'meeting' | 'event' | 'announcement'
}

interface EventCard {
  id: string
  title: string
  location: string
  dateLabel: string
  accentTone: string
}

interface DeadlineCard {
  id: string
  title: string
  dueLabel: string
  status: string
  statusTone: string
}

interface AnnouncementCard {
  id: string
  body: string
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildWeeks(year: number, month: number) {
  const firstDOW = new Date(year, month, 1).getDay()
  const total = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDOW).fill(null)
  for (let day = 1; day <= total; day++) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

function dueLabelFromDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (date.getTime() === today.getTime()) return 'Due Today'
  if (date.getTime() === tomorrow.getTime()) return 'Due Tomorrow'
  return `Due: ${date.toLocaleDateString('en-GB', { month: 'long', day: 'numeric' })}`
}

function dateLabelFromRange(startIso: string, endIso: string | null) {
  const start = new Date(`${startIso}T00:00:00`)
  const startLabel = start.toLocaleDateString('en-GB', { month: 'long', day: 'numeric' })

  if (!endIso || endIso === startIso) return startLabel

  const end = new Date(`${endIso}T00:00:00`)
  const endLabel = end.toLocaleDateString('en-GB', { month: 'long', day: 'numeric' })
  return `${startLabel} - ${endLabel}`
}

function toneFromIndex(index: number) {
  if (index % 3 === 0) return 'bg-primary text-white'
  if (index % 3 === 1) return 'bg-amber-400 text-white'
  return 'bg-red-500 text-white'
}

function ItemIcon({ icon, className }: { icon: CalendarItem['icon']; className: string }) {
  if (icon === 'assignment') return <FileText size={16} className={className} />
  if (icon === 'meeting') return <Users size={16} className={className} />
  if (icon === 'announcement') return <Megaphone size={16} className={className} />
  return <CalendarDays size={16} className={className} />
}

function CalendarCard({ item }: { item: CalendarItem }) {
  return (
    <div className="rounded-[18px] border border-black/12 bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[16px] font-medium text-foreground">{item.title}</p>
          <p className="mt-4 text-[16px] font-extrabold text-foreground">{item.timeLabel}</p>
          <p className="mt-6 text-[14px] text-foreground/80">{item.subLabel}</p>
        </div>
        <div className={`flex size-[46px] shrink-0 items-center justify-center rounded-full ${item.tone}`}>
          <ItemIcon icon={item.icon} className="shrink-0" />
        </div>
      </div>
    </div>
  )
}

function EventCardView({ item }: { item: EventCard }) {
  return (
    <article className="overflow-hidden rounded-[18px] border border-black/12 bg-white shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
      <div className={`h-28 w-full bg-gradient-to-br ${item.accentTone}`} />
      <div className="p-4">
        <p className="text-[16px] font-medium text-foreground">{item.title}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-[14px] text-foreground/80">
          <span>{item.location}</span>
          <span className="font-extrabold text-foreground">{item.dateLabel}</span>
        </div>
      </div>
      <button className="flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-sm font-medium text-white">
        View All
        <ArrowRight size={16} />
      </button>
    </article>
  )
}

function DeadlineCardView({ item }: { item: DeadlineCard }) {
  return (
    <div className="rounded-[18px] border border-black/12 bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[16px] font-medium text-foreground">{item.title}</p>
          <p className="mt-4 text-[16px] font-extrabold text-foreground">{item.dueLabel}</p>
          <div className={`mt-6 inline-flex rounded-[10px] px-4 py-2 text-[14px] font-semibold ${item.statusTone}`}>
            {item.status}
          </div>
        </div>
        <div className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <FileText size={16} />
        </div>
      </div>
    </div>
  )
}

function AnnouncementCardView({ item }: { item: AnnouncementCard }) {
  return (
    <div className="rounded-[18px] border border-black/12 bg-amber-300 p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-[32rem] text-[14px] font-semibold leading-6 text-foreground">{item.body}</p>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-foreground">
          <Megaphone size={18} />
        </div>
      </div>
    </div>
  )
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-black/12 bg-white px-4 py-8 text-center text-sm text-muted shadow-sm">
      {message}
    </div>
  )
}

export default function ParentCalendarPage({ onNavigate }: Props) {
  const { profile, loading: authLoading } = useAuth()

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [childName, setChildName] = useState('')
  const [loading, setLoading] = useState(true)
  const [hasLinkedChild, setHasLinkedChild] = useState(true)
  const [todayActivities, setTodayActivities] = useState<CalendarItem[]>([])
  const [events, setEvents] = useState<EventCard[]>([])
  const [deadlineCards, setDeadlineCards] = useState<DeadlineCard[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementCard[]>([])
  const [highlightedDays, setHighlightedDays] = useState<Record<number, string>>({})

  useEffect(() => {
    if (authLoading) return
    if (!profile?.id || !profile.school_id) {
      setHasLinkedChild(false)
      setLoading(false)
      return
    }
    loadData()
  }, [authLoading, profile?.id, profile?.school_id, year, month, selectedDay])

  async function loadData() {
    if (!profile?.id || !profile.school_id) return

    setLoading(true)

    const { childId } = await resolveLinkedParentChild(profile.id, profile.school_id)
    if (!childId) {
      setHasLinkedChild(false)
      setChildName('')
      setTodayActivities([])
      setEvents([])
      setDeadlineCards([])
      setAnnouncements([])
      setHighlightedDays({})
      setLoading(false)
      return
    }

    setHasLinkedChild(true)

    const monthStr = String(month + 1).padStart(2, '0')
    const startStr = `${year}-${monthStr}-01`
    const endStr = `${year}-${monthStr}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`

    const [childRes, enrollRes, announcementsRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', childId).maybeSingle(),
      supabase.from('class_enrollments').select('class_id').eq('student_id', childId),
      supabase
        .from('announcements')
        .select('id, title, body, published_at, target_roles')
        .eq('school_id', profile.school_id)
        .order('published_at', { ascending: false })
        .limit(3),
    ])

    setChildName((childRes.data as { full_name: string | null } | null)?.full_name ?? '')

    const classIds = ((enrollRes.data ?? []) as { class_id: string }[]).map(item => item.class_id)

    const assignmentsPromise = classIds.length
      ? supabase
          .from('assignments')
          .select('id, title, due_date, subjects(name)')
          .eq('school_id', profile.school_id)
          .in('class_id', classIds)
          .gte('due_date', startStr)
          .lte('due_date', endStr)
          .order('due_date')
      : Promise.resolve({ data: [], error: null })

    const eventsPromise = supabase
      .from('calendar_events')
      .select('id, title, start_date, end_date, type, description')
      .eq('school_id', profile.school_id)
      .gte('start_date', startStr)
      .lte('start_date', endStr)
      .order('start_date')
      .limit(6)

    const [assignmentRes, eventsRes] = await Promise.all([assignmentsPromise, eventsPromise])

    const assignments = (assignmentRes.data ?? []) as {
      id: string
      title: string
      due_date: string | null
      subjects: { name: string } | null
    }[]

    const calendarEvents = (eventsRes.data ?? []) as {
      id: string
      title: string
      start_date: string
      end_date: string | null
      type: string | null
      description: string | null
    }[]

    const announcementRows = ((announcementsRes.data ?? []) as {
      id: string
      title: string
      body: string | null
      target_roles: string[] | null
    }[]).filter(item => !item.target_roles || item.target_roles.length === 0 || item.target_roles.includes('parent'))

    const selectedAssignmentItems = assignments
      .filter(item => {
        if (!item.due_date) return false
        const date = new Date(`${item.due_date}T00:00:00`)
        return date.getDate() === selectedDay && date.getMonth() === month && date.getFullYear() === year
      })
      .map<CalendarItem>(item => ({
        id: item.id,
        title: item.title,
        timeLabel: item.due_date ? dueLabelFromDate(item.due_date).replace('Due ', '') : 'Scheduled',
        subLabel: item.subjects?.name ?? 'Assignment',
        tone: 'bg-pink-100 text-pink-500',
        icon: 'assignment',
      }))

    const selectedEventItems = calendarEvents
      .filter(item => {
        const start = new Date(`${item.start_date}T00:00:00`)
        const end = new Date(`${(item.end_date ?? item.start_date)}T00:00:00`)
        const current = new Date(year, month, selectedDay)
        current.setHours(0, 0, 0, 0)
        return current >= start && current <= end
      })
      .map<CalendarItem>((item, index) => ({
        id: item.id,
        title: item.title,
        timeLabel: dateLabelFromRange(item.start_date, item.end_date),
        subLabel: item.type ? item.type.replace(/_/g, ' ') : 'School event',
        tone: index % 2 === 0 ? 'bg-primary/15 text-primary' : 'bg-amber-100 text-amber-600',
        icon: item.type?.toLowerCase().includes('meeting') ? 'meeting' : 'event',
      }))

    const nextDeadlineCards = assignments.slice(0, 3).map<DeadlineCard>(item => ({
      id: item.id,
      title: item.title,
      dueLabel: item.due_date ? dueLabelFromDate(item.due_date) : 'Due soon',
      status: item.due_date && new Date(`${item.due_date}T00:00:00`) < new Date() ? 'Past Due' : 'Pending',
      statusTone: item.due_date && new Date(`${item.due_date}T00:00:00`) < new Date()
        ? 'bg-red-500 text-white'
        : 'bg-amber-300 text-foreground',
    }))

    const nextEvents = calendarEvents.slice(0, 4).map<EventCard>((item, index) => ({
      id: item.id,
      title: item.title,
      location: item.description?.trim() || (item.type ? item.type.replace(/_/g, ' ') : 'School event'),
      dateLabel: dateLabelFromRange(item.start_date, item.end_date),
      accentTone: index % 2 === 0 ? 'from-primary/80 to-primary-deep' : 'from-amber-300 to-orange-400',
    }))

    const nextAnnouncements = announcementRows.map(item => ({
      id: item.id,
      body: item.body?.trim() || item.title,
    }))

    const nextHighlights: Record<number, string> = {}
    assignments.forEach((item, index) => {
      if (!item.due_date) return
      const date = new Date(`${item.due_date}T00:00:00`)
      nextHighlights[date.getDate()] = toneFromIndex(index)
    })
    calendarEvents.forEach((item, index) => {
      const start = new Date(`${item.start_date}T00:00:00`)
      nextHighlights[start.getDate()] = toneFromIndex(index + assignments.length)
    })

    setTodayActivities([...selectedAssignmentItems, ...selectedEventItems])
    setEvents(nextEvents)
    setDeadlineCards(nextDeadlineCards)
    setAnnouncements(nextAnnouncements)
    setHighlightedDays(nextHighlights)
    setLoading(false)
  }

  function goPrevMonth() {
    if (month === 0) {
      setYear(value => value - 1)
      setMonth(11)
      return
    }
    setMonth(value => value - 1)
  }

  function goNextMonth() {
    if (month === 11) {
      setYear(value => value + 1)
      setMonth(0)
      return
    }
    setMonth(value => value + 1)
  }

  const weeks = useMemo(() => buildWeeks(year, month), [year, month])
  const childFirstName = childName.split(' ')[0] ?? 'your child'
  const userName = profile?.full_name ?? 'Parent User'
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'P'

  function renderTopIntro() {
    return (
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-primary">Calendar</h1>
          <p className="mt-3 max-w-[32rem] text-[12px] leading-6 text-foreground">
            Stay informed about your child&apos;s academic schedule, events, and important school activities.
          </p>
        </div>
        <button type="button" className="flex size-[46px] shrink-0 items-center justify-center rounded-full border border-black/70 bg-white text-foreground">
          <Search size={22} />
        </button>
      </div>
    )
  }

  function renderCalendarGrid() {
    return (
      <div className="rounded-[18px] border border-black/15 bg-white p-4 shadow-[0_10px_24px_rgba(0,0,0,0.10)]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goPrevMonth}
            className="flex size-9 items-center justify-center rounded-full border border-black/10 text-foreground"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-3 text-sm text-white"
          >
            {MONTHS[month]}
            <ChevronDown size={16} />
          </button>

          <button
            type="button"
            onClick={goNextMonth}
            className="flex size-9 items-center justify-center rounded-full border border-black/10 text-foreground"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-4 text-center">
          {DAYS_SHORT.map(day => (
            <p key={day} className="text-[14px] font-semibold text-foreground">{day}</p>
          ))}

          {weeks.flat().map((day, index) => {
            if (!day) return <div key={`empty-${index}`} className="h-9" />

            const isSelected = day === selectedDay
            const tone = highlightedDays[day]

            return (
              <button
                key={`${day}-${index}`}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`mx-auto flex size-8 items-center justify-center rounded-full text-[14px] font-medium transition-colors ${
                  isSelected
                    ? tone || 'bg-primary/15 text-primary'
                    : tone || 'text-foreground'
                }`}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderContent() {
    return (
      <div className="space-y-8">
        {renderTopIntro()}
        {renderCalendarGrid()}

        <section>
          <h2 className="text-[20px] font-semibold text-foreground">Selected Day Activities</h2>
          <p className="mt-2 text-[12px] text-foreground">Assignments and school events scheduled for the selected day.</p>
          <div className="mt-5 space-y-4">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted">Loading calendar items…</div>
            ) : todayActivities.length === 0 ? (
              <EmptySection message="No assignments or events are scheduled for this day." />
            ) : (
              todayActivities.map(item => <CalendarCard key={item.id} item={item} />)
            )}
          </div>
        </section>

        <section>
          <h2 className="text-[20px] font-semibold text-foreground">Upcoming Events</h2>
          <p className="mt-2 text-[12px] text-foreground">Never miss important school activities.</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {loading ? (
              <div className="lg:col-span-2 py-10 text-center text-sm text-muted">Loading events…</div>
            ) : events.length === 0 ? (
              <div className="lg:col-span-2"><EmptySection message="No school events have been published for this month yet." /></div>
            ) : (
              events.map(item => <EventCardView key={item.id} item={item} />)
            )}
          </div>
        </section>

        <section>
          <h2 className="text-[20px] font-semibold text-foreground">Assignment Deadlines</h2>
          <p className="mt-2 text-[12px] text-foreground">Track pending submissions and due dates.</p>
          <div className="mt-5 space-y-4">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted">Loading deadlines…</div>
            ) : deadlineCards.length === 0 ? (
              <EmptySection message="No assignment deadlines were found for this month." />
            ) : (
              deadlineCards.map(item => <DeadlineCardView key={item.id} item={item} />)
            )}
          </div>
        </section>

        <section>
          <h2 className="text-[20px] font-semibold text-foreground">Recent Announcements</h2>
          <p className="mt-2 text-[12px] text-foreground">Official updates from the school.</p>
          <div className="mt-5 space-y-4">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted">Loading announcements…</div>
            ) : announcements.length === 0 ? (
              <EmptySection message="No parent announcements have been published yet." />
            ) : (
              announcements.map(item => <AnnouncementCardView key={item.id} item={item} />)
            )}
          </div>
        </section>
      </div>
    )
  }

  function renderNoLinkedChild() {
    return (
      <div className="rounded-[18px] border border-dashed border-black/12 bg-white px-4 py-8 text-center text-sm text-muted shadow-sm">
        Ask the school admin to link this parent account to a student before calendar records can appear here.
      </div>
    )
  }

  return (
    <>
      <div className="lg:hidden">
        <MobileLayout activePage="parent/calendar" onNavigate={onNavigate} nav={parentMobileNav}>
          <div className="px-[18px] pt-14 pb-28">
            <div className="mb-6">
              <button type="button" onClick={() => onNavigate('parent/home')} className="text-foreground">
                <ChevronLeft size={24} />
              </button>
            </div>
            {hasLinkedChild || loading ? renderContent() : renderNoLinkedChild()}
          </div>
        </MobileLayout>
      </div>

      <div className="hidden lg:block">
        <DashboardLayout
          activePage="parent/calendar"
          onNavigate={onNavigate}
          title="Calendar"
          subtitle={childName ? `${childFirstName}'s academic schedule and upcoming school activities.` : 'Academic schedule and upcoming school activities.'}
          nav={parentNav}
          user={{ name: userName, role: 'Parent', initials: userInitials }}
          mainClassName="flex-1 overflow-y-auto p-6 xl:p-8"
        >
          <div className="mx-auto max-w-7xl">
            {hasLinkedChild || loading ? renderContent() : renderNoLinkedChild()}
          </div>
        </DashboardLayout>
      </div>
    </>
  )
}
