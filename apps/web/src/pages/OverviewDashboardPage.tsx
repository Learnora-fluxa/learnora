import { useState, useEffect } from 'react'
import { Play, ArrowRight, CheckCircle2, Clock, ChevronRight, BookOpen, AlertCircle, BarChart2, CalendarClock, Medal } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

const COURSE_COLORS = ['bg-primary', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500']

interface CourseItem {
  id:          string
  title:       string
  teacherName: string
  progress:    number
  color:       string
}

interface AssignmentItem {
  id:          string
  title:       string
  subjectName: string
  due_date:    string | null
  status:      'Pending' | 'Completed' | 'Overdue'
}

function fmtDue(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (d.toDateString() === now.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function SectionHeader({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      {onViewAll && (
        <button onClick={onViewAll} className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
          View all <ChevronRight size={14} />
        </button>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfgMap: Record<string, { cls: string; icon: typeof CheckCircle2 }> = {
    Completed: { cls: 'bg-green-50 text-green-700', icon: CheckCircle2 },
    Pending:   { cls: 'bg-amber-50 text-amber-700', icon: Clock        },
    Overdue:   { cls: 'bg-red-50 text-red-700',     icon: AlertCircle  },
  }
  const cfg = cfgMap[status] ?? { cls: 'bg-canvas text-muted', icon: Clock }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xs ${cfg.cls}`}>
      <Icon size={12} />{status}
    </span>
  )
}

export default function OverviewDashboardPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)
  const firstName    = profile?.full_name?.split(' ')[0] ?? 'Student'

  const [courses,     setCourses]     = useState<CourseItem[]>([])
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => { if (profile?.id) loadDashboard() }, [profile?.id])

  async function loadDashboard() {
    setLoading(true)
    const studentId = profile!.id

    const { data: ceData } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', studentId)

    const classIds = (ceData ?? []).map((e: { class_id: string }) => e.class_id)
    if (classIds.length === 0) { setLoading(false); return }

    const { data: courseData } = await supabase
      .from('courses')
      .select('id, title, profiles!teacher_id(full_name)')
      .in('class_id', classIds)
      .eq('is_published', true)

    const rawCourses = (courseData ?? []) as unknown as {
      id: string; title: string
      profiles: { full_name: string | null } | null
    }[]

    const courseIds = rawCourses.map(c => c.id)

    // Lesson IDs per course for progress calc
    const lessonsByCourse: Record<string, string[]> = {}
    if (courseIds.length > 0) {
      const { data: lData } = await supabase
        .from('lessons')
        .select('id, course_id')
        .in('course_id', courseIds)
        .eq('is_published', true)

      for (const l of (lData ?? []) as { id: string; course_id: string }[]) {
        if (!lessonsByCourse[l.course_id]) lessonsByCourse[l.course_id] = []
        lessonsByCourse[l.course_id].push(l.id)
      }
    }

    const allLessonIds = Object.values(lessonsByCourse).flat()
    const completedSet = new Set<string>()
    if (allLessonIds.length > 0) {
      const { data: pData } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('student_id', studentId)
        .eq('completed', true)
        .in('lesson_id', allLessonIds)

      for (const p of (pData ?? []) as { lesson_id: string }[]) {
        completedSet.add(p.lesson_id)
      }
    }

    const courses: CourseItem[] = rawCourses.slice(0, 4).map((c, i) => {
      const total    = lessonsByCourse[c.id]?.length ?? 0
      const done     = lessonsByCourse[c.id]?.filter(id => completedSet.has(id)).length ?? 0
      const progress = total > 0 ? Math.round((done / total) * 100) : 0
      return {
        id:          c.id,
        title:       c.title,
        teacherName: c.profiles?.full_name ?? 'Teacher',
        progress,
        color:       COURSE_COLORS[i % COURSE_COLORS.length],
      }
    })

    const { data: aData } = await supabase
      .from('assignments')
      .select('id, title, due_date, subjects(name)')
      .in('class_id', classIds)
      .eq('is_published', true)
      .order('due_date', { ascending: true })
      .limit(8)

    const rawAssign = (aData ?? []) as unknown as {
      id: string; title: string; due_date: string | null
      subjects: { name: string } | null
    }[]

    const assignIds = rawAssign.map(a => a.id)
    const submittedSet = new Set<string>()
    if (assignIds.length > 0) {
      const { data: sData } = await supabase
        .from('assignment_submissions')
        .select('assignment_id')
        .eq('student_id', studentId)
        .in('assignment_id', assignIds)

      for (const s of (sData ?? []) as { assignment_id: string }[]) {
        submittedSet.add(s.assignment_id)
      }
    }

    const nowDate = new Date()
    const assignments: AssignmentItem[] = rawAssign.map(a => ({
      id:          a.id,
      title:       a.title,
      subjectName: a.subjects?.name ?? '—',
      due_date:    a.due_date,
      status:      submittedSet.has(a.id)
        ? 'Completed'
        : (a.due_date && new Date(a.due_date) < nowDate ? 'Overdue' : 'Pending'),
    }))

    setCourses(courses)
    setAssignments(assignments)
    setLoading(false)
  }

  function goToCourse(courseId: string) {
    sessionStorage.setItem('learnora_selected_course', courseId)
    onNavigate('course-details')
  }

  function goToAssignment(assignmentId: string) {
    sessionStorage.setItem('learnora_selected_assignment', assignmentId)
    onNavigate('assignment-details')
  }

  const dueThisWeek = assignments.filter(a => {
    if (a.status !== 'Pending' || !a.due_date) return false
    const due = new Date(a.due_date)
    const week = new Date(); week.setDate(week.getDate() + 7)
    return due <= week
  }).length

  return (
    <DashboardLayout
      activePage="dashboard"
      onNavigate={onNavigate}
      title="Dashboard"
      subtitle="Track your academic activities"
      user={sidebarUser}
    >
      <div className="flex flex-col gap-6 max-w-[1300px]">

        {/* Welcome banner */}
        <div className="relative bg-surface rounded-card px-8 py-7 overflow-hidden shadow-sm">
          <div className="max-w-[480px]">
            <h2 className="text-2xl font-bold text-foreground mb-1">Welcome Back, {firstName}!</h2>
            <p className="text-sm text-muted mb-6">
              {loading
                ? 'Loading your assignments…'
                : dueThisWeek > 0
                ? `You have ${dueThisWeek} assignment${dueThisWeek > 1 ? 's' : ''} due this week`
                : "You're all caught up!"}
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => onNavigate('courses')}
                className="flex items-center gap-2 h-11 px-5 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors"
              >
                <Play size={14} fill="currentColor" />
                Continue Learning
              </button>
              <button
                onClick={() => onNavigate('live-classes')}
                className="flex items-center gap-2 h-11 px-5 border border-muted text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors"
              >
                Join Live Class
              </button>
            </div>
          </div>
          <div className="absolute right-8 top-1/2 -translate-y-1/2 size-36 rounded-card bg-gradient-to-br from-accent-cyan/20 to-accent-mint/20 flex items-center justify-center text-4xl select-none hidden sm:flex">
            📚
          </div>
        </div>

        {/* Continue Learning */}
        <section>
          <SectionHeader title="Continue Learning" onViewAll={() => onNavigate('courses')} />
          {loading ? (
            <div className="bg-surface rounded-card shadow-sm p-10 text-center text-muted text-sm">Loading…</div>
          ) : courses.length === 0 ? (
            <div className="bg-surface rounded-card shadow-sm p-10 text-center text-muted">
              <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No courses yet. Your enrolled courses will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {courses.map(c => (
                <div key={c.id} className="bg-surface rounded-card overflow-hidden shadow-sm flex flex-col">
                  <div className={`h-40 ${c.color} opacity-80`} />
                  <div className="flex flex-col gap-2 p-4 flex-1">
                    <p className="text-base font-semibold text-foreground">{c.title}</p>
                    <p className="text-sm text-muted">{c.teacherName}</p>
                    <div className="h-2 bg-black/8 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${c.progress}%` }} />
                    </div>
                    <p className="text-xs text-muted">{c.progress}% complete</p>
                  </div>
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => goToCourse(c.id)}
                      className="w-full h-10 border border-primary text-primary text-sm font-semibold rounded-pill hover:bg-primary hover:text-white transition-colors"
                    >
                      Resume Course
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Assignments table */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <SectionHeader title="Upcoming Assignments" onViewAll={() => onNavigate('assignments')} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/6 text-muted text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left px-6 py-3">Subject</th>
                  <th className="text-left px-6 py-3">Assignment</th>
                  <th className="text-left px-6 py-3">Deadline</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-muted">Loading…</td></tr>
                ) : assignments.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-muted">No assignments yet.</td></tr>
                ) : assignments.map(a => (
                  <tr key={a.id} className="border-b border-black/4 last:border-0 hover:bg-canvas/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{a.subjectName}</td>
                    <td className="px-6 py-4 text-foreground">{a.title}</td>
                    <td className="px-6 py-4 text-muted">{fmtDue(a.due_date)}</td>
                    <td className="px-6 py-4"><StatusBadge status={a.status} /></td>
                    <td className="px-6 py-4">
                      {a.status === 'Completed' ? (
                        <button
                          onClick={() => goToAssignment(a.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xs text-primary hover:bg-primary/8 transition-colors"
                        >
                          View
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigate('assignments')}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xs bg-primary text-white hover:bg-primary-deep transition-colors"
                        >
                          Submit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick links row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: BarChart2,     label: 'Subject Performance', sub: 'Detailed per-subject analytics',     page: 'subject-performance', color: 'bg-primary/10 text-primary'     },
            { icon: CalendarClock, label: 'Deadlines',           sub: 'All upcoming & overdue work',         page: 'deadlines',           color: 'bg-amber-50 text-amber-600'     },
            { icon: Medal,         label: 'Badges & Rewards',    sub: 'Your XP, badges and reward shop',     page: 'badges-rewards',      color: 'bg-purple-50 text-purple-600'   },
          ].map(q => {
            const Icon = q.icon
            return (
              <button key={q.page} onClick={() => onNavigate(q.page)}
                className="bg-surface rounded-card shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow text-left">
                <div className={`size-11 rounded-card flex items-center justify-center shrink-0 ${q.color}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{q.label}</p>
                  <p className="text-xs text-muted mt-0.5">{q.sub}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Live Classes + Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
          <div className="bg-surface rounded-card shadow-sm p-6">
            <SectionHeader title="Live Classes" onViewAll={() => onNavigate('live-classes')} />
            <div className="py-8 text-center text-muted text-sm">No live classes scheduled.</div>
          </div>
          <div className="bg-surface rounded-card shadow-sm p-6 lg:w-80">
            <SectionHeader title="Performance Overview" onViewAll={() => onNavigate('analysis')} />
            <div className="py-8 text-center text-muted text-sm">No performance data yet.</div>
            <button
              onClick={() => onNavigate('analysis')}
              className="mt-2 w-full h-10 border border-primary text-primary text-sm font-semibold rounded-pill hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-1"
            >
              Full Report <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
