import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, CheckCircle2, ClipboardList, HelpCircle } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type QType = 'multiple-choice' | 'short-answer' | 'essay'

interface Question {
  id:      number
  type:    QType
  text:    string
  options: string[]
  answer:  number
  points:  number
}

interface TeacherClass {
  class_id:    string
  subject_id:  string
  label:       string
}

let nextId = 2

export default function AssignmentBuilderPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([])
  const [selectedIdx,    setSelectedIdx]    = useState(0)
  const [loadingClasses, setLoadingClasses] = useState(true)

  const [isQuiz,       setIsQuiz]       = useState(false)
  const [title,        setTitle]        = useState('')
  const [deadline,     setDeadline]     = useState('')
  const [instructions, setInstructions] = useState('')
  const [questions,    setQuestions]    = useState<Question[]>([
    { id: 1, type: 'multiple-choice', text: '', options: ['', '', '', ''], answer: 0, points: 1 },
  ])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [done,   setDone]   = useState(false)

  useEffect(() => { if (profile?.id) loadClasses() }, [profile?.id])

  async function loadClasses() {
    setLoadingClasses(true)
    const { data } = await supabase
      .from('teacher_assignments')
      .select('class_id, subject_id, classes(name), subjects(name)')
      .eq('teacher_id', profile!.id)

    const raw = (data ?? []) as unknown as {
      class_id:   string
      subject_id: string
      classes:    { name: string } | null
      subjects:   { name: string } | null
    }[]

    setTeacherClasses(raw.map(r => ({
      class_id:   r.class_id,
      subject_id: r.subject_id,
      label:      `${r.subjects?.name ?? '—'} — ${r.classes?.name ?? '—'}`,
    })))
    setLoadingClasses(false)
  }

  function addQuestion(type: QType) {
    setQuestions(qs => [...qs, { id: nextId++, type, text: '', options: ['', '', '', ''], answer: 0, points: 1 }])
  }
  function removeQuestion(id: number) {
    setQuestions(qs => qs.filter(q => q.id !== id))
  }
  function updateText(id: number, text: string) {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, text } : q))
  }
  function updateOption(id: number, idx: number, val: string) {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, options: q.options.map((o, i) => i === idx ? val : o) } : q))
  }
  function updatePoints(id: number, val: string) {
    const pts = Math.max(1, parseInt(val) || 1)
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, points: pts } : q))
  }

  const filledQuestions = questions.filter(q => q.text.trim())
  const totalPoints     = filledQuestions.reduce((s, q) => s + q.points, 0)

  async function publish(isDraft: boolean) {
    if (!title.trim()) { setError('Title is required.'); return }
    if (!isDraft && !deadline) { setError('Due date is required to publish.'); return }
    if (!isDraft && !instructions.trim() && !isQuiz) { setError('Instructions are required to publish.'); return }
    if (isQuiz && !isDraft && filledQuestions.length === 0) { setError('Add at least one question before publishing.'); return }
    if (teacherClasses.length === 0) { setError('No class available. Contact admin.'); return }
    setSaving(true)
    setError('')

    const selected = teacherClasses[selectedIdx]

    const { data: insertData, error: err } = await supabase
      .from('assignments')
      .insert({
        school_id:    profile!.school_id!,
        class_id:     selected.class_id,
        subject_id:   selected.subject_id,
        teacher_id:   profile!.id,
        title:        title.trim(),
        instructions: instructions.trim() || null,
        due_date:     deadline || null,
        is_published: !isDraft,
        max_score:    isQuiz ? totalPoints : null,
      })
      .select('id')
      .single()

    if (err) { logSupabaseError('AssignmentBuilder.insert', err); setError(err.message); setSaving(false); return }

    // Save quiz questions to dedicated table
    if (isQuiz && !isDraft && insertData?.id && filledQuestions.length > 0) {
      const db = supabase as unknown as { from: (t: string) => any }
      await db.from('quiz_questions').insert(
        filledQuestions.map((q, i) => ({
          school_id:      profile!.school_id!,
          assignment_id:  insertData.id,
          question:       q.text,
          options:        q.options.filter(o => o.trim()),
          correct_option: q.answer,
          points:         q.points,
          position:       i,
        }))
      )
    }

    setSaving(false)
    if (!isDraft) setDone(true)
    else onNavigate('teacher-assignments')
  }

  function resetForm() {
    setDone(false)
    setTitle('')
    setDeadline('')
    setInstructions('')
    setIsQuiz(false)
    setQuestions([{ id: 1, type: 'multiple-choice', text: '', options: ['', '', '', ''], answer: 0, points: 1 }])
    setSelectedIdx(0)
  }

  if (done) {
    return (
      <DashboardLayout activePage="teacher-assignments" onNavigate={onNavigate} title="Assignment Builder" subtitle="" nav={teacherNav} user={sidebarUser}>
        <div className="max-w-[500px] text-center py-16">
          <div className="size-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            {isQuiz ? 'Quiz Published!' : 'Assignment Published!'}
          </h2>
          <p className="text-base text-muted mb-8">
            Students in the selected class can now {isQuiz ? 'take this quiz' : 'see and submit this assignment'}.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => onNavigate('teacher-assignments')}
              className="h-12 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep shadow-primary"
            >
              View Assignments
            </button>
            <button
              onClick={resetForm}
              className="h-12 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary"
            >
              Create Another
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      activePage="teacher-assignments"
      onNavigate={onNavigate}
      title="Assignment Builder"
      subtitle="Create a new assignment or quiz for your students"
      nav={teacherNav}
      user={sidebarUser}
    >
      <div className="max-w-[860px] flex flex-col gap-6">

        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-3">
          {([
            { val: false, label: 'Regular Assignment', desc: 'Written work, essays, file submissions', icon: ClipboardList },
            { val: true,  label: 'Quiz',               desc: 'Multiple choice questions, auto-scored',  icon: HelpCircle  },
          ] as const).map(({ val, label, desc, icon: Icon }) => (
            <button key={String(val)} type="button" onClick={() => setIsQuiz(val)}
              className={`flex items-start gap-3 p-4 rounded-card border-2 text-left transition-colors ${
                isQuiz === val
                  ? 'border-primary bg-primary/5'
                  : 'border-black/10 hover:border-primary/30'
              }`}>
              <div className={`size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                isQuiz === val ? 'bg-primary text-white' : 'bg-canvas text-muted'
              }`}>
                <Icon size={15} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{label}</p>
                <p className="text-xs text-muted mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Assignment details */}
        <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-5">
          <h2 className="text-base font-bold text-foreground">Details</h2>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground">Title</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder={isQuiz ? 'e.g. Chapter 5 Physics Quiz' : 'e.g. Newton\'s Laws Essay'}
              className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Class &amp; Subject</label>
              {loadingClasses ? (
                <p className="text-sm text-muted h-12 flex items-center">Loading…</p>
              ) : teacherClasses.length === 0 ? (
                <p className="text-sm text-amber-600 h-12 flex items-center">No classes assigned yet.</p>
              ) : (
                <div className="relative">
                  <select
                    value={selectedIdx}
                    onChange={e => setSelectedIdx(Number(e.target.value))}
                    className="w-full h-12 pl-4 pr-10 border border-black/20 rounded-input text-sm text-foreground bg-white outline-none focus:border-primary appearance-none"
                  >
                    {teacherClasses.map((c, i) => (
                      <option key={`${c.class_id}-${c.subject_id}`} value={i}>{c.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-foreground">Due Date</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="h-12 px-4 border border-black/20 rounded-input text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-foreground">
              {isQuiz ? 'Instructions (optional)' : 'Instructions'}
            </label>
            <textarea
              value={instructions} onChange={e => setInstructions(e.target.value)}
              rows={3} placeholder="Add any instructions or notes for students..."
              className="px-4 py-3 border border-black/20 rounded-card text-sm text-foreground placeholder:text-muted outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        {/* Questions — quiz mode only */}
        {isQuiz && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Quiz Questions</h2>
              {filledQuestions.length > 0 && (
                <span className="text-xs text-muted bg-canvas px-3 py-1 rounded-full">
                  {filledQuestions.length} question{filledQuestions.length !== 1 ? 's' : ''} · {totalPoints} pts total
                </span>
              )}
            </div>

            {questions.map((q, qi) => (
              <div key={q.id} className="bg-surface rounded-card shadow-sm p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted">Question {qi + 1}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-muted">pts</label>
                      <input
                        type="number" min="1" value={q.points}
                        onChange={e => updatePoints(q.id, e.target.value)}
                        className="w-14 h-7 px-2 border border-black/15 rounded-md text-xs text-center outline-none focus:border-primary"
                      />
                    </div>
                    <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-full capitalize">
                      {q.type.replace('-', ' ')}
                    </span>
                    {questions.length > 1 && (
                      <button onClick={() => removeQuestion(q.id)} className="text-muted hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  value={q.text} onChange={e => updateText(q.id, e.target.value)}
                  rows={2} placeholder="Enter your question..."
                  className="px-4 py-3 border border-black/20 rounded-card text-sm text-foreground placeholder:text-muted outline-none focus:border-primary resize-none"
                />

                {q.type === 'multiple-choice' && (
                  <div className="grid grid-cols-2 gap-3">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          onClick={() => setQuestions(qs => qs.map(qu => qu.id === q.id ? { ...qu, answer: oi } : qu))}
                          title="Mark as correct answer"
                          className={`size-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                            q.answer === oi ? 'border-primary bg-primary' : 'border-black/20'
                          }`}
                        >
                          {q.answer === oi && <span className="size-1.5 rounded-full bg-white" />}
                        </button>
                        <input
                          value={opt} onChange={e => updateOption(q.id, oi, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                          className="flex-1 h-9 px-3 border border-black/15 rounded-md text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {q.type !== 'multiple-choice' && (
                  <p className="text-xs text-muted italic">Students will type their answer for this question.</p>
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              {(['multiple-choice', 'short-answer', 'essay'] as QType[]).map(t => (
                <button key={t} onClick={() => addQuestion(t)}
                  className="flex items-center gap-1.5 h-9 px-4 border border-dashed border-black/25 rounded-pill text-xs font-semibold text-muted hover:border-primary hover:text-primary transition-colors capitalize">
                  <Plus size={13} /> {t.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => publish(false)}
            disabled={saving || !title.trim() || teacherClasses.length === 0}
            className="h-12 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Publishing…' : isQuiz ? 'Publish Quiz' : 'Publish Assignment'}
          </button>
          <button
            onClick={() => publish(true)}
            disabled={saving || !title.trim() || teacherClasses.length === 0}
            className="h-12 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save as Draft
          </button>
        </div>

      </div>
    </DashboardLayout>
  )
}
