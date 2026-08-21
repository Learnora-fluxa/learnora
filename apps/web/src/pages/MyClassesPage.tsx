import { useState, useEffect } from 'react'
import { Users, BookOpen, ChevronRight, TrendingUp } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface ClassRow {
  classId:     string
  subjectId:   string
  className:   string
  subjectName: string
  enrollments: number
  color:       string
}

const COLORS = [
  'bg-primary', 'bg-green-500', 'bg-amber-500', 'bg-red-500',
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
]

export default function MyClassesPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => { if (profile?.id) loadClasses() }, [profile?.id])

  async function loadClasses() {
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('teacher_assignments')
      .select('class_id, subject_id, classes(id, name), subjects(id, name)')
      .eq('teacher_id', profile!.id)

    if (err) { setError(err.message); setLoading(false); return }

    const raw = (data ?? []) as unknown as {
      class_id:   string
      subject_id: string
      classes:    { id: string; name: string } | null
      subjects:   { id: string; name: string } | null
    }[]

    const classIds = [...new Set(raw.map(r => r.class_id))]

    const enrollmentMap: Record<string, number> = {}
    if (classIds.length > 0) {
      const { data: eData } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .in('class_id', classIds)
      for (const e of (eData ?? []) as { class_id: string }[]) {
        enrollmentMap[e.class_id] = (enrollmentMap[e.class_id] ?? 0) + 1
      }
    }

    setClasses(raw.map((r, i) => ({
      classId:     r.class_id,
      subjectId:   r.subject_id,
      className:   r.classes?.name ?? '—',
      subjectName: r.subjects?.name ?? '—',
      enrollments: enrollmentMap[r.class_id] ?? 0,
      color:       COLORS[i % COLORS.length],
    })))
    setLoading(false)
  }

  const totalStudents = classes.reduce((s, c) => s + c.enrollments, 0)

  return (
    <DashboardLayout
      activePage="classes"
      onNavigate={onNavigate}
      title="My Classes"
      subtitle="Manage all your active classes"
      nav={teacherNav}
      user={sidebarUser}
    >
      <div className="max-w-[1200px] flex flex-col gap-6">

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Classes',  value: loading ? '…' : String(classes.length), color: 'text-primary'    },
            { label: 'Total Students', value: loading ? '…' : String(totalStudents),  color: 'text-foreground' },
            { label: 'Avg Completion', value: '—',                                     color: 'text-amber-600'  },
            { label: 'Avg Score',      value: '—',                                     color: 'text-green-600'  },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-card shadow-sm p-5">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">All Classes</h2>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {loading ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center text-muted">
            <p className="text-sm">Loading classes…</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center text-muted">
            <BookOpen size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No classes assigned yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {classes.map(c => (
              <div key={`${c.classId}-${c.subjectId}`} className="bg-surface rounded-card shadow-sm overflow-hidden flex flex-col">
                <div className={`h-2 ${c.color}`} />
                <div className="p-5 flex flex-col gap-4 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground">{c.subjectName}</h3>
                      <p className="text-xs text-muted">{c.className}</p>
                    </div>
                    <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                      {c.className}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Users size={14} />{c.enrollments} students
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <TrendingUp size={14} />Avg: —
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        sessionStorage.setItem('learnora_selected_class_id', c.classId)
                        sessionStorage.setItem('learnora_selected_subject_id', c.subjectId)
                        sessionStorage.setItem('learnora_selected_class_name', c.className)
                        sessionStorage.setItem('learnora_selected_subject_name', c.subjectName)
                        onNavigate('class-details')
                      }}
                      className="flex-1 h-9 border border-primary text-primary text-sm font-semibold rounded-pill hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-1"
                    >
                      <BookOpen size={13} /> View Class
                    </button>
                    <button
                      onClick={() => onNavigate('students')}
                      className="flex-1 h-9 border border-black/15 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                    >
                      <Users size={13} /> Students
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Class activity */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/6">
            <h3 className="text-base font-bold text-foreground">Class Activity</h3>
            <button
              onClick={() => onNavigate('submissions-inbox')}
              className="text-sm text-primary font-semibold hover:underline flex items-center gap-1"
            >
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="px-6 py-8 text-center text-sm text-muted">No recent activity.</div>
        </div>

      </div>
    </DashboardLayout>
  )
}
