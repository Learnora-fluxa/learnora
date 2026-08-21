import { useState, useEffect } from 'react'
import { Plus, GripVertical, Trash2, ChevronDown, BookOpen, CheckCircle2, ArrowLeft } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface ClassOption   { id: string; name: string }
interface SubjectOption { id: string; name: string }

interface LessonForm {
  localId:  number
  title:    string
  duration: string
}

interface ModuleForm {
  localId:  number
  title:    string
  lessons:  LessonForm[]
}

interface CourseRow {
  id:           string
  title:        string
  is_published: boolean | null
}

let _lid = 10

export default function CourseBuilderPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [view,      setView]      = useState<'list' | 'create'>('list')
  const [myCourses, setMyCourses] = useState<CourseRow[]>([])
  const [classes,   setClasses]   = useState<ClassOption[]>([])
  const [subjects,  setSubjects]  = useState<SubjectOption[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [done,      setDone]      = useState(false)

  const [title,       setTitle]       = useState('')
  const [classId,     setClassId]     = useState('')
  const [subjectId,   setSubjectId]   = useState('')
  const [description, setDescription] = useState('')
  const [modules,     setModules]     = useState<ModuleForm[]>([
    { localId: _lid++, title: 'Module 1', lessons: [] },
  ])

  useEffect(() => { if (profile?.id) loadData() }, [profile?.id])

  async function loadData() {
    setLoading(true)
    const teacherId = profile!.id
    const schoolId  = profile!.school_id!
    const db = supabase as unknown as { from: (t: string) => any }

    const { data: taData } = await db.from('teacher_assignments')
      .select('class_id, subject_id, classes(id, name), subjects(id, name)')
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId)

    const classMap:   Record<string, ClassOption>   = {}
    const subjectMap: Record<string, SubjectOption> = {}
    for (const ta of (taData ?? []) as any[]) {
      if (ta.classes)  classMap[ta.class_id]    = { id: ta.class_id,   name: ta.classes.name }
      if (ta.subjects) subjectMap[ta.subject_id] = { id: ta.subject_id, name: ta.subjects.name }
    }
    const cls  = Object.values(classMap)
    const subs = Object.values(subjectMap)
    setClasses(cls)
    setSubjects(subs)
    if (cls.length  > 0 && !classId)   setClassId(cls[0].id)
    if (subs.length > 0 && !subjectId) setSubjectId(subs[0].id)

    const { data: cData } = await supabase
      .from('courses')
      .select('id, title, is_published')
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })

    setMyCourses((cData ?? []) as CourseRow[])
    setLoading(false)
  }

  function addModule() {
    setModules(ms => [...ms, { localId: _lid++, title: `Module ${ms.length + 1}`, lessons: [] }])
  }

  function removeModule(lid: number) {
    setModules(ms => ms.filter(m => m.localId !== lid))
  }

  function updateModuleTitle(lid: number, t: string) {
    setModules(ms => ms.map(m => m.localId === lid ? { ...m, title: t } : m))
  }

  function addLesson(modLid: number) {
    setModules(ms => ms.map(m =>
      m.localId === modLid
        ? { ...m, lessons: [...m.lessons, { localId: _lid++, title: '', duration: '' }] }
        : m
    ))
  }

  function updateLesson(modLid: number, lesLid: number, field: 'title' | 'duration', val: string) {
    setModules(ms => ms.map(m =>
      m.localId === modLid
        ? { ...m, lessons: m.lessons.map(l => l.localId === lesLid ? { ...l, [field]: val } : l) }
        : m
    ))
  }

  function removeLesson(modLid: number, lesLid: number) {
    setModules(ms => ms.map(m =>
      m.localId === modLid
        ? { ...m, lessons: m.lessons.filter(l => l.localId !== lesLid) }
        : m
    ))
  }

  async function saveCourse(publish: boolean) {
    if (!title.trim() || !classId || !subjectId) return
    setSaving(true)

    const schoolId  = profile!.school_id!
    const teacherId = profile!.id

    const { data: courseData, error } = await supabase
      .from('courses')
      .insert({
        title:        title.trim(),
        description:  description.trim() || null,
        class_id:     classId,
        subject_id:   subjectId,
        teacher_id:   teacherId,
        school_id:    schoolId,
        is_published: publish,
      })
      .select('id')
      .single()

    if (error || !courseData) { logSupabaseError('CourseBuilder.insert', error); setSaving(false); return }

    const courseId = (courseData as { id: string }).id

    for (let mi = 0; mi < modules.length; mi++) {
      const mod = modules[mi]
      if (!mod.title.trim()) continue

      const { data: modData } = await supabase
        .from('modules')
        .insert({ course_id: courseId, school_id: schoolId, title: mod.title.trim(), position: mi + 1 })
        .select('id')
        .single()

      if (!modData) continue
      const moduleId = (modData as { id: string }).id

      const lessonRows = mod.lessons
        .filter(l => l.title.trim())
        .map((l, li) => ({
          course_id:        courseId,
          module_id:        moduleId,
          school_id:        schoolId,
          title:            l.title.trim(),
          duration_minutes: l.duration ? parseInt(l.duration) || null : null,
          position:         li + 1,
          is_published:     publish,
        }))

      if (lessonRows.length > 0) await supabase.from('lessons').insert(lessonRows)
    }

    setSaving(false)
    setDone(true)
    await loadData()
  }

  async function togglePublish(courseId: string, current: boolean | null) {
    await supabase.from('courses').update({ is_published: !current }).eq('id', courseId)
    await supabase.from('lessons').update({ is_published: !current }).eq('course_id', courseId)
    setMyCourses(cs => cs.map(c => c.id === courseId ? { ...c, is_published: !current } : c))
  }

  function startCreate() {
    setTitle('')
    setDescription('')
    setModules([{ localId: _lid++, title: 'Module 1', lessons: [] }])
    setDone(false)
    setView('create')
  }

  if (done) {
    return (
      <DashboardLayout activePage="course-builder" onNavigate={onNavigate} title="Course Builder" nav={teacherNav} user={sidebarUser}>
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="size-16 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">Course Created!</h2>
            <p className="text-sm text-muted mt-2">Your course has been saved successfully.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView('list')} className="h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">
              View My Courses
            </button>
            <button onClick={() => onNavigate('lesson-upload')} className="h-11 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
              Upload Lesson Content
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      activePage="course-builder"
      onNavigate={onNavigate}
      title="Course Builder"
      subtitle={view === 'list' ? 'Manage and create courses' : 'Create a new course'}
      nav={teacherNav}
      user={sidebarUser}
    >
      {view === 'list' ? (
        <div className="max-w-[900px] flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">My Courses</h2>
            <button
              onClick={startCreate}
              className="flex items-center gap-1.5 h-9 px-4 bg-primary text-white text-xs font-semibold rounded-pill hover:bg-primary-deep transition-colors"
            >
              <Plus size={13} /> New Course
            </button>
          </div>

          {loading ? (
            <div className="bg-surface rounded-card shadow-sm p-12 text-center text-sm text-muted">Loading…</div>
          ) : myCourses.length === 0 ? (
            <div className="bg-surface rounded-card shadow-sm p-16 flex flex-col items-center gap-4">
              <BookOpen size={36} className="text-muted opacity-30" />
              <p className="text-sm text-muted">No courses yet. Create your first course to get started.</p>
              <button onClick={startCreate} className="h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill">
                Create Course
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myCourses.map(c => (
                <div key={c.id} className="bg-surface rounded-card shadow-sm p-5 flex items-center gap-4">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{c.title}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.is_published ? 'bg-green-50 text-green-700' : 'bg-canvas text-muted'}`}>
                    {c.is_published ? 'Published' : 'Draft'}
                  </span>
                  <button
                    onClick={() => togglePublish(c.id, c.is_published)}
                    className="h-8 px-3 border border-black/15 text-xs font-semibold text-muted rounded-full hover:border-primary hover:text-primary transition-colors"
                  >
                    {c.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => {
                      sessionStorage.setItem('learnora_selected_course', c.id)
                      onNavigate('lesson-upload')
                    }}
                    className="h-8 px-3 bg-primary/10 text-primary text-xs font-semibold rounded-full hover:bg-primary hover:text-white transition-colors"
                  >
                    Add Content
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-[900px] flex flex-col gap-6">
          <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground w-fit">
            <ArrowLeft size={14} /> Back to My Courses
          </button>

          {/* Course Details */}
          <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-5">
            <h2 className="text-base font-bold text-foreground">Course Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Course Title *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Physics 101"
                  className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Target Class *</label>
                <div className="relative">
                  <select
                    value={classId}
                    onChange={e => setClassId(e.target.value)}
                    className="w-full h-12 pl-4 pr-10 border border-black/20 rounded-input text-sm text-foreground bg-white outline-none focus:border-primary appearance-none"
                  >
                    {classes.length === 0 && <option value="">No classes assigned yet</option>}
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Subject *</label>
                <div className="relative">
                  <select
                    value={subjectId}
                    onChange={e => setSubjectId(e.target.value)}
                    className="w-full h-12 pl-4 pr-10 border border-black/20 rounded-input text-sm text-foreground bg-white outline-none focus:border-primary appearance-none"
                  >
                    {subjects.length === 0 && <option value="">No subjects assigned yet</option>}
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe what students will learn in this course…"
                className="px-4 py-3 border border-black/20 rounded-card text-sm text-foreground placeholder:text-muted outline-none focus:border-primary resize-none"
              />
            </div>
          </div>

          {/* Modules */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Course Modules</h2>
              <button
                onClick={addModule}
                className="flex items-center gap-1.5 h-9 px-4 bg-primary text-white text-xs font-semibold rounded-pill hover:bg-primary-deep transition-colors"
              >
                <Plus size={13} /> Add Module
              </button>
            </div>

            {modules.map(mod => (
              <div key={mod.localId} className="bg-surface rounded-card shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 bg-canvas/60 border-b border-black/6">
                  <GripVertical size={16} className="text-muted/40 shrink-0" />
                  <input
                    value={mod.title}
                    onChange={e => updateModuleTitle(mod.localId, e.target.value)}
                    placeholder="Module title"
                    className="flex-1 text-sm font-semibold text-foreground bg-transparent outline-none border-b border-transparent focus:border-primary"
                  />
                  <span className="text-xs text-muted shrink-0">{mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}</span>
                  <button onClick={() => removeModule(mod.localId)} className="text-muted hover:text-red-500 transition-colors shrink-0 ml-2">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="px-5 py-3 flex flex-col gap-2">
                  {mod.lessons.map(lesson => (
                    <div key={lesson.localId} className="flex items-center gap-3 p-2.5 rounded-card bg-canvas/40 group">
                      <GripVertical size={14} className="text-muted/30 shrink-0" />
                      <input
                        value={lesson.title}
                        onChange={e => updateLesson(mod.localId, lesson.localId, 'title', e.target.value)}
                        placeholder="Lesson title"
                        className="flex-1 text-sm text-foreground bg-transparent outline-none"
                      />
                      <input
                        value={lesson.duration}
                        onChange={e => updateLesson(mod.localId, lesson.localId, 'duration', e.target.value)}
                        type="number"
                        min="1"
                        placeholder="—"
                        className="w-12 text-xs text-muted bg-transparent outline-none text-right"
                      />
                      <span className="text-xs text-muted shrink-0">min</span>
                      <button
                        onClick={() => removeLesson(mod.localId, lesson.localId)}
                        className="text-muted/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addLesson(mod.localId)}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors mt-1 px-2.5"
                  >
                    <Plus size={12} /> Add lesson
                  </button>
                </div>
              </div>
            ))}

            {modules.length === 0 && (
              <div className="bg-surface rounded-card shadow-sm p-8 text-center text-sm text-muted">
                No modules yet. Click "Add Module" to start.
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap pb-4">
            <button
              onClick={() => saveCourse(true)}
              disabled={saving || !title.trim() || !classId || !subjectId}
              className="h-12 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50"
            >
              {saving ? 'Publishing…' : 'Publish Course'}
            </button>
            <button
              onClick={() => saveCourse(false)}
              disabled={saving || !title.trim() || !classId || !subjectId}
              className="h-12 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button onClick={() => setView('list')} className="h-12 px-6 border border-black/20 text-muted text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
