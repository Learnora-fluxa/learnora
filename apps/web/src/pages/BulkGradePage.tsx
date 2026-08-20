import { useState, useEffect } from 'react'
import { ChevronDown, Save, CheckCircle2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface AssignmentOpt { id: string; title: string; max_score: number | null; class_id: string | null }
interface StudentRow    { id: string; name: string; score: string; note: string }

function gradeTag(score: number | null) {
  if (score === null) return null
  if (score >= 90) return { label: 'A+', cls: 'bg-green-50 text-green-700' }
  if (score >= 80) return { label: 'A',  cls: 'bg-green-50 text-green-700' }
  if (score >= 70) return { label: 'B',  cls: 'bg-blue-50 text-blue-700'   }
  if (score >= 60) return { label: 'C',  cls: 'bg-amber-50 text-amber-700' }
  return                  { label: 'F',  cls: 'bg-red-50 text-red-700'     }
}

export default function BulkGradePage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [assignments,    setAssignments]    = useState<AssignmentOpt[]>([])
  const [selectedAsgn,   setSelectedAsgn]   = useState<AssignmentOpt | null>(null)
  const [students,       setStudents]       = useState<StudentRow[]>([])
  const [loadingStudents,setLoadingStudents] = useState(false)
  const [loading,        setLoading]        = useState(true)
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [error,          setError]          = useState('')

  useEffect(() => { if (profile?.id) loadAssignments() }, [profile?.id])

  async function loadAssignments() {
    setLoading(true)
    const { data } = await supabase
      .from('assignments')
      .select('id, title, max_score, class_id')
      .eq('teacher_id', profile!.id)
      .eq('school_id', profile!.school_id!)
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    const rows = (data ?? []) as AssignmentOpt[]
    setAssignments(rows)
    if (rows.length > 0) selectAssignment(rows[0])
    setLoading(false)
  }

  async function selectAssignment(asgn: AssignmentOpt) {
    setSelectedAsgn(asgn)
    setSaved(false)
    setError('')
    if (!asgn.class_id) { setStudents([]); return }

    setLoadingStudents(true)
    const { data } = await supabase
      .from('class_enrollments')
      .select('student_id, profiles(id, full_name)')
      .eq('class_id', asgn.class_id)

    const rows = (data ?? []) as unknown as {
      student_id: string
      profiles: { id: string; full_name: string | null } | null
    }[]

    // Load existing submissions
    const { data: subData } = await supabase
      .from('assignment_submissions')
      .select('student_id, submission_text, status')
      .eq('assignment_id', asgn.id)

    const existingMap: Record<string, { text: string; status: string }> = {}
    for (const s of (subData ?? []) as { student_id: string; submission_text: string | null; status: string | null }[]) {
      existingMap[s.student_id] = { text: s.submission_text ?? '', status: s.status ?? '' }
    }

    setStudents(rows.map(r => {
      const existing = existingMap[r.student_id]
      const scoreMatch = existing?.text?.match(/^Score:\s*(\d+)/)
      return {
        id:    r.student_id,
        name:  r.profiles?.full_name ?? 'Student',
        score: scoreMatch ? scoreMatch[1] : '',
        note:  '',
      }
    }))
    setLoadingStudents(false)
  }

  function updateRow(id: string, patch: Partial<StudentRow>) {
    setStudents(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function fillAll(val: string) {
    setStudents(prev => prev.map(r => ({ ...r, score: val })))
  }

  async function saveGrades() {
    if (!selectedAsgn) return
    setSaving(true)
    setError('')

    const schoolId = profile!.school_id!
    const graded   = students.filter(s => s.score !== '')

    for (const s of graded) {
      const scoreNum  = parseInt(s.score)
      const maxScore  = selectedAsgn.max_score ?? 100
      const scoreTxt  = `Score: ${scoreNum}/${maxScore}`

      await supabase.from('assignment_submissions').upsert({
        student_id:      s.id,
        assignment_id:   selectedAsgn.id,
        school_id:       schoolId,
        status:          'graded',
        submission_text: scoreTxt,
        submitted_at:    new Date().toISOString(),
      }, { onConflict: 'student_id,assignment_id' })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const totalMarks = selectedAsgn?.max_score ?? 100
  const graded     = students.filter(r => r.score !== '').length

  return (
    <DashboardLayout
      activePage="gradebook"
      onNavigate={onNavigate}
      title="Bulk Grade"
      subtitle="Enter scores for all students in one go"
      nav={teacherNav}
      user={sidebarUser}
    >
      <div className="flex flex-col gap-5 max-w-[860px]">

        {/* Assignment selector */}
        <div className="bg-surface rounded-card shadow-sm p-5 flex flex-col gap-4">
          <p className="text-sm font-bold text-foreground">Assignment</p>
          {loading ? (
            <p className="text-sm text-muted">Loading assignments…</p>
          ) : assignments.length === 0 ? (
            <p className="text-sm text-muted">No published assignments found. Publish an assignment first.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted mb-1 block">Select Assignment</label>
                <div className="relative">
                  <select
                    value={selectedAsgn?.id ?? ''}
                    onChange={e => {
                      const a = assignments.find(a => a.id === e.target.value)
                      if (a) selectAssignment(a)
                    }}
                    className="w-full h-10 pl-3 pr-8 border border-black/20 rounded-card text-sm outline-none focus:border-primary appearance-none"
                  >
                    {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted mb-1 block">Max Score</label>
                <input
                  type="number"
                  value={totalMarks}
                  readOnly
                  className="w-full h-10 px-3 border border-black/20 rounded-card text-sm outline-none bg-canvas text-muted"
                />
              </div>
            </div>
          )}

          {students.length > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-black/6">
              <p className="text-xs text-muted">{graded} / {students.length} students graded</p>
              <div className="flex gap-2">
                <button
                  onClick={() => fillAll(String(totalMarks))}
                  className="h-8 px-3 text-xs font-semibold text-muted border border-black/15 rounded-full hover:border-primary hover:text-primary transition-colors"
                >
                  Fill All Max
                </button>
                <button
                  onClick={() => fillAll('')}
                  className="h-8 px-3 text-xs font-semibold text-muted border border-black/15 rounded-full hover:border-red-400 hover:text-red-500 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Grade table */}
        {loadingStudents ? (
          <div className="bg-surface rounded-card shadow-sm p-10 text-center text-sm text-muted">Loading students…</div>
        ) : students.length > 0 && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/6 bg-canvas/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Student</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider w-32">Score / {totalMarks}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider w-20">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(r => {
                    const scoreNum = r.score !== '' ? Number(r.score) : null
                    const pct      = scoreNum !== null ? Math.round((scoreNum / totalMarks) * 100) : null
                    const tag      = gradeTag(pct)
                    return (
                      <tr key={r.id} className="border-b border-black/4 last:border-0 hover:bg-canvas/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                              {r.name.charAt(0)}
                            </div>
                            <span className="font-medium text-foreground">{r.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={r.score}
                            min={0}
                            max={totalMarks}
                            onChange={e => updateRow(r.id, { score: e.target.value })}
                            placeholder="—"
                            className="w-full h-9 px-2 border border-black/15 rounded-card text-sm outline-none focus:border-primary text-center"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tag ? (
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tag.cls}`}>{tag.label}</span>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Actions */}
        {selectedAsgn && students.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={saveGrades}
              disabled={saving || graded === 0}
              className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors disabled:opacity-50"
            >
              <Save size={15} /> {saving ? 'Saving…' : 'Save Grades'}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-green-600 text-sm font-semibold">
                <CheckCircle2 size={15} /> Grades saved!
              </span>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
