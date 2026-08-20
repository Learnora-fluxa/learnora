import { useState, useEffect } from 'react'
import { BookOpen, TrendingUp, Award, Calendar } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface SubjectRecord { name: string; score: number; grade: string }
interface TermRecord {
  label:      string
  date:       string
  avgScore:   number
  grade:      string
  subjects:   SubjectRecord[]
  attendance: string
}

function scoreToGrade(score: number): string {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 75) return 'B+'
  if (score >= 70) return 'B'
  if (score >= 65) return 'C+'
  if (score >= 60) return 'C'
  return 'F'
}

function gradeColor(grade: string) {
  if (grade.startsWith('A')) return 'text-green-700 bg-green-50'
  if (grade.startsWith('B')) return 'text-primary bg-primary/10'
  return 'text-amber-600 bg-amber-50'
}

export default function AcademicHistoryPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [terms,    setTerms]    = useState<TermRecord[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { if (profile?.id) loadData() }, [profile?.id])

  async function loadData() {
    setLoading(true)
    const studentId = profile!.id
    const schoolId  = profile!.school_id!

    const [gsRes, arRes, termRes] = await Promise.all([
      supabase.from('grade_summaries')
        .select('avg_score, subject_id, subjects!subject_id(name), term_id')
        .eq('student_id', studentId)
        .eq('school_id', schoolId),
      supabase.from('attendance_records')
        .select('status, date')
        .eq('student_id', studentId)
        .eq('school_id', schoolId),
      supabase.from('terms')
        .select('id, name, start_date, end_date, is_current')
        .eq('school_id', schoolId)
        .order('start_date', { ascending: false })
        .limit(4),
    ])

    const gsRows = (gsRes.data ?? []) as unknown as {
      avg_score: number | null
      subject_id: string
      subjects: { name: string } | null
      term_id: string | null
    }[]

    const arRows = (arRes.data ?? []) as { status: string; date: string }[]
    const dbTerms = (termRes.data ?? []) as { id: string; name: string; start_date: string | null; end_date: string | null; is_current: boolean }[]

    const totalRecords = arRows.length
    const presentCount = arRows.filter(r => r.status === 'present').length
    const overallAttendance = totalRecords > 0 ? `${Math.round((presentCount / totalRecords) * 100)}%` : '—'

    if (dbTerms.length > 0) {
      const termRecords: TermRecord[] = dbTerms.map(t => {
        const termGrades = gsRows.filter(g => g.term_id === t.id)
        const subjects: SubjectRecord[] = termGrades.map(g => {
          const score = Math.round(g.avg_score ?? 0)
          return { name: g.subjects?.name ?? 'Unknown', score, grade: scoreToGrade(score) }
        })
        const avg = subjects.length > 0
          ? Math.round(subjects.reduce((s, sub) => s + sub.score, 0) / subjects.length)
          : 0
        const start = t.start_date ? new Date(t.start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : ''
        const end   = t.end_date   ? new Date(t.end_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : ''
        return {
          label:      t.name,
          date:       start && end ? `${start} – ${end}` : start || end || t.name,
          avgScore:   avg,
          grade:      scoreToGrade(avg),
          subjects:   subjects.length > 0 ? subjects : [],
          attendance: overallAttendance,
        }
      })
      setTerms(termRecords)
    } else if (gsRows.length > 0) {
      const subjects: SubjectRecord[] = gsRows.map(g => {
        const score = Math.round(g.avg_score ?? 0)
        return { name: g.subjects?.name ?? 'Unknown', score, grade: scoreToGrade(score) }
      })
      const avg = Math.round(subjects.reduce((s, sub) => s + sub.score, 0) / subjects.length)
      setTerms([{
        label:      'Current Term',
        date:       'Academic Year',
        avgScore:   avg,
        grade:      scoreToGrade(avg),
        subjects,
        attendance: overallAttendance,
      }])
    }

    setLoading(false)
  }

  const gpaHistory = terms.map(t => t.avgScore).reverse()
  const maxGpa     = 100
  const termLabels = terms.map(t => t.label.replace(/^.*\s/, '')).reverse()

  return (
    <DashboardLayout
      activePage="profile"
      onNavigate={onNavigate}
      title="Academic History"
      subtitle="Your term-by-term academic record"
      user={sidebarUser}
    >
      {loading ? (
        <div className="text-center py-16 text-sm text-muted">Loading academic records…</div>
      ) : terms.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted">No academic records yet. Check back after grades are submitted.</div>
      ) : (
        <>
          {/* Score Trend */}
          {gpaHistory.length > 1 && (
            <div className="bg-surface rounded-card shadow-sm p-6 mb-5">
              <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-primary" /> Score Trend
              </h2>
              <div className="flex items-end gap-4 h-28">
                {gpaHistory.map((g, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                    <span className="text-[10px] font-bold text-primary">{g}%</span>
                    <div className="w-full bg-primary rounded-t" style={{ height: `${(g / maxGpa) * 100}%` }} />
                    <span className="text-[9px] text-muted text-center leading-tight">{termLabels[i]}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted mt-3 text-center">Score out of 100 per term</p>
            </div>
          )}

          {/* Terms */}
          <div className="flex flex-col gap-5">
            {terms.map((term, ti) => (
              <div key={ti} className="bg-surface rounded-card shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-canvas border-b border-black/6 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Calendar size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{term.label}</p>
                      <p className="text-xs text-muted">{term.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-foreground">{term.avgScore}%</p>
                      <p className="text-xs text-muted">Avg Score</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-foreground">{term.attendance}</p>
                      <p className="text-xs text-muted">Attendance</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${gradeColor(term.grade)}`}>
                      Grade {term.grade}
                    </span>
                  </div>
                </div>

                {term.subjects.length === 0 ? (
                  <div className="px-6 py-6 text-center text-sm text-muted">Grades not yet submitted for this term.</div>
                ) : (
                  <div className="divide-y divide-black/4">
                    {term.subjects.map((s, si) => (
                      <div key={si} className="flex items-center gap-4 px-6 py-3">
                        <div className="size-7 rounded-full bg-canvas flex items-center justify-center shrink-0">
                          <BookOpen size={11} className="text-muted" />
                        </div>
                        <p className="flex-1 text-sm text-foreground">{s.name}</p>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-canvas rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${s.score}%` }} />
                          </div>
                          <span className="text-xs font-bold text-foreground w-7 text-right">{s.score}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-10 text-center ${gradeColor(s.grade)}`}>
                            {s.grade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="px-6 py-3 bg-canvas border-t border-black/6 flex items-center justify-between text-xs text-muted">
                  <span className="flex items-center gap-1.5"><Award size={11} /> {term.subjects.length} subjects</span>
                  <button className="text-primary font-semibold hover:underline">Download Report Card</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
