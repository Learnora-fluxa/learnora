import { useState, useEffect } from 'react'
import { Search, ChevronRight } from 'lucide-react'
import MobileLayout, { studentMobileNav } from '../../components/layout/MobileLayout'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface SubjectItem { name: string; lessonCount: number; color: string }
interface CourseItem  { id: string; title: string; subject: string; teacher: string; progress: number; color: string }

const SUBJ_COLORS = ['bg-blue-500', 'bg-orange-400', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500']
const COURSE_COLORS = ['bg-slate-700', 'bg-primary', 'bg-blue-600', 'bg-slate-600']

export default function MobileLearnPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [search,   setSearch]   = useState('')
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [courses,  setCourses]  = useState<CourseItem[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { if (profile?.id) loadData() }, [profile?.id])

  async function loadData() {
    setLoading(true)
    const studentId = profile!.id

    // Enrolled classes
    const { data: ceData } = await supabase
      .from('class_enrollments').select('class_id').eq('student_id', studentId)
    const classIds = (ceData ?? []).map((e: { class_id: string }) => e.class_id)

    if (classIds.length > 0) {
      // Subjects via grade_summaries
      const { data: gsData } = await supabase
        .from('grade_summaries')
        .select('subjects(name)')
        .eq('student_id', studentId)
      const subjectNames = [...new Set(
        (gsData ?? [])
          .map((g: unknown) => (g as { subjects: { name: string } | null }).subjects?.name)
          .filter(Boolean) as string[]
      )]

      // Lesson counts per subject
      const subjList: SubjectItem[] = await Promise.all(
        subjectNames.slice(0, 6).map(async (name, i) => {
          const { count } = await supabase
            .from('lessons')
            .select('id', { count: 'exact', head: true })
            .eq('is_published', true)
          return { name, lessonCount: count ?? 0, color: SUBJ_COLORS[i % SUBJ_COLORS.length] }
        })
      )
      setSubjects(subjList)

      // Courses
      const { data: courseData } = await supabase
        .from('courses')
        .select('id, title, profiles!teacher_id(full_name), subjects(name)')
        .in('class_id', classIds)
        .eq('is_published', true)
        .limit(6)
      const rawCourses = (courseData ?? []) as unknown as {
        id: string; title: string
        profiles: { full_name: string | null } | null
        subjects: { name: string } | null
      }[]

      const courseIds = rawCourses.map(c => c.id)
      const lessonsByCourse: Record<string, string[]> = {}
      if (courseIds.length > 0) {
        const { data: lData } = await supabase
          .from('lessons').select('id, course_id').in('course_id', courseIds).eq('is_published', true)
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
          return {
            id: c.id, title: c.title,
            subject:  c.subjects?.name ?? '',
            teacher:  c.profiles?.full_name ?? 'Teacher',
            progress: total > 0 ? Math.round((done / total) * 100) : 0,
            color:    COURSE_COLORS[i % COURSE_COLORS.length],
          }
        }))
      }
    }
    setLoading(false)
  }

  const q = search.toLowerCase()
  const filteredCourses  = courses.filter(c => !q || c.title.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q))
  const filteredSubjects = subjects.filter(s => !q || s.name.toLowerCase().includes(q))

  function goToCourse(id: string) {
    sessionStorage.setItem('learnora_selected_course', id)
    onNavigate('m/lesson')
  }

  return (
    <MobileLayout activePage="m/learn" onNavigate={onNavigate} nav={studentMobileNav}>
      <div className="px-5 pt-6 pb-4">

        <h1 className="text-2xl font-bold text-foreground mb-0.5">Learn</h1>
        <p className="text-xs text-muted mb-4">Continue your academic journey.</p>

        {/* Search */}
        <div className="flex items-center gap-2 h-11 px-4 bg-canvas border border-black/8 rounded-full mb-6">
          <Search size={14} className="text-muted shrink-0" />
          <input type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search courses, subjects…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none" />
        </div>

        {/* Continue Learning */}
        <p className="text-base font-bold text-foreground mb-3">Continue Learning</p>
        <div className="flex gap-3 overflow-x-auto pb-1 mb-6 scrollbar-none">
          {loading
            ? <div className="py-4 text-sm text-muted">Loading…</div>
            : filteredCourses.length === 0
            ? <div className="py-4 text-sm text-muted">No courses found.</div>
            : filteredCourses.slice(0, 4).map(c => (
              <button key={c.id} onClick={() => goToCourse(c.id)}
                className={`shrink-0 ${c.color} rounded-2xl px-5 py-4 flex items-center gap-3`}>
                <div className="text-left">
                  <p className="text-white font-bold text-sm truncate max-w-[80px]">{c.subject || c.title}</p>
                  <p className="text-white/70 text-[10px] truncate max-w-[80px]">{c.title}</p>
                </div>
                <div className="bg-white/20 rounded-full w-7 h-7 flex items-center justify-center shrink-0">
                  <ChevronRight size={12} className="text-white" />
                </div>
              </button>
            ))
          }
        </div>

        {/* Recommended / All Courses */}
        <p className="text-base font-bold text-foreground mb-1">All Courses</p>
        <p className="text-xs text-muted mb-3">Your enrolled courses this term.</p>
        <div className="flex gap-3 overflow-x-auto pb-1 mb-6 scrollbar-none">
          {loading
            ? <div className="py-4 text-sm text-muted">Loading…</div>
            : filteredCourses.length === 0
            ? <div className="py-4 text-sm text-muted">No courses yet.</div>
            : filteredCourses.map(c => (
              <div key={c.id} className="shrink-0 w-44 rounded-2xl overflow-hidden border border-black/6">
                <div className={`h-20 ${c.color} flex items-end p-2`}>
                  <span className="text-white text-xs font-semibold truncate">{c.subject || c.title}</span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-foreground leading-tight mb-1 truncate">{c.title}</p>
                  <p className="text-[10px] text-muted truncate">{c.teacher}</p>
                  <div className="h-1 bg-black/8 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${c.progress}%` }} />
                  </div>
                  <p className="text-[9px] text-muted mt-0.5">{c.progress}%</p>
                  <button onClick={() => goToCourse(c.id)}
                    className="flex items-center gap-1 bg-primary rounded-full px-3 py-1 w-fit mt-2">
                    <span className="text-[10px] text-white font-medium">Resume</span>
                  </button>
                </div>
              </div>
            ))
          }
        </div>

        {/* My Subjects */}
        <p className="text-base font-bold text-foreground mb-1">My Subjects</p>
        <p className="text-xs text-muted mb-3">Subjects enrolled this term.</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {loading
            ? <div className="col-span-2 py-4 text-sm text-muted text-center">Loading…</div>
            : filteredSubjects.length === 0
            ? <div className="col-span-2 py-4 text-sm text-muted text-center">No subjects yet.</div>
            : filteredSubjects.map(s => (
              <div key={s.name} className="bg-canvas rounded-2xl p-3 flex items-center gap-3">
                <div className={`size-9 rounded-xl ${s.color} flex items-center justify-center shrink-0`}>
                  <span className="text-white text-xs font-bold">{s.name.charAt(0)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                  <p className="text-[10px] text-muted">{s.lessonCount} lessons</p>
                </div>
              </div>
            ))
          }
        </div>

        {/* Practice Quizzes */}
        <p className="text-base font-bold text-foreground mb-3">Practice Quizzes</p>
        <div className="flex flex-col gap-3 mb-6">
          {subjects.slice(0, 2).length === 0
            ? <p className="text-sm text-muted py-2">No quizzes yet.</p>
            : subjects.slice(0, 2).map(s => (
              <div key={s.name} className="flex items-center justify-between bg-canvas rounded-2xl px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{s.name} Quiz</p>
                <button onClick={() => onNavigate('m/quiz')} className="h-8 px-4 bg-primary text-white text-xs font-bold rounded-full">
                  Start Quiz
                </button>
              </div>
            ))
          }
        </div>

        {/* Revision Zone */}
        <p className="text-base font-bold text-foreground mb-3">Revision Zone</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'WAEC Practice', sub: '500+ Exam Questions', color: 'bg-red-500' },
            { label: 'JAMB Practice', sub: '500+ Exam Questions', color: 'bg-blue-500' },
          ].map(e => (
            <div key={e.label} className="bg-canvas rounded-2xl p-3">
              <p className="text-xs font-bold text-foreground mb-1">{e.label}</p>
              <p className="text-[10px] text-muted mb-3">{e.sub}</p>
              <button className={`h-7 px-3 ${e.color} text-white text-[10px] font-bold rounded-full w-full`}>Start Practice</button>
            </div>
          ))}
        </div>

      </div>
    </MobileLayout>
  )
}
