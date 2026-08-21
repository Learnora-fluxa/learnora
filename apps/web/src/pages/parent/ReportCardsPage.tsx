import { useEffect, useState } from 'react'
import { Download, ChevronLeft, TrendingUp } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { parentNav } from '../../components/layout/Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { resolveLinkedParentChild } from '../../lib/parentStudents'

type Props = { onNavigate: (page: string) => void }

interface GradeSummary {
  average_score: number | null
  grade_letter: string | null
  subjects: { name: string } | null
}

function gradeColor(g: string | null) {
  if (!g) return 'text-foreground'
  if (g.startsWith('A')) return 'text-green-600'
  if (g.startsWith('B')) return 'text-primary'
  return 'text-foreground'
}

function remarkFor(score: number) {
  if (score >= 90) return 'Outstanding'
  if (score >= 80) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 60) return 'Average'
  return 'Needs Improvement'
}

export default function ReportCardsPage({ onNavigate }: Props) {
  const { profile, loading: authLoading } = useAuth()
  const [grades, setGrades] = useState<GradeSummary[]>([])
  const [childName, setChildName] = useState('')
  const [className, setClassName] = useState('')
  const [loading, setLoading] = useState(true)
  const [hasLinkedChild, setHasLinkedChild] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!profile?.id || !profile.school_id) {
      setHasLinkedChild(false)
      setLoading(false)
      return
    }
    loadData()
  }, [authLoading, profile?.id, profile?.school_id])

  async function loadData() {
    if (!profile?.id || !profile.school_id) return

    setLoading(true)
    const { childId } = await resolveLinkedParentChild(profile.id, profile.school_id)

    if (!childId) {
      setHasLinkedChild(false)
      setGrades([])
      setChildName('')
      setClassName('')
      setLoading(false)
      return
    }

    setHasLinkedChild(true)

    const [childRes, ceRes, gradeRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', childId).maybeSingle(),
      supabase.from('class_enrollments').select('classes(name)').eq('student_id', childId).limit(1).maybeSingle(),
      supabase.from('grade_summaries').select('average_score, grade_letter, subjects(name)').eq('student_id', childId),
    ])

    setChildName((childRes.data as { full_name: string | null } | null)?.full_name ?? '')
    const ce = ceRes.data as { classes: { name: string } | null } | null
    setClassName(ce?.classes?.name ?? '')
    setGrades((gradeRes.data ?? []) as GradeSummary[])
    setLoading(false)
  }

  const scores = grades.map(g => g.average_score ?? 0).filter(s => s > 0)
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const overallGrade = avg >= 90 ? 'A+' : avg >= 80 ? 'A' : avg >= 70 ? 'B' : avg >= 60 ? 'C' : 'D'
  const userName = profile?.full_name ?? 'Parent User'
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'P'

  function renderEmptyState() {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-8 text-center text-sm text-muted shadow-sm">
        Ask the school admin to link this parent account to a student before report cards can appear here.
      </div>
    )
  }

  function renderContent(showBackButton: boolean) {
    return (
      <div className="px-5 pb-4 pt-5 lg:px-0 lg:pb-0 lg:pt-0">
        {showBackButton && (
          <button onClick={() => onNavigate('parent/home')} className="mb-4">
            <ChevronLeft size={22} />
          </button>
        )}

        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Report Card</h1>
          <button className="flex h-9 items-center gap-1.5 rounded-full border border-primary px-3 text-xs font-semibold text-primary">
            <Download size={13} /> PDF
          </button>
        </div>
        <p className="mb-5 text-xs text-muted">{childName}{className ? ` · ${className}` : ''}</p>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted">Loading…</div>
        ) : !hasLinkedChild ? (
          renderEmptyState()
        ) : (
          <>
            <div className="mb-6 rounded-3xl bg-primary p-5">
              <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{avg > 0 ? `${avg}%` : '—'}</p>
                  <p className="text-[10px] text-white/70">Average</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{grades.length}</p>
                  <p className="text-[10px] text-white/70">Subjects</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{avg > 0 ? overallGrade : '—'}</p>
                  <p className="text-[10px] text-white/70">Overall Grade</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2">
                <TrendingUp size={13} className="text-white" />
                <p className="text-xs text-white">Academic performance from current report-card records</p>
              </div>
            </div>

            {grades.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No report card data available yet.</p>
            ) : (
              <>
                <p className="mb-3 text-base font-bold text-foreground">Subject Results</p>
                <div className="flex flex-col gap-2">
                  {grades.map((g, i) => {
                    const score = g.average_score ?? 0
                    const grade = g.grade_letter ?? '—'
                    const subject = g.subjects?.name ?? `Subject ${i + 1}`
                    return (
                      <div key={`${subject}-${i}`} className="rounded-2xl border border-black/6 bg-white px-4 py-3 shadow-sm">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">{subject}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-base font-bold ${gradeColor(grade)}`}>{grade}</span>
                            <span className="text-sm font-semibold text-muted">{score > 0 ? `${score}%` : '—'}</span>
                          </div>
                        </div>
                        {score > 0 && (
                          <div className="h-1.5 overflow-hidden rounded-full bg-black/8">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
                          </div>
                        )}
                        <p className="mt-1 text-xs text-muted">{score > 0 ? remarkFor(score) : '—'}</p>
                      </div>
                    )
                  })}
                </div>

                <button className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-white">
                  <Download size={16} /> Download Full Report
                </button>
              </>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="lg:hidden">
        <MobileLayout activePage="parent/home" onNavigate={onNavigate} nav={parentMobileNav}>
          {renderContent(true)}
        </MobileLayout>
      </div>

      <div className="hidden lg:block">
        <DashboardLayout
          activePage="parent/report-cards"
          onNavigate={onNavigate}
          title="Report Card"
          subtitle={hasLinkedChild ? `${childName}${className ? ` · ${className}` : ''}` : 'No linked child'}
          nav={parentNav}
          user={{ name: userName, role: 'Parent', initials: userInitials }}
          mainClassName="flex-1 overflow-y-auto p-6 xl:p-8"
        >
          <div className="mx-auto max-w-6xl rounded-[30px] bg-white p-8 shadow-sm">
            {renderContent(false)}
          </div>
        </DashboardLayout>
      </div>
    </>
  )
}
