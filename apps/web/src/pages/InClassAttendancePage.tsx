import { useState, useEffect } from 'react'
import { CheckCircle2, Users, ChevronDown } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }
type Status = 'present' | 'absent' | 'late'

interface TeacherClass {
  class_id:    string
  class_name:  string
  subject_id:  string
  label:       string
}

interface StudentRecord {
  id:     string
  name:   string
  status: Status
  auto:   boolean   // marked automatically when the student joined the live class
}

export default function InClassAttendancePage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [teacherClasses,  setTeacherClasses]  = useState<TeacherClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [students,        setStudents]        = useState<StudentRecord[]>([])
  const [loadingClasses,  setLoadingClasses]  = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [saved,           setSaved]           = useState(false)
  const [error,           setError]           = useState('')

  useEffect(() => { if (profile?.id) loadTeacherClasses() }, [profile?.id])

  async function loadTeacherClasses() {
    setLoadingClasses(true)
    const { data } = await supabase
      .from('teacher_assignments')
      .select('class_id, subject_id, classes(name), subjects(name)')
      .eq('teacher_id', profile!.id)

    const raw = (data ?? []) as unknown as {
      class_id:   string
      subject_id: string
      classes:    { name: string } | null
      subjects:   { name: string } | null
    }[]

    const classes = raw.map(r => ({
      class_id:   r.class_id,
      class_name: r.classes?.name ?? '—',
      subject_id: r.subject_id,
      label:      `${r.subjects?.name ?? '—'} — ${r.classes?.name ?? '—'}`,
    }))

    setTeacherClasses(classes)
    if (classes.length > 0) setSelectedClassId(classes[0].class_id)
    setLoadingClasses(false)
  }

  useEffect(() => {
    if (selectedClassId) loadStudents()
  }, [selectedClassId])

  async function loadStudents() {
    setLoadingStudents(true)
    setSaved(false)
    const today = new Date().toISOString().split('T')[0]

    const [enrollRes, existingRes] = await Promise.all([
      supabase
        .from('class_enrollments')
        .select('student_id, profiles!student_id(id, full_name, email)')
        .eq('class_id', selectedClassId),
      supabase
        .from('attendance_records')
        .select('student_id, status, source')
        .eq('class_id', selectedClassId)
        .eq('date', today),
    ])

    const raw = (enrollRes.data ?? []) as unknown as {
      student_id: string
      profiles:   { id: string; full_name: string | null; email: string | null } | null
    }[]

    // Existing records for today (including auto-marks from joining the live class)
    const existing: Record<string, { status: Status; source: string | null }> = {}
    for (const r of (existingRes.data ?? []) as { student_id: string; status: string | null; source: string | null }[]) {
      existing[r.student_id] = { status: (r.status as Status) ?? 'present', source: r.source }
    }

    setStudents(raw.map(r => ({
      id:     r.student_id,
      name:   r.profiles?.full_name ?? r.profiles?.email ?? 'Unknown',
      status: existing[r.student_id]?.status ?? 'absent',
      auto:   existing[r.student_id]?.source === 'live_auto',
    })))
    setLoadingStudents(false)
  }

  function setStatus(id: string, status: Status) {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status, auto: false } : s))
  }

  async function saveAttendance() {
    setSaving(true)
    setError('')
    const today   = new Date().toISOString().split('T')[0]
    const cls     = teacherClasses.find(c => c.class_id === selectedClassId)

    const records = students.map(s => ({
      school_id:  profile!.school_id!,
      class_id:   selectedClassId,
      subject_id: cls?.subject_id ?? null,
      teacher_id: profile!.id,
      student_id: s.id,
      date:       today,
      status:     s.status,
      source:     s.auto ? 'live_auto' : 'manual',  // teacher's manual save wins over auto-marks
    }))

    const { error: err } = await supabase
      .from('attendance_records')
      .upsert(records, { onConflict: 'student_id,class_id,date' })

    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved(true)
  }

  const present = students.filter(s => s.status === 'present').length
  const late    = students.filter(s => s.status === 'late').length
  const absent  = students.filter(s => s.status === 'absent').length

  return (
    <DashboardLayout
      activePage="live-classes"
      onNavigate={onNavigate}
      title="In-Class Attendance"
      subtitle="Mark attendance for today's class"
      nav={teacherNav}
      user={sidebarUser}
    >
      <div className="max-w-[720px] flex flex-col gap-5">

        {/* Class selector */}
        <div className="bg-surface rounded-card shadow-sm p-5">
          <label className="text-sm font-semibold text-foreground block mb-2">Select Class</label>
          {loadingClasses ? (
            <p className="text-sm text-muted">Loading classes…</p>
          ) : teacherClasses.length === 0 ? (
            <p className="text-sm text-amber-600">No classes assigned yet.</p>
          ) : (
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="w-full h-12 pl-4 pr-10 border border-black/20 rounded-input text-sm text-foreground bg-surface outline-none focus:border-primary appearance-none"
              >
                {teacherClasses.map(c => (
                  <option key={c.class_id} value={c.class_id}>{c.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
          )}
        </div>

        {/* Summary counts */}
        {students.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Present', count: present, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Late',    count: late,    color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Absent',  count: absent,  color: 'text-red-500',   bg: 'bg-red-50'   },
            ].map(({ label, count, color, bg }) => (
              <div key={label} className={`${bg} rounded-card p-4 text-center`}>
                <p className={`text-2xl font-bold ${color}`}>{count}</p>
                <p className="text-xs text-muted mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Student list */}
        {selectedClassId && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-black/6 flex items-center gap-3">
              <Users size={15} className="text-muted" />
              <h2 className="text-base font-bold text-foreground">
                {loadingStudents ? 'Loading…' : `${students.length} Students`}
              </h2>
            </div>
            <div className="divide-y divide-black/4">
              {loadingStudents ? (
                <div className="px-6 py-8 text-center text-sm text-muted">Loading students…</div>
              ) : students.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted">No students enrolled in this class.</div>
              ) : students.map(s => (
                <div key={s.id} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {s.name.split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    {s.auto && (
                      <p className="text-[11px] text-primary font-medium">Auto-marked from live class — click a status to override</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(['present', 'late', 'absent'] as Status[]).map(st => (
                      <button
                        key={st}
                        onClick={() => setStatus(s.id, st)}
                        className={`h-8 px-3 rounded-full text-xs font-semibold capitalize transition-colors ${
                          s.status === st
                            ? st === 'present' ? 'bg-green-500 text-white'
                            : st === 'late'    ? 'bg-amber-500 text-white'
                            : 'bg-red-500 text-white'
                            : 'bg-canvas text-muted hover:bg-black/8'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {students.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={saveAttendance}
              disabled={saving}
              className="h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Attendance'}
            </button>
            {saved && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                <CheckCircle2 size={16} /> Saved
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
