import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, MessageSquareText, PenLine, Sparkles, Wand2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { functionErrorMessage, logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type ReviewMode = 'full_review' | 'rubric' | 'feedback'

type SubmissionOption = {
  id: string
  assignmentId: string
  assignmentTitle: string
  instructions: string | null
  maxScore: number
  studentId: string
  studentName: string
  submittedAt: string | null
  status: string
  submissionText: string | null
}

type AIReviewResult = {
  mode: ReviewMode
  overview: string
  score_ready: boolean
  suggested_score: number
  score_rationale: string
  student_feedback: string
  strengths: string[]
  improvements: string[]
  rubric: Array<{
    criterion: string
    points: number
    rationale: string
  }>
  confidence: 'low' | 'medium' | 'high'
  caution: string
}

const STORAGE_SELECTED_SUBMISSION = 'learnora_selected_submission'
const STORAGE_AI_DRAFT = 'learnora_ai_grading_draft'

const actionCards: Array<{
  mode: ReviewMode
  title: string
  body: string
  icon: typeof Wand2
}> = [
  {
    mode: 'full_review',
    title: 'Full Review',
    body: 'Ask AI for a score suggestion, rubric breakdown, and polished student feedback.',
    icon: Sparkles,
  },
  {
    mode: 'rubric',
    title: 'Rubric Suggestions',
    body: 'Generate grading criteria and point splits matched to the assignment brief.',
    icon: PenLine,
  },
  {
    mode: 'feedback',
    title: 'Student Feedback',
    body: 'Draft encouraging, specific feedback the teacher can edit before sending.',
    icon: MessageSquareText,
  },
]

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function parseDraft() {
  const raw = sessionStorage.getItem(STORAGE_AI_DRAFT)
  if (!raw) return null
  try {
    return JSON.parse(raw) as {
      submissionId: string
      score: string
      feedback: string
      generatedAt: string
    }
  } catch {
    return null
  }
}

export default function AIGradingPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [submissions, setSubmissions] = useState<SubmissionOption[]>([])
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('')
  const [teacherPrompt, setTeacherPrompt] = useState('')
  const [result, setResult] = useState<AIReviewResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<ReviewMode | null>(null)
  const [error, setError] = useState('')
  const [statusNote, setStatusNote] = useState('')

  useEffect(() => {
    if (profile?.id) loadSubmissions()
  }, [profile?.id])

  async function loadSubmissions() {
    setLoading(true)
    setError('')

    const { data, error: subErr } = await supabase
      .from('assignment_submissions')
      .select(`
        id,
        assignment_id,
        student_id,
        submitted_at,
        status,
        submission_text,
        student:profiles!student_id(full_name, email),
        assignment:assignments!assignment_id(id, title, instructions, max_score, teacher_id)
      `)
      .in('status', ['submitted', 'late', 'graded'])
      .order('submitted_at', { ascending: false })

    if (subErr) {
      logSupabaseError('AIGradingPage.loadSubmissions', subErr)
      setError(subErr.message)
      setLoading(false)
      return
    }

    type RawSubmission = {
      id: string
      assignment_id: string
      student_id: string
      submitted_at: string | null
      status: string
      submission_text: string | null
      student: { full_name: string | null; email: string | null } | null
      assignment: {
        id: string
        title: string | null
        instructions: string | null
        max_score: number | null
        teacher_id: string | null
      } | null
    }

    const next = ((data ?? []) as unknown as RawSubmission[])
      .filter(item => item.assignment?.teacher_id === profile?.id)
      .map(item => ({
        id: item.id,
        assignmentId: item.assignment_id,
        assignmentTitle: item.assignment?.title ?? 'Untitled Assignment',
        instructions: item.assignment?.instructions ?? null,
        maxScore: item.assignment?.max_score ?? 100,
        studentId: item.student_id,
        studentName: item.student?.full_name ?? item.student?.email ?? 'Student',
        submittedAt: item.submitted_at,
        status: item.status,
        submissionText: item.submission_text,
      }))

    setSubmissions(next)

    const storedSelection = sessionStorage.getItem(STORAGE_SELECTED_SUBMISSION)
    const initialSelection = next.find(item => item.id === storedSelection)?.id ?? next[0]?.id ?? ''
    setSelectedSubmissionId(initialSelection)
    setLoading(false)
  }

  const selectedSubmission = submissions.find(item => item.id === selectedSubmissionId) ?? null
  const draft = parseDraft()

  async function runReview(mode: ReviewMode) {
    if (!selectedSubmission) {
      setError('Choose a submission first.')
      return
    }

    setError('')
    setStatusNote('')
    setRunning(mode)
    setResult(null)

    const { data, error: invokeErr } = await supabase.functions.invoke('ai-grading', {
      body: {
        submissionId: selectedSubmission.id,
        mode,
        teacherPrompt: teacherPrompt.trim() || null,
      },
    })

    setRunning(null)

    if (invokeErr || !data?.result) {
      setError(
        invokeErr
          ? await functionErrorMessage(invokeErr, 'AI review failed.')
          : (data?.error ?? 'AI review failed.')
      )
      return
    }

    setResult(data.result as AIReviewResult)
  }

  function storeDraftAndOpenGrading() {
    if (!selectedSubmission || !result) return

    const nextDraft = {
      submissionId: selectedSubmission.id,
      score: result.score_ready ? String(result.suggested_score) : '',
      feedback: result.student_feedback,
      generatedAt: new Date().toISOString(),
    }

    sessionStorage.setItem(STORAGE_SELECTED_SUBMISSION, selectedSubmission.id)
    sessionStorage.setItem(STORAGE_AI_DRAFT, JSON.stringify(nextDraft))
    setStatusNote('AI draft saved. Opening grading screen with the suggested score and feedback.')
    onNavigate('grading-screen')
  }

  return (
    <DashboardLayout
      activePage="ai-assistant"
      onNavigate={onNavigate}
      title="Learnora AI Assistant"
      subtitle="Review a submission, suggest a rubric, and draft feedback before you publish."
      nav={teacherNav}
      user={sidebarUser}
    >
      <div className="max-w-[1200px] flex flex-col gap-6">
        <div className="flex items-start gap-3 bg-primary/8 border border-primary/20 rounded-card p-4">
          <div className="size-9 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">Teacher demo: AI-assisted grading</p>
            <p className="text-xs text-muted mt-1">
              This demo reads the selected submission, then suggests a rubric, score rationale, and editable student feedback.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-card text-sm text-red-700">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {statusNote && (
          <div className="flex items-start gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-card text-sm text-green-700">
            <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> {statusNote}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
          <div className="flex flex-col gap-6">
            <div className="bg-surface rounded-card shadow-sm p-6">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Choose Submission</p>
              {loading ? (
                <div className="py-10 text-sm text-muted">Loading submissions…</div>
              ) : submissions.length === 0 ? (
                <div className="py-10 text-sm text-muted">No submissions are available for AI review yet.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  <select
                    value={selectedSubmissionId}
                    onChange={e => {
                      setSelectedSubmissionId(e.target.value)
                      sessionStorage.setItem(STORAGE_SELECTED_SUBMISSION, e.target.value)
                      setResult(null)
                    }}
                    className="w-full h-11 px-4 border border-black/15 rounded-input text-sm text-foreground bg-white outline-none focus:border-primary"
                  >
                    {submissions.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.studentName} - {item.assignmentTitle}
                      </option>
                    ))}
                  </select>

                  {selectedSubmission && (
                    <div className="bg-canvas rounded-card p-4 text-sm">
                      <p className="font-semibold text-foreground">{selectedSubmission.assignmentTitle}</p>
                      <p className="text-muted mt-1">{selectedSubmission.studentName}</p>
                      <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted">
                        <span>Submitted: {fmtDate(selectedSubmission.submittedAt)}</span>
                        <span>Status: {selectedSubmission.status}</span>
                        <span>Max score: {selectedSubmission.maxScore}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-surface rounded-card shadow-sm p-6">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Teacher Notes</p>
              <textarea
                value={teacherPrompt}
                onChange={e => setTeacherPrompt(e.target.value)}
                rows={6}
                placeholder="Optional: tell the AI what to focus on. Example: be stricter on grammar, keep feedback warm, or suggest a 4-criterion rubric."
                className="w-full px-4 py-3 border border-black/15 rounded-card text-sm text-foreground placeholder:text-muted outline-none focus:border-primary resize-none"
              />
              <p className="text-xs text-muted mt-2">
                Add a teaching preference, grading standard, or tone instruction before running the review.
              </p>
            </div>

            <div className="bg-surface rounded-card shadow-sm p-6">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Run AI Review</p>
              <div className="grid grid-cols-1 gap-3">
                {actionCards.map(card => {
                  const Icon = card.icon
                  const busy = running === card.mode
                  return (
                    <button
                      key={card.mode}
                      onClick={() => runReview(card.mode)}
                      disabled={!selectedSubmission || busy || !!running}
                      className="text-left border border-black/10 rounded-card p-4 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start gap-3">
                        <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          {busy ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{card.title}</p>
                          <p className="text-xs text-muted mt-1">{card.body}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-surface rounded-card shadow-sm p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider">Submission Content</p>
                  <p className="text-sm text-muted mt-1">
                    The demo currently analyzes text submissions directly.
                  </p>
                </div>
                {draft?.submissionId === selectedSubmissionId && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-pill bg-green-50 text-green-700">
                    Draft saved for grading
                  </span>
                )}
              </div>
              <div className="bg-canvas rounded-card p-5 min-h-[220px]">
                {selectedSubmission?.submissionText ? (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedSubmission.submissionText}
                  </p>
                ) : (
                  <p className="text-sm text-muted italic">
                    No text submission found. For this demo, AI review works best on submissions with text content.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-surface rounded-card shadow-sm p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider">AI Output</p>
                  <p className="text-sm text-muted mt-1">
                    Review the suggestion, then decide whether to use it.
                  </p>
                </div>
                {result && (
                  <button
                    onClick={storeDraftAndOpenGrading}
                    className="h-10 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary"
                  >
                    Use In Grading
                  </button>
                )}
              </div>

              {!result ? (
                <div className="min-h-[260px] flex flex-col items-center justify-center text-center py-10">
                  <div className="size-14 rounded-full bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center mb-4">
                    <Sparkles size={22} className="text-white" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">Ask for grading help, rubric suggestions, or student feedback generation.</p>
                  <p className="text-sm text-muted max-w-md mt-2">
                    Pick a submission on the left, then run one of the review actions to see live AI behavior.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-canvas rounded-card p-4">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider">Confidence</p>
                      <p className="text-lg font-bold text-foreground mt-2 capitalize">{result.confidence}</p>
                    </div>
                    <div className="bg-canvas rounded-card p-4">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider">Score Suggestion</p>
                      <p className="text-lg font-bold text-foreground mt-2">
                        {result.score_ready ? `${result.suggested_score} / ${selectedSubmission?.maxScore ?? 100}` : 'Not scored'}
                      </p>
                    </div>
                    <div className="bg-canvas rounded-card p-4">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider">Mode</p>
                      <p className="text-lg font-bold text-foreground mt-2">
                        {result.mode === 'full_review' ? 'Full Review' : result.mode === 'rubric' ? 'Rubric' : 'Feedback'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-canvas rounded-card p-5">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Overview</p>
                    <p className="text-sm text-foreground leading-relaxed">{result.overview}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-canvas rounded-card p-5">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Strengths</p>
                      <ul className="space-y-2 text-sm text-foreground">
                        {result.strengths.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-canvas rounded-card p-5">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Improvements</p>
                      <ul className="space-y-2 text-sm text-foreground">
                        {result.improvements.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-canvas rounded-card p-5">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Score Rationale</p>
                    <p className="text-sm text-foreground leading-relaxed">{result.score_rationale}</p>
                  </div>

                  <div className="bg-canvas rounded-card p-5">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Student Feedback</p>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.student_feedback}</p>
                  </div>

                  <div className="bg-canvas rounded-card p-5">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Suggested Rubric</p>
                    <div className="space-y-3">
                      {result.rubric.map((item, index) => (
                        <div key={`${item.criterion}-${index}`} className="border border-black/8 rounded-card p-4 bg-white">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-foreground">{item.criterion}</p>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-pill bg-primary/10 text-primary">
                              {item.points} pts
                            </span>
                          </div>
                          <p className="text-sm text-muted mt-2">{item.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.caution && (
                    <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-card text-sm text-amber-800">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" /> {result.caution}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
