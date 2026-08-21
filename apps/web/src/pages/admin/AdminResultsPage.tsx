import { useState, useEffect } from 'react'
import { Award, CheckCircle2, Clock, AlertCircle, Eye, Globe, X } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }
type SubmissionStatus = 'pending' | 'submitted' | 'published'

interface ClassResult {
  id: string; name: string; total: number; submitted: number; status: SubmissionStatus
}

interface GradeRow {
  student: string
  subjects: { name: string; score: number }[]
  avg: number; grade: string
}

function gradeLabel(avg: number) {
  if (avg >= 90) return 'A+'
  if (avg >= 80) return 'A'
  if (avg >= 70) return 'B'
  if (avg >= 60) return 'C'
  if (avg >= 50) return 'D'
  return 'F'
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-card shadow-xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/8">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function AdminResultsPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [classes,    setClasses]    = useState<ClassResult[]>([])
  const [reviewing,  setReviewing]  = useState<ClassResult | null>(null)
  const [publishing, setPublishing] = useState<ClassResult | null>(null)
  const [reviewRows, setReviewRows] = useState<GradeRow[]>([])
  const [flash,      setFlash]      = useState('')
  const [loading,    setLoading]    = useState(true)

  useEffect(() => { if (profile?.school_id) loadClasses() }, [profile?.school_id])

  async function loadClasses() {
    setLoading(true)
    const schoolId = profile!.school_id!

    const { data: clsData } = await supabase
      .from('classes').select('id, name').eq('school_id', schoolId)
    const clsList = (clsData ?? []) as { id: string; name: string }[]

    // Enrollment counts
    const { data: ceData } = await supabase
      .from('class_enrollments').select('class_id, student_id').in('class_id', clsList.map(c => c.id))
    const ceRows = (ceData ?? []) as { class_id: string; student_id: string }[]
    const enrollByClass: Record<string, string[]> = {}
    for (const e of ceRows) {
      if (!enrollByClass[e.class_id]) enrollByClass[e.class_id] = []
      enrollByClass[e.class_id].push(e.student_id)
    }

    // Grade summary counts per class
    const { data: gsData } = await supabase
      .from('grade_summaries').select('student_id').eq('school_id', schoolId)
    const gradedStudents = new Set((gsData ?? []).map((g: { student_id: string }) => g.student_id))

    const rows: ClassResult[] = clsList.map(c => {
      const enrolled  = enrollByClass[c.id] ?? []
      const submitted = enrolled.filter(sid => gradedStudents.has(sid)).length
      const total     = enrolled.length
      const status: SubmissionStatus = submitted === 0 ? 'pending' : submitted >= total ? 'submitted' : 'pending'
      return { id: c.id, name: c.name, total, submitted, status }
    })
    setClasses(rows)
    setLoading(false)
  }

  async function loadReviewData(classId: string) {
    // Students in class
    const { data: ceData } = await supabase
      .from('class_enrollments').select('student_id, profiles(id, full_name)').eq('class_id', classId)
    const ceRows = (ceData ?? []) as unknown as { student_id: string; profiles: { id: string; full_name: string | null } | null }[]
    const studentIds = ceRows.filter(e => e.profiles).map(e => e.profiles!.id)
    const nameMap = Object.fromEntries(ceRows.filter(e => e.profiles).map(e => [e.profiles!.id, e.profiles!.full_name ?? 'Unknown']))

    if (studentIds.length === 0) { setReviewRows([]); return }

    // Grade summaries
    const { data: gsData } = await supabase
      .from('grade_summaries')
      .select('student_id, average_score, subjects(name)')
      .in('student_id', studentIds)
    const gsRows = (gsData ?? []) as unknown as { student_id: string; average_score: number | null; subjects: { name: string } | null }[]

    // Group by student
    const byStudent: Record<string, { name: string; subjects: { name: string; score: number }[] }> = {}
    for (const id of studentIds) {
      byStudent[id] = { name: nameMap[id], subjects: [] }
    }
    for (const g of gsRows) {
      if (byStudent[g.student_id] && g.subjects?.name) {
        byStudent[g.student_id].subjects.push({ name: g.subjects.name, score: g.average_score ?? 0 })
      }
    }
    const rows: GradeRow[] = Object.values(byStudent).map(s => {
      const scores = s.subjects.map(sub => sub.score).filter(Boolean)
      const avg    = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      return { student: s.name, subjects: s.subjects, avg, grade: gradeLabel(avg) }
    }).sort((a, b) => b.avg - a.avg)

    setReviewRows(rows)
  }

  function showFlash(msg: string) {
    setFlash(msg)
    setTimeout(() => setFlash(''), 3500)
  }

  function publishClass(id: string) {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, status: 'published' } : c))
    setPublishing(null)
    setReviewing(null)
    showFlash('Results published — students and parents can now view their report cards.')
  }

  const submitted = classes.filter(c => c.status === 'submitted').length
  const published = classes.filter(c => c.status === 'published').length
  const pending   = classes.filter(c => c.status === 'pending').length

  const statusConfig: Record<SubmissionStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
    pending:   { label: 'Grades Pending',   cls: 'bg-amber-50 text-amber-700', icon: Clock        },
    submitted: { label: 'Ready to Publish', cls: 'bg-blue-50 text-blue-700',   icon: AlertCircle  },
    published: { label: 'Published',        cls: 'bg-green-50 text-green-700', icon: CheckCircle2 },
  }

  // Unique subject names from review rows (for table columns)
  const reviewSubjects = [...new Set(reviewRows.flatMap(r => r.subjects.map(s => s.name)))].slice(0, 5)

  return (
    <DashboardLayout
      activePage="admin-results"
      onNavigate={onNavigate}
      title="Results Management"
      subtitle="Review and publish end-of-term results"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[1100px] flex flex-col gap-6">

        {flash && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-green-600 text-white text-sm font-semibold px-5 py-3.5 rounded-card shadow-lg">
            <CheckCircle2 size={16} /> {flash}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface rounded-card shadow-sm p-5"><p className="text-3xl font-bold text-amber-500">{loading ? '…' : pending}</p><p className="text-sm text-muted mt-1">Grades Pending</p></div>
          <div className="bg-surface rounded-card shadow-sm p-5"><p className="text-3xl font-bold text-blue-500">{loading ? '…' : submitted}</p><p className="text-sm text-muted mt-1">Ready to Publish</p></div>
          <div className="bg-surface rounded-card shadow-sm p-5"><p className="text-3xl font-bold text-green-600">{loading ? '…' : published}</p><p className="text-sm text-muted mt-1">Published</p></div>
        </div>

        <div className="bg-primary/6 border border-primary/20 rounded-card px-5 py-3.5 text-sm text-primary font-medium flex items-center gap-3">
          <Award size={16} className="shrink-0" />
          <span>Once published, students and parents can view report cards in their dashboard. This action cannot be undone.</span>
        </div>

        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-black/6">
            <h3 className="text-base font-bold text-foreground">Classes — Current Term</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-black/6 bg-canvas/50">
                  {['Class', 'Students', 'Grades', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">Loading…</td></tr>
                ) : classes.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">No classes found.</td></tr>
                ) : classes.map(c => {
                  const sc = statusConfig[c.status]
                  const StatusIcon = sc.icon
                  return (
                    <tr key={c.id} className="border-b border-black/4 last:border-0 hover:bg-canvas/40 transition-colors">
                      <td className="px-5 py-4 font-bold text-foreground">{c.name}</td>
                      <td className="px-5 py-4 text-foreground">{c.total}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold ${c.status === 'pending' ? 'text-amber-600' : 'text-green-600'}`}>
                          {c.submitted}/{c.total} submitted
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xs ${sc.cls}`}>
                          <StatusIcon size={11} /> {sc.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {c.status !== 'pending' && (
                            <button onClick={async () => { setReviewing(c); await loadReviewData(c.id) }}
                              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                              <Eye size={12} /> Review
                            </button>
                          )}
                          {c.status === 'submitted' && (
                            <><span className="text-black/15">|</span>
                            <button onClick={() => setPublishing(c)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:underline">
                              <Globe size={12} /> Publish
                            </button></>
                          )}
                          {c.status === 'published' && (
                            <><span className="text-black/15">|</span>
                            <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 size={11} /> Live</span></>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {submitted > 0 && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setClasses(prev => prev.map(c => c.status === 'submitted' ? { ...c, status: 'published' } : c))
                showFlash(`Published results for ${submitted} class${submitted > 1 ? 'es' : ''}.`)
              }}
              className="h-11 px-6 bg-green-600 text-white text-sm font-semibold rounded-pill hover:bg-green-700 transition-colors flex items-center gap-2">
              <Globe size={15} /> Publish All Ready ({submitted})
            </button>
          </div>
        )}

      </div>

      {reviewing && (
        <Modal onClose={() => setReviewing(null)} title={`Review Grades — ${reviewing.name}`}>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-black/8 bg-canvas/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Student</th>
                    {reviewSubjects.map(s => <th key={s} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">{s}</th>)}
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Avg</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.length === 0 ? (
                    <tr><td colSpan={reviewSubjects.length + 3} className="px-4 py-8 text-center text-sm text-muted">No grade data yet.</td></tr>
                  ) : reviewRows.map((g, i) => (
                    <tr key={i} className="border-b border-black/4 last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">{g.student}</td>
                      {reviewSubjects.map(s => {
                        const sub = g.subjects.find(x => x.name === s)
                        return <td key={s} className="px-4 py-3 text-center text-muted">{sub ? sub.score : '—'}</td>
                      })}
                      <td className="px-4 py-3 text-center font-bold text-foreground">{g.avg > 0 ? g.avg : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-xs ${g.grade.startsWith('A') ? 'bg-green-50 text-green-700' : g.grade === 'B' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{g.grade}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reviewing.status === 'submitted' && (
              <div className="flex justify-end gap-3 mt-5 pt-5 border-t border-black/8">
                <button onClick={() => setReviewing(null)} className="h-10 px-5 border border-black/15 rounded-pill text-sm font-semibold text-muted hover:text-foreground transition-colors">Close</button>
                <button onClick={() => setPublishing(reviewing)} className="h-10 px-5 bg-green-600 text-white text-sm font-semibold rounded-pill hover:bg-green-700 transition-colors flex items-center gap-2"><Globe size={14} /> Publish Results</button>
              </div>
            )}
            {reviewing.status === 'published' && (
              <div className="mt-5 pt-5 border-t border-black/8 flex items-center gap-2 text-green-600 text-sm font-semibold">
                <CheckCircle2 size={16} /> Results are live — students and parents can view them.
              </div>
            )}
          </div>
        </Modal>
      )}

      {publishing && !reviewing && (
        <Modal onClose={() => setPublishing(null)} title={`Publish Results — ${publishing.name}`}>
          <div className="p-6 flex flex-col gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-card p-4 text-sm text-amber-800">
              <p className="font-bold mb-1">This action cannot be undone.</p>
              <p>Publishing will make results visible to all {publishing.total} students in <span className="font-semibold">{publishing.name}</span> and their parents.</p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => setPublishing(null)} className="flex-1 h-11 border border-black/15 rounded-pill text-sm font-semibold text-muted hover:text-foreground transition-colors">Cancel</button>
              <button onClick={() => publishClass(publishing.id)} className="flex-1 h-11 bg-green-600 text-white text-sm font-semibold rounded-pill hover:bg-green-700 transition-colors flex items-center justify-center gap-2"><Globe size={14} /> Publish Now</button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  )
}
