import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, Star, TrendingUp, Users, Trophy, Medal } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { parentNav } from '../../components/layout/Sidebar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

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

interface GrowthPoint {
  month: string
  value: number
}

interface TermScore {
  label: string
  score: number
}

interface AttendanceMonth {
  month: string
  value: number
}

interface QuickStat {
  label: string
  value: string
  sub: string
  icon: typeof TrendingUp
  iconWrap: string
}

interface SubjectPreview extends SubjectStat {
  improvementLabel: string
  classAverage: number
  rank: string
}

interface ProgressPreviewData {
  child: ChildSummary
  avgGpa: number
  gpaBadge: string
  growthRangeLabel: string
  growthHistory: GrowthPoint[]
  quickStats: QuickStat[]
  termScores: TermScore[]
  termBestLabel: string
  subjectCards: SubjectPreview[]
  attendanceRate: number
  attendanceBadge: string
  presentDays: number
  absentDays: number
  attendanceTrend: AttendanceMonth[]
}

const DEMO_CHILD_ID = 'demo-child-olive'
const DEMO_PREVIEW: ProgressPreviewData = {
  child: {
    id: DEMO_CHILD_ID,
    name: 'Olive Princely Ashuma',
    className: 'Primary 5A',
  },
  avgGpa: 4.5,
  gpaBadge: '+10% Improvement from last term',
  growthRangeLabel: 'Last 4 Months',
  growthHistory: [
    { month: 'Sep', value: 3.2 },
    { month: 'Oct', value: 3.8 },
    { month: 'Nov', value: 4.1 },
    { month: 'Dec', value: 3.7 },
    { month: 'Jan', value: 4.5 },
  ],
  quickStats: [
    {
      label: 'GPA',
      value: '4.3',
      sub: '↑ +0.4 from last term',
      icon: TrendingUp,
      iconWrap: 'bg-green-100 text-green-500',
    },
    {
      label: 'Rank',
      value: '4th',
      sub: 'Top 10% in class',
      icon: Trophy,
      iconWrap: 'bg-primary text-white',
    },
    {
      label: 'Attendance',
      value: '4.3',
      sub: '↑ +0.4 from last term',
      icon: Users,
      iconWrap: 'bg-lime-200 text-lime-700',
    },
    {
      label: 'Conduct',
      value: 'Excellent',
      sub: 'Teacher rating: A',
      icon: Star,
      iconWrap: 'bg-amber-100 text-amber-500',
    },
  ],
  termScores: [
    { label: 'Test 1', score: 72 },
    { label: 'Mid Term', score: 76 },
    { label: 'Test 2', score: 73 },
    { label: 'Exam', score: 80 },
  ],
  termBestLabel: 'Best performance recorded in December.',
  subjectCards: [
    {
      name: 'Mathematics',
      avgScore: 85,
      gradeLetter: 'A',
      improvementLabel: '+10% Improvement from last term',
      classAverage: 78,
      rank: '5th',
    },
    {
      name: 'English',
      avgScore: 75,
      gradeLetter: 'B',
      improvementLabel: '+10% Improvement from last term',
      classAverage: 78,
      rank: '5th',
    },
  ],
  attendanceRate: 95,
  attendanceBadge: 'Excellent Attendance',
  presentDays: 114,
  absentDays: 6,
  attendanceTrend: [
    { month: 'Jan', value: 38 },
    { month: 'Feb', value: 95 },
    { month: 'Mar', value: 71 },
    { month: 'Apr', value: 29 },
    { month: 'May', value: 68 },
  ],
}

function AcademicGrowthChart({ points }: { points: { month: string; value: number }[] }) {
  if (!points.length) return null

  const width = 320
  const height = 110
  const paddingX = 12
  const paddingY = 10
  const min = 3
  const max = 4.5

  const coords = points.map((point, index) => {
    const x = paddingX + (index * (width - paddingX * 2)) / Math.max(points.length - 1, 1)
    const normalized = (point.value - min) / (max - min || 1)
    const y = height - paddingY - normalized * (height - paddingY * 2)
    return { x, y }
  })

  const path = coords.map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {[0, 1, 2, 3].map(index => {
        const y = 18 + index * 24
        return <line key={index} x1="0" y1={y} x2={width} y2={y} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
      })}
      <path d={path} fill="none" stroke="#00de04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PerformanceTrendChart({ points }: { points: { label: string; score: number }[] }) {
  if (!points.length) return null

  const width = 320
  const height = 170
  const paddingX = 10
  const paddingY = 8
  const min = 65
  const max = 100

  const coords = points.map((point, index) => {
    const x = paddingX + (index * (width - paddingX * 2)) / Math.max(points.length - 1, 1)
    const normalized = (point.score - min) / (max - min || 1)
    const y = height - paddingY - normalized * (height - paddingY * 2)
    return { x, y }
  })

  const path = coords.map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`).join(' ')
  const focus = coords[coords.length - 1]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {Array.from({ length: 8 }).map((_, index) => {
        const y = index * 24
        return <line key={index} x1="0" y1={y} x2={width} y2={y} stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
      })}
      <path d={path} fill="none" stroke="#4b75ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {focus && (
        <>
          <circle cx={focus.x} cy={focus.y} r="4" fill="#4b75ff" />
          <rect x={Math.max(focus.x - 34, 220)} y={Math.max(focus.y - 40, 8)} rx="8" width="74" height="38" fill="#111111" />
          <text x={Math.max(focus.x - 26, 228)} y={Math.max(focus.y - 26, 22)} fill="#fff" fontSize="8">Exam</text>
          <text x={Math.max(focus.x - 26, 228)} y={Math.max(focus.y - 12, 34)} fill="#fff" fontSize="8" fontWeight="700">
            Score: 80%
          </text>
        </>
      )}
    </svg>
  )
}

export default function ParentProgressPage({ onNavigate }: Props) {
  const { profile, loading: authLoading } = useAuth()
  const [child, setChild] = useState<ChildSummary>(DEMO_PREVIEW.child)
  const [subjects, setSubjects] = useState<SubjectStat[]>(DEMO_PREVIEW.subjectCards)
  const [avgGPA, setAvgGPA] = useState<number>(DEMO_PREVIEW.avgGpa)
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!profile) {
      setLoading(false)
      return
    }
    loadProgress()
  }, [authLoading, profile?.id, profile?.school_id])

  async function loadProgress() {
    setLoading(true)
    if (!profile?.school_id) {
      useFallback()
      return
    }
    const childId = sessionStorage.getItem('learnora_selected_child')
    if (!childId || childId === DEMO_CHILD_ID) {
      useFallback()
      return
    }

    const { data: childCheck } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', childId)
      .eq('school_id', profile.school_id)
      .maybeSingle()

    if (!childCheck) {
      useFallback()
      return
    }

    const [profileRes, enrollRes, gradeRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', childId).maybeSingle(),
      supabase.from('class_enrollments')
        .select('class_id, classes(name)')
        .eq('student_id', childId)
        .limit(1)
        .maybeSingle(),
      supabase.from('grade_summaries')
        .select('average_score, grade_letter, subjects(name)')
        .eq('student_id', childId),
    ])

    const childName = (profileRes.data as { full_name: string | null } | null)?.full_name ?? 'Child'
    const className = (enrollRes.data as unknown as { classes: { name: string } | null } | null)?.classes?.name ?? '—'

    const rawGrades = (gradeRes.data ?? []) as unknown as {
      average_score: number | null
      grade_letter: string | null
      subjects: { name: string } | null
    }[]

    const stats = rawGrades
      .filter(grade => grade.subjects?.name)
      .map(grade => ({
        name: grade.subjects!.name,
        avgScore: grade.average_score ?? 0,
        gradeLetter: grade.grade_letter ?? '—',
      }))

    const mean = stats.length > 0
      ? parseFloat((stats.reduce((sum, grade) => sum + grade.avgScore, 0) / stats.length / 20).toFixed(1))
      : 4.5

    setChild({ id: childId, name: childName, className })
    setSubjects(stats.length > 0 ? stats : DEMO_PREVIEW.subjectCards)
    setAvgGPA(mean)
    setUsingFallback(false)
    setLoading(false)
  }

  function useFallback() {
    setChild(DEMO_PREVIEW.child)
    setSubjects(DEMO_PREVIEW.subjectCards)
    setAvgGPA(DEMO_PREVIEW.avgGpa)
    setUsingFallback(true)
    setLoading(false)
  }

  const quickStats = useMemo(() => DEMO_PREVIEW.quickStats, [])
  const userName = profile?.full_name ?? 'Parent User'
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'P'

  const subjectCards = useMemo<SubjectPreview[]>(() => {
    const primary = subjects.slice(0, 2)
    if (primary.length === 0) return DEMO_PREVIEW.subjectCards

    return primary.map((subject, index) => ({
      ...subject,
      improvementLabel: DEMO_PREVIEW.subjectCards[index]?.improvementLabel ?? '+10% Improvement from last term',
      classAverage: DEMO_PREVIEW.subjectCards[index]?.classAverage ?? Math.max(50, subject.avgScore - 7),
      rank: DEMO_PREVIEW.subjectCards[index]?.rank ?? `${index + 4}th`,
    }))
  }, [subjects])

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

          <div className="flex items-center gap-3 rounded-full border border-black px-3 py-2 shadow-sm">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {child.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground">{child.name}</p>
              <p className="truncate text-xs text-muted">{child.className}</p>
            </div>
            <ChevronDown size={16} className="shrink-0" />
          </div>
        </div>

        <h1 className="text-[2rem] font-bold text-primary leading-tight">Progress Tracking</h1>
        <p className="mt-2 max-w-[260px] text-sm text-foreground">
          Track your child&apos;s academic growth and performance trends.
        </p>

        {usingFallback && (
          <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary">
            Preview mode: showing fallback child progress because no linked child was found yet.
          </div>
        )}

        {loading ? (
          <p className="py-12 text-center text-sm text-muted">Loading…</p>
        ) : (
          <>
            <section className="mt-4 rounded-[18px] border border-black/20 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">Academic Growth</p>
                  <div className="mt-4 flex items-end gap-1">
                    <p className="text-5xl font-bold leading-none text-foreground">{avgGPA.toFixed(1)}</p>
                    <p className="mb-1 text-lg font-semibold text-muted">/5.0 GPA</p>
                  </div>
                  <div className="mt-3 inline-flex rounded-md bg-[#00de04] px-3 py-1.5 text-sm font-semibold text-white">
                    {DEMO_PREVIEW.gpaBadge}
                  </div>
                </div>

                <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white">
                  {DEMO_PREVIEW.growthRangeLabel}
                  <ChevronDown size={14} />
                </button>
              </div>

              <div className="mt-4">
                <AcademicGrowthChart points={DEMO_PREVIEW.growthHistory} />
                <div className="mt-2 flex justify-between px-3 text-sm font-semibold text-foreground">
                  {['Sep', 'Oct', 'Nov', 'Dec'].map(month => <span key={month}>{month}</span>)}
                </div>
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-[2rem] font-semibold text-foreground">Quick Stats</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
                {quickStats.map(item => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="rounded-[16px] border border-black/20 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[1.4rem] font-semibold text-foreground">{item.label}</p>
                        <div className={`flex size-10 items-center justify-center rounded-full ${item.iconWrap}`}>
                          <Icon size={16} />
                        </div>
                      </div>
                      <p className="mt-10 text-[2.3rem] font-bold leading-none text-foreground">{item.value}</p>
                      <p className="mt-3 text-sm text-foreground">{item.sub}</p>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-foreground">Performance Trend</h2>
              <p className="mt-3 text-sm text-foreground">Track academic performance throughout the term.</p>
              <div className="mt-4 rounded-[16px] border border-black/20 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-base font-bold text-foreground">This Term</p>
                  <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white">
                    All
                    <ChevronDown size={14} />
                  </button>
                </div>
                <p className="text-[10px] text-foreground">{DEMO_PREVIEW.termBestLabel}</p>

                <div className="mt-4">
                  <PerformanceTrendChart points={DEMO_PREVIEW.termScores} />
                  <div className="mt-2 flex justify-between px-2 text-xs text-foreground">
                    {DEMO_PREVIEW.termScores.map(item => <span key={item.label}>{item.label}</span>)}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-foreground">Subject Progress</h2>
              <p className="mt-3 text-sm text-foreground">See how your child is progressing in every subject this term.</p>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {subjectCards.map((subject, index) => {
                  const trackColor = index === 0 ? 'bg-green-100' : 'bg-amber-100'
                  const barColor = index === 0 ? 'bg-[#00ff04]' : 'bg-[#ffc107]'
                  const chipColor = index === 0 ? 'bg-[#00ff04]' : 'bg-[#ffd700]'
                  return (
                    <div key={subject.name} className="rounded-[16px] border border-black/20 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-base font-semibold text-foreground">{subject.name}</p>
                        <div className={`flex size-9 items-center justify-center rounded-full ${trackColor}`}>
                          <Medal size={16} className={index === 0 ? 'text-green-600' : 'text-amber-500'} />
                        </div>
                      </div>
                      <p className="mt-5 text-4xl font-bold text-foreground">{subject.avgScore}%</p>
                      <div className={`mt-3 inline-flex rounded-md px-2 py-1 text-[8px] font-semibold text-white ${chipColor}`}>
                        {subject.improvementLabel}
                      </div>
                      <div className={`mt-5 h-1.5 rounded-full ${trackColor}`}>
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${subject.avgScore}%` }} />
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-[10px] text-[#323232]">
                        <span>Class Average: <strong className="text-black">{subject.classAverage}%</strong></span>
                        <span className="text-black/20">|</span>
                        <span>Rank: <strong className="text-black">{subject.rank}</strong></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-foreground">Attendance Progress</h2>
              <p className="mt-3 text-sm text-foreground">Monitor attendance patterns and punctuality throughout the term.</p>

              <div className="mt-4 rounded-[16px] border border-black/20 bg-white p-4 shadow-sm">
                <p className="text-base font-semibold text-foreground">Attendance rate</p>
                <p className="mt-4 text-6xl font-bold leading-none text-foreground">{DEMO_PREVIEW.attendanceRate}%</p>
                <div className="mt-4 inline-flex rounded-md bg-[#00ff04] px-2.5 py-1 text-[8px] font-semibold text-white">
                  {DEMO_PREVIEW.attendanceBadge}
                </div>
                <div className="mt-6 flex items-center justify-between gap-4 text-base">
                  <p className="font-semibold text-muted">Present Days: <span className="font-bold text-foreground">{DEMO_PREVIEW.presentDays}</span></p>
                  <div className="h-6 w-px bg-black/20" />
                  <p className="font-semibold text-muted">Absent Days: <span className="font-bold text-foreground">{DEMO_PREVIEW.absentDays}</span></p>
                </div>
              </div>

              <div className="mt-4 rounded-[16px] border border-black/20 bg-white p-4 shadow-sm">
                <p className="text-base font-semibold text-foreground">Monthly Attendance Trend</p>
                <div className="mt-5 space-y-4">
                  {DEMO_PREVIEW.attendanceTrend.map(item => (
                    <div key={item.month} className="flex items-center gap-4">
                      <span className="w-7 text-sm font-semibold text-foreground">{item.month}</span>
                      <div className="h-[30px] flex-1 rounded-[10px] bg-primary/10">
                        <div className="h-full rounded-[10px] bg-primary" style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                  ))}
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
          subtitle="Track your child's academic growth and performance trends."
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
