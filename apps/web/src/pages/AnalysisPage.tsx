import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, Users2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface SubjectStat { subject: string; classAvg: number; topScore: number; passRate: number }
interface TopStudent  { name: string; avg: number; trend: 'up' | 'down' | 'stable' }
interface ScoreBand   { range: string; count: number; pct: number; color: string }

const BAND_COLORS = ['bg-red-400', 'bg-amber-400', 'bg-amber-300', 'bg-primary/60', 'bg-primary', 'bg-green-500']

export default function AnalysisPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [subjectStats,  setSubjectStats]  = useState<SubjectStat[]>([])
  const [topStudents,   setTopStudents]   = useState<TopStudent[]>([])
  const [scoreBands,    setScoreBands]    = useState<ScoreBand[]>([])
  const [studentAverages, setStudentAverages] = useState<number[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [classAvgScore, setClassAvgScore] = useState(0)
  const [passRate,      setPassRate]      = useState(0)
  const [topScore,      setTopScore]      = useState(0)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => { if (profile?.id) loadData() }, [profile?.id])

  async function loadData() {
    setLoading(true)
    setSubjectStats([])
    setTopStudents([])
    setScoreBands([])
    setStudentAverages([])
    setClassAvgScore(0)
    setPassRate(0)
    setTopScore(0)

    const teacherId = profile!.id

    // Teacher scope should come from teacher_assignments, not only published courses
    const { data: assignmentScopeData } = await supabase
      .from('teacher_assignments')
      .select('class_id, subject_id, classes!class_id(name), subjects!subject_id(name)')
      .eq('teacher_id', teacherId)

    const teacherScope = (assignmentScopeData ?? []) as unknown as Array<{
      class_id: string
      subject_id: string
      classes: { name: string } | null
      subjects: { name: string } | null
    }>

    const classIds = [...new Set(teacherScope.map(item => item.class_id))]
    const subjectIds = [...new Set(teacherScope.map(item => item.subject_id))]
    const subjectNameMap = new Map(
      teacherScope
        .filter((item) => item.subjects?.name)
        .map((item) => [item.subject_id, item.subjects!.name]),
    )

    if (classIds.length === 0) { setLoading(false); return }

    // Enrolled students
    const { data: ceData } = await supabase
      .from('class_enrollments')
      .select('student_id, profiles(id, full_name)')
      .in('class_id', classIds)
    const ceRows = (ceData ?? []) as unknown as { student_id: string; profiles: { id: string; full_name: string | null } | null }[]
    const studentIds = [...new Set(ceRows.filter(e => e.profiles).map(e => e.profiles!.id))]
    const nameMap    = Object.fromEntries(ceRows.filter(e => e.profiles).map(e => [e.profiles!.id, e.profiles!.full_name ?? 'Unknown']))
    setTotalStudents(studentIds.length)
    if (studentIds.length === 0) { setLoading(false); return }

    // Live grades from teacher-owned assignments
    const { data: assignmentData } = await supabase
      .from('assignments')
      .select('id, subject_id, class_id')
      .eq('teacher_id', teacherId)
      .in('class_id', classIds)
      .in('subject_id', subjectIds)

    const assignments = (assignmentData ?? []) as Array<{
      id: string
      subject_id: string | null
      class_id: string | null
    }>
    const assignmentIds = assignments.map((item) => item.id)
    if (assignmentIds.length === 0) { setLoading(false); return }

    const assignmentSubjectMap = new Map(
      assignments
        .filter((item): item is { id: string; subject_id: string; class_id: string | null } => Boolean(item.subject_id))
        .map((item) => [item.id, item.subject_id]),
    )

    const { data: gradeData } = await supabase
      .from('grades')
      .select('student_id, assignment_id, score, max_score')
      .in('student_id', studentIds)
      .in('assignment_id', assignmentIds)

    const gradeRows = (gradeData ?? []) as Array<{
      student_id: string
      assignment_id: string
      score: number | null
      max_score: number | null
    }>

    // Subject stats
    const bySubject: Record<string, { name: string; scores: number[] }> = {}
    for (const grade of gradeRows) {
      const subjectId = assignmentSubjectMap.get(grade.assignment_id)
      if (!subjectId || grade.score == null || !grade.max_score || grade.max_score <= 0) continue

      if (!bySubject[subjectId]) {
        bySubject[subjectId] = { name: subjectNameMap.get(subjectId) ?? subjectId, scores: [] }
      }
      bySubject[subjectId].scores.push((grade.score / grade.max_score) * 100)
    }
    const stats: SubjectStat[] = Object.values(bySubject).map(s => {
      if (s.scores.length === 0) return { subject: s.name, classAvg: 0, topScore: 0, passRate: 0 }
      const avg     = Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length)
      const top     = Math.round(Math.max(...s.scores))
      const passing = s.scores.filter(v => v >= 50).length
      return { subject: s.name, classAvg: avg, topScore: top, passRate: Math.round((passing / s.scores.length) * 100) }
    })
    setSubjectStats(stats)

    // Per-student averages
    const byStudent: Record<string, number[]> = {}
    for (const grade of gradeRows) {
      if (grade.score == null || !grade.max_score || grade.max_score <= 0) continue
      if (!byStudent[grade.student_id]) byStudent[grade.student_id] = []
      byStudent[grade.student_id].push((grade.score / grade.max_score) * 100)
    }
    const studentAvgs = Object.entries(byStudent).map(([id, scores]) => ({
      id,
      name: nameMap[id] ?? 'Unknown',
      avg:  Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10,
    })).sort((a, b) => b.avg - a.avg)
    setStudentAverages(studentAvgs.map(student => student.avg))

    setTopStudents(studentAvgs.slice(0, 5).map(s => ({
      name: s.name,
      avg:  s.avg,
      trend: s.avg >= 80 ? 'up' : s.avg >= 60 ? 'stable' : 'down',
    })))

    // Overall stats
    const allScores = studentAvgs.map(s => s.avg)
    if (allScores.length > 0) {
      const overallAvg = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length * 10) / 10
      setClassAvgScore(overallAvg)
      setTopScore(Math.round(Math.max(...allScores)))
      setPassRate(Math.round((allScores.filter(s => s >= 50).length / allScores.length) * 100))
    }

    // Score distribution
    const bands = [
      { range: '0–49',  min: 0,  max: 49  },
      { range: '50–59', min: 50, max: 59  },
      { range: '60–69', min: 60, max: 69  },
      { range: '70–79', min: 70, max: 79  },
      { range: '80–89', min: 80, max: 89  },
      { range: '90+',   min: 90, max: 100 },
    ]
    const maxCount = Math.max(1, ...bands.map(b => allScores.filter(s => s >= b.min && s <= b.max).length))
    setScoreBands(bands.map((b, i) => {
      const count = allScores.filter(s => s >= b.min && s <= b.max).length
      return { range: b.range, count, pct: Math.round((count / maxCount) * 100), color: BAND_COLORS[i] }
    }))

    setLoading(false)
  }

  return (
    <DashboardLayout
      activePage="analytics"
      onNavigate={onNavigate}
      title="Academic Analysis"
      subtitle="Class performance insights and student progress"
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-6 max-w-[1200px]">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Students',  value: loading ? '…' : String(totalStudents), sub: 'Enrolled this term',   color: 'text-foreground' },
            { label: 'Class Avg Score', value: loading ? '…' : `${classAvgScore}%`,   sub: 'Across all subjects',  color: 'text-green-600'  },
            { label: 'Pass Rate',       value: loading ? '…' : `${passRate}%`,         sub: 'Passed all subjects',  color: 'text-primary'    },
            { label: 'Top Score',       value: loading ? '…' : `${topScore}%`,         sub: topStudents[0]?.name ?? '—', color: 'text-accent-mint'},
          ].map(stat => (
            <div key={stat.label} className="bg-surface rounded-card shadow-sm p-5">
              <p className="text-sm text-muted">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          <div className="bg-surface rounded-card shadow-sm p-6">
            <h3 className="text-xl font-bold text-foreground mb-6">Subject Performance</h3>
            {loading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : subjectStats.length === 0 ? (
              <p className="text-sm text-muted">No grade data available yet.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {subjectStats.map(s => (
                  <div key={s.subject} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{s.subject}</span>
                      <div className="flex items-center gap-4 text-xs text-muted">
                        <span>Avg: <strong className="text-foreground">{s.classAvg}%</strong></span>
                        <span>Top: <strong className="text-foreground">{s.topScore}%</strong></span>
                        <span>Pass: <strong className="text-green-600">{s.passRate}%</strong></span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-black/6 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${s.classAvg}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && scoreBands.length > 0 && (
              <div className="mt-8 pt-6 border-t border-black/6">
                <h4 className="text-base font-semibold text-foreground mb-4">Score Distribution</h4>
                <div className="flex items-end gap-2 h-36">
                  {scoreBands.map(bar => (
                    <div key={bar.range} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-foreground">{bar.count}</span>
                      <div className={`w-full rounded-t-sm ${bar.color}`} style={{ height: `${bar.pct * 1.2}px` }} />
                      <span className="text-[10px] text-muted">{bar.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-surface rounded-card shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Users2 size={18} className="text-primary" />
              <h3 className="text-base font-bold text-foreground">Top Performers</h3>
            </div>
            {loading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : topStudents.length === 0 ? (
              <p className="text-sm text-muted">No data yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {topStudents.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-card bg-canvas/60">
                    <span className="text-xs font-bold text-muted w-5 text-center shrink-0">#{i + 1}</span>
                    <div className="size-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">{s.name.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm font-bold text-foreground">{s.avg}%</span>
                      {s.trend === 'up'     && <TrendingUp   size={12} className="text-green-500" />}
                      {s.trend === 'down'   && <TrendingDown size={12} className="text-red-500"   />}
                      {s.trend === 'stable' && <Minus        size={12} className="text-muted"     />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && totalStudents > 0 && (
              <div className="mt-6 pt-5 border-t border-black/6">
                <h4 className="text-sm font-bold text-foreground mb-3">Class Health</h4>
                {[
                  { label: 'At Risk (< 60%)',    color: 'bg-red-400',   cutoff: [0,  59]  },
                  { label: 'Below Avg (60–74%)', color: 'bg-amber-400', cutoff: [60, 74]  },
                  { label: 'Average (75–84%)',   color: 'bg-primary/60',cutoff: [75, 84]  },
                  { label: 'Excellent (85%+)',   color: 'bg-green-500', cutoff: [85, 100] },
                ].map(item => {
                  const count = studentAverages.filter(avg => avg >= item.cutoff[0] && avg <= item.cutoff[1]).length
                  return (
                    <div key={item.label} className="flex items-center gap-3 mb-2.5">
                      <span className={`size-2.5 rounded-full ${item.color} shrink-0`} />
                      <span className="text-xs text-muted flex-1">{item.label}</span>
                      <span className="text-xs font-semibold text-foreground">{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
