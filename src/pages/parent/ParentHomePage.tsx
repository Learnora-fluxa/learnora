import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  MessageSquare,
  Settings,
  ShieldCheck,
  Star,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { parentNav } from '../../components/layout/Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface ChildData {
  id: string
  name: string
  className: string
  gpa: string
  feeOwed: boolean
  feeAmt: string
  feeDue: string
  subjects: { name: string; avgScore: number; grade: string }[]
  attRate: number
  attPresent: number
  attAbsent: number
}

interface NotifItem {
  id: string
  title: string
  body: string
  time: string
  read: boolean
}

type QuickAction = {
  label: string
  page: string
  icon: LucideIcon
  iconWrap: string
  iconColor: string
}

const quickActions: QuickAction[] = [
  { label: 'Academic Progress', page: 'parent/progress', icon: TrendingUp, iconWrap: 'bg-pink-100', iconColor: 'text-pink-500' },
  { label: 'Report Card', page: 'parent/report-cards', icon: FileText, iconWrap: 'bg-red-100', iconColor: 'text-red-500' },
  { label: 'Attendance', page: 'parent/attendance', icon: CalendarDays, iconWrap: 'bg-green-100', iconColor: 'text-green-500' },
  { label: 'Messages', page: 'parent/chat', icon: MessageSquare, iconWrap: 'bg-sky-100', iconColor: 'text-sky-500' },
]

const fallbackChildren: ChildData[] = [
  {
    id: 'demo-child-olive',
    name: 'Olive Princely Ashuma',
    className: 'Primary 5A · Greenfield Academy',
    gpa: '4.2',
    feeOwed: true,
    feeAmt: '₦25,000',
    feeDue: '12 Aug 2026',
    subjects: [
      { name: 'Mathematics', avgScore: 98, grade: 'A' },
      { name: 'English', avgScore: 78, grade: 'B' },
      { name: 'Government', avgScore: 56, grade: 'C' },
    ],
    attRate: 96,
    attPresent: 24,
    attAbsent: 1,
  },
]

const fallbackNotifs: NotifItem[] = [
  {
    id: 'demo-notif-score',
    title: 'New Mathematics Score Added',
    body: 'Olive scored 98% in the latest mathematics assessment.',
    time: '2h ago',
    read: false,
  },
  {
    id: 'demo-notif-attendance',
    title: 'Attendance Record Updated',
    body: 'Present today. Attendance remains strong this term.',
    time: '4h ago',
    read: true,
  },
  {
    id: 'demo-notif-feedback',
    title: 'Teacher Comment Received',
    body: 'Olive is participating actively in class and showing steady improvement.',
    time: '1d ago',
    read: true,
  },
]

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const m = (now.getTime() - d.getTime()) / 60000
  if (m < 60) return `${Math.max(1, Math.round(m))}m ago`
  if (m < 1440) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function scoreTone(score: number) {
  if (score >= 85) return { pill: 'bg-green-100 text-green-500', bar: 'bg-green-500', track: 'bg-green-100' }
  if (score >= 70) return { pill: 'bg-sky-100 text-sky-500', bar: 'bg-sky-500', track: 'bg-sky-100' }
  return { pill: 'bg-amber-100 text-orange-500', bar: 'bg-orange-500', track: 'bg-amber-100' }
}

function ChildSwitcher({
  children,
  child,
  pickerOpen,
  setPickerOpen,
  selectedIdx,
  selectChild,
}: {
  children: ChildData[]
  child?: ChildData
  pickerOpen: boolean
  setPickerOpen: React.Dispatch<React.SetStateAction<boolean>>
  selectedIdx: number
  selectChild: (idx: number) => void
}) {
  if (!child || children.length <= 1) return null

  return (
    <div className="relative">
      <button
        onClick={() => setPickerOpen(open => !open)}
        className="w-full flex items-center justify-between gap-3 rounded-full border border-black/10 bg-white px-4 py-3 text-left shadow-sm"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {child.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{child.name}</p>
            <p className="truncate text-xs text-muted">{child.className}</p>
          </div>
        </div>
        <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
      </button>

      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-card border border-black/8 bg-white shadow-xl">
            {children.map((entry, index) => (
              <button
                key={entry.id}
                onClick={() => selectChild(index)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  index === selectedIdx ? 'bg-primary/5' : 'hover:bg-canvas'
                }`}
              >
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {entry.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{entry.name}</p>
                  <p className="truncate text-xs text-muted">{entry.className}</p>
                </div>
                {index === selectedIdx && <span className="text-xs font-bold text-primary">Active</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SectionHeader({
  title,
  cta,
  onClick,
}: {
  title: string
  cta?: string
  onClick?: () => void
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {cta && onClick && (
        <button onClick={onClick} className="shrink-0 text-sm font-medium text-foreground">
          {cta}
        </button>
      )}
    </div>
  )
}

function EmptyLinkedState() {
  return (
    <div className="rounded-[28px] border border-dashed border-black/12 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ShieldCheck size={22} />
      </div>
      <p className="text-lg font-semibold text-foreground">No children linked yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Contact your school administrator to connect your child&apos;s account to this parent profile.
      </p>
    </div>
  )
}

function PreviewNotice() {
  return (
    <div className="rounded-[20px] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary">
      Preview mode: showing fallback child data because this parent has no linked child yet.
    </div>
  )
}

export default function ParentHomePage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [children, setChildren] = useState<ChildData[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [notifs, setNotifs] = useState<NotifItem[]>([])
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)

  const parentFirstName = profile?.full_name?.split(' ')[0] ?? 'Parent'
  const userName = profile?.full_name ?? 'Parent'
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'P'

  useEffect(() => {
    if (profile?.id) loadData()
  }, [profile?.id])

  async function loadData() {
    setLoading(true)
    const parentId = profile!.id
    const schoolId = profile!.school_id!

    const { data: linkData } = await supabase
      .from('parent_student_links')
      .select('student_id')
      .eq('parent_id', parentId)
      .eq('school_id', schoolId)

    const studentIds = (linkData ?? []).map((l: { student_id: string }) => l.student_id)

    const notifsPromise = supabase
      .from('notifications')
      .select('id, title, body, read, created_at')
      .eq('user_id', parentId)
      .order('created_at', { ascending: false })
      .limit(4)

    if (!studentIds.length) {
      setUsingFallback(true)
      setNotifs(fallbackNotifs)
      setChildren(fallbackChildren)
      setSelectedIdx(0)
      sessionStorage.setItem('learnora_selected_child', fallbackChildren[0].id)
      setLoading(false)
      return
    }

    setUsingFallback(false)

    const [profilesRes, enrollRes, gradeRes, invoiceRes, attRes, nd] = await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', studentIds),
      supabase.from('class_enrollments')
        .select('student_id, class_id, classes(name)')
        .in('student_id', studentIds),
      supabase.from('grade_summaries')
        .select('student_id, average_score, grade_letter, subjects(name)')
        .in('student_id', studentIds),
      supabase.from('invoices')
        .select('student_id, amount, status, due_date')
        .in('student_id', studentIds)
        .eq('school_id', schoolId),
      supabase.from('attendance_records')
        .select('student_id, status')
        .in('student_id', studentIds)
        .order('date', { ascending: false })
        .limit(studentIds.length * 30),
      notifsPromise,
    ])

    setNotifs(mapNotifs(nd.data))

    const profileMap: Record<string, string> = {}
    for (const p of (profilesRes.data ?? []) as { id: string; full_name: string | null }[]) {
      profileMap[p.id] = p.full_name ?? 'Student'
    }

    const classMap: Record<string, string> = {}
    for (const e of (enrollRes.data ?? []) as unknown as { student_id: string; classes: { name: string } | null }[]) {
      if (!classMap[e.student_id]) classMap[e.student_id] = e.classes?.name ?? '—'
    }

    const gradesByStudent: Record<string, { name: string; avgScore: number; grade: string }[]> = {}
    for (const g of (gradeRes.data ?? []) as unknown as {
      student_id: string
      average_score: number | null
      grade_letter: string | null
      subjects: { name: string } | null
    }[]) {
      if (!gradesByStudent[g.student_id]) gradesByStudent[g.student_id] = []
      if (g.subjects?.name) {
        gradesByStudent[g.student_id].push({
          name: g.subjects.name,
          avgScore: g.average_score ?? 0,
          grade: g.grade_letter ?? '—',
        })
      }
    }

    const invoicesByStudent: Record<string, { amount: number; status: string; due_date: string | null }[]> = {}
    for (const inv of (invoiceRes.data ?? []) as {
      student_id: string
      amount: string | number
      status: string
      due_date: string | null
    }[]) {
      if (!invoicesByStudent[inv.student_id]) invoicesByStudent[inv.student_id] = []
      invoicesByStudent[inv.student_id].push({
        amount: parseFloat(String(inv.amount)),
        status: inv.status,
        due_date: inv.due_date,
      })
    }

    const attByStudent: Record<string, { present: number; absent: number; late: number; total: number }> = {}
    for (const a of (attRes.data ?? []) as { student_id: string; status: string }[]) {
      if (!attByStudent[a.student_id]) attByStudent[a.student_id] = { present: 0, absent: 0, late: 0, total: 0 }
      const stats = attByStudent[a.student_id]
      if (a.status !== 'holiday') stats.total++
      if (a.status === 'present') stats.present++
      else if (a.status === 'absent') stats.absent++
      else if (a.status === 'late') stats.late++
    }

    const kids: ChildData[] = studentIds.map(id => {
      const grades = gradesByStudent[id] ?? []
      const invoices = invoicesByStudent[id] ?? []
      const att = attByStudent[id] ?? { present: 0, absent: 0, late: 0, total: 0 }
      const gpaScore = grades.length
        ? parseFloat((grades.reduce((sum, grade) => sum + grade.avgScore, 0) / grades.length / 20).toFixed(1))
        : null

      const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'waived')
      const totalOwed = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0)
      const nearestDue = unpaidInvoices.reduce((nearest: string | null, inv) => {
        if (!inv.due_date) return nearest
        if (!nearest || inv.due_date < nearest) return inv.due_date
        return nearest
      }, null)

      return {
        id,
        name: profileMap[id] ?? 'Student',
        className: classMap[id] ?? '—',
        gpa: gpaScore !== null ? gpaScore.toString() : '—',
        feeOwed: totalOwed > 0,
        feeAmt: totalOwed > 0 ? fmt(totalOwed) : '',
        feeDue: nearestDue ? fmtDate(nearestDue) : '',
        subjects: grades.slice(0, 4),
        attRate: att.total > 0 ? Math.round((att.present / att.total) * 100) : 0,
        attPresent: att.present,
        attAbsent: att.absent,
      }
    })

    const storedChildId = sessionStorage.getItem('learnora_selected_child')
    const initialIndex = storedChildId ? Math.max(0, kids.findIndex(kid => kid.id === storedChildId)) : 0

    setChildren(kids)
    setSelectedIdx(initialIndex)
    if (kids[initialIndex]) sessionStorage.setItem('learnora_selected_child', kids[initialIndex].id)
    setLoading(false)
  }

  function mapNotifs(data: unknown[] | null | undefined): NotifItem[] {
    return (data ?? []).map((n: unknown) => {
      const notif = n as {
        id: string
        title: string
        body: string | null
        read: boolean | null
        created_at: string | null
      }
      return {
        id: notif.id,
        title: notif.title,
        body: notif.body ?? '',
        time: notif.created_at ? fmtTime(notif.created_at) : '—',
        read: notif.read ?? false,
      }
    })
  }

  const child = children[selectedIdx]

  const overviewCards = useMemo(() => {
    if (!child) return []

    const subjectCards = child.subjects.slice(0, 3).map(subject => ({
      type: 'subject' as const,
      title: subject.name,
      grade: subject.grade,
      score: subject.avgScore,
    }))

    return [
      {
        type: 'gpa' as const,
        title: 'Overall CGPA',
        gpa: child.gpa,
      },
      ...subjectCards,
    ]
  }, [child])

  const upcomingItems = useMemo(() => {
    if (!child) return []

    const items = []
    if (child.feeOwed) {
      items.push({
        title: 'School Fees Reminder',
        sub: child.feeDue ? `Due ${child.feeDue}` : 'Outstanding balance requires attention',
        page: 'parent/fees',
        icon: CreditCard,
      })
    }

    items.push({
      title: 'Progress Review',
      sub: `Check ${child.name.split(' ')[0]}'s latest subject performance`,
      page: 'parent/progress',
      icon: TrendingUp,
    })

    items.push({
      title: 'School Calendar',
      sub: 'View school events and upcoming important dates',
      page: 'parent/calendar',
      icon: CalendarDays,
    })

    return items.slice(0, 3)
  }, [child])

  const teacherFeedback = useMemo(() => {
    const source = notifs.find(notif => notif.body) ?? notifs[0]
    if (!source) return null

    return {
      title: source.title,
      body: source.body || 'Open updates to review the latest note from your child’s school.',
      time: source.time,
    }
  }, [notifs])

  function selectChild(index: number) {
    setSelectedIdx(index)
    setPickerOpen(false)
    if (children[index]) sessionStorage.setItem('learnora_selected_child', children[index].id)
  }

  function navigateWithChild(page: string) {
    if (child) sessionStorage.setItem('learnora_selected_child', child.id)
    onNavigate(page)
  }

  function renderHero() {
    if (!child) return null

    return (
      <div className="rounded-[28px] bg-primary p-5 text-white shadow-lg shadow-primary/25">
        <div className="flex items-center gap-3">
          <div className="flex size-16 items-center justify-center rounded-full border border-white/30 bg-white/20 text-xl font-bold">
            {child.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold">{child.name}</p>
            <div className="mt-1 inline-flex max-w-full rounded-md bg-primary-deep px-3 py-1 text-xs text-white/95">
              <span className="truncate">{child.className}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'GPA', value: child.gpa, icon: Star, iconWrap: 'bg-white/20 text-white' },
            { label: 'Attendance', value: `${child.attRate}%`, icon: CalendarDays, iconWrap: 'bg-fuchsia-400/35 text-white' },
            { label: 'Rank', value: child.subjects.length > 0 ? 'Top set' : '—', icon: Trophy, iconWrap: 'bg-orange-300/35 text-white' },
            { label: 'Conduct', value: child.attRate >= 80 ? 'Excellent' : 'Improving', icon: ShieldCheck, iconWrap: 'bg-amber-300/35 text-white' },
          ].map(item => {
            const Icon = item.icon
            return (
              <div key={item.label} className="rounded-2xl bg-white/8 px-3 py-3 backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-2">
                  <div className={`flex size-7 items-center justify-center rounded-full ${item.iconWrap}`}>
                    <Icon size={14} />
                  </div>
                  <span className="text-[11px] text-white/75">{item.label}</span>
                </div>
                <p className="truncate text-2xl font-semibold">{item.value}</p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderQuickActions() {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map(action => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={() => navigateWithChild(action.page)}
              className="rounded-[22px] border border-black/8 bg-white px-4 py-5 text-center shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <div className={`mx-auto mb-3 flex size-11 items-center justify-center rounded-xl ${action.iconWrap}`}>
                <Icon size={18} className={action.iconColor} />
              </div>
              <p className="text-sm font-medium text-foreground">{action.label}</p>
            </button>
          )
        })}
      </div>
    )
  }

  function renderPerformanceOverview() {
    if (!child || overviewCards.length === 0) return null

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {overviewCards.map(card => {
          if (card.type === 'gpa') {
            return (
              <div key={card.title} className="rounded-[24px] border border-black/8 bg-white p-5 shadow-sm">
                <p className="text-[15px] font-semibold text-muted">{card.title}</p>
                <p className="mt-5 text-5xl font-bold text-foreground">{card.gpa}</p>
                <div className="mt-4 flex items-center gap-1 text-amber-400">
                  {[0, 1, 2, 3].map(index => <Star key={index} size={16} fill="currentColor" strokeWidth={1.5} />)}
                  <Star size={16} className="text-black" fill="currentColor" strokeWidth={1.5} />
                </div>
                <p className="mt-3 text-2xl font-medium text-foreground">Excellent</p>
              </div>
            )
          }

          const tone = scoreTone(card.score)
          return (
            <div key={card.title} className="rounded-[24px] border border-black/8 bg-white p-5 shadow-sm">
              <p className="text-[15px] font-semibold text-muted">{card.title}</p>
              <div className="mt-6 flex items-end justify-between gap-4">
                <div className={`flex size-12 items-center justify-center rounded-xl text-2xl font-bold ${tone.pill}`}>
                  {card.grade}
                </div>
                <p className="text-3xl font-semibold text-foreground">{card.score}%</p>
              </div>
              <div className={`mt-6 h-1.5 rounded-full ${tone.track}`}>
                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.max(8, card.score)}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function renderUpdates() {
    if (notifs.length === 0) {
      return (
        <div className="rounded-[24px] border border-black/8 bg-white p-5 text-sm text-muted shadow-sm">
          No recent updates yet.
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {notifs.map(notif => (
          <button
            key={notif.id}
            onClick={() => onNavigate('parent/notifications')}
            className="flex w-full items-start gap-3 rounded-[20px] border border-black/8 bg-white px-4 py-4 text-left shadow-sm"
          >
            <div className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full ${notif.read ? 'bg-canvas' : 'bg-primary/10'}`}>
              <Bell size={16} className={notif.read ? 'text-muted' : 'text-primary'} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{notif.title}</p>
                <span className="shrink-0 text-[11px] text-muted">{notif.time}</span>
              </div>
              {notif.body && <p className="mt-1 text-xs text-muted">{notif.body}</p>}
            </div>
          </button>
        ))}
      </div>
    )
  }

  function renderUpcomingEvents() {
    if (!child || upcomingItems.length === 0) return null

    return (
      <div className="grid gap-3 xl:grid-cols-3">
        {upcomingItems.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.title}
              onClick={() => navigateWithChild(item.page)}
              className="flex items-start gap-3 rounded-[22px] border border-black/8 bg-white p-4 text-left shadow-sm"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs text-muted">{item.sub}</p>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  function renderTeacherFeedback() {
    return (
      <div className="rounded-[24px] border border-black/8 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
            T
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {teacherFeedback ? 'Teacher Update' : 'No teacher feedback yet'}
                </p>
                <p className="mt-1 text-xs text-muted">{teacherFeedback?.time ?? 'Check back later for new comments.'}</p>
              </div>
              <button onClick={() => onNavigate('parent/message-teacher')} className="text-xs font-semibold text-primary">
                Open Chat
              </button>
            </div>
            <p className="mt-4 text-sm text-muted">
              {teacherFeedback?.body || 'When a teacher sends comments or feedback, they will appear here for quick review.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  function renderFinanceCard() {
    if (!child) return null

    if (child.feeOwed) {
      return (
        <button
          onClick={() => navigateWithChild('parent/fees')}
          className="flex w-full items-start gap-3 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-left"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertCircle size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Fee Payment Incomplete</p>
            <p className="mt-1 text-xs text-amber-700">
              {child.feeAmt} outstanding{child.feeDue ? ` · Due ${child.feeDue}` : ''}
            </p>
          </div>
          <ChevronRight size={16} className="mt-0.5 shrink-0 text-amber-600" />
        </button>
      )
    }

    return (
      <button
        onClick={() => navigateWithChild('parent/fees')}
        className="flex w-full items-start gap-3 rounded-[22px] border border-green-200 bg-green-50 px-4 py-4 text-left"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 size={18} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-700">School fees fully paid</p>
          <p className="mt-1 text-xs text-green-600">Open fee history and payment records</p>
        </div>
        <ChevronRight size={16} className="mt-0.5 shrink-0 text-green-600" />
      </button>
    )
  }

  function renderMobileContent() {
    return (
      <MobileLayout activePage="parent/home" onNavigate={onNavigate} nav={parentMobileNav}>
        <div className="px-4 pb-8 pt-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {userInitials.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-[15px] leading-tight text-muted">
                  Good Morning, <span className="font-bold text-foreground">{parentFirstName}</span>
                </p>
                <p className="mt-1 text-sm text-muted">Track your child&apos;s progress.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('parent/notifications')}
                aria-label="Notifications"
                className="relative flex size-11 items-center justify-center rounded-full bg-white shadow-md"
              >
                <Bell size={18} />
                {notifs.some(notif => !notif.read) && <span className="absolute right-3 top-3 size-2 rounded-full bg-primary" />}
              </button>
              <button
                onClick={() => onNavigate('parent/profile')}
                aria-label="Profile settings"
                className="flex size-11 items-center justify-center rounded-full bg-white shadow-md"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {loading ? (
            <p className="py-10 text-sm text-muted">Loading…</p>
          ) : children.length === 0 ? (
            <EmptyLinkedState />
          ) : (
            <>
              {usingFallback && <div className="mb-4"><PreviewNotice /></div>}
              <div className="mb-4">
                <ChildSwitcher
                  children={children}
                  child={child}
                  pickerOpen={pickerOpen}
                  setPickerOpen={setPickerOpen}
                  selectedIdx={selectedIdx}
                  selectChild={selectChild}
                />
              </div>

              <div className="mb-6">{renderHero()}</div>

              <SectionHeader title="Quick Actions" cta="View All" onClick={() => onNavigate('parent/profile')} />
              <div className="mb-8">{renderQuickActions()}</div>

              <SectionHeader title="Performance Overview" cta="View All" onClick={() => navigateWithChild('parent/progress')} />
              <div className="mb-8">{renderPerformanceOverview()}</div>

              <SectionHeader title="Recent Updates" cta="View All" onClick={() => onNavigate('parent/notifications')} />
              <div className="mb-8">{renderUpdates()}</div>

              <SectionHeader title="Upcoming Events" cta="View All" onClick={() => navigateWithChild('parent/calendar')} />
              <div className="mb-8">{renderUpcomingEvents()}</div>

              <SectionHeader title="Latest Teacher Feedback" cta="View All" onClick={() => onNavigate('parent/message-teacher')} />
              <div className="mb-6">{renderTeacherFeedback()}</div>

              {renderFinanceCard()}
            </>
          )}
        </div>
      </MobileLayout>
    )
  }

  function renderDesktopContent() {
    return (
      <DashboardLayout
        activePage="parent/home"
        onNavigate={onNavigate}
        title="Parent Home"
        subtitle="Track academics, communication, and school activity for your child."
        nav={parentNav}
        user={{ name: userName, role: 'Parent', initials: userInitials }}
        mainClassName="flex-1 overflow-y-auto bg-canvas p-5 md:p-8"
      >
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : children.length === 0 ? (
          <EmptyLinkedState />
        ) : (
          <div className="space-y-8">
            {usingFallback && <PreviewNotice />}
            <div className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
              <div className="space-y-4">
                <ChildSwitcher
                  children={children}
                  child={child}
                  pickerOpen={pickerOpen}
                  setPickerOpen={setPickerOpen}
                  selectedIdx={selectedIdx}
                  selectChild={selectChild}
                />
                {renderHero()}
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-muted">Attendance Summary</p>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-green-50 p-4">
                      <p className="text-xs text-green-700">Present</p>
                      <p className="mt-2 text-2xl font-semibold text-green-700">{child?.attPresent ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-red-50 p-4">
                      <p className="text-xs text-red-600">Absent</p>
                      <p className="mt-2 text-2xl font-semibold text-red-600">{child?.attAbsent ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-sky-50 p-4">
                      <p className="text-xs text-sky-700">Rate</p>
                      <p className="mt-2 text-2xl font-semibold text-sky-700">{child?.attRate ?? 0}%</p>
                    </div>
                  </div>
                </div>

                {renderFinanceCard()}
              </div>
            </div>

            <section>
              <SectionHeader title="Quick Actions" />
              {renderQuickActions()}
            </section>

            <section>
              <SectionHeader title="Performance Overview" cta="View All" onClick={() => navigateWithChild('parent/progress')} />
              {renderPerformanceOverview()}
            </section>

            <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
              <section>
                <SectionHeader title="Recent Updates" cta="View All" onClick={() => onNavigate('parent/notifications')} />
                {renderUpdates()}
              </section>

              <section>
                <SectionHeader title="Latest Teacher Feedback" cta="View All" onClick={() => onNavigate('parent/message-teacher')} />
                {renderTeacherFeedback()}
              </section>
            </div>

            <section>
              <SectionHeader title="Upcoming Events" cta="View All" onClick={() => navigateWithChild('parent/calendar')} />
              {renderUpcomingEvents()}
            </section>
          </div>
        )}
      </DashboardLayout>
    )
  }

  return (
    <>
      <div className="lg:hidden">{renderMobileContent()}</div>
      <div className="hidden lg:block">{renderDesktopContent()}</div>
    </>
  )
}
