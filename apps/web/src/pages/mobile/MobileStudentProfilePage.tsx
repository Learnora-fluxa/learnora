import { useState, useEffect } from 'react'
import { Settings, Award, BookOpen, Flame, TrendingUp, ChevronRight, Camera } from 'lucide-react'
import MobileLayout, { studentMobileNav } from '../../components/layout/MobileLayout'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

const COLORS = ['bg-primary', 'bg-accent-mint', 'bg-amber-400', 'bg-red-400']

export default function MobileStudentProfilePage({ onNavigate }: Props) {
  const { profile, signOut } = useAuth()

  const [className,  setClassName]  = useState('—')
  const [schoolName, setSchoolName] = useState('—')
  const [attendance, setAttendance] = useState('—')
  const [streak,     setStreak]     = useState(0)
  const [avgScore,   setAvgScore]   = useState<number | null>(null)
  const [courses,    setCourses]    = useState<{ name: string; progress: number }[]>([])

  useEffect(() => { if (profile?.id) loadProfile() }, [profile?.id])

  async function loadProfile() {
    const sid      = profile!.id
    const schoolId = profile!.school_id!

    const [ceRes, schRes, arRes, gsRes, lpRes] = await Promise.all([
      supabase.from('class_enrollments').select('classes!class_id(name)').eq('student_id', sid).limit(1).maybeSingle(),
      supabase.from('schools').select('name').eq('id', schoolId).maybeSingle(),
      supabase.from('attendance_records').select('status').eq('student_id', sid).eq('school_id', schoolId).limit(60),
      supabase.from('grade_summaries').select('avg_score, subjects!subject_id(name)').eq('student_id', sid).eq('school_id', schoolId).limit(6),
      supabase.from('lesson_progress').select('completed_at').eq('student_id', sid).eq('school_id', schoolId).eq('completed', true).not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(60),
    ])

    const ce = ceRes.data as unknown as { classes: { name: string } | null } | null
    setClassName(ce?.classes?.name ?? '—')

    const sch = schRes.data as { name: string | null } | null
    setSchoolName(sch?.name ?? '—')

    const ar = (arRes.data ?? []) as { status: string }[]
    const present = ar.filter(r => r.status === 'present').length
    setAttendance(ar.length > 0 ? `${Math.round((present / ar.length) * 100)}%` : '—')

    const gs = (gsRes.data ?? []) as unknown as { avg_score: number | null; subjects: { name: string } | null }[]
    if (gs.length > 0) {
      const avg = Math.round(gs.reduce((s, g) => s + (g.avg_score ?? 0), 0) / gs.length)
      setAvgScore(avg)
      setCourses(gs.slice(0, 3).map(g => ({ name: g.subjects?.name ?? 'Unknown', progress: Math.round(g.avg_score ?? 0) })))
    }

    // Streak: consecutive days with a completed lesson
    const lp = (lpRes.data ?? []) as { completed_at: string }[]
    const days = new Set(lp.map(r => r.completed_at.slice(0, 10)))
    const today = new Date()
    let s = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      if (days.has(key)) s++
      else if (i > 0) break
    }
    setStreak(s)
  }

  async function handleSignOut() {
    await signOut()
    onNavigate('login')
  }

  const name     = profile?.full_name ?? 'Student'
  const initials = name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || 'S'
  const gpa      = avgScore !== null ? (avgScore / 25).toFixed(1) : '—'

  return (
    <MobileLayout activePage="m/profile" onNavigate={onNavigate} nav={studentMobileNav}>
      <div className="px-5 pt-5 pb-8 flex flex-col gap-5">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">My Profile</h1>
          <button onClick={() => onNavigate('m/settings')} className="size-9 rounded-full bg-canvas flex items-center justify-center">
            <Settings size={18} className="text-muted" />
          </button>
        </div>

        {/* Avatar + info */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="relative">
            <div className="size-24 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold shadow-primary">
              {initials}
            </div>
            <button className="absolute bottom-0 right-0 size-7 rounded-full bg-white shadow flex items-center justify-center border border-black/8">
              <Camera size={13} className="text-muted" />
            </button>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground">{name}</h2>
            <p className="text-sm text-muted">{className} · {schoolName}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'GPA',        value: gpa,              Icon: TrendingUp, color: 'text-primary'   },
            { label: 'Attendance', value: attendance,       Icon: Award,      color: 'text-green-500' },
            { label: 'Streak',     value: `${streak}d`,     Icon: Flame,      color: 'text-red-500'   },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="bg-surface rounded-2xl p-4 text-center shadow-sm">
              <Icon size={18} className={`${color} mx-auto mb-1`} />
              <p className="text-lg font-bold text-foreground">{value}</p>
              <p className="text-[10px] text-muted">{label}</p>
            </div>
          ))}
        </div>

        {/* Courses progress */}
        {courses.length > 0 && (
          <div className="bg-surface rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <BookOpen size={14} className="text-primary" /> My Subjects
              </p>
              <button onClick={() => onNavigate('courses')} className="text-xs text-primary font-semibold flex items-center gap-0.5">
                View all <ChevronRight size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {courses.map((c, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted">{c.progress}%</p>
                  </div>
                  <div className="h-1.5 bg-black/8 rounded-full overflow-hidden">
                    <div className={`h-full ${COLORS[i % COLORS.length]} rounded-full`} style={{ width: `${c.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="bg-surface rounded-2xl shadow-sm overflow-hidden">
          {[
            { label: 'Profile Settings',      page: 'profile-settings' },
            { label: 'Notification Settings', page: 'notif-settings'   },
            { label: 'Security',              page: 'security-settings' },
            { label: 'Help & Support',        page: 'support'          },
          ].map(({ label, page }, i, arr) => (
            <button key={i} onClick={() => onNavigate(page)}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground hover:bg-canvas transition-colors ${i < arr.length - 1 ? 'border-b border-black/6' : ''}`}>
              {label}
              <ChevronRight size={14} className="text-muted" />
            </button>
          ))}
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut} className="w-full h-12 border border-red-200 text-red-500 text-sm font-bold rounded-2xl hover:bg-red-50 transition-colors">
          Sign Out
        </button>

      </div>
    </MobileLayout>
  )
}
