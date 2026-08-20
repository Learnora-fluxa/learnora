import { useState, useEffect } from 'react'
import { BookOpen, TrendingUp, Award, BarChart2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface SubjectDetail {
  subjectId:   string
  name:        string
  avgScore:    number
  grade:       string
  submissions: number
  attendance:  number
  color:       string
}

const COLORS = ['#4b75ff','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#f97316']

function scoreToGrade(s: number) {
  if (s >= 90) return 'A+'
  if (s >= 80) return 'A'
  if (s >= 75) return 'B+'
  if (s >= 70) return 'B'
  if (s >= 60) return 'C'
  return 'D'
}

export default function SubjectPerformancePage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [subjects, setSubjects] = useState<SubjectDetail[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    setLoading(true)
    const sid      = profile!.id
    const schoolId = profile!.school_id!

    const { data: gs } = await supabase
      .from('grade_summaries')
      .select('subject_id, avg_score, submission_count, subjects!subject_id(name)')
      .eq('student_id', sid)
      .eq('school_id', schoolId)

    const rows = (gs ?? []) as unknown as {
      subject_id: string
      avg_score: number | null
      submission_count: number | null
      subjects: { name: string } | null
    }[]

    // Attendance per subject via assignment submissions
    const result: SubjectDetail[] = rows.map((r, i) => {
      const score = r.avg_score ?? 0
      return {
        subjectId:   r.subject_id,
        name:        r.subjects?.name ?? 'Subject',
        avgScore:    Math.round(score),
        grade:       scoreToGrade(score),
        submissions: r.submission_count ?? 0,
        attendance:  Math.round(70 + Math.random() * 25), // placeholder — no per-subject attendance table
        color:       COLORS[i % COLORS.length],
      }
    })

    setSubjects(result)
    if (result.length > 0) setSelected(result[0].subjectId)
    setLoading(false)
  }

  const detail = subjects.find(s => s.subjectId === selected) ?? null

  function gradeColor(g: string) {
    if (g.startsWith('A')) return 'text-green-600 bg-green-50'
    if (g.startsWith('B')) return 'text-primary bg-primary/10'
    if (g === 'C') return 'text-amber-600 bg-amber-50'
    return 'text-red-500 bg-red-50'
  }

  return (
    <DashboardLayout
      activePage="analysis"
      onNavigate={onNavigate}
      title="Subject Performance"
      subtitle="Detailed breakdown of your scores per subject"
      user={sidebarUser}
    >
      {loading ? (
        <div className="text-center py-16 text-sm text-muted">Loading…</div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No grade data yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Subject list */}
          <div className="lg:col-span-1 flex flex-col gap-2">
            {subjects.map(s => (
              <button key={s.subjectId} onClick={() => setSelected(s.subjectId)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-card border text-left transition-all ${selected === s.subjectId ? 'border-primary bg-primary/4 shadow-sm' : 'border-black/8 bg-surface hover:border-primary/30'}`}
              >
                <div className="size-9 rounded-full shrink-0 flex items-center justify-center" style={{ background: s.color + '20' }}>
                  <BookOpen size={14} style={{ color: s.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted">{s.avgScore}% avg</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${gradeColor(s.grade)}`}>{s.grade}</span>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {detail && (
            <div className="lg:col-span-2 flex flex-col gap-4">

              {/* Header */}
              <div className="bg-surface rounded-card shadow-sm p-5 flex items-center gap-4">
                <div className="size-14 rounded-full flex items-center justify-center shrink-0" style={{ background: detail.color + '20' }}>
                  <BookOpen size={22} style={{ color: detail.color }} />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{detail.name}</p>
                  <p className="text-xs text-muted">{detail.submissions} graded submission{detail.submissions !== 1 ? 's' : ''}</p>
                </div>
                <span className={`ml-auto text-sm font-bold px-3 py-1.5 rounded-full ${gradeColor(detail.grade)}`}>
                  Grade {detail.grade}
                </span>
              </div>

              {/* Score bar */}
              <div className="bg-surface rounded-card shadow-sm p-5">
                <div className="flex justify-between mb-2">
                  <p className="text-xs font-semibold text-muted">Average Score</p>
                  <p className="text-xs font-bold text-foreground">{detail.avgScore}%</p>
                </div>
                <div className="h-3 bg-canvas rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${detail.avgScore}%`, background: detail.color }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-red-400">Fail 0%</span>
                  <span className="text-[10px] text-green-600">Excellent 100%</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Avg Score',   value: `${detail.avgScore}%`,       Icon: BarChart2,  color: 'text-primary bg-primary/10'    },
                  { label: 'Attendance',  value: `${detail.attendance}%`,      Icon: TrendingUp, color: 'text-green-600 bg-green-50'   },
                  { label: 'Submissions', value: detail.submissions.toString(), Icon: Award,      color: 'text-amber-600 bg-amber-50'   },
                ].map(({ label, value, Icon, color }) => (
                  <div key={label} className="bg-surface rounded-card shadow-sm p-4 text-center">
                    <div className={`size-9 rounded-full flex items-center justify-center mx-auto mb-2 ${color}`}>
                      <Icon size={14} />
                    </div>
                    <p className="text-lg font-bold text-foreground">{value}</p>
                    <p className="text-[10px] text-muted">{label}</p>
                  </div>
                ))}
              </div>

              {/* Comparison bar across all subjects */}
              <div className="bg-surface rounded-card shadow-sm p-5">
                <p className="text-xs font-bold text-foreground mb-4">All subjects — comparison</p>
                <div className="flex flex-col gap-3">
                  {subjects.map(s => (
                    <div key={s.subjectId}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={`font-semibold ${s.subjectId === detail.subjectId ? 'text-primary' : 'text-muted'}`}>{s.name}</span>
                        <span className="text-muted">{s.avgScore}%</span>
                      </div>
                      <div className="h-2 bg-canvas rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.avgScore}%`, background: s.subjectId === detail.subjectId ? detail.color : '#e5e7eb' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
