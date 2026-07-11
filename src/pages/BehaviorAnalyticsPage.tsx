import { AlertTriangle, CheckCircle2, TrendingDown, Users, ChevronRight, Flag } from 'lucide-react'
import { useState, useEffect } from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type Risk  = 'high' | 'medium' | 'low'

interface AtRiskStudent {
  id:          string
  name:        string
  className:   string
  risk:        Risk
  attendance:  number
  avgGrade:    number
  subRate:     string
  flags:       string[]
}

const riskStyle: Record<Risk, { badge: string; row: string }> = {
  high:   { badge: 'bg-red-50 text-red-600',    row: 'border-l-2 border-red-400'    },
  medium: { badge: 'bg-amber-50 text-amber-600', row: 'border-l-2 border-amber-400' },
  low:    { badge: 'bg-canvas text-muted',       row: ''                             },
}

const riskIcon: Record<Risk, typeof AlertTriangle> = {
  high:   AlertTriangle,
  medium: TrendingDown,
  low:    CheckCircle2,
}

function classifyRisk(att: number, avg: number): Risk {
  if (att < 65 || avg < 50) return 'high'
  if (att < 75 || avg < 60) return 'medium'
  return 'low'
}

function generateFlags(att: number, avg: number, subRatePct: number): string[] {
  const flags: string[] = []
  if (att < 65)         flags.push('Attendance below 65%')
  else if (att < 70)    flags.push('Attendance below 70%')
  else if (att < 75)    flags.push('Attendance below 75%')
  if (avg < 50)         flags.push('Failing most subjects')
  else if (avg < 60)    flags.push('Below passing average')
  if (subRatePct < 50)  flags.push('Missed more than half of assignments')
  else if (subRatePct < 70) flags.push('Low assignment completion')
  return flags
}

export default function BehaviorAnalyticsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [loading,   setLoading]   = useState(true)
  const [allStudents, setAllStudents] = useState<AtRiskStudent[]>([])
  const [filter,    setFilter]    = useState<Risk | 'all'>('all')

  useEffect(() => { if (profile?.id) loadData() }, [profile?.id])

  async function loadData() {
    setLoading(true)
    const teacherId = profile!.id

    // Phase 1 — teacher assignments
    const { data: taData, error: taErr } = await supabase
      .from('teacher_assignments')
      .select('class_id, subject_id, classes!class_id(name), subjects!subject_id(name)')
      .eq('teacher_id', teacherId)
    if (taErr) { logSupabaseError('Behavior/ta', taErr); setLoading(false); return }

    type TARaw = { class_id: string; subject_id: string; classes: { name: string } | null; subjects: { name: string } | null }
    const classMap   = new Map<string, string>()
    const subjectIds: string[] = []
    for (const r of (taData ?? []) as unknown as TARaw[]) {
      if (r.classes?.name) classMap.set(r.class_id, r.classes.name)
      if (r.subject_id)    subjectIds.push(r.subject_id)
    }

    const classIds = [...classMap.keys()]
    if (classIds.length === 0) { setLoading(false); return }

    // Phase 2 — enrollment, attendance, assignments
    const threeMonthsAgo = new Date(Date.now() - 90 * 86400_000).toISOString().split('T')[0]
    const [enrollRes, attRes, assignRes] = await Promise.all([
      supabase.from('class_enrollments').select('class_id, student_id').in('class_id', classIds),
      supabase.from('attendance_records').select('student_id, status').in('class_id', classIds).gte('date', threeMonthsAgo),
      supabase.from('assignments').select('id').in('class_id', classIds),
    ])
    if (enrollRes.error) logSupabaseError('Behavior/enroll', enrollRes.error)
    if (attRes.error)    logSupabaseError('Behavior/att',    attRes.error)

    type EnrollRaw = { class_id: string; student_id: string }
    type AttRaw    = { student_id: string; status: string }

    const studentClassMap = new Map<string, string>()
    for (const e of (enrollRes.data ?? []) as unknown as EnrollRaw[]) {
      if (!studentClassMap.has(e.student_id)) studentClassMap.set(e.student_id, e.class_id)
    }

    const studentIds    = [...studentClassMap.keys()]
    const assignmentIds = (assignRes.data ?? []).map((a: { id: string }) => a.id)

    if (studentIds.length === 0) { setLoading(false); return }

    // Attendance per student
    const attPres = new Map<string, number>()
    const attTot  = new Map<string, number>()
    for (const r of (attRes.data ?? []) as unknown as AttRaw[]) {
      attPres.set(r.student_id, (attPres.get(r.student_id) ?? 0) + (r.status === 'present' ? 1 : 0))
      attTot.set(r.student_id,  (attTot.get(r.student_id)  ?? 0) + 1)
    }
    const attRateFn = (sid: string) => {
      const tot = attTot.get(sid) ?? 0
      return tot > 0 ? Math.round((attPres.get(sid) ?? 0) / tot * 100) : 100
    }

    // Phase 3 — grades, submissions, names
    const [gsRes, subRes, profRes] = await Promise.all([
      supabase.from('grade_summaries').select('student_id, average_score').in('student_id', studentIds).in('subject_id', subjectIds),
      assignmentIds.length > 0
        ? supabase.from('assignment_submissions').select('student_id').in('assignment_id', assignmentIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('profiles').select('id, full_name').in('id', studentIds),
    ])
    if (gsRes.error)   logSupabaseError('Behavior/gs',   gsRes.error)
    if (profRes.error) logSupabaseError('Behavior/prof', profRes.error)

    type GSRaw   = { student_id: string; average_score: number }
    type SubRaw  = { student_id: string }
    type ProfRaw = { id: string; full_name: string }

    const nameMap = new Map<string, string>()
    for (const p of (profRes.data ?? []) as unknown as ProfRaw[]) {
      nameMap.set(p.id, p.full_name)
    }

    // Average grade per student
    const gradeAccum = new Map<string, number[]>()
    for (const r of (gsRes.data ?? []) as unknown as GSRaw[]) {
      if (!gradeAccum.has(r.student_id)) gradeAccum.set(r.student_id, [])
      gradeAccum.get(r.student_id)!.push(r.average_score)
    }
    const avgGradeFn = (sid: string) => {
      const gs = gradeAccum.get(sid) ?? []
      return gs.length > 0 ? Math.round(gs.reduce((s, v) => s + v, 0) / gs.length) : 0
    }

    // Submission count per student
    const subCountMap = new Map<string, number>()
    for (const r of (subRes.data ?? []) as unknown as SubRaw[]) {
      subCountMap.set(r.student_id, (subCountMap.get(r.student_id) ?? 0) + 1)
    }
    const subRateFn = (sid: string) => {
      if (assignmentIds.length === 0) return 100
      return Math.round((subCountMap.get(sid) ?? 0) / assignmentIds.length * 100)
    }

    // Build at-risk list (only students at low risk or above)
    const atRiskList: AtRiskStudent[] = []
    for (const [sid, classId] of studentClassMap) {
      const att  = attRateFn(sid)
      const avg  = avgGradeFn(sid)
      const rate = subRateFn(sid)
      const risk = classifyRisk(att, avg)

      // Only include students who are not fully healthy
      if (att >= 80 && avg >= 65 && rate >= 80) continue

      const flags = generateFlags(att, avg, rate)
      if (flags.length === 0 && risk === 'low') continue  // no meaningful flags

      atRiskList.push({
        id:         sid,
        name:       nameMap.get(sid) ?? '—',
        className:  classMap.get(classId) ?? '—',
        risk,
        attendance: att,
        avgGrade:   avg,
        subRate:    `${subCountMap.get(sid) ?? 0}/${assignmentIds.length}`,
        flags,
      })
    }

    // Sort: high first, then medium, then low
    atRiskList.sort((a, b) => {
      const order: Record<Risk, number> = { high: 0, medium: 1, low: 2 }
      return order[a.risk] - order[b.risk]
    })

    setAllStudents(atRiskList)
    setLoading(false)
  }

  const filtered    = filter === 'all' ? allStudents : allStudents.filter(s => s.risk === filter)
  const highCount   = allStudents.filter(s => s.risk === 'high').length
  const mediumCount = allStudents.filter(s => s.risk === 'medium').length
  const lowCount    = allStudents.filter(s => s.risk === 'low').length

  return (
    <DashboardLayout
      activePage="analytics"
      onNavigate={onNavigate}
      title="At-Risk Students"
      subtitle="Behavior analytics and early-warning flags"
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-5">

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'High Risk',   count: loading ? '—' : highCount,   color: 'bg-red-50 text-red-600',    Icon: AlertTriangle },
            { label: 'Medium Risk', count: loading ? '—' : mediumCount, color: 'bg-amber-50 text-amber-600', Icon: TrendingDown  },
            { label: 'Low Risk',    count: loading ? '—' : lowCount,    color: 'bg-green-50 text-green-600', Icon: CheckCircle2  },
          ].map(({ label, count, color, Icon }) => (
            <div key={label} className="bg-surface rounded-card shadow-sm p-5 flex items-center gap-4">
              <div className={`size-10 rounded-card ${color} flex items-center justify-center shrink-0`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-xs text-muted">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Alert banner */}
        {!loading && highCount > 0 && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-card p-4">
            <Flag size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">
              <span className="font-bold">{highCount} student{highCount > 1 ? 's are' : ' is'} at high risk</span> of academic failure.
              Intervention recommended this week.
            </p>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 bg-canvas rounded-pill p-1 w-fit">
          {(['all', 'high', 'medium', 'low'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-8 px-4 rounded-full text-sm font-semibold capitalize transition-colors ${filter === f ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}
            >
              {f === 'all' ? `All (${allStudents.length})` : f}
            </button>
          ))}
        </div>

        {/* Students list */}
        {loading ? (
          <div className="py-12 text-center text-sm text-muted">Analysing student data…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <Users size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {allStudents.length === 0 ? 'No at-risk students detected. Great work!' : 'No students in this category.'}
            </p>
          </div>
        ) : (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="divide-y divide-black/4">
              {filtered.map(s => {
                const { badge, row } = riskStyle[s.risk]
                const RiskIcon = riskIcon[s.risk]
                return (
                  <div key={s.id} className={`px-6 py-4 hover:bg-canvas/50 transition-colors ${row}`}>
                    <div className="flex items-start gap-4">
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-0.5">
                        {s.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <p className="text-sm font-semibold text-foreground">{s.name}</p>
                          <span className="text-xs text-muted">{s.className}</span>
                          <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${badge} capitalize`}>
                            <RiskIcon size={10} /> {s.risk} risk
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3 text-xs">
                          <div>
                            <p className="text-muted">Attendance</p>
                            <p className={`font-bold ${s.attendance < 70 ? 'text-red-500' : 'text-foreground'}`}>{s.attendance}%</p>
                          </div>
                          <div>
                            <p className="text-muted">Avg Grade</p>
                            <p className={`font-bold ${s.avgGrade < 50 ? 'text-red-500' : 'text-foreground'}`}>
                              {s.avgGrade > 0 ? `${s.avgGrade}%` : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted">Submissions</p>
                            <p className="font-bold text-foreground">{s.subRate}</p>
                          </div>
                        </div>

                        {s.flags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {s.flags.map((flag, fi) => (
                              <span key={fi} className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                                <AlertTriangle size={9} /> {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => onNavigate('teacher-messages')}
                          className="h-8 px-3 border border-primary text-primary text-xs font-semibold rounded-full hover:bg-primary/8 transition-colors"
                        >
                          Message
                        </button>
                        <button
                          onClick={() => {
                            sessionStorage.setItem('learnora_selected_student', s.id)
                            onNavigate('student-detail')
                          }}
                          className="h-8 px-3 bg-canvas text-muted text-xs font-semibold rounded-full hover:bg-black/8 transition-colors flex items-center gap-1"
                        >
                          Profile <ChevronRight size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
