import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Star, TrendingUp, Trophy, Users } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { parentNav } from '../../components/layout/Sidebar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { resolveLinkedParentChild } from '../../lib/parentStudents'

type Props = { onNavigate: (page: string) => void }

interface SubjectStat {
  name: string
  avgScore: number
  gradeLetter: string
}

interface ChildSummary {
  id: string
  name: string
  className: string
}

interface AttendanceRecord {
  date: string
  status: 'present' | 'absent' | 'late' | 'holiday'
}

interface QuickStat {
  label: string
  value: string
  sub: string
  icon: typeof TrendingUp
  iconWrap: string
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { month: 'short' })
}

export default function ParentProgressPage({ onNavigate }: Props) {
  const { profile, loading: authLoading } = useAuth()
  const [child, setChild] = useState<ChildSummary | null>(null)
  const [subjects, setSubjects] = useState<SubjectStat[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!profile?.id || !profile.school_id) {
      setChild(null)
      setSubjects([])
      setAttendance([])
      setLoading(false)
      return
    }
    loadProgress()
  }, [authLoading, profile?.id, profile?.school_id])

  async function loadProgress() {
    if (!profile?.id || !profile.school_id) return

    setLoading(true)

    const { childId } = await resolveLinkedParentChild(profile.id, profile.school_id)
    if (!childId) {
      setChild(null)
      setSubjects([])
      setAttendance([])
      setLoading(false)
      return
    }

    const [profileRes, enrollRes, gradeRes, attendanceRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', childId).maybeSingle(),
      supabase.from('class_enrollments')
        .select('classes(name)')
        .eq('student_id', childId)
        .limit(1)
        .maybeSingle(),
      supabase.from('grade_summaries')
        .select('average_score, grade_letter, subjects(name)')
        .eq('student_id', childId),
      supabase.from('attendance_records')
        .select('date, status')
        .eq('student_id', childId)
        .order('date', { ascending: false })
        .limit(120),
    ])

    const childName = (profileRes.data as { full_name: string | null } | null)?.full_name ?? 'Child'
    const className = (enrollRes.data as { classes: { name: string } | null } | null)?.classes?.name ?? '—'

    const gradeRows = (gradeRes.data ?? []) as {
      average_score: number | null
      grade_letter: string | null
      subjects: { name: string } | null
    }[]

    const subjectRows = gradeRows
      .filter(grade => grade.subjects?.name)
      .map(grade => ({
        name: grade.subjects!.name,
        avgScore: grade.average_score ?? 0,
        gradeLetter: grade.grade_letter ?? '—',
      }))
      .sort((left, right) => right.avgScore - left.avgScore)

    setChild({ id: childId, name: childName, className })
    setSubjects(subjectRows)
    setAttendance((attendanceRes.data ?? []) as AttendanceRecord[])
    setLoading(false)
  }

  const userName = profile?.full_name ?? 'Parent User'
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'P'

  const scores = useMemo(() => subjects.map(subject => subject.avgScore).filter(score => score > 0), [subjects])
  const averageScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0
  const avgGPA = scores.length ? parseFloat((averageScore / 20).toFixed(1)) : 0
  const topSubject = subjects[0] ?? null
  const passingCount = subjects.filter(subject => subject.avgScore >= 50).length
  const attendanceSummary = useMemo(() => {
    const stats = { present: 0, absent: 0, late: 0, total: 0 }
    for (const record of attendance) {
      if (record.status === 'holiday') continue
      stats.total += 1
      if (record.status === 'present') stats.present += 1
      if (record.status === 'absent') stats.absent += 1
      if (record.status === 'late') stats.late += 1
    }
    return stats
  }, [attendance])

  const attendanceRate = attendanceSummary.total > 0
    ? Math.round((attendanceSummary.present / attendanceSummary.total) * 100)
    : 0

  const monthlyAttendance = useMemo(() => {
    const totals = new Map<string, { label: string; present: number; total: number }>()

    for (const record of attendance) {
      if (record.status === 'holiday') continue
      const key = record.date.slice(0, 7)
      const entry = totals.get(key) ?? { label: monthLabel(record.date), present: 0, total: 0 }
      entry.total += 1
      if (record.status === 'present') entry.present += 1
      totals.set(key, entry)
    }

    return [...totals.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-5)
      .map(([, value]) => ({
        label: value.label,
        value: value.total > 0 ? Math.round((value.present / value.total) * 100) : 0,
      }))
  }, [attendance])

  const quickStats: QuickStat[] = [
    {
      label: 'GPA',
      value: scores.length ? avgGPA.toFixed(1) : '—',
      sub: scores.length ? `${averageScore}% average across subjects` : 'No grade records yet',
      icon: TrendingUp,
      iconWrap: 'bg-green-100 text-green-500',
    },
    {
      label: 'Subjects',
      value: subjects.length.toString(),
      sub: subjects.length ? `${passingCount} subject${passingCount === 1 ? '' : 's'} above pass mark` : 'No subjects recorded yet',
      icon: Trophy,
      iconWrap: 'bg-primary text-white',
    },
    {
      label: 'Attendance',
      value: attendanceSummary.total ? `${attendanceRate}%` : '—',
      sub: attendanceSummary.total ? `${attendanceSummary.present} present days logged` : 'No attendance records yet',
      icon: Users,
      iconWrap: 'bg-lime-200 text-lime-700',
    },
    {
      label: 'Best Subject',
      value: topSubject?.gradeLetter ?? '—',
      sub: topSubject ? `${topSubject.name} at ${topSubject.avgScore}%` : 'No top subject available yet',
      icon: Star,
      iconWrap: 'bg-amber-100 text-amber-500',
    },
  ]

  function renderEmptyState() {
    return (
      <div className="rounded-[24px] border border-dashed border-black/12 bg-white px-6 py-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-foreground">No linked child yet</p>
        <p className="mt-2 text-sm text-muted">
          Ask the school admin to link this parent account to a student so progress can appear here.
        </p>
      </div>
    )
  }

  function renderProgressContent(showBackButton: boolean) {
    return (
      <div className="px-4 pt-5 pb-6 lg:px-0 lg:pt-0 lg:pb-0">
        <div className="mb-3 flex items-center justify-between gap-4">
          {showBackButton ? (
            <button onClick={() => onNavigate('parent/home')} className="shrink-0">
              <ChevronLeft size={24} />
            </button>
          ) : (
            <div />
          )}

          {child ? (
            <div className="flex items-center gap-3 rounded-full border border-black px-3 py-2 shadow-sm">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {child.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-foreground">{child.name}</p>
                <p className="truncate text-xs text-muted">{child.className}</p>
              </div>
            </div>
          ) : (
            <div />
          )}
        </div>

        <h1 className="text-[2rem] font-bold leading-tight text-primary">Progress Tracking</h1>
        <p className="mt-2 max-w-[260px] text-sm text-foreground">
          Track your child&apos;s academic performance and attendance using live school records.
        </p>

        {loading ? (
          <p className="py-12 text-center text-sm text-muted">Loading…</p>
        ) : !child ? (
          <div className="mt-6">{renderEmptyState()}</div>
        ) : (
          <>
            <section className="mt-4 rounded-[18px] border border-black/20 bg-white p-4 shadow-sm">
              <p className="text-lg font-semibold text-foreground">Academic Overview</p>
              <div className="mt-4 flex items-end gap-1">
                <p className="text-5xl font-bold leading-none text-foreground">{scores.length ? avgGPA.toFixed(1) : '—'}</p>
                <p className="mb-1 text-lg font-semibold text-muted">/5.0 GPA</p>
              </div>
              <p className="mt-3 text-sm text-muted">
                {scores.length
                  ? `Built from ${subjects.length} subject result${subjects.length === 1 ? '' : 's'}.`
                  : 'No grade summaries have been published for this child yet.'}
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-[2rem] font-semibold text-foreground">Quick Stats</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
                {quickStats.map(item => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="rounded-[16px] border border-black/20 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[1.2rem] font-semibold text-foreground">{item.label}</p>
                        <div className={`flex size-10 items-center justify-center rounded-full ${item.iconWrap}`}>
                          <Icon size={16} />
                        </div>
                      </div>
                      <p className="mt-8 text-[2.1rem] font-bold leading-none text-foreground">{item.value}</p>
                      <p className="mt-3 text-sm text-foreground">{item.sub}</p>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-foreground">Subject Performance</h2>
              <p className="mt-3 text-sm text-foreground">Latest published scores by subject.</p>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {subjects.length === 0 ? (
                  <div className="rounded-[16px] border border-dashed border-black/12 bg-white px-4 py-8 text-center text-sm text-muted shadow-sm xl:col-span-2">
                    No subject performance records yet.
                  </div>
                ) : (
                  subjects.map(subject => (
                    <div key={subject.name} className="rounded-[16px] border border-black/20 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-base font-semibold text-foreground">{subject.name}</p>
                        <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                          {subject.gradeLetter}
                        </div>
                      </div>
                      <p className="mt-5 text-4xl font-bold text-foreground">{subject.avgScore}%</p>
                      <div className="mt-5 h-1.5 rounded-full bg-primary/10">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${subject.avgScore}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-foreground">Attendance Progress</h2>
              <p className="mt-3 text-sm text-foreground">Attendance trends from the latest recorded school days.</p>

              <div className="mt-4 rounded-[16px] border border-black/20 bg-white p-4 shadow-sm">
                <p className="text-base font-semibold text-foreground">Attendance rate</p>
                <p className="mt-4 text-6xl font-bold leading-none text-foreground">
                  {attendanceSummary.total ? `${attendanceRate}%` : '—'}
                </p>
                <div className="mt-6 flex items-center justify-between gap-4 text-base">
                  <p className="font-semibold text-muted">
                    Present Days: <span className="font-bold text-foreground">{attendanceSummary.present}</span>
                  </p>
                  <div className="h-6 w-px bg-black/20" />
                  <p className="font-semibold text-muted">
                    Absent Days: <span className="font-bold text-foreground">{attendanceSummary.absent}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[16px] border border-black/20 bg-white p-4 shadow-sm">
                <p className="text-base font-semibold text-foreground">Monthly Attendance Trend</p>
                <div className="mt-5 space-y-4">
                  {monthlyAttendance.length === 0 ? (
                    <p className="text-sm text-muted">No monthly attendance trend available yet.</p>
                  ) : (
                    monthlyAttendance.map(item => (
                      <div key={item.label} className="flex items-center gap-4">
                        <span className="w-7 text-sm font-semibold text-foreground">{item.label}</span>
                        <div className="h-[30px] flex-1 rounded-[10px] bg-primary/10">
                          <div className="h-full rounded-[10px] bg-primary" style={{ width: `${item.value}%` }} />
                        </div>
                        <span className="w-12 text-right text-sm font-semibold text-foreground">{item.value}%</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="lg:hidden">
        <MobileLayout activePage="parent/progress" onNavigate={onNavigate} nav={parentMobileNav}>
          {renderProgressContent(true)}
        </MobileLayout>
      </div>

      <div className="hidden lg:block">
        <DashboardLayout
          activePage="parent/progress"
          onNavigate={onNavigate}
          title="Progress Tracking"
          subtitle={child ? `${child.name} · ${child.className}` : 'Track academic performance and attendance'}
          nav={parentNav}
          user={{ name: userName, role: 'Parent', initials: userInitials }}
          mainClassName="flex-1 overflow-y-auto p-6 xl:p-8"
        >
          <div className="mx-auto max-w-7xl rounded-[30px] bg-white p-8 shadow-sm">
            {renderProgressContent(false)}
          </div>
        </DashboardLayout>
      </div>
    </>
  )
}
