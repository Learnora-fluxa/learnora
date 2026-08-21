import { useState, useEffect } from 'react'
import { Search, ChevronDown, Play, BookOpen } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

const GRAD_COLORS = [
  'from-primary to-blue-300',
  'from-green-500 to-emerald-300',
  'from-amber-500 to-yellow-300',
  'from-purple-500 to-violet-300',
  'from-pink-500 to-rose-300',
  'from-teal-500 to-cyan-300',
  'from-indigo-500 to-blue-400',
]

interface CourseItem {
  id:          string
  title:       string
  teacherName: string
  progress:    number
  lessonCount: number
  color:       string
}

export default function MyCoursesPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [courses, setCourses] = useState<CourseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => { if (profile?.id) loadCourses() }, [profile?.id])

  async function loadCourses() {
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
    if (courseIds.length === 0) { setLoading(false); return }

    const { data: lData } = await supabase
      .from('lessons')
      .select('id, course_id')
      .in('course_id', courseIds)
      .eq('is_published', true)

    const lessonsByCourse: Record<string, string[]> = {}
    for (const l of (lData ?? []) as { id: string; course_id: string }[]) {
      if (!lessonsByCourse[l.course_id]) lessonsByCourse[l.course_id] = []
      lessonsByCourse[l.course_id].push(l.id)
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

    const items: CourseItem[] = rawCourses.map((c, i) => {
      const lessons  = lessonsByCourse[c.id] ?? []
      const done     = lessons.filter(id => completedSet.has(id)).length
      const progress = lessons.length > 0 ? Math.round((done / lessons.length) * 100) : 0
      return {
        id:          c.id,
        title:       c.title,
        teacherName: c.profiles?.full_name ?? 'Teacher',
        progress,
        lessonCount: lessons.length,
        color:       GRAD_COLORS[i % GRAD_COLORS.length],
      }
    })

    setCourses(items)
    setLoading(false)
  }

  function goToCourse(courseId: string) {
    sessionStorage.setItem('learnora_selected_course', courseId)
    onNavigate('course-details')
  }

  const visible    = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.teacherName.toLowerCase().includes(search.toLowerCase())
  )
  const inProgress = courses.filter(c => c.progress > 0 && c.progress < 100).length
  const completed  = courses.filter(c => c.lessonCount > 0 && c.progress === 100).length

  return (
    <DashboardLayout
      activePage="courses"
      onNavigate={onNavigate}
      title="My Courses"
      subtitle="Access and continue all enrolled courses"
      user={sidebarUser}
    >
      <div className="flex flex-col gap-6 max-w-[1300px]">

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 h-11 px-4 bg-surface border border-black/8 rounded-input flex-1 min-w-[200px] max-w-md shadow-sm">
            <Search size={16} className="text-muted shrink-0" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Courses"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
            />
          </div>
          <button className="flex items-center gap-2 h-11 px-4 bg-surface border border-black/8 rounded-input text-sm text-foreground shadow-sm hover:border-primary hover:text-primary transition-colors shrink-0">
            All Courses <ChevronDown size={14} className="text-muted" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Enrolled',    value: courses.length, color: 'text-primary'    },
            { label: 'In Progress', value: inProgress,     color: 'text-amber-600'  },
            { label: 'Completed',   value: completed,      color: 'text-green-600'  },
            { label: 'Available',   value: 0,              color: 'text-foreground' },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-card shadow-sm p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Course grid */}
        <section>
          <h3 className="text-lg font-bold text-foreground mb-4">All Courses</h3>
          {loading ? (
            <div className="bg-surface rounded-card shadow-sm p-12 text-center text-muted text-sm">Loading…</div>
          ) : visible.length === 0 ? (
            <div className="bg-surface rounded-card shadow-sm p-12 text-center text-muted">
              <BookOpen size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {search ? 'No courses match your search.' : 'No courses yet. Courses assigned to your class will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {visible.map(c => (
                <div key={c.id} className="bg-surface rounded-card shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <div className={`h-40 bg-gradient-to-br ${c.color} relative`}>
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/30 text-white text-xs font-medium px-2 py-1 rounded-full">
                      <BookOpen size={11} />
                      {c.lessonCount} lesson{c.lessonCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 p-4 flex-1">
                    <p className="text-base font-semibold text-foreground leading-snug">{c.title}</p>
                    <p className="text-sm text-muted">{c.teacherName}</p>
                    <div className="h-1.5 bg-black/8 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${c.progress}%` }} />
                    </div>
                    <p className="text-xs text-muted">{c.progress}% complete</p>
                  </div>
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => goToCourse(c.id)}
                      className="w-full h-10 flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary"
                    >
                      <Play size={12} fill="currentColor" />
                      Continue Learning
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </DashboardLayout>
  )
}
