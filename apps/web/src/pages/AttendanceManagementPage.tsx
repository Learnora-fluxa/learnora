import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Clock, ChevronDown, Save } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type Status = 'present' | 'absent' | 'late' | null

interface ClassOption { id: string; classId: string; label: string }
interface StudentRow  { id: string; name: string }

export default function AttendanceManagementPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [classOptions,  setClassOptions]  = useState<ClassOption[]>([])
  const [selectedOpt,   setSelectedOpt]   = useState<ClassOption | null>(null)
  const [students,      setStudents]      = useState<StudentRow[]>([])
  const [attendance,    setAttendance]    = useState<Record<string, Status>>({})
  const [date,          setDate]          = useState(new Date().toISOString().split('T')[0])
  const [saved,         setSaved]         = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => { if (profile?.id) loadClasses() }, [profile?.id])
  useEffect(() => { if (selectedOpt) loadStudents(selectedOpt.classId) }, [selectedOpt?.classId, date])

  async function loadClasses() {
    const { data } = await supabase
      .from('courses')
      .select('id, class_id, classes(name), subjects(name)')
      .eq('teacher_id', profile!.id)
      .eq('is_published', true)
    const raw = (data ?? []) as unknown as {
      id: string; class_id: string
      classes: { name: string } | null
      subjects: { name: string } | null
    }[]
    const opts: ClassOption[] = raw.map(c => ({
      id:      c.id,
      classId: c.class_id,
      label:   `${c.classes?.name ?? '—'} · ${c.subjects?.name ?? '—'}`,
    }))
    setClassOptions(opts)
    if (opts.length > 0) setSelectedOpt(opts[0])
    setLoading(false)
  }

  async function loadStudents(classId: string) {
    const { data: ceData } = await supabase
      .from('class_enrollments')
      .select('student_id, profiles(id, full_name)')
      .eq('class_id', classId)
    const raw = (ceData ?? []) as unknown as {
      student_id: string
      profiles: { id: string; full_name: string | null } | null
    }[]
    const rows: StudentRow[] = raw
      .filter(e => e.profiles)
      .map(e => ({ id: e.profiles!.id, name: e.profiles!.full_name ?? 'Unknown' }))
    setStudents(rows)

    const studentIds = rows.map(r => r.id)
    if (studentIds.length > 0) {
      const { data: arData } = await supabase
        .from('attendance_records')
        .select('student_id, status')
        .eq('class_id', classId)
        .eq('date', date)
        .in('student_id', studentIds)
      const existing: Record<string, Status> = {}
      for (const r of (arData ?? []) as { student_id: string; status: Status }[]) {
        existing[r.student_id] = r.status
      }
      setAttendance(existing)
    } else {
      setAttendance({})
    }
    setSaved(false)
  }

  function mark(studentId: string, status: Status) {
    setAttendance(prev => ({ ...prev, [studentId]: prev[studentId] === status ? null : status }))
    setSaved(false)
  }

  function markAll(status: Status) {
    const next: Record<string, Status> = {}
    students.forEach(s => { next[s.id] = status })
    setAttendance(next)
    setSaved(false)
  }

  async function saveAttendance() {
    if (!selectedOpt || !profile?.school_id) return
    setSaving(true)
    const records = students
      .filter(s => attendance[s.id])
      .map(s => ({
        student_id: s.id,
        class_id:   selectedOpt.classId,
        date,
        status:     attendance[s.id],
        school_id:  profile.school_id!,
      }))
    if (records.length > 0) {
      const { error } = await supabase
        .from('attendance_records')
        .upsert(records, { onConflict: 'student_id,class_id,date' })
      logSupabaseError('Attendance.save', error)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const present = students.filter(s => attendance[s.id] === 'present').length
  const absent  = students.filter(s => attendance[s.id] === 'absent').length
  const late    = students.filter(s => attendance[s.id] === 'late').length

  return (
    <DashboardLayout
      activePage="attendance"
      onNavigate={onNavigate}
      title="Attendance"
      subtitle="Record and manage class attendance"
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[900px] flex flex-col gap-6">

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <select
              value={selectedOpt?.id ?? ''}
              onChange={e => {
                const opt = classOptions.find(o => o.id === e.target.value)
                if (opt) setSelectedOpt(opt)
              }}
              className="h-11 pl-4 pr-10 border border-black/20 rounded-input text-sm font-semibold text-foreground bg-surface outline-none focus:border-primary appearance-none"
            >
              {classOptions.length === 0
                ? <option value="">No classes assigned</option>
                : classOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)
              }
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>

          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setSaved(false) }}
            className="h-11 px-4 border border-black/20 rounded-input text-sm text-foreground bg-surface outline-none focus:border-primary"
          />

          <div className="flex gap-2 ml-auto">
            <button onClick={() => markAll('present')} className="h-9 px-4 text-xs font-semibold text-green-700 bg-green-50 rounded-pill hover:bg-green-100 transition-colors">Mark All Present</button>
            <button onClick={() => markAll('absent')}  className="h-9 px-4 text-xs font-semibold text-red-600 bg-red-50 rounded-pill hover:bg-red-100 transition-colors">Mark All Absent</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-card p-4 text-center"><p className="text-2xl font-bold text-green-700">{present}</p><p className="text-xs text-green-600 mt-0.5">Present</p></div>
          <div className="bg-red-50 rounded-card p-4 text-center"><p className="text-2xl font-bold text-red-600">{absent}</p><p className="text-xs text-red-500 mt-0.5">Absent</p></div>
          <div className="bg-amber-50 rounded-card p-4 text-center"><p className="text-2xl font-bold text-amber-600">{late}</p><p className="text-xs text-amber-500 mt-0.5">Late</p></div>
        </div>

        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/6">
            <h2 className="text-base font-bold text-foreground">Student Roll</h2>
            <span className="text-xs text-muted">{loading ? 'Loading…' : `${students.length} students`}</span>
          </div>
          <div className="divide-y divide-black/4">
            {loading ? (
              <div className="px-6 py-8 text-sm text-muted">Loading…</div>
            ) : students.length === 0 ? (
              <div className="px-6 py-8 text-sm text-muted">No students found for this class.</div>
            ) : students.map((s, i) => {
              const status = attendance[s.id]
              return (
                <div key={s.id} className="flex items-center gap-4 px-6 py-3.5">
                  <span className="text-sm text-muted w-6 text-right shrink-0">{i + 1}</span>
                  <div className="size-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                    {s.name.charAt(0)}
                  </div>
                  <p className="flex-1 text-sm font-medium text-foreground">{s.name}</p>
                  <div className="flex gap-2">
                    <button onClick={() => mark(s.id, 'present')}
                      className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors ${status === 'present' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                      <CheckCircle2 size={12} /> Present
                    </button>
                    <button onClick={() => mark(s.id, 'absent')}
                      className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors ${status === 'absent' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                      <XCircle size={12} /> Absent
                    </button>
                    <button onClick={() => mark(s.id, 'late')}
                      className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors ${status === 'late' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>
                      <Clock size={12} /> Late
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <button
          onClick={saveAttendance}
          disabled={saving}
          className={`flex items-center gap-2 h-12 px-6 rounded-pill text-sm font-semibold transition-colors self-start disabled:opacity-60 ${
            saved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary-deep shadow-primary'
          }`}
        >
          <Save size={15} />
          {saving ? 'Saving…' : saved ? 'Attendance Saved!' : 'Save Attendance'}
        </button>

      </div>
    </DashboardLayout>
  )
}
