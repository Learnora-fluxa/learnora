import { useState, useEffect } from 'react'
import { Plus, Search, Users, BookOpen, MoreHorizontal, X, CheckCircle2, ChevronDown } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/shared/Toast'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

const DEFAULT_SUBJECTS = [
  'Mathematics', 'Physics', 'English Language', 'Chemistry', 'Biology',
  'Government', 'Economics', 'Literature', 'CRK', 'History',
]
const LEVEL_OPTIONS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3']
const ARM_OPTIONS   = ['A', 'B', 'C', 'D']

interface ClassRow {
  id: string
  name: string
  level: string | null
  arm: string | null
  form_teacher: { id: string; full_name: string | null } | null
  class_subjects: { id: string }[]
  class_enrollments: { id: string }[]
}
interface TeacherOption  { id: string; full_name: string | null }
interface SubjectOption  { id: string; name: string }

export default function ClassesManagementPage({ onNavigate }: Props) {
  const { profile, loading: authLoading } = useAuth()
  const { toast }   = useToast()
  const schoolId    = profile?.school_id

  const [classes,    setClasses]    = useState<ClassRow[]>([])
  const [teachers,   setTeachers]   = useState<TeacherOption[]>([])
  const [subjects,   setSubjects]   = useState<SubjectOption[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [created,    setCreated]    = useState(false)

  const [newLevel,          setNewLevel]          = useState('SS1')
  const [newArm,            setNewArm]            = useState('A')
  const [newTeacherId,      setNewTeacherId]      = useState('')
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])

  useEffect(() => {
    if (authLoading) return

    if (!schoolId) {
      setLoading(false)
      return
    }

    void loadAll()
  }, [authLoading, schoolId])

  async function loadAll() {
    setLoading(true)
    try {
      await Promise.all([loadClasses(), loadTeachers(), loadSubjects()])
    } catch (err: unknown) {
      console.error('[ClassesMgmt.loadAll]', err)
      toast('Unable to load class management data right now.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadClasses() {
    const { data, error } = await supabase
      .from('classes')
      .select(`id, name, level, arm,
               form_teacher:profiles!form_teacher_id(id, full_name),
               class_subjects(id),
               class_enrollments(id)`)
      .eq('school_id', schoolId!)
      .order('level').order('arm')

    if (!error) {
      setClasses((data as unknown as ClassRow[]) ?? [])
      return
    }

    logSupabaseError('ClassesMgmt.loadClasses.rich', error)

    // Fallback: load class rows without the form-teacher join so the page stays usable
    const { data: basicData, error: basicError } = await supabase
      .from('classes')
      .select('id, name, level, arm, class_subjects(id), class_enrollments(id)')
      .eq('school_id', schoolId!)
      .order('level')
      .order('arm')

    if (basicError) {
      logSupabaseError('ClassesMgmt.loadClasses.basic', basicError)
      throw basicError
    }

    const fallbackRows = ((basicData ?? []) as Array<{
      id: string
      name: string
      level: string | null
      arm: string | null
      class_subjects: { id: string }[]
      class_enrollments: { id: string }[]
    }>).map(row => ({
      ...row,
      form_teacher: null,
    }))

    setClasses(fallbackRows)
    toast('Classes loaded without form teacher details. Check your class schema/join wiring.', 'error')
  }

  async function loadTeachers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('school_id', schoolId!)
      .eq('role', 'teacher')
      .order('full_name')

    if (error) {
      logSupabaseError('ClassesMgmt.loadTeachers', error)
      throw error
    }

    setTeachers((data as TeacherOption[]) ?? [])
  }

  async function loadSubjects() {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('school_id', schoolId!)
      .order('name')

    if (error) {
      logSupabaseError('ClassesMgmt.loadSubjects.select', error)
      throw error
    }

    if (data && data.length > 0) {
      setSubjects(data as SubjectOption[])
    } else {
      const { data: seeded, error: seedError } = await supabase
        .from('subjects')
        .insert(DEFAULT_SUBJECTS.map(name => ({ name, school_id: schoolId! })))
        .select('id, name')

      if (seedError) {
        logSupabaseError('ClassesMgmt.loadSubjects.seed', seedError)
        throw seedError
      }

      setSubjects((seeded as SubjectOption[]) ?? [])
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!schoolId || selectedSubjectIds.length === 0) return
    setSaving(true)
    try {
      const { data: cls, error: clsErr } = await supabase
        .from('classes')
        .insert({ school_id: schoolId, name: `${newLevel}${newArm}`, level: newLevel, arm: newArm, form_teacher_id: newTeacherId || null })
        .select('id')
        .single()
      if (clsErr) throw clsErr

      const { error: subErr } = await supabase.from('class_subjects').insert(
        selectedSubjectIds.map(subject_id => ({ class_id: cls.id, subject_id, school_id: schoolId }))
      )
      if (subErr) throw subErr

      await loadClasses()
      setCreated(true)
    } catch (err: unknown) {
      logSupabaseError('ClassesMgmt.create', err as any)
      toast((err as Error).message ?? 'Failed to create class', 'error')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setCreated(false)
    setNewLevel('SS1')
    setNewArm('A')
    setNewTeacherId('')
    setSelectedSubjectIds([])
  }

  function toggleSubject(id: string) {
    setSelectedSubjectIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const filtered = classes.filter(c =>
    (c.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.form_teacher?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const sidebarUser = profileToSidebarUser(profile)

  if (!authLoading && !schoolId) {
    return (
      <DashboardLayout
        activePage="classes-management"
        onNavigate={onNavigate}
        title="Classes Management"
        subtitle="Manage all school classes and form teachers"
        nav={adminNav}
        user={sidebarUser}
      >
        <div className="max-w-[900px]">
          <div className="bg-surface rounded-card shadow-sm p-8 text-center">
            <BookOpen size={32} className="text-muted mx-auto mb-3 opacity-30" />
            <p className="text-base font-semibold text-foreground">Your admin account is not linked to a school yet.</p>
            <p className="text-sm text-muted mt-2">
              Classes can only load after your `profiles.school_id` is set. Update the admin profile in Supabase, then sign out and back in.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      activePage="classes-management"
      onNavigate={onNavigate}
      title="Classes Management"
      subtitle="Manage all school classes and form teachers"
      nav={adminNav}
      user={sidebarUser}
    >
      <div className="max-w-[1100px] flex flex-col gap-6">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Classes',    value: loading ? '—' : String(classes.length) },
            { label: 'Total Students',   value: loading ? '—' : String(classes.reduce((a, c) => a + (c.class_enrollments?.length ?? 0), 0)) },
            { label: 'No Form Teacher',  value: loading ? '—' : String(classes.filter(c => !c.form_teacher).length) },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-card shadow-sm p-5">
              <p className="text-3xl font-bold text-primary">{s.value}</p>
              <p className="text-sm text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[400px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search classes or teachers..."
              className="w-full h-10 pl-9 pr-4 border border-black/15 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary" />
          </div>
          <button
            onClick={() => { setShowCreate(true); resetForm() }}
            className="flex items-center gap-1.5 h-10 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary ml-auto"
          >
            <Plus size={13} /> New Class
          </button>
        </div>

        {/* Classes grid */}
        {loading ? (
          <div className="py-16 text-center text-muted text-sm">Loading classes...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center">
            <BookOpen size={32} className="text-muted mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted">No classes yet. Create your first class to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(c => (
              <div key={c.id} className="bg-surface rounded-card shadow-sm p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{c.name}</h3>
                    <p className="text-xs text-muted mt-0.5">{c.level} · Arm {c.arm}</p>
                  </div>
                  <button className="text-muted hover:text-foreground"><MoreHorizontal size={15} /></button>
                </div>

                <div className="flex flex-col gap-2.5 text-sm text-muted mb-4">
                  <div className="flex items-center gap-2">
                    <Users size={13} />{c.class_enrollments?.length ?? 0} students
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen size={13} />{c.class_subjects?.length ?? 0} subjects
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">
                      {(c.form_teacher?.full_name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <span className={!c.form_teacher ? 'text-red-500 font-semibold' : ''}>
                      {c.form_teacher?.full_name ?? 'No form teacher'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      sessionStorage.setItem('learnora_admin_class', JSON.stringify({
                        id: c.id, name: c.name, level: c.level, arm: c.arm,
                        teacher: c.form_teacher?.full_name ?? null,
                        students: c.class_enrollments?.length ?? 0,
                        subjects: c.class_subjects?.length ?? 0,
                      }))
                      onNavigate('admin-class-details')
                    }}
                    className="flex-1 h-8 border border-primary text-primary text-xs font-semibold rounded-pill hover:bg-primary hover:text-white transition-colors"
                  >
                    View Details
                  </button>
                  <button onClick={() => onNavigate('admin-attendance')} className="flex-1 h-8 border border-black/15 text-muted text-xs font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
                    Attendance
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Class Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 bg-white rounded-card shadow-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/8 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-foreground">{created ? 'Class Created' : 'Create New Class'}</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted hover:text-foreground"><X size={18} /></button>
            </div>

            {created ? (
              <div className="p-8 text-center">
                <div className="size-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={24} className="text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{newLevel}{newArm} Created!</h3>
                <p className="text-sm text-muted mb-6">{selectedSubjectIds.length} subject{selectedSubjectIds.length !== 1 ? 's' : ''} assigned</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={resetForm} className="h-10 px-5 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors">
                    Create Another
                  </button>
                  <button onClick={() => setShowCreate(false)} className="h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="p-6 flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-foreground">Level <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select value={newLevel} onChange={e => setNewLevel(e.target.value)}
                        className="w-full h-11 pl-4 pr-8 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary appearance-none">
                        {LEVEL_OPTIONS.map(l => <option key={l}>{l}</option>)}
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-foreground">Arm <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      {ARM_OPTIONS.map(a => (
                        <button key={a} type="button" onClick={() => setNewArm(a)}
                          className={`flex-1 h-11 rounded-input border-2 text-sm font-bold transition-colors ${newArm === a ? 'border-primary bg-primary/8 text-primary' : 'border-black/15 text-muted hover:border-primary/40'}`}>
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-canvas rounded-card p-3 text-center">
                  <p className="text-sm text-muted">Class name: <strong className="text-foreground text-base">{newLevel}{newArm}</strong></p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Assign Form Teacher</label>
                  <p className="text-xs text-muted">Form teacher manages class admin. Subject teachers are assigned separately.</p>
                  {teachers.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-card px-3 py-2">
                      No teachers added yet. Add teachers first via User Management.
                    </p>
                  ) : (
                    <div className="relative">
                      <select value={newTeacherId} onChange={e => setNewTeacherId(e.target.value)}
                        className="w-full h-11 pl-4 pr-8 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary appearance-none">
                        <option value="">— Unassigned —</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name || 'Unnamed'}</option>)}
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">Subjects Offered <span className="text-red-500">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map(s => (
                      <button key={s.id} type="button" onClick={() => toggleSubject(s.id)}
                        className={`h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${
                          selectedSubjectIds.includes(s.id)
                            ? 'border-primary bg-primary/8 text-primary'
                            : 'border-black/15 text-muted hover:border-primary/40 hover:text-foreground'
                        }`}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                  {selectedSubjectIds.length > 0 && (
                    <p className="text-xs text-muted">{selectedSubjectIds.length} subject{selectedSubjectIds.length !== 1 ? 's' : ''} selected</p>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="h-11 px-5 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={selectedSubjectIds.length === 0 || saving}
                    className="flex-1 h-11 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50">
                    {saving ? 'Creating...' : 'Create Class'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
