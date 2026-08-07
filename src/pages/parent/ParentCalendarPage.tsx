import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Megaphone, Search, Users, FileText, ArrowRight } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { parentNav } from '../../components/layout/Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

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
  image: string
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
const EVENT_IMAGE = 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=80'

const FALLBACK_TODAY: CalendarItem[] = [
  {
    id: 'today-maths',
    title: 'Mathematics Assignment Due',
    timeLabel: '10:00 AM',
    subLabel: 'Grade 6 Mathematics',
    tone: 'bg-pink-100 text-pink-500',
    icon: 'assignment',
  },
  {
    id: 'today-assessment',
    title: 'Continuous Assessment',
    timeLabel: '10:00 AM',
    subLabel: 'Basic Science',
    tone: 'bg-primary/15 text-primary',
    icon: 'meeting',
  },
]

const FALLBACK_EVENTS: EventCard[] = [
  { id: 'event-cultural-day', title: 'Cultural Day', location: 'School Hall', dateLabel: 'August 15', image: EVENT_IMAGE },
  { id: 'event-pta', title: 'Parent-Teacher Meeting', location: 'Virtual Session', dateLabel: 'August 18', image: EVENT_IMAGE },
]

const FALLBACK_DEADLINES: DeadlineCard[] = [
  { id: 'deadline-essay-1', title: 'English Essay', dueLabel: 'Due Tomorrow', status: 'Pending', statusTone: 'bg-amber-300 text-foreground' },
  { id: 'deadline-essay-2', title: 'Social Studies Project', dueLabel: 'Due: August 10', status: 'Submitted', statusTone: 'bg-green-500 text-white' },
  { id: 'deadline-essay-3', title: 'Science Revision Pack', dueLabel: 'Due: August 10', status: 'In Progress', statusTone: 'bg-green-500 text-white' },
]

const FALLBACK_ANNOUNCEMENTS: AnnouncementCard[] = [
  { id: 'ann-1', body: 'School closes early on Friday due to staff training.' },
  { id: 'ann-2', body: 'Parents are encouraged to review the upcoming continuous assessment schedule with their children.' },
  { id: 'ann-3', body: 'The school cultural day dress rehearsal will take place after classes on Thursday.' },
]

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

function dayChipTone(day: number) {
  if (day % 5 === 0) return 'bg-primary text-white'
  if (day % 11 === 0) return 'bg-amber-400 text-white'
  if (day % 19 === 0) return 'bg-red-500 text-white'
  if (day % 29 === 0) return 'bg-primary text-white'
  return ''
}

function ItemIcon({ icon, className }: { icon: CalendarItem['icon']; className: string }) {
  if (icon === 'assignment') return <FileText size={16} className={className} />
  if (icon === 'meeting') return <Users size={16} className={className} />
  if (icon === 'announcement') return <Megaphone size={16} className={className} />
  return <CalendarDays size={16} className={className} />
}

function CalendarCard({
  item,
}: {
  item: CalendarItem
}) {
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
      <div className="h-28 w-full">
        <img src={item.image} alt="" className="h-full w-full object-cover" />
      </div>
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

export default function ParentCalendarPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [childName, setChildName] = useState('')
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [todayActivities, setTodayActivities] = useState<CalendarItem[]>(FALLBACK_TODAY)
  const [deadlineCards, setDeadlineCards] = useState<DeadlineCard[]>(FALLBACK_DEADLINES)
  const [highlightedDays, setHighlightedDays] = useState<Record<number, string>>({})

  const childId = sessionStorage.getItem('learnora_selected_child') ?? ''

  useEffect(() => {
    if (profile?.id) loadData()
  }, [profile?.id, profile?.school_id, childId, year, month, selectedDay])

  async function loadData() {
    setLoading(true)

    if (!profile?.school_id || !childId) {
      useFallbackData()
      return
    }

    const [childRes, enrollRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', childId).maybeSingle(),
      supabase.from('class_enrollments').select('class_id').eq('student_id', childId),
    ])

    setChildName((childRes.data as { full_name: string | null } | null)?.full_name ?? '')

    const classIds = ((enrollRes.data ?? []) as { class_id: string }[]).map(item => item.class_id)
    if (!classIds.length) {
      useFallbackData()
      return
    }

    const monthStr = String(month + 1).padStart(2, '0')
    const startStr = `${year}-${monthStr}-01`
    const endStr = `${year}-${monthStr}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('assignments')
      .select('id, title, due_date, subjects(name)')
      .eq('school_id', profile.school_id)
      .in('class_id', classIds)
      .gte('due_date', startStr)
      .lte('due_date', endStr)
      .order('due_date')

    if (error || !(data ?? []).length) {
      useFallbackData()
      return
    }

    const assignments = (data ?? []) as {
      id: string
      title: string
      due_date: string | null
      subjects: { name: string } | null
    }[]

    const selectedItems = assignments
      .filter(item => {
        if (!item.due_date) return false
        const date = new Date(`${item.due_date}T00:00:00`)
        return date.getDate() === selectedDay && date.getMonth() === month && date.getFullYear() === year
      })
      .map<CalendarItem>(item => ({
        id: item.id,
        title: item.title,
        timeLabel: item.due_date ? dueLabelFromDate(item.due_date).replace('Due ', '') : 'Scheduled',
        subLabel: item.subjects?.name ?? 'Academic activity',
        tone: 'bg-pink-100 text-pink-500',
        icon: 'assignment',
      }))

    const deadlineItems = assignments.slice(0, 3).map<DeadlineCard>((item, index) => ({
      id: item.id,
      title: item.title,
      dueLabel: item.due_date ? dueLabelFromDate(item.due_date) : 'Due soon',
      status: index === 0 ? 'Pending' : index === 1 ? 'Submitted' : 'In Progress',
      statusTone: index === 0 ? 'bg-amber-300 text-foreground' : 'bg-green-500 text-white',
    }))

    const nextHighlights: Record<number, string> = {}
    assignments.forEach((item, index) => {
      if (!item.due_date) return
      const date = new Date(`${item.due_date}T00:00:00`)
      const tone = index % 3 === 0 ? 'bg-primary text-white' : index % 3 === 1 ? 'bg-amber-400 text-white' : 'bg-red-500 text-white'
      nextHighlights[date.getDate()] = tone
    })

    setTodayActivities(selectedItems.length ? selectedItems : FALLBACK_TODAY)
    setDeadlineCards(deadlineItems.length ? deadlineItems : FALLBACK_DEADLINES)
    setHighlightedDays(nextHighlights)
    setUsingFallback(false)
    setLoading(false)
  }

  function useFallbackData() {
    setChildName(current => current || 'Olive Princely Ashuma')
    setTodayActivities(FALLBACK_TODAY)
    setDeadlineCards(FALLBACK_DEADLINES)
    setHighlightedDays({
      5: 'bg-primary text-white',
      11: 'bg-amber-400 text-white',
      19: 'bg-red-500 text-white',
      29: 'bg-primary text-white',
    })
    setUsingFallback(true)
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
            const tone = highlightedDays[day] ?? dayChipTone(day)
            const isOutsideSelection = index >= weeks.flat().length - 4 && day <= 4 && new Date(year, month, 1).getDay() !== 0

            return (
              <button
                key={`${day}-${index}`}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`mx-auto flex size-8 items-center justify-center rounded-full text-[14px] font-medium transition-colors ${
                  isOutsideSelection
                    ? 'text-muted'
                    : isSelected
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

        {usingFallback && (
          <div className="rounded-[18px] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary">
            Preview mode: showing fallback calendar items because this parent has no linked calendar data yet.
          </div>
        )}

        {renderCalendarGrid()}

        <section>
          <h2 className="text-[20px] font-semibold text-foreground">Today&apos;s Activities</h2>
          <p className="mt-2 text-[12px] text-foreground">Events and academic activities scheduled for today.</p>
          <div className="mt-5 space-y-4">
            {(loading ? FALLBACK_TODAY : todayActivities).map(item => (
              <CalendarCard key={item.id} item={item} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[20px] font-semibold text-foreground">Upcoming Events</h2>
          <p className="mt-2 text-[12px] text-foreground">Never miss important school activities.</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {FALLBACK_EVENTS.map(item => (
              <EventCardView key={item.id} item={item} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[20px] font-semibold text-foreground">Assignment Deadlines</h2>
          <p className="mt-2 text-[12px] text-foreground">Track pending submissions and due dates.</p>
          <div className="mt-5 space-y-4">
            {(loading ? FALLBACK_DEADLINES : deadlineCards).map(item => (
              <DeadlineCardView key={item.id} item={item} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[20px] font-semibold text-foreground">Recent Announcements</h2>
          <p className="mt-2 text-[12px] text-foreground">Official updates from the school.</p>
          <div className="mt-5 space-y-4">
            {FALLBACK_ANNOUNCEMENTS.map(item => (
              <AnnouncementCardView key={item.id} item={item} />
            ))}
          </div>
        </section>
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
            {renderContent()}
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
            {renderContent()}
          </div>
        </DashboardLayout>
      </div>
    </>
  )
}
