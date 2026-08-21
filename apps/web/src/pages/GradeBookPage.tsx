import { useState, useEffect } from 'react'
import { Search, Download, CheckCircle2, ChevronDown, Save } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { logSupabaseError } from '../lib/supabaseError'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }
type ScoreCategory = 'assignment' | 'ca1' | 'ca2' | 'midterm' | 'exam'

interface StudentRow {
  id: string; name: string
  scores: Record<ScoreCategory, number | ''>
}

interface ClassOption { id: string; classId: string; subjectId: string; label: string }

const catConfig: { key: ScoreCategory; label: string; max: number }[] = [
  { key: 'assignment', label: 'Assignment', max: 10 },
  { key: 'ca1',        label: 'CA Test 1',  max: 10 },
  { key: 'ca2',        label: 'CA Test 2',  max: 10 },
  { key: 'midterm',    label: 'Mid-Term',   max: 20 },
  { key: 'exam',       label: 'Exam',       max: 50 },
]

const totalMax = catConfig.reduce((s, c) => s + c.max, 0)

function computeTotal(scores: Record<ScoreCategory, number | ''>) {
  return catConfig.reduce((s, c) => {
    const v = scores[c.key]
    return s + (v === '' || isNaN(Number(v)) ? 0 : Number(v))
  }, 0)
}

function gradeLabel(score: number): { label: string; cls: string } {
  if (score >= 90) return { label: 'A+', cls: 'bg-green-50 text-green-700'  }
  if (score >= 80) return { label: 'A',  cls: 'bg-green-50 text-green-700'  }
  if (score >= 70) return { label: 'B',  cls: 'bg-blue-50 text-blue-700'    }
  if (score >= 60) return { label: 'C',  cls: 'bg-amber-50 text-amber-700'  }
  if (score >= 50) return { label: 'D',  cls: 'bg-orange-50 text-orange-600'}
  return                   { label: 'F',  cls: 'bg-red-50 text-red-700'      }
}

const emptyScores = (): Record<ScoreCategory, number | ''> =>
  ({ assignment: '', ca1: '', ca2: '', midterm: '', exam: '' })

export default function GradeBookPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [classOptions, setClassOptions] = useState<ClassOption[]>([])
  const [selectedOpt,  setSelectedOpt]  = useState<ClassOption | null>(null)
  const [students,     setStudents]     = useState<StudentRow[]>([])
  const [search,       setSearch]       = useState('')
  const [saved,        setSaved]        = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [exported,     setExported]     = useState(false)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => { if (profile?.id) loadClasses() }, [profile?.id])
  useEffect(() => { if (selectedOpt) loadStudents(selectedOpt.classId, selectedOpt.subjectId) }, [selectedOpt?.id])

  async function loadClasses() {
    const { data } = await supabase
      .from('courses')
      .select('id, class_id, subject_id, classes(name), subjects(name)')
      .eq('teacher_id', profile!.id)
      .eq('is_published', true)
    const raw = (data ?? []) as unknown as {
      id: string; class_id: string; subject_id: string
      classes: { name: string } | null
      subjects: { name: string } | null
    }[]
    const opts: ClassOption[] = raw.map(c => ({
      id:        c.id,
      classId:   c.class_id,
      subjectId: c.subject_id,
      label:     `${c.classes?.name ?? '—'} · ${c.subjects?.name ?? '—'}`,
    }))
    setClassOptions(opts)
    if (opts.length > 0) setSelectedOpt(opts[0])
    setLoading(false)
  }

  async function loadStudents(classId: string, subjectId: string) {
    const { data: ceData } = await supabase
      .from('class_enrollments')
      .select('student_id, profiles(id, full_name)')
      .eq('class_id', classId)
    const raw = (ceData ?? []) as unknown as {
      student_id: string
      profiles: { id: string; full_name: string | null } | null
    }[]
    const ids   = raw.filter(e => e.profiles).map(e => e.profiles!.id)
    const names = Object.fromEntries(raw.filter(e => e.profiles).map(e => [e.profiles!.id, e.profiles!.full_name ?? 'Unknown']))

    // Load existing grade summaries for this subject
    const existing: Record<string, number> = {}
    if (ids.length > 0) {
      const { data: gsData } = await supabase
        .from('grade_summaries')
        .select('student_id, average_score')
        .eq('subject_id', subjectId)
        .in('student_id', ids)
      for (const g of (gsData ?? []) as { student_id: string; average_score: number | null }[]) {
        existing[g.student_id] = g.average_score ?? 0
      }
    }

    setStudents(ids.map(id => ({
      id,
      name:   names[id],
      scores: emptyScores(),
    })))
    setSaved(false)
  }

  function updateScore(id: string, key: ScoreCategory, raw: string) {
    const num = raw === '' ? '' : Math.min(catConfig.find(c => c.key === key)!.max, Math.max(0, Number(raw)))
    setStudents(prev => prev.map(s => s.id === id ? { ...s, scores: { ...s.scores, [key]: num } } : s))
    setSaved(false)
  }

  async function handleSave() {
    if (!selectedOpt || !profile?.school_id) return
    setSaving(true)
    const records = students.map(s => {
      const total = computeTotal(s.scores)
      const { label } = gradeLabel(total)
      return {
        student_id:    s.id,
        subject_id:    selectedOpt.subjectId,
        school_id:     profile.school_id!,
        average_score: total,
        grade_letter:  label,
      }
    })
    const { error } = await supabase
      .from('grade_summaries')
      .upsert(records, { onConflict: 'student_id,subject_id' })
    logSupabaseError('GradeBook.save', error)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function exportCSV() {
    const header = ['Student', ...catConfig.map(c => `${c.label} (/${c.max})`), 'Total', 'Grade'].join(',')
    const rows   = students.map(s => {
      const total = computeTotal(s.scores)
      const { label } = gradeLabel(total)
      return [s.name, ...catConfig.map(c => s.scores[c.key] ?? ''), total, label].join(',')
    })
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `gradebook-${selectedOpt?.label ?? 'export'}.csv`; a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 2500)
  }

  const visible   = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
  const classAvg  = students.length > 0
    ? Math.round(students.reduce((s, st) => s + computeTotal(st.scores), 0) / students.length)
    : 0

  return (
    <DashboardLayout
      activePage="gradebook"
      onNavigate={onNavigate}
      title="Gradebook"
      subtitle="Enter and track scores by category for each student"
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-5 max-w-[1200px]">

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select value={selectedOpt?.id ?? ''}
              onChange={e => {
                const opt = classOptions.find(o => o.id === e.target.value)
                if (opt) setSelectedOpt(opt)
              }}
              className="h-10 pl-4 pr-8 border border-black/15 rounded-input text-sm bg-white outline-none focus:border-primary appearance-none">
              {classOptions.length === 0
                ? <option value="">No classes assigned</option>
                : classOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)
              }
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search student..."
              className="w-full h-10 pl-9 pr-4 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 h-10 px-4 border border-black/15 rounded-pill text-sm text-muted hover:text-foreground hover:border-primary transition-colors">
              <Download size={13} />
              {exported ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={13} /> Exported</span> : 'Export CSV'}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 h-10 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-60">
              <Save size={13} />
              {saving ? 'Saving…' : saved ? <span className="flex items-center gap-1"><CheckCircle2 size={13} /> Saved</span> : 'Save'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Class Average', value: `${classAvg}%`   },
            { label: 'Students',      value: students.length    },
            { label: 'Passing (≥50%)',value: students.filter(s => computeTotal(s.scores) >= 50).length },
            { label: 'At Risk (<50%)',value: students.filter(s => computeTotal(s.scores) < 50).length  },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-card shadow-sm p-4">
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '780px' }}>
              <thead>
                <tr className="bg-canvas/60 border-b border-black/6">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted w-[180px]">Student</th>
                  {catConfig.map(c => (
                    <th key={c.key} className="px-3 py-2.5 text-center text-xs font-semibold text-muted">
                      <div>{c.label}</div>
                      <div className="text-[10px] text-muted/60 font-normal">/{c.max}</div>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted">Total<div className="text-[10px] font-normal">/{totalMax}</div></th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/4">
                {loading ? (
                  <tr><td colSpan={catConfig.length + 3} className="px-5 py-8 text-center text-sm text-muted">Loading…</td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={catConfig.length + 3} className="px-5 py-8 text-center text-sm text-muted">No students found.</td></tr>
                ) : visible.map(s => {
                  const total = computeTotal(s.scores)
                  const { label, cls } = gradeLabel(total)
                  return (
                    <tr key={s.id} className="hover:bg-canvas/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{s.name.charAt(0)}</div>
                          <span className="font-medium text-foreground text-sm">{s.name}</span>
                        </div>
                      </td>
                      {catConfig.map(c => (
                        <td key={c.key} className="px-3 py-2.5 text-center">
                          <input
                            type="number"
                            value={s.scores[c.key]}
                            min={0} max={c.max}
                            onChange={e => updateScore(s.id, c.key, e.target.value)}
                            className="w-14 h-8 text-center border border-black/15 rounded-md text-sm outline-none focus:border-primary bg-canvas/50 font-semibold"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-bold text-sm ${total >= 50 ? 'text-foreground' : 'text-red-500'}`}>{total}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-canvas/30 border-t border-black/8">
                  <td className="px-5 py-2.5 text-xs font-semibold text-muted">Max Marks</td>
                  {catConfig.map(c => (
                    <td key={c.key} className="px-3 py-2.5 text-center text-xs font-semibold text-muted">{c.max}</td>
                  ))}
                  <td className="px-3 py-2.5 text-center text-xs font-semibold text-muted">{totalMax}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted">Grades: A+ ≥90 · A ≥80 · B ≥70 · C ≥60 · D ≥50 · F &lt;50. Total is out of {totalMax} marks.</p>
      </div>
    </DashboardLayout>
  )
}
