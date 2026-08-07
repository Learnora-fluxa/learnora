import { useState, useEffect } from 'react'
import { ChevronLeft, CheckCircle2, Sparkles } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface SubmissionData {
  id:              string
  studentName:     string
  assignmentTitle: string
  submittedAt:     string | null
  submissionText:  string | null
  assignmentId:    string
  studentId:       string
  maxScore:        number
}

export default function GradingScreenPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [submission, setSubmission] = useState<SubmissionData | null>(null)
  const [score,      setScore]      = useState('')
  const [feedback,   setFeedback]   = useState('')
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [done,       setDone]       = useState(false)

  useEffect(() => { if (profile?.id) loadSubmission() }, [profile?.id])

  async function loadSubmission() {
    setLoading(true)
    setError('')

    const { data: aData } = await supabase
      .from('assignments')
      .select('id, title, max_score')
      .eq('teacher_id', profile!.id)

    const assignments = (aData ?? []) as { id: string; title: string; max_score: number }[]
    if (assignments.length === 0) { setLoading(false); return }

    const assignIds  = assignments.map(a => a.id)
    const assignMap: Record<string, { title: string; max_score: number }> = {}
    for (const a of assignments) assignMap[a.id] = { title: a.title, max_score: a.max_score }

    const selectedSubmissionId = sessionStorage.getItem('learnora_selected_submission')

    let data: unknown = null

    if (selectedSubmissionId) {
      const { data: picked } = await supabase
        .from('assignment_submissions')
        .select('id, assignment_id, student_id, submitted_at, submission_text, profiles!student_id(full_name, email)')
        .eq('id', selectedSubmissionId)
        .in('assignment_id', assignIds)
        .maybeSingle()
      data = picked
    }

    if (!data) {
      const { data: nextItem } = await supabase
        .from('assignment_submissions')
        .select('id, assignment_id, student_id, submitted_at, submission_text, profiles!student_id(full_name, email)')
        .in('assignment_id', assignIds)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      data = nextItem
    }

    if (!data) { setLoading(false); return }

    const raw = data as unknown as {
      id:              string
      assignment_id:   string
      student_id:      string
      submitted_at:    string | null
      submission_text: string | null
      profiles:        { full_name: string | null; email: string | null } | null
    }

    const info = assignMap[raw.assignment_id]
    setSubmission({
      id:              raw.id,
      studentName:     raw.profiles?.full_name ?? raw.profiles?.email ?? 'Student',
      assignmentTitle: info?.title ?? '—',
      submittedAt:     raw.submitted_at,
      submissionText:  raw.submission_text,
      assignmentId:    raw.assignment_id,
      studentId:       raw.student_id,
      maxScore:        info?.max_score ?? 100,
    })

    const rawDraft = sessionStorage.getItem('learnora_ai_grading_draft')
    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft) as { submissionId?: string; score?: string; feedback?: string }
        if (draft.submissionId === raw.id) {
          setScore(draft.score ?? '')
          setFeedback(draft.feedback ?? '')
        } else {
          setScore('')
          setFeedback('')
        }
      } catch {
        setScore('')
        setFeedback('')
      }
    } else {
      setScore('')
      setFeedback('')
    }

    setLoading(false)
  }

  async function submitGrade() {
    if (!submission || !score.trim()) return
    const scoreNum = parseFloat(score)
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > submission.maxScore) {
      setError(`Score must be between 0 and ${submission.maxScore}`)
      return
    }

    setSaving(true)
    setError('')

    const { error: gErr } = await supabase.from('grades').insert({
      school_id:     profile!.school_id!,
      submission_id: submission.id,
      assignment_id: submission.assignmentId,
      student_id:    submission.studentId,
      teacher_id:    profile!.id,
      score:         scoreNum,
      max_score:     submission.maxScore,
      feedback:      feedback.trim() || null,
    })
    if (gErr) { logSupabaseError('GradingScreen.insertGrade', gErr); setError(gErr.message); setSaving(false); return }

    const { error: uErr } = await supabase
      .from('assignment_submissions')
      .update({ status: 'graded' })
      .eq('id', submission.id)

    setSaving(false)
    if (uErr) { logSupabaseError('GradingScreen.updateSubmission', uErr); setError(uErr.message); return }
    sessionStorage.removeItem('learnora_ai_grading_draft')
    setDone(true)
  }

  if (loading) {
    return (
      <DashboardLayout activePage="gradebook" onNavigate={onNavigate} title="Grading" subtitle="" nav={teacherNav} user={sidebarUser}>
        <p className="text-sm text-muted py-8">Loading submission…</p>
      </DashboardLayout>
    )
  }

  if (!submission) {
    return (
      <DashboardLayout activePage="gradebook" onNavigate={onNavigate} title="Grading" subtitle="Nothing left to grade" nav={teacherNav} user={sidebarUser}>
        <div className="max-w-[500px] py-16 text-center">
          <div className="size-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">All Caught Up!</h2>
          <p className="text-sm text-muted mb-6">No ungraded submissions right now.</p>
          <button
            onClick={() => onNavigate('submissions-inbox')}
            className="h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep shadow-primary"
          >
            View All Submissions
          </button>
        </div>
      </DashboardLayout>
    )
  }

  if (done) {
    return (
      <DashboardLayout activePage="gradebook" onNavigate={onNavigate} title="Grading" subtitle="" nav={teacherNav} user={sidebarUser}>
        <div className="max-w-[500px] py-16 text-center">
          <div className="size-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={28} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Grade Submitted!</h2>
          <p className="text-base text-muted mb-8">
            {submission.studentName} — {score}/{submission.maxScore} ({Math.round((parseFloat(score) / submission.maxScore) * 100)}%)
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => onNavigate('submissions-inbox')}
              className="h-12 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep shadow-primary"
            >
              Back to Inbox
            </button>
            <button
              onClick={() => { setDone(false); setScore(''); setFeedback(''); loadSubmission() }}
              className="h-12 px-6 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary"
            >
              Grade Next
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      activePage="gradebook"
      onNavigate={onNavigate}
      title="Grading"
      subtitle={`${submission.studentName} — ${submission.assignmentTitle}`}
      nav={teacherNav}
      user={sidebarUser}
    >
      <div className="max-w-[1100px] flex flex-col gap-6">

        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('submissions-inbox')} className="flex items-center gap-2 text-sm text-muted hover:text-foreground">
            <ChevronLeft size={16} /> Back to Submissions
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem('learnora_selected_submission', submission.id)
              onNavigate('ai-assistant')
            }}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary-deep"
          >
            <Sparkles size={16} /> Open AI Review
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          {/* Submission content */}
          <div className="flex flex-col gap-4">
            <div className="bg-surface rounded-card shadow-sm p-6">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Student's Submission</p>
              <div className="bg-canvas rounded-card p-5 min-h-[200px]">
                {submission.submissionText ? (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{submission.submissionText}</p>
                ) : (
                  <p className="text-sm text-muted italic">No text submission provided.</p>
                )}
              </div>
              <div className="flex justify-between text-xs text-muted mt-3 flex-wrap gap-2">
                <span>Student: <span className="font-semibold text-foreground">{submission.studentName}</span></span>
                {submission.submittedAt && (
                  <span>
                    Submitted:{' '}
                    {new Date(submission.submittedAt).toLocaleString('en-GB', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Grade panel */}
          <div className="flex flex-col gap-4">

            <div className="bg-surface rounded-card shadow-sm p-6">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Score</p>
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="number"
                  min={0}
                  max={submission.maxScore}
                  value={score}
                  onChange={e => setScore(e.target.value)}
                  placeholder="0"
                  className="w-24 h-12 px-3 border border-black/20 rounded-input text-2xl font-bold text-foreground text-center outline-none focus:border-primary"
                />
                <span className="text-lg text-muted">/ {submission.maxScore}</span>
              </div>
              {score && !isNaN(parseFloat(score)) && (
                <p className="text-sm font-semibold text-primary mt-1">
                  {Math.round((parseFloat(score) / submission.maxScore) * 100)}%
                </p>
              )}
            </div>

            <div className="bg-surface rounded-card shadow-sm p-6">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Teacher Feedback</p>
              <textarea
                value={feedback} onChange={e => setFeedback(e.target.value)}
                rows={5} placeholder="Leave feedback for the student…"
                className="w-full px-4 py-3 border border-black/15 rounded-card text-sm text-foreground placeholder:text-muted outline-none focus:border-primary resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              onClick={submitGrade}
              disabled={saving || !score.trim()}
              className="h-12 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Submitting…' : 'Submit Grade'}
            </button>

          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
