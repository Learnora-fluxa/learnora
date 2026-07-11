import { useState, useEffect } from 'react'
import { Users, TrendingUp, Award, BookOpen, BarChart2, AlertCircle } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface ClassStat {
  id: string; name: string; students: number
  avgGrade: number; attendance: number; atRisk: number; trend: 'up' | 'down'
}

interface TopStudent { id: string; name: string; className: string; avg: number }
interface SubjectAvg  { subject: string; avg: number; color: string }

const SUBJECT_COLORS = ['bg-primary', 'bg-amber-400', 'bg-green-500', 'bg-red-400', 'bg-purple-400']

export default function TeacherAnalyticsPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [loading,      setLoading]      = useState(true)
  const [classStats,   setClassStats]   = useState<ClassStat[]>([])
  const [topStudents,  setTopStudents]  = useState<TopStudent[]>([])
  const [subjectAvgs,  setSubjectAvgs]  = useState<SubjectAvg[]>([])
  const [weeklyData,   setWeeklyData]   = useState<number[]>(Array(7).fill(0))
  const [pendingCount, setPendingCount] = useState(0)
  const [totalStuds,   setTotalStuds]   = useState(0)
  const [overallAvg,   setOverallAvg]   = useState(0)
  const [totalAtRisk,  setTotalAtRisk]  = useState(0)

  useEffect(() => { if (profile?.id) loadAnalytics() }, [profile?.id])

  async function loadAnalytics() {
    setLoading(true)
    const teacherId = profile!.id

    // Phase 1 — teacher's class/subject assignments
    const { data: taData, error: taErr } = await supabase
      .from('teacher_assignments')
      .select('class_id, subject_id, classes!class_id(name), subjects!subject_id(name)')
      .eq('teacher_id', teacherId)
    if (taErr) { logSupabaseError('Analytics/ta', taErr); setLoading(false); return }

    type TARaw = { class_id: string; subject_id: string; classes: { name: string } | null; subjects: { name: string } | null }
    const classMap   = new Map<string, string>()
    const subjectMap = new Map<string, string>()
    for (const r of (taData ?? []) as unknown as TARaw[]) {
      if (r.classes?.name)  classMap.set(r.class_id, r.classes.name)
      if (r.subjects?.name) subjectMap.set(r.subject_id, r.subjects.name)
    }

    const classIds   = [...classMap.keys()]
    const subjectIds = [...subjectMap.keys()]
    if (classIds.length === 0) { setLoading(false); return }

    // Phase 2 — enrollment, attendance, assignments
    const threeMonthsAgo = new Date(Date.now() - 90 * 86400_000).toISOString().split('T')[0]
    const [enrollRes, attRes, assignRes] = await Promise.all([
      supabase.from('class_enrollments').select('class_id, student_id').in('class_id', classIds),
      supabase.from('attendance_records').select('class_id, student_id, status').in('class_id', classIds).gte('date', threeMonthsAgo),
      supabase.from('assignments').select('id').in('class_id', classIds),
    ])
    if (enrollRes.error) logSupabaseError('Analytics/enroll', enrollRes.error)
    if (attRes.error)    logSupabaseError('Analytics/att',    attRes.error)

    type EnrollRaw  = { class_id: string; student_id: string }
    type AttRaw     = { class_id: string; student_id: string; status: string }

    const enrollRows    = (enrollRes.data ?? []) as unknown as EnrollRaw[]
    const attRows       = (attRes.data    ?? []) as unknown as AttRaw[]
    const assignmentIds = (assignRes.data ?? []).map((a: { id: string }) => a.id)

    const studentClassMap  = new Map<string, string>()
    const classStudentsMap = new Map<string, Set<string>>()
    for (const [cid] of classMap) classStudentsMap.set(cid, new Set())
    for (const e of enrollRows) {
      if (!studentClassMap.has(e.student_id)) studentClassMap.set(e.student_id, e.class_id)
      classStudentsMap.get(e.class_id)?.add(e.student_id)
    }
    const studentIds = [...studentClassMap.keys()]

    if (studentIds.length === 0) { setLoading(false); return }

    // Phase 3 — grades, submissions, names
    const [gsRes, subRes, profRes] = await Promise.all([
      supabase.from('grade_summaries').select('student_id, subject_id, average_score').in('student_id', studentIds).in('subject_id', subjectIds),
      assignmentIds.length > 0
        ? supabase.from('assignment_submissions').select('student_id, status, submitted_at').in('assignment_id', assignmentIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('profiles').select('id, full_name').in('id', studentIds),
    ])
    if (gsRes.error)   logSupabaseError('Analytics/gs',   gsRes.error)
    if (profRes.error) logSupabaseError('Analytics/prof', profRes.error)

    type GSRaw  = { student_id: string; subject_id: string; average_score: number }
    type SubRaw = { student_id: string; status: string; submitted_at: string }
    type ProfRaw = { id: string; full_name: string }

    const gsRows   = (gsRes.data  ?? []) as unknown as GSRaw[]
    const subRows  = (subRes.data ?? []) as unknown as SubRaw[]
    const profRows = (profRes.data ?? []) as unknown as ProfRaw[]

    const nameMap = new Map(profRows.map(p => [p.id, p.full_name]))

    // ── Attendance per student ──
    const attPres = new Map<string, number>()
    const attTot  = new Map<string, number>()
    for (const r of attRows) {
      attPres.set(r.student_id, (attPres.get(r.student_id) ?? 0) + (r.status === 'present' ? 1 : 0))
      attTot.set(r.student_id,  (attTot.get(r.student_id)  ?? 0) + 1)
    }
    const attRateFn = (sid: string) => {
      const tot = attTot.get(sid) ?? 0
      return tot > 0 ? Math.round((attPres.get(sid) ?? 0) / tot * 100) : 100
    }

    // ── Grades per student ──
    const studentGrades = new Map<string, number[]>()
    const subjectScores = new Map<string, number[]>()
    for (const r of gsRows) {
      if (!studentGrades.has(r.student_id)) studentGrades.set(r.student_id, [])
      studentGrades.get(r.student_id)!.push(r.average_score)
      if (!subjectScores.has(r.subject_id)) subjectScores.set(r.subject_id, [])
      subjectScores.get(r.subject_id)!.push(r.average_score)
    }
    const avgFn = (sid: string) => {
      const gs = studentGrades.get(sid) ?? []
      return gs.length > 0 ? gs.reduce((s, v) => s + v, 0) / gs.length : 0
    }

    // ── Class stats ──
    const csList: ClassStat[] = []
    let totalAtRiskCount = 0
    for (const [cid, cName] of classMap) {
      const sids = [...(classStudentsMap.get(cid) ?? new Set())]
      const grades = sids.map(avgFn).filter(g => g > 0)
      const avgGrade = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + g, 0) / grades.length) : 0
      const totAtt   = sids.reduce((s, sid) => s + (attTot.get(sid) ?? 0), 0)
      const presAtt  = sids.reduce((s, sid) => s + (attPres.get(sid) ?? 0), 0)
      const attendance = totAtt > 0 ? Math.round(presAtt / totAtt * 100) : 100
      const atRisk = sids.filter(sid => attRateFn(sid) < 70 || avgFn(sid) < 60).length
      totalAtRiskCount += atRisk
      csList.push({ id: cid, name: cName, students: sids.length, avgGrade, attendance, atRisk, trend: avgGrade >= 65 ? 'up' : 'down' })
    }
    setClassStats(csList)
    setTotalAtRisk(totalAtRiskCount)

    // ── Total students + overall avg ──
    setTotalStuds(studentIds.length)
    const allGrades = gsRows.map(r => r.average_score)
    setOverallAvg(allGrades.length > 0 ? Math.round(allGrades.reduce((s, g) => s + g, 0) / allGrades.length) : 0)

    // ── Top students ──
    const topList: TopStudent[] = studentIds
      .map(sid => ({ sid, avg: avgFn(sid) }))
      .filter(s => s.avg > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
      .map(s => ({
        id: s.sid,
        name: nameMap.get(s.sid) ?? '—',
        className: classMap.get(studentClassMap.get(s.sid) ?? '') ?? '—',
        avg: Math.round(s.avg),
      }))
    setTopStudents(topList)

    // ── Subject averages ──
    const subAvgList: SubjectAvg[] = []
    let ci = 0
    for (const [sid, sName] of subjectMap) {
      const scores = subjectScores.get(sid) ?? []
      if (scores.length > 0) {
        const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
        subAvgList.push({ subject: sName, avg, color: SUBJECT_COLORS[ci++ % SUBJECT_COLORS.length] })
      }
    }
    setSubjectAvgs(subAvgList)

    // ── Weekly submissions (last 7 weeks) ──
    const weekly = Array(7).fill(0)
    const now = Date.now()
    for (const r of subRows) {
      const daysAgo = (now - new Date(r.submitted_at).getTime()) / 86400_000
      const idx = 6 - Math.floor(daysAgo / 7)
      if (idx >= 0 && idx <= 6) weekly[idx]++
    }
    setWeeklyData(weekly)

    // ── Pending grading ──
    setPendingCount(subRows.filter(r => r.status === 'submitted').length)

    setLoading(false)
  }

  const weeklyLabels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']
  const maxWeekly    = Math.max(...weeklyData, 1)

  return (
    <DashboardLayout
      activePage="analytics"
      onNavigate={onNavigate}
      title="My Analytics"
      subtitle="Performance overview across all your classes"
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-5">

        {/* Summary cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Total Students',   value: loading ? '—' : totalStuds,            Icon: Users,        color: 'bg-primary/10 text-primary'   },
            { label: 'Overall Avg',      value: loading ? '—' : `${overallAvg}%`,      Icon: BarChart2,    color: 'bg-green-50 text-green-600'   },
            { label: 'Pending Grading',  value: loading ? '—' : pendingCount,           Icon: BookOpen,     color: 'bg-amber-50 text-amber-600'   },
            { label: 'At-Risk Students', value: loading ? '—' : totalAtRisk,            Icon: AlertCircle,  color: 'bg-red-50 text-red-500'       },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="bg-surface rounded-card shadow-sm p-5">
              <div className={`size-9 rounded-full flex items-center justify-center mb-2 ${color}`}>
                <Icon size={16} />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Submissions trend */}
          <div className="bg-surface rounded-card shadow-sm p-5 xl:col-span-2">
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" /> Assignment Submissions (Last 7 Weeks)
            </h2>
            {loading ? (
              <div className="h-32 bg-canvas rounded animate-pulse" />
            ) : (
              <div className="flex items-end gap-3 h-32">
                {weeklyData.map((v, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-[9px] font-bold text-foreground">{v > 0 ? v : ''}</span>
                    <div className="w-full bg-primary rounded-t transition-all" style={{ height: `${(v / maxWeekly) * 100}%`, minHeight: v > 0 ? '4px' : '0' }} />
                    <span className="text-[9px] text-muted">{weeklyLabels[i]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subject averages */}
          <div className="bg-surface rounded-card shadow-sm p-5">
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <BarChart2 size={14} className="text-primary" /> Subject Averages
            </h2>
            {loading ? (
              <div className="flex flex-col gap-3">{[1,2,3].map(i => <div key={i} className="h-8 bg-canvas rounded animate-pulse" />)}</div>
            ) : subjectAvgs.length === 0 ? (
              <p className="text-xs text-muted">No grade data yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {subjectAvgs.map(s => (
                  <div key={s.subject}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-foreground truncate">{s.subject}</span>
                      <span className="font-bold text-foreground ml-2">{s.avg}%</span>
                    </div>
                    <div className="h-2 bg-canvas rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.avg}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Class breakdown */}
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-black/6">
              <h2 className="text-sm font-bold text-foreground">Class Breakdown</h2>
            </div>
            {loading ? (
              <div className="divide-y divide-black/4">
                {[1,2,3].map(i => <div key={i} className="flex items-center gap-4 px-5 py-3.5"><div className="size-9 rounded-full bg-canvas animate-pulse" /><div className="flex-1 h-8 bg-canvas rounded animate-pulse" /></div>)}
              </div>
            ) : classStats.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">No classes assigned yet.</p>
            ) : (
              <div className="divide-y divide-black/4">
                {classStats.map(c => (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="size-9 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                      {c.name.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted">{c.students} students · {c.attendance}% attendance</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${c.avgGrade >= 75 ? 'text-green-600' : c.avgGrade >= 65 ? 'text-foreground' : 'text-amber-600'}`}>
                        {c.avgGrade > 0 ? `${c.avgGrade}%` : '—'}
                      </p>
                      {c.atRisk > 0 && (
                        <p className="text-[10px] text-red-500 font-semibold">{c.atRisk} at risk</p>
                      )}
                    </div>
                    <span className={`text-base ${c.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                      {c.trend === 'up' ? '↑' : '↓'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top students */}
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-black/6 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Award size={13} className="text-amber-500" /> Top Students
              </h2>
              <button onClick={() => onNavigate('students')} className="text-xs text-primary font-semibold hover:underline">
                All students
              </button>
            </div>
            {loading ? (
              <div className="divide-y divide-black/4">
                {[1,2,3,4,5].map(i => <div key={i} className="flex items-center gap-3 px-5 py-3.5"><div className="h-8 w-full bg-canvas rounded animate-pulse" /></div>)}
              </div>
            ) : topStudents.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">No grade data available yet.</p>
            ) : (
              <div className="divide-y divide-black/4">
                {topStudents.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="text-sm font-bold text-muted w-5">{i + 1}</span>
                    <div className="size-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                      <p className="text-xs text-muted">{s.className}</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">{s.avg}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Grade Submissions', page: 'submissions-inbox',  color: 'bg-primary text-white'         },
            { label: 'View At-Risk',      page: 'behavior-analytics', color: 'bg-red-50 text-red-600'        },
            { label: 'Class Performance', page: 'class-performance',  color: 'bg-green-50 text-green-700'    },
            { label: 'Export Report',     page: 'reports',            color: 'bg-canvas text-foreground'     },
          ].map(a => (
            <button key={a.label} onClick={() => onNavigate(a.page)}
              className={`h-11 rounded-card text-sm font-semibold transition-colors hover:opacity-90 ${a.color}`}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
