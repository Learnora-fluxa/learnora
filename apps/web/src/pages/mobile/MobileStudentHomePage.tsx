import { useState, useEffect } from 'react'
import { Bell, Sparkles, ChevronRight, Clock, CheckCircle2, BookOpen, TrendingUp } from 'lucide-react'
import MobileLayout, { studentMobileNav } from '../../components/layout/MobileLayout'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface ClassItem  { id: string; name: string; subject: string; time: string; color: string }
interface CourseItem { id: string; title: string; subject: string; teacher: string; progress: number; color: string }
interface DeadlineItem { id: string; title: string; dueLabel: string; className: string; urgent: boolean }
interface ActivityItem  { title: string; action: string; timeAgo: string }

const CLASS_COLORS  = ['bg-blue-400', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500']
const COURSE_COLORS = ['bg-primary', 'bg-green-600', 'bg-amber-500', 'bg-purple-600']

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function fmtDue(iso: string): { label: string; urgent: boolean } {
  const d = new Date(iso + 'T00:00:00')
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const days = Math.ceil(diffMs / 86400000)
  if (days < 0) return { label: 'Overdue', urgent: true }
  if (days === 0) return { label: 'Due today', urgent: true }
  if (days === 1) return { label: 'Due tomorrow', urgent: true }
  if (days <= 7) return { label: `Due in ${days} days`, urgent: false }
  return { label: `Due ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`, urgent: false }
}

function timeAgo(iso: string) {
  const m = (Date.now() - new Date(iso).getTime()) / 60000
  if (m < 60)   return `${Math.round(m)}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

export default function MobileStudentHomePage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Student'
  const initials  = (profile?.full_name ?? 'S').charAt(0).toUpperCase()

  const [className,  setClassName]  = useState('')
  const [gpa,        setGpa]        = useState<string>('—')
  const [attRate,    setAttRate]    = useState<string>('—')
  const [classes,    setClasses]    = useState<ClassItem[]>([])
  const [courses,    setCourses]    = useState<CourseItem[]>([])
  const [deadlines,  setDeadlines]  = useState<DeadlineItem[]>([])
  const [activity,   setActivity]   = useState<ActivityItem[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => { if (profile?.id) loadData() }, [profile?.id])

  async function loadData() {
    setLoading(true)
    const studentId = profile!.id
    const schoolId  = profile!.school_id!

    const { data: ceData } = await supabase
      .from('class_enrollments')
      .select('class_id, classes(name)')
      .eq('student_id', studentId)
    const enrollments = (ceData ?? []) as unknown as { class_id: string; classes: { name: string } | null }[]
    const classIds = enrollments.map(e => e.class_id)
    if (enrollments.length > 0) setClassName(enrollments[0].classes?.name ?? '')

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const weekAhead  = new Date(todayEnd.getTime() + 7 * 86400000)

    const [gradeRes, sessRes, courseRes, attRes, assignRes, subRes] = await Promise.all([
      supabase.from('grade_summaries').select('average_score').eq('student_id', studentId),
      classIds.length > 0
        ? supabase.from('live_sessions')
            .select('id, title, scheduled_at, subjects(name), classes(name)')
            .in('class_id', classIds).eq('school_id', schoolId)
            .gte('scheduled_at', todayStart.toISOString()).lte('scheduled_at', todayEnd.toISOString())
            .order('scheduled_at', { ascending: true }).limit(6)
        : Promise.resolve({ data: [] }),
      classIds.length > 0
        ? supabase.from('courses')
            .select('id, title, profiles!teacher_id(full_name), subjects(name)')
            .in('class_id', classIds).eq('is_published', true).limit(4)
        : Promise.resolve({ data: [] }),
      supabase.from('attendance_records').select('status').eq('student_id', studentId).eq('school_id', schoolId).limit(60),
      classIds.length > 0
        ? supabase.from('assignments')
            .select('id, title, due_date, classes(name)')
            .in('class_id', classIds).eq('school_id', schoolId)
            .gte('due_date', todayStart.toISOString().substring(0, 10))
            .lte('due_date', weekAhead.toISOString().substring(0, 10))
            .order('due_date', { ascending: true }).limit(5)
        : Promise.resolve({ data: [] }),
      supabase.from('assignment_submissions')
        .select('submitted_at, status, assignments!inner(title)')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
        .limit(4),
    ])

    // GPA
    const scores = (gradeRes.data ?? []) as { average_score: number | null }[]
    if (scores.length > 0) {
      const avg = scores.reduce((s, g) => s + (g.average_score ?? 0), 0) / scores.length
      setGpa((avg / 20).toFixed(1))
    }

    // Attendance rate
    const attRows = (attRes.data ?? []) as { status: string }[]
    const attTotal   = attRows.filter(r => r.status !== 'holiday').length
    const attPresent = attRows.filter(r => r.status === 'present').length
    if (attTotal > 0) setAttRate(`${Math.round((attPresent / attTotal) * 100)}%`)

    // Today's live sessions
    const rawSessions = (sessRes.data ?? []) as unknown as {
      id: string; title: string; scheduled_at: string
      subjects: { name: string } | null; classes: { name: string } | null
    }[]
    setClasses(rawSessions.map((s, i) => ({
      id: s.id, name: s.classes?.name ?? s.title, subject: s.subjects?.name ?? s.title,
      time: fmtTime(s.scheduled_at), color: CLASS_COLORS[i % CLASS_COLORS.length],
    })))

    // Courses with progress
    const rawCourses = (courseRes.data ?? []) as unknown as {
      id: string; title: string
      profiles: { full_name: string | null } | null; subjects: { name: string } | null
    }[]
    if (rawCourses.length > 0) {
      const courseIds = rawCourses.map(c => c.id)
      const lessonsByCourse: Record<string, string[]> = {}
      const { data: lData } = await supabase.from('lessons').select('id, course_id').in('course_id', courseIds).eq('is_published', true)
      for (const l of (lData ?? []) as { id: string; course_id: string }[]) {
        if (!lessonsByCourse[l.course_id]) lessonsByCourse[l.course_id] = []
        lessonsByCourse[l.course_id].push(l.id)
      }
      const allIds = Object.values(lessonsByCourse).flat()
      const completedSet = new Set<string>()
      if (allIds.length > 0) {
        const { data: pData } = await supabase
          .from('lesson_progress').select('lesson_id').eq('student_id', studentId).eq('completed', true).in('lesson_id', allIds)
        for (const p of (pData ?? []) as { lesson_id: string }[]) completedSet.add(p.lesson_id)
      }
      setCourses(rawCourses.map((c, i) => {
        const total = lessonsByCourse[c.id]?.length ?? 0
        const done  = lessonsByCourse[c.id]?.filter(id => completedSet.has(id)).length ?? 0
        return { id: c.id, title: c.title, subject: c.subjects?.name ?? '', teacher: c.profiles?.full_name ?? 'Teacher', progress: total > 0 ? Math.round((done / total) * 100) : 0, color: COURSE_COLORS[i % COURSE_COLORS.length] }
      }))
    }

    // Upcoming deadlines
    const rawAssign = (assignRes.data ?? []) as unknown as { id: string; title: string; due_date: string; classes: { name: string } | null }[]
    setDeadlines(rawAssign.map(a => {
      const { label, urgent } = fmtDue(a.due_date)
      return { id: a.id, title: a.title, dueLabel: label, className: a.classes?.name ?? '—', urgent }
    }))

    // Recent activity
    const rawSubs = (subRes.data ?? []) as unknown as { submitted_at: string; status: string; assignments: { title: string } | null }[]
    setActivity(rawSubs.map(s => ({
      title:   s.assignments?.title ?? 'Assignment',
      action:  s.status === 'graded' ? 'Graded' : 'Submitted',
      timeAgo: timeAgo(s.submitted_at),
    })))

    setLoading(false)
  }

  return (
    <MobileLayout activePage="m/home" onNavigate={onNavigate} nav={studentMobileNav} aiPage="ai-tutor">
      <div className="px-5 pt-6 pb-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
              {initials}
            </div>
            <div>
              <p className="text-sm text-muted">Good Morning, <span className="font-bold text-foreground">{firstName}</span></p>
              {className && <p className="text-xs text-muted/70">{className}</p>}
            </div>
          </div>
          <button onClick={() => onNavigate('notifications')} aria-label="Notifications"
            className="size-9 rounded-full border border-black/10 flex items-center justify-center">
            <Bell size={16} className="text-foreground" />
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-3 mb-5">
          {[
            { label: 'GPA',      value: loading ? '…' : gpa },
            { label: 'Attend.',  value: loading ? '…' : attRate },
            { label: 'Courses',  value: loading ? '…' : courses.length > 0 ? courses.length.toString() : '—' },
          ].map(stat => (
            <div key={stat.label} className="flex-1 bg-canvas rounded-2xl px-3 py-2.5">
              <p className="text-[10px] text-muted mb-0.5">{stat.label}</p>
              <p className="text-base font-bold text-foreground truncate">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Learnora AI Banner */}
        <button
          onClick={() => onNavigate('ai-tutor')}
          className="w-full bg-primary rounded-2xl p-4 flex items-center justify-between mb-6"
        >
          <div className="text-left">
            <p className="text-sm font-bold text-white">Learnora AI</p>
            <p className="text-xs text-white/70">Ask a question, summarise notes, generate a quiz…</p>
          </div>
          <div className="size-9 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
        </button>

        {/* Upcoming Deadlines */}
        {!loading && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-bold text-foreground">Upcoming Deadlines</p>
              <button onClick={() => onNavigate('assignments')} className="text-xs text-primary font-medium">View all</button>
            </div>
            {deadlines.length === 0 ? (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3.5">
                <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-700">You're all caught up!</p>
                  <p className="text-xs text-green-600">No assignments due in the next 7 days.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {deadlines.map(d => (
                  <div key={d.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${d.urgent ? 'bg-red-50 border-red-200' : 'bg-canvas border-black/8'}`}>
                    <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${d.urgent ? 'bg-red-100' : 'bg-primary/10'}`}>
                      <Clock size={14} className={d.urgent ? 'text-red-600' : 'text-primary'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{d.title}</p>
                      <p className="text-xs text-muted">{d.className}</p>
                    </div>
                    <span className={`text-[11px] font-bold shrink-0 ${d.urgent ? 'text-red-600' : 'text-muted'}`}>{d.dueLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Today's Classes */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-foreground">Today's Classes</p>
          <button onClick={() => onNavigate('live-classes')} className="text-xs text-primary font-medium">View all</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 mb-6 scrollbar-none">
          {loading
            ? <div className="py-4 text-sm text-muted">Loading…</div>
            : classes.length === 0
            ? (
              <div className="flex-1 py-6 flex flex-col items-center gap-2">
                <div className="text-3xl">📅</div>
                <p className="text-sm font-medium text-muted">No live classes today</p>
              </div>
            )
            : classes.map((cls) => (
              <div key={cls.id} className="shrink-0 w-36 rounded-2xl overflow-hidden border border-black/6">
                <div className={`h-20 ${cls.color} flex items-center justify-center`}>
                  <div className="size-10 rounded-full bg-white/50 flex items-center justify-center text-xs font-bold text-foreground">
                    {cls.name.charAt(0)}
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-foreground truncate">{cls.name}</p>
                  <p className="text-[10px] text-muted">{cls.subject}</p>
                  <p className="text-[10px] text-muted">{cls.time}</p>
                </div>
              </div>
            ))
          }
        </div>

        {/* Weekly Progress */}
        {!loading && (gpa !== '—' || attRate !== '—') && (
          <div className="mb-6">
            <p className="text-base font-bold text-foreground mb-3">Weekly Progress</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => onNavigate('analysis')}
                className="bg-canvas rounded-2xl p-4 flex flex-col gap-2 text-left">
                <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp size={15} className="text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{gpa}</p>
                <p className="text-xs text-muted">Current GPA</p>
              </button>
              <button onClick={() => onNavigate('attendance')}
                className="bg-canvas rounded-2xl p-4 flex flex-col gap-2 text-left">
                <div className="size-8 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 size={15} className="text-green-600" />
                </div>
                <p className="text-2xl font-bold text-foreground">{attRate}</p>
                <p className="text-xs text-muted">Attendance Rate</p>
              </button>
            </div>
          </div>
        )}

        {/* Continue Learning */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-foreground">Continue Learning</p>
          <button onClick={() => onNavigate('m/learn')} className="text-xs text-primary font-medium">View all</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 mb-6 scrollbar-none">
          {loading
            ? <div className="py-4 text-sm text-muted">Loading…</div>
            : courses.length === 0
            ? (
              <div className="flex-1 py-6 flex flex-col items-center gap-2">
                <div className="text-3xl">📚</div>
                <p className="text-sm font-medium text-muted">No courses assigned yet</p>
                <p className="text-xs text-muted">Check back after your school sets up classes</p>
              </div>
            )
            : courses.map((course) => (
              <button
                key={course.id}
                onClick={() => {
                  sessionStorage.setItem('learnora_selected_course', course.id)
                  onNavigate('m/lesson')
                }}
                className="shrink-0 w-40 rounded-2xl overflow-hidden border border-black/6 text-left"
              >
                <div className={`h-24 ${course.color} flex items-center justify-center`}>
                  <p className="text-white font-bold text-lg px-2 text-center leading-tight">{course.title.substring(0, 10)}</p>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-foreground truncate">{course.subject || course.title}</p>
                  <p className="text-[10px] text-muted mt-0.5 truncate">{course.teacher}</p>
                  <div className="h-1 bg-black/8 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${course.progress}%` }} />
                  </div>
                  <p className="text-[9px] text-muted mt-0.5">{course.progress}%</p>
                </div>
                <div className="px-2.5 pb-2.5">
                  <div className="flex items-center gap-1 bg-primary rounded-full px-3 py-1 w-fit">
                    <span className="text-[10px] text-white font-medium">Resume</span>
                    <ChevronRight size={10} className="text-white" />
                  </div>
                </div>
              </button>
            ))
          }
        </div>

        {/* Recent Activity */}
        {!loading && activity.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-bold text-foreground">Recent Activity</p>
              <button onClick={() => onNavigate('assignments')} className="text-xs text-primary font-medium">View all</button>
            </div>
            <div className="flex flex-col gap-2">
              {activity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 bg-canvas rounded-2xl px-4 py-3">
                  <div className="size-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <BookOpen size={14} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                    <p className="text-xs text-muted">{a.action}</p>
                  </div>
                  <span className="text-[11px] text-muted shrink-0">{a.timeAgo}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for brand-new students with no data */}
        {!loading && courses.length === 0 && classes.length === 0 && deadlines.length === 0 && activity.length === 0 && (
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles size={28} className="text-primary" />
            </div>
            <p className="text-base font-bold text-foreground">Welcome to Learnora!</p>
            <p className="text-sm text-muted max-w-xs leading-relaxed">
              Your dashboard will fill up once your school assigns classes and your teachers post courses.
            </p>
            <button onClick={() => onNavigate('ai-tutor')}
              className="mt-2 flex items-center gap-2 h-10 px-5 bg-primary text-white text-sm font-semibold rounded-full shadow-primary">
              <Sparkles size={14} /> Try Learnora AI
            </button>
          </div>
        )}

      </div>
    </MobileLayout>
  )
}
