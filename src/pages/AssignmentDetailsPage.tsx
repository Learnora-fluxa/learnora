import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Calendar, Clock, BookOpen, Upload, CheckCircle2, X, FileText, AlertCircle, HelpCircle } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }
type View = 'details' | 'submit' | 'quiz' | 'success'

interface AssignmentData {
  id:           string
  title:        string
  subjectName:  string
  className:    string
  dueDate:      string | null
  points:       number
  teacherName:  string
  instructions: string | null
  status:       'Pending' | 'Completed' | 'Overdue'
}

interface QuizQuestion {
  id:             string
  position:       number
  question:       string
  options:        string[]
  correct_option: number
  points:         number
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const statusCls: Record<string, string> = {
  Pending:   'bg-amber-50 text-amber-700',
  Completed: 'bg-green-50 text-green-700',
  Overdue:   'bg-red-50 text-red-700',
}

export default function AssignmentDetailsPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [view,          setView]          = useState<View>('details')
  const [assignment,    setAssignment]    = useState<AssignmentData | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [note,          setNote]          = useState('')
  const [fileObjects,   setFileObjects]   = useState<File[]>([])
  const [submitting,    setSubmitting]    = useState(false)
  const [error,         setError]         = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isQuiz,        setIsQuiz]        = useState(false)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizAnswers,   setQuizAnswers]   = useState<Record<string, number>>({})
  const [quizResult,    setQuizResult]    = useState<{ score: number; max: number } | null>(null)

  useEffect(() => { if (profile?.id) loadAssignment() }, [profile?.id])

  async function loadAssignment() {
    setLoading(true)
    const studentId  = profile!.id
    let assignmentId = sessionStorage.getItem('learnora_selected_assignment')

    if (!assignmentId) {
      const { data: ceData } = await supabase
        .from('class_enrollments').select('class_id').eq('student_id', studentId)
      const classIds = (ceData ?? []).map((e: { class_id: string }) => e.class_id)
      if (classIds.length > 0) {
        const { data: aData } = await supabase
          .from('assignments').select('id').in('class_id', classIds)
          .eq('is_published', true).order('due_date', { ascending: true }).limit(1).maybeSingle()
        if (aData) {
          assignmentId = (aData as { id: string }).id
          sessionStorage.setItem('learnora_selected_assignment', assignmentId)
        }
      }
    }

    if (!assignmentId) { setLoading(false); return }
    await loadById(assignmentId, studentId)
  }

  async function loadById(assignmentId: string, studentId: string) {
    const { data } = await supabase
      .from('assignments')
      .select('id, title, due_date, max_score, instructions, subjects(name), classes(name), profiles!teacher_id(full_name)')
      .eq('id', assignmentId)
      .maybeSingle()

    if (!data) { setLoading(false); return }

    const raw = data as unknown as {
      id: string; title: string; due_date: string | null
      max_score: number | null; instructions: string | null
      subjects: { name: string } | null
      classes:  { name: string } | null
      profiles: { full_name: string | null } | null
    }

    const { data: subData } = await supabase
      .from('assignment_submissions')
      .select('status')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .maybeSingle()

    let status: 'Pending' | 'Completed' | 'Overdue'
    if (subData) {
      status = 'Completed'
    } else if (raw.due_date && new Date(raw.due_date) < new Date()) {
      status = 'Overdue'
    } else {
      status = 'Pending'
    }

    setAssignment({
      id:           raw.id,
      title:        raw.title,
      subjectName:  raw.subjects?.name ?? '—',
      className:    raw.classes?.name ?? '—',
      dueDate:      raw.due_date,
      points:       raw.max_score ?? 100,
      teacherName:  raw.profiles?.full_name ?? '—',
      instructions: raw.instructions,
      status,
    })

    // Check for quiz questions
    const db = supabase as unknown as { from: (t: string) => any }
    const { data: qData } = await db
      .from('quiz_questions')
      .select('id, position, question, options, correct_option, points')
      .eq('assignment_id', assignmentId)
      .order('position', { ascending: true })

    const qs = (qData ?? []) as QuizQuestion[]
    if (qs.length > 0) {
      setIsQuiz(true)
      setQuizQuestions(qs)
    }

    setLoading(false)
  }

  async function submitAssignment() {
    if (!assignment) return
    setSubmitting(true)
    setError('')

    // Upload files to Supabase Storage
    const uploadedUrls: string[] = []
    for (const file of fileObjects) {
      const ext  = file.name.split('.').pop()
      const path = `${profile!.school_id}/${assignment.id}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage
        .from('assignment-submissions')
        .upload(path, file, { contentType: file.type || `application/${ext}`, upsert: false })
      if (upErr) { setError(`Upload failed: ${upErr.message}`); setSubmitting(false); return }
      const { data: urlData } = supabase.storage.from('assignment-submissions').getPublicUrl(path)
      uploadedUrls.push(urlData.publicUrl)
    }

    const { error: err } = await supabase
      .from('assignment_submissions')
      .upsert({
        school_id:       profile!.school_id!,
        assignment_id:   assignment.id,
        student_id:      profile!.id,
        submission_text: note.trim() || null,
        submission_url:  uploadedUrls[0] ?? null,
        status:          'submitted',
        submitted_at:    new Date().toISOString(),
      }, { onConflict: 'assignment_id,student_id' })

    setSubmitting(false)
    if (err) { setError(err.message); return }
    setView('success')
  }

  async function submitQuiz() {
    if (!assignment) return
    setSubmitting(true)
    setError('')

    let score = 0
    let max   = 0
    quizQuestions.forEach(q => {
      max += q.points
      if (quizAnswers[q.id] === q.correct_option) score += q.points
    })

    const db = supabase as unknown as { from: (t: string) => any }
    await db.from('quiz_submissions').upsert({
      school_id:     profile!.school_id!,
      assignment_id: assignment.id,
      student_id:    profile!.id,
      answers:       quizAnswers,
      score,
      max_score:     max,
      submitted_at:  new Date().toISOString(),
    }, { onConflict: 'assignment_id,student_id' })

    await supabase
      .from('assignment_submissions')
      .upsert({
        school_id:       profile!.school_id!,
        assignment_id:   assignment.id,
        student_id:      profile!.id,
        submission_text: `Quiz: ${score}/${max}`,
        status:          'submitted',
        submitted_at:    new Date().toISOString(),
      }, { onConflict: 'assignment_id,student_id' })

    setQuizResult({ score, max })
    setSubmitting(false)
    setView('success')
  }

  const allAnswered = quizQuestions.length > 0 && quizQuestions.every(q => quizAnswers[q.id] !== undefined)

  if (loading) {
    return (
      <DashboardLayout activePage="assignments" onNavigate={onNavigate} title="Assignment Details" user={sidebarUser}>
        <p className="text-sm text-muted py-8">Loading…</p>
      </DashboardLayout>
    )
  }

  if (!assignment) {
    return (
      <DashboardLayout activePage="assignments" onNavigate={onNavigate} title="Assignment Details" user={sidebarUser}>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <AlertCircle size={32} className="text-muted opacity-40" />
          <p className="text-sm text-muted">Assignment not found.</p>
          <button
            onClick={() => onNavigate('assignments')}
            className="h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill"
          >
            Back to Assignments
          </button>
        </div>
      </DashboardLayout>
    )
  }

  if (view === 'success') {
    return (
      <DashboardLayout activePage="assignments" onNavigate={onNavigate} title={isQuiz ? 'Quiz Complete' : 'Assignment Submitted'} user={sidebarUser}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="size-24 rounded-full bg-green-50 flex items-center justify-center mb-6">
            <CheckCircle2 size={44} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isQuiz ? 'Quiz Submitted!' : 'Submitted Successfully!'}
          </h1>
          {quizResult ? (
            <>
              <div className="bg-surface rounded-card shadow-sm px-10 py-6 mb-6 mt-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Your Score</p>
                <p className="text-5xl font-bold text-foreground">
                  {quizResult.score}
                  <span className="text-2xl text-muted font-semibold">/{quizResult.max}</span>
                </p>
                <p className="text-sm text-muted mt-2">
                  {Math.round((quizResult.score / quizResult.max) * 100)}% · {quizQuestions.length} question{quizQuestions.length !== 1 ? 's' : ''}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted max-w-[380px] leading-relaxed mb-8">
              Your assignment <span className="font-semibold text-foreground">{assignment.title}</span> has been submitted.
            </p>
          )}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => onNavigate('assignments')}
              className="h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors"
            >
              Back to Assignments
            </button>
            <button
              onClick={() => { setView('details'); setAssignment(a => a ? { ...a, status: 'Completed' } : a) }}
              className="h-11 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:bg-canvas transition-colors"
            >
              View Details
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (view === 'quiz') {
    return (
      <DashboardLayout activePage="assignments" onNavigate={onNavigate} title="Take Quiz" user={sidebarUser}>
        <div className="max-w-[700px] flex flex-col gap-5">
          <button
            onClick={() => setView('details')}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft size={16} /> Back to Details
          </button>

          <div className="bg-surface rounded-card shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center">
                <HelpCircle size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{assignment.title}</p>
                <p className="text-xs text-muted">{quizQuestions.length} questions · {assignment.points} pts total</p>
              </div>
            </div>
          </div>

          {quizQuestions.map((q, qi) => {
            const chosen = quizAnswers[q.id]
            return (
              <div key={q.id} className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold text-foreground leading-snug">
                    <span className="text-muted font-normal mr-2">{qi + 1}.</span>
                    {q.question}
                  </p>
                  <span className="text-xs text-muted shrink-0">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                </div>

                {q.options.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: oi }))}
                        className={`flex items-center gap-3 p-3 rounded-card border text-left transition-colors ${
                          chosen === oi
                            ? 'border-primary bg-primary/5'
                            : 'border-black/10 hover:border-primary/30'
                        }`}
                      >
                        <span className={`size-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                          chosen === oi ? 'border-primary bg-primary' : 'border-black/20'
                        }`}>
                          {chosen === oi && <span className="size-1.5 rounded-full bg-white" />}
                        </span>
                        <span className="text-sm text-foreground">{opt}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    rows={3}
                    placeholder="Type your answer…"
                    onChange={e => setQuizAnswers(prev => ({ ...prev, [q.id]: e.target.value as unknown as number }))}
                    className="w-full px-4 py-3 border border-black/20 rounded-card text-sm text-foreground outline-none focus:border-primary resize-none"
                  />
                )}
              </div>
            )
          })}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={submitQuiz}
            disabled={submitting || !allAnswered}
            className="h-12 bg-primary text-white text-sm font-bold rounded-pill shadow-primary hover:bg-primary-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit Quiz'}
          </button>

          {!allAnswered && (
            <p className="text-xs text-muted text-center -mt-2">Answer all questions to submit</p>
          )}
        </div>
      </DashboardLayout>
    )
  }

  if (view === 'submit') {
    return (
      <DashboardLayout activePage="assignments" onNavigate={onNavigate} title="Submit Assignment" user={sidebarUser}>
        <div className="max-w-[700px] flex flex-col gap-6">
          <button
            onClick={() => setView('details')}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft size={16} /> Back to Details
          </button>

          <div className="bg-surface rounded-card shadow-sm p-6">
            <h2 className="text-lg font-bold text-foreground mb-1">{assignment.title}</h2>
            <p className="text-sm text-muted mb-5">{assignment.subjectName} · Due {fmtDate(assignment.dueDate)}</p>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={e => {
                const selected = Array.from(e.target.files ?? [])
                setFileObjects(prev => [...prev, ...selected])
                e.target.value = ''
              }}
            />
            <div
              className="border-2 border-dashed border-black/20 rounded-card p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary hover:bg-primary/4 transition-colors mb-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload size={22} className="text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Click to attach a file (optional)</p>
                <p className="text-xs text-muted mt-1">PDF, DOC, DOCX, images — max 50 MB</p>
              </div>
            </div>

            {fileObjects.length > 0 && (
              <div className="flex flex-col gap-2 mb-5">
                {fileObjects.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-canvas rounded-card px-4 py-3">
                    <FileText size={16} className="text-primary shrink-0" />
                    <span className="text-sm text-foreground flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => setFileObjects(prev => prev.filter((_, j) => j !== i))}>
                      <X size={14} className="text-muted hover:text-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="block text-sm font-semibold text-foreground mb-2">Your answer / note to teacher</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              placeholder="Type your answer or add a note for your teacher…"
              className="w-full border border-black/20 rounded-card px-4 py-3 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary resize-none transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            disabled={submitting || (!note.trim() && fileObjects.length === 0)}
            onClick={submitAssignment}
            className="h-12 bg-primary text-white text-sm font-bold rounded-pill shadow-primary hover:bg-primary-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit Assignment'}
          </button>
        </div>
      </DashboardLayout>
    )
  }

  const instructionText  = assignment.instructions ?? ''
  const instructionParts = instructionText.split('\n').filter(Boolean)

  return (
    <DashboardLayout activePage="assignments" onNavigate={onNavigate} title="Assignment Details" user={sidebarUser}>
      <div className="max-w-[780px] flex flex-col gap-5">
        <button
          onClick={() => onNavigate('assignments')}
          className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft size={16} /> Back to Assignments
        </button>

        {/* Header card */}
        <div className="bg-primary rounded-card p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">{assignment.subjectName}</span>
                {isQuiz && (
                  <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">
                    <HelpCircle size={10} /> Quiz
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold mt-3 mb-1">{assignment.title}</h1>
              <p className="text-white/70 text-sm">{assignment.className} · {assignment.teacherName}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold">{assignment.points}</p>
              <p className="text-white/70 text-xs">points</p>
            </div>
          </div>
          <div className="flex items-center gap-5 mt-4 pt-4 border-t border-white/15">
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <Calendar size={14} />
              <span>{fmtDate(assignment.dueDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <Clock size={14} />
              <span>11:59 PM</span>
            </div>
            {isQuiz && (
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <HelpCircle size={14} />
                <span>{quizQuestions.length} question{quizQuestions.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main content */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {instructionText ? (
              <div className="bg-surface rounded-card shadow-sm p-6">
                <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <BookOpen size={16} className="text-primary" /> Instructions
                </h2>
                {instructionParts.length > 1 ? (
                  <ul className="flex flex-col gap-2.5">
                    {instructionParts.map((inst, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-muted">
                        <span className="size-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {inst}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{instructionText}</p>
                )}
              </div>
            ) : (
              <div className="bg-surface rounded-card shadow-sm p-6">
                <p className="text-sm text-muted">
                  {isQuiz ? 'No additional instructions.' : 'No instructions provided for this assignment.'}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-5">
            {/* Status */}
            <div className="bg-surface rounded-card shadow-sm p-5">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Status</p>
              <span className={`inline-flex items-center gap-2 h-8 px-3 text-xs font-semibold rounded-full ${statusCls[assignment.status]}`}>
                <span className="size-1.5 rounded-full bg-current" />{assignment.status}
              </span>
            </div>

            {/* CTA */}
            {assignment.status !== 'Completed' && (
              <button
                onClick={() => setView(isQuiz ? 'quiz' : 'submit')}
                className="w-full h-12 bg-primary text-white text-sm font-bold rounded-pill shadow-primary hover:bg-primary-deep transition-colors flex items-center justify-center gap-2"
              >
                {isQuiz ? <><HelpCircle size={16} /> Take Quiz</> : 'Submit Assignment'}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
