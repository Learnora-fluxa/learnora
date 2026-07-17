import { useState, useEffect } from 'react'
import {
  MonitorCheck, Plus, Trash2, ChevronDown, ChevronUp, Loader2,
  CheckCircle2, Clock, Users, Shuffle, PenLine, BarChart2, X,
} from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type QType = 'mcq' | 'truefalse' | 'short'
type ExamStatus = 'draft' | 'published' | 'closed'

interface Exam {
  id:               string
  title:            string
  instructions:     string | null
  class_id:         string
  subject_id:       string | null
  lesson_id:        string | null
  duration_minutes: number
  randomize:        boolean
  status:           ExamStatus
  created_at:       string
  class_name:       string
  subject_name:     string
  lesson_title:     string | null
  question_count:   number
  attempt_count:    number
}

interface EditQuestion {
  id?:     string
  type:    QType
  prompt:  string
  options: string[]
  answer:  number | boolean | string
  points:  number
}

interface AttemptRow {
  student_name: string
  score:        number | null
  max_score:    number | null
  submitted_at: string | null
  auto:         boolean
}

interface ClassOpt   { id: string; name: string }
interface SubjectOpt { id: string; name: string }
interface LessonOpt  { id: string; title: string }

const typeLabels: Record<QType, string> = {
  mcq: 'Multiple Choice', truefalse: 'True / False', short: 'Short Answer',
}

const STATUS_STYLE: Record<ExamStatus, string> = {
  draft:     'bg-canvas text-muted border border-black/10',
  published: 'bg-green-50 text-green-700',
  closed:    'bg-red-50 text-red-600',
}

function emptyQuestion(): EditQuestion {
  return { type: 'mcq', prompt: '', options: ['', '', '', ''], answer: 0, points: 1 }
}

export default function CBTExamManagerPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [exams,    setExams]    = useState<Exam[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  // Create form
  const [showNew,    setShowNew]    = useState(false)
  const [classes,    setClasses]    = useState<ClassOpt[]>([])
  const [subjects,   setSubjects]   = useState<SubjectOpt[]>([])
  const [lessons,    setLessons]    = useState<LessonOpt[]>([])
  const [fTitle,     setFTitle]     = useState('')
  const [fClass,     setFClass]     = useState('')
  const [fSubject,   setFSubject]   = useState('')
  const [fLesson,    setFLesson]    = useState('')       // '' = no lesson attached
  const [fDuration,  setFDuration]  = useState(30)
  const [fRandom,    setFRandom]    = useState(true)
  const [fInstr,     setFInstr]     = useState('')
  const [creating,   setCreating]   = useState(false)

  // Question editor (per exam, expanded inline)
  const [editingExam, setEditingExam] = useState<string | null>(null)
  const [questions,   setQuestions]   = useState<EditQuestion[]>([])
  const [qExpanded,   setQExpanded]   = useState<number | null>(null)
  const [qLoading,    setQLoading]    = useState(false)
  const [qSaving,     setQSaving]     = useState(false)
  const [qSaved,      setQSaved]      = useState(false)

  // Results viewer
  const [resultsExam, setResultsExam] = useState<string | null>(null)
  const [attempts,    setAttempts]    = useState<AttemptRow[]>([])
  const [rLoading,    setRLoading]    = useState(false)

  const [busy, setBusy] = useState<Set<string>>(new Set())

  useEffect(() => { if (profile?.id) { loadExams(); loadOptions() } }, [profile?.id])

  async function loadExams() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('cbt_exams')
      .select('id, title, instructions, class_id, subject_id, lesson_id, duration_minutes, randomize, status, created_at, classes!class_id(name), subjects!subject_id(name), lessons!lesson_id(title)')
      .eq('teacher_id', profile!.id)
      .order('created_at', { ascending: false })

    if (err) { logSupabaseError('CBTManager/load', err); setError(err.message); setLoading(false); return }

    type Raw = {
      id: string; title: string; instructions: string | null; class_id: string
      subject_id: string | null; lesson_id: string | null; duration_minutes: number
      randomize: boolean | null; status: string; created_at: string
      classes: { name: string } | null; subjects: { name: string } | null; lessons: { title: string } | null
    }
    const rows = (data ?? []) as unknown as Raw[]

    // Question + attempt counts in parallel
    const examIds = rows.map(r => r.id)
    const counts: Record<string, { q: number; a: number }> = {}
    if (examIds.length > 0) {
      const [qRes, aRes] = await Promise.all([
        supabase.from('quiz_questions').select('exam_id').in('exam_id', examIds),
        supabase.from('cbt_attempts').select('exam_id').in('exam_id', examIds).not('submitted_at', 'is', null),
      ])
      for (const q of (qRes.data ?? []) as { exam_id: string | null }[]) {
        if (!q.exam_id) continue
        counts[q.exam_id] = counts[q.exam_id] ?? { q: 0, a: 0 }
        counts[q.exam_id].q++
      }
      for (const a of (aRes.data ?? []) as { exam_id: string }[]) {
        counts[a.exam_id] = counts[a.exam_id] ?? { q: 0, a: 0 }
        counts[a.exam_id].a++
      }
    }

    setExams(rows.map(r => ({
      id:               r.id,
      title:            r.title,
      instructions:     r.instructions,
      class_id:         r.class_id,
      subject_id:       r.subject_id,
      lesson_id:        r.lesson_id,
      duration_minutes: r.duration_minutes,
      randomize:        r.randomize ?? true,
      status:           (r.status as ExamStatus) ?? 'draft',
      created_at:       r.created_at,
      class_name:       r.classes?.name ?? '—',
      subject_name:     r.subjects?.name ?? '—',
      lesson_title:     r.lessons?.title ?? null,
      question_count:   counts[r.id]?.q ?? 0,
      attempt_count:    counts[r.id]?.a ?? 0,
    })))
    setLoading(false)
  }

  async function loadOptions() {
    const { data } = await supabase
      .from('teacher_assignments')
      .select('class_id, subject_id, classes!class_id(name), subjects!subject_id(name)')
      .eq('teacher_id', profile!.id)

    type Raw = { class_id: string; subject_id: string; classes: { name: string } | null; subjects: { name: string } | null }
    const raw = (data ?? []) as unknown as Raw[]
    const cls  = new Map<string, string>()
    const subj = new Map<string, string>()
    for (const r of raw) {
      if (r.classes?.name)  cls.set(r.class_id, r.classes.name)
      if (r.subjects?.name) subj.set(r.subject_id, r.subjects.name)
    }
    const clsArr  = [...cls.entries()].map(([id, name]) => ({ id, name }))
    const subjArr = [...subj.entries()].map(([id, name]) => ({ id, name }))
    setClasses(clsArr)
    setSubjects(subjArr)
    if (clsArr[0])  setFClass(clsArr[0].id)
    if (subjArr[0]) setFSubject(subjArr[0].id)
  }

  // Optional lesson picker — loads lessons for the teacher's courses when subject changes
  useEffect(() => {
    async function loadLessons() {
      if (!fSubject) { setLessons([]); return }
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('subject_id', fSubject)
        .eq('school_id', profile!.school_id!)
      const courseIds = ((courses ?? []) as { id: string }[]).map(c => c.id)
      if (courseIds.length === 0) { setLessons([]); return }
      const { data: mods } = await supabase.from('modules').select('id').in('course_id', courseIds)
      const modIds = ((mods ?? []) as { id: string }[]).map(m => m.id)
      if (modIds.length === 0) { setLessons([]); return }
      const { data: less } = await supabase.from('lessons').select('id, title').in('module_id', modIds)
      setLessons(((less ?? []) as { id: string; title: string }[]))
    }
    if (profile?.school_id) loadLessons()
  }, [fSubject, profile?.school_id])

  async function createExam() {
    if (!fTitle.trim() || !fClass) return
    setCreating(true)
    const { error: err } = await supabase.from('cbt_exams').insert({
      school_id:        profile!.school_id!,
      teacher_id:       profile!.id,
      class_id:         fClass,
      subject_id:       fSubject || null,
      lesson_id:        fLesson || null,
      title:            fTitle.trim(),
      instructions:     fInstr.trim() || null,
      duration_minutes: fDuration,
      randomize:        fRandom,
      status:           'draft',
    })
    setCreating(false)
    if (err) { logSupabaseError('CBTManager/create', err); setError(err.message); return }
    setShowNew(false)
    setFTitle(''); setFInstr(''); setFLesson('')
    loadExams()
  }

  async function setStatus(examId: string, status: ExamStatus) {
    setBusy(prev => new Set([...prev, examId]))
    const { error: err } = await supabase.from('cbt_exams').update({ status }).eq('id', examId)
    setBusy(prev => { const n = new Set(prev); n.delete(examId); return n })
    if (err) { logSupabaseError('CBTManager/status', err); setError(err.message); return }
    loadExams()
  }

  async function deleteExam(examId: string) {
    if (!confirm('Delete this exam and all its questions and attempts?')) return
    setBusy(prev => new Set([...prev, examId]))
    const { error: err } = await supabase.from('cbt_exams').delete().eq('id', examId)
    setBusy(prev => { const n = new Set(prev); n.delete(examId); return n })
    if (err) { logSupabaseError('CBTManager/delete', err); setError(err.message); return }
    if (editingExam === examId) setEditingExam(null)
    loadExams()
  }

  // ── Question editor ─────────────────────────────────────────────────────────
  async function openQuestions(examId: string) {
    if (editingExam === examId) { setEditingExam(null); return }
    setResultsExam(null)
    setEditingExam(examId)
    setQLoading(true)
    setQSaved(false)
    const { data } = await supabase
      .from('quiz_questions')
      .select('id, question, type, options, points, order_index')
      .eq('exam_id', examId)
      .order('order_index', { ascending: true })

    type Raw = { id: string; question: string; type: string; options: unknown; points: number | null }
    const qs = ((data ?? []) as Raw[]).map(q => {
      const parsed = (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) as { opts?: string[]; answer?: number | boolean | string } | null
      return {
        id:      q.id,
        type:    q.type as QType,
        prompt:  q.question,
        options: parsed?.opts ?? ['', '', '', ''],
        answer:  parsed?.answer ?? 0,
        points:  q.points ?? 1,
      }
    })
    setQuestions(qs.length > 0 ? qs : [emptyQuestion()])
    setQExpanded(qs.length > 0 ? null : 0)
    setQLoading(false)
  }

  function updateQuestion(i: number, patch: Partial<EditQuestion>) {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, ...patch } : q))
    setQSaved(false)
  }

  function addQuestion() {
    setQuestions(prev => [...prev, emptyQuestion()])
    setQExpanded(questions.length)
    setQSaved(false)
  }

  function removeQuestion(i: number) {
    setQuestions(prev => prev.filter((_, idx) => idx !== i))
    setQSaved(false)
  }

  async function saveQuestions() {
    if (!editingExam) return
    const valid = questions.filter(q => q.prompt.trim() !== '')
    setQSaving(true)
    // Replace-all: delete then insert keeps ordering simple
    await supabase.from('quiz_questions').delete().eq('exam_id', editingExam)
    if (valid.length > 0) {
      const rows = valid.map((q, i) => ({
        school_id:   profile!.school_id!,
        exam_id:     editingExam,
        lesson_id:   null,
        question:    q.prompt.trim(),
        type:        q.type,
        options:     JSON.stringify({ opts: q.type === 'mcq' ? q.options : [], answer: q.answer }),
        points:      q.points,
        order_index: i,
        created_by:  profile!.id,
      }))
      const { error: err } = await supabase.from('quiz_questions').insert(rows)
      if (err) { logSupabaseError('CBTManager/saveQ', err); setError(err.message); setQSaving(false); return }
    }
    setQSaving(false)
    setQSaved(true)
    loadExams()
  }

  // ── Results ────────────────────────────────────────────────────────────────
  async function openResults(examId: string) {
    if (resultsExam === examId) { setResultsExam(null); return }
    setEditingExam(null)
    setResultsExam(examId)
    setRLoading(true)
    const { data } = await supabase
      .from('cbt_attempts')
      .select('score, max_score, submitted_at, auto_submitted, profiles!student_id(full_name, email)')
      .eq('exam_id', examId)
      .not('submitted_at', 'is', null)
      .order('score', { ascending: false })

    type Raw = { score: number | null; max_score: number | null; submitted_at: string | null; auto_submitted: boolean | null; profiles: { full_name: string | null; email: string | null } | null }
    setAttempts(((data ?? []) as unknown as Raw[]).map(r => ({
      student_name: r.profiles?.full_name ?? r.profiles?.email ?? 'Student',
      score:        r.score,
      max_score:    r.max_score,
      submitted_at: r.submitted_at,
      auto:         r.auto_submitted ?? false,
    })))
    setRLoading(false)
  }

  return (
    <DashboardLayout
      activePage="cbt-exams"
      onNavigate={onNavigate}
      title="CBT Exams"
      subtitle="Create and manage computer-based tests"
      nav={teacherNav}
      user={sidebarUser}
    >
      <div className="max-w-[900px] flex flex-col gap-5">

        {error && (
          <div className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-card text-sm text-red-700">
            {error}
            <button onClick={() => setError('')}><X size={14} /></button>
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted">
            {loading ? 'Loading…' : `${exams.length} exam${exams.length !== 1 ? 's' : ''}`}
          </p>
          <button
            onClick={() => setShowNew(p => !p)}
            className="flex items-center gap-1.5 h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary"
          >
            <Plus size={14} /> New CBT Exam
          </button>
        </div>

        {/* Create form */}
        {showNew && (
          <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-4">
            <h3 className="text-base font-bold text-foreground">New CBT Exam</h3>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Title *</label>
              <input
                value={fTitle} onChange={e => setFTitle(e.target.value)}
                placeholder="e.g. Mid-Term Physics CBT"
                className="w-full h-11 px-4 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Class *</label>
                <select value={fClass} onChange={e => setFClass(e.target.value)}
                  className="w-full h-11 px-3 border border-black/20 rounded-card text-sm bg-surface outline-none focus:border-primary">
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Subject</label>
                <select value={fSubject} onChange={e => { setFSubject(e.target.value); setFLesson('') }}
                  className="w-full h-11 px-3 border border-black/20 rounded-card text-sm bg-surface outline-none focus:border-primary">
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Lesson (optional)</label>
                <select value={fLesson} onChange={e => setFLesson(e.target.value)}
                  className="w-full h-11 px-3 border border-black/20 rounded-card text-sm bg-surface outline-none focus:border-primary">
                  <option value="">— No lesson attached —</option>
                  {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Duration (minutes) *</label>
                <input
                  type="number" min={5} max={240} value={fDuration}
                  onChange={e => setFDuration(Math.max(5, parseInt(e.target.value) || 30))}
                  className="w-full h-11 px-4 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Instructions (shown to students)</label>
              <textarea
                value={fInstr} onChange={e => setFInstr(e.target.value)} rows={2}
                placeholder="e.g. Answer all questions. Do not leave the exam page."
                className="w-full px-4 py-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary resize-none"
              />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer w-fit">
              <input type="checkbox" checked={fRandom} onChange={e => setFRandom(e.target.checked)} className="size-4 accent-primary" />
              <span className="text-sm text-foreground flex items-center gap-1.5"><Shuffle size={13} className="text-muted" /> Randomize question order per student</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={createExam} disabled={creating || !fTitle.trim() || !fClass}
                className="flex items-center gap-2 h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Create Draft
              </button>
              <button onClick={() => setShowNew(false)} className="h-10 px-5 text-sm font-semibold text-muted hover:text-foreground">Cancel</button>
            </div>
          </div>
        )}

        {/* Exam list */}
        {loading ? (
          <div className="py-16 text-center text-sm text-muted">Loading exams…</div>
        ) : exams.length === 0 ? (
          <div className="text-center py-16 text-muted bg-surface rounded-card shadow-sm">
            <MonitorCheck size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No CBT exams yet. Create one to get started.</p>
          </div>
        ) : exams.map(exam => (
          <div key={exam.id} className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="size-11 rounded-card bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <MonitorCheck size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${STATUS_STYLE[exam.status]}`}>{exam.status}</span>
                    <span className="text-xs text-muted font-semibold">{exam.subject_name} · {exam.class_name}</span>
                    {exam.lesson_title && <span className="text-xs text-muted">Lesson: {exam.lesson_title}</span>}
                  </div>
                  <h3 className="text-base font-bold text-foreground leading-snug">{exam.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted">
                    <span className="flex items-center gap-1"><Clock size={11} /> {exam.duration_minutes} min</span>
                    <span className="flex items-center gap-1"><PenLine size={11} /> {exam.question_count} question{exam.question_count !== 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1"><Users size={11} /> {exam.attempt_count} submission{exam.attempt_count !== 1 ? 's' : ''}</span>
                    {exam.randomize && <span className="flex items-center gap-1"><Shuffle size={11} /> Randomized</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => openQuestions(exam.id)}
                    className={`h-9 px-4 text-sm font-semibold rounded-pill border transition-colors ${editingExam === exam.id ? 'border-primary text-primary bg-primary/5' : 'border-black/15 text-foreground hover:border-primary hover:text-primary'}`}
                  >
                    Questions
                  </button>
                  <button
                    onClick={() => openResults(exam.id)}
                    className={`h-9 px-4 text-sm font-semibold rounded-pill border transition-colors flex items-center gap-1.5 ${resultsExam === exam.id ? 'border-primary text-primary bg-primary/5' : 'border-black/15 text-foreground hover:border-primary hover:text-primary'}`}
                  >
                    <BarChart2 size={13} /> Results
                  </button>
                  {exam.status === 'draft' && (
                    <button
                      onClick={() => setStatus(exam.id, 'published')}
                      disabled={busy.has(exam.id) || exam.question_count === 0}
                      title={exam.question_count === 0 ? 'Add questions first' : undefined}
                      className="h-9 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-50"
                    >
                      Publish
                    </button>
                  )}
                  {exam.status === 'published' && (
                    <button
                      onClick={() => setStatus(exam.id, 'closed')}
                      disabled={busy.has(exam.id)}
                      className="h-9 px-4 border border-red-300 text-red-600 text-sm font-semibold rounded-pill hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      Close
                    </button>
                  )}
                  {exam.status === 'closed' && (
                    <button
                      onClick={() => setStatus(exam.id, 'published')}
                      disabled={busy.has(exam.id)}
                      className="h-9 px-4 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                    >
                      Reopen
                    </button>
                  )}
                  <button
                    onClick={() => deleteExam(exam.id)}
                    disabled={busy.has(exam.id)}
                    className="h-9 w-9 flex items-center justify-center border border-black/15 text-muted rounded-pill hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-50"
                    aria-label="Delete exam"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Inline question editor */}
            {editingExam === exam.id && (
              <div className="border-t border-black/6 bg-canvas/40 p-5 flex flex-col gap-3">
                {qLoading ? (
                  <p className="text-sm text-muted py-4 text-center">Loading questions…</p>
                ) : (
                  <>
                    {questions.map((q, i) => (
                      <div key={i} className="bg-surface rounded-card shadow-sm">
                        <button
                          onClick={() => setQExpanded(qExpanded === i ? null : i)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left"
                        >
                          <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <span className="flex-1 text-sm font-medium text-foreground truncate">{q.prompt || 'Untitled question'}</span>
                          <span className="text-xs text-muted shrink-0">{typeLabels[q.type]} · {q.points} pt{q.points !== 1 ? 's' : ''}</span>
                          {qExpanded === i ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                        </button>
                        {qExpanded === i && (
                          <div className="px-4 pb-4 flex flex-col gap-3 border-t border-black/6 pt-3">
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_90px] gap-3">
                              <input
                                value={q.prompt}
                                onChange={e => updateQuestion(i, { prompt: e.target.value })}
                                placeholder="Question text"
                                className="h-10 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
                              />
                              <select
                                value={q.type}
                                onChange={e => {
                                  const t = e.target.value as QType
                                  updateQuestion(i, { type: t, answer: t === 'truefalse' ? true : t === 'mcq' ? 0 : '' })
                                }}
                                className="h-10 px-2 border border-black/20 rounded-card text-sm bg-surface outline-none focus:border-primary"
                              >
                                {(Object.keys(typeLabels) as QType[]).map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
                              </select>
                              <input
                                type="number" min={1} value={q.points}
                                onChange={e => updateQuestion(i, { points: Math.max(1, parseInt(e.target.value) || 1) })}
                                className="h-10 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
                                aria-label="Points"
                              />
                            </div>
                            {q.type === 'mcq' && (
                              <div className="flex flex-col gap-2">
                                {q.options.map((opt, oi) => (
                                  <div key={oi} className="flex items-center gap-2">
                                    <input
                                      type="radio" checked={q.answer === oi}
                                      onChange={() => updateQuestion(i, { answer: oi })}
                                      className="size-4 accent-primary shrink-0"
                                      aria-label={`Mark option ${oi + 1} correct`}
                                    />
                                    <input
                                      value={opt}
                                      onChange={e => updateQuestion(i, { options: q.options.map((o, x) => x === oi ? e.target.value : o) })}
                                      placeholder={`Option ${oi + 1}`}
                                      className="flex-1 h-9 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
                                    />
                                  </div>
                                ))}
                                <p className="text-[11px] text-muted">Select the radio next to the correct option.</p>
                              </div>
                            )}
                            {q.type === 'truefalse' && (
                              <div className="flex gap-2">
                                {[true, false].map(v => (
                                  <button
                                    key={String(v)}
                                    onClick={() => updateQuestion(i, { answer: v })}
                                    className={`h-9 px-4 rounded-full text-sm font-semibold transition-colors ${q.answer === v ? 'bg-primary text-white' : 'bg-canvas text-muted hover:bg-black/8'}`}
                                  >
                                    {v ? 'True' : 'False'}
                                  </button>
                                ))}
                              </div>
                            )}
                            {q.type === 'short' && (
                              <input
                                value={String(q.answer ?? '')}
                                onChange={e => updateQuestion(i, { answer: e.target.value })}
                                placeholder="Expected answer (exact match, case-insensitive)"
                                className="h-10 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
                              />
                            )}
                            <button
                              onClick={() => removeQuestion(i)}
                              className="flex items-center gap-1.5 text-xs text-red-500 font-semibold hover:underline w-fit"
                            >
                              <Trash2 size={11} /> Remove question
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={addQuestion}
                        className="flex items-center gap-1.5 h-9 px-4 border border-dashed border-black/25 text-sm font-semibold text-muted rounded-pill hover:border-primary hover:text-primary transition-colors"
                      >
                        <Plus size={13} /> Add Question
                      </button>
                      <button
                        onClick={saveQuestions}
                        disabled={qSaving}
                        className="flex items-center gap-2 h-9 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-50"
                      >
                        {qSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        {qSaving ? 'Saving…' : 'Save Questions'}
                      </button>
                      {qSaved && <span className="text-sm text-green-600 font-semibold">Saved ✓</span>}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Inline results */}
            {resultsExam === exam.id && (
              <div className="border-t border-black/6 bg-canvas/40 p-5">
                {rLoading ? (
                  <p className="text-sm text-muted py-4 text-center">Loading results…</p>
                ) : attempts.length === 0 ? (
                  <p className="text-sm text-muted py-4 text-center">No submissions yet.</p>
                ) : (
                  <div className="bg-surface rounded-card shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-black/6 bg-canvas/40">
                          {['Student', 'Score', '%', 'Submitted', ''].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {attempts.map((a, i) => {
                          const pct = a.max_score && a.max_score > 0 ? Math.round(((a.score ?? 0) / a.max_score) * 100) : null
                          return (
                            <tr key={i} className="border-b border-black/4 last:border-0">
                              <td className="px-4 py-3 font-medium text-foreground">{a.student_name}</td>
                              <td className="px-4 py-3 text-foreground">{a.score ?? '—'} / {a.max_score ?? '—'}</td>
                              <td className="px-4 py-3">
                                {pct != null && (
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct >= 70 ? 'bg-green-50 text-green-700' : pct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>{pct}%</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted">
                                {a.submitted_at ? new Date(a.submitted_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted">{a.auto ? 'Auto-submitted (time up)' : ''}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
