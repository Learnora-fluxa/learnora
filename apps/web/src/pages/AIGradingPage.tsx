import { useEffect, useState } from 'react'
import { ChevronLeft, CheckCircle2, ExternalLink, RefreshCw, Sparkles } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { reviewAssignmentSubmission, type AssignmentReviewReply } from '../lib/aiAssistant'

type Props = { onNavigate: (page: string) => void }

export default function AIGradingPage({ onNavigate }: Props) {
  const { profile, session } = useAuth()
  const [review, setReview] = useState<AssignmentReviewReply | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    if (profile?.id) {
      void loadReview()
    }
  }, [profile?.id])

  async function loadReview() {
    const submissionId = sessionStorage.getItem('learnora_selected_submission')

    if (!submissionId) {
      setError('No submission was selected for AI review.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    setApplied(false)

    try {
      const payload = await reviewAssignmentSubmission(session, submissionId)
      setReview(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate AI review.')
    } finally {
      setLoading(false)
    }
  }

  function applyToGrading() {
    if (!review) return

    sessionStorage.setItem('learnora_ai_grading_draft', JSON.stringify({
      submissionId: review.submissionId,
      score: String(review.suggestedScore),
      feedback: review.feedbackForStudent,
    }))
    setApplied(true)
  }

  return (
    <DashboardLayout
      activePage="ai-assistant"
      onNavigate={onNavigate}
      title="Learnora AI Review"
      subtitle={review ? `${review.studentName} — ${review.assignmentTitle}` : 'AI-assisted grading review'}
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-6 max-w-[1200px]">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => onNavigate('grading-screen')}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground"
          >
            <ChevronLeft size={16} /> Back to Grading
          </button>
          <button
            onClick={() => void loadReview()}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary-deep"
          >
            <RefreshCw size={16} /> Refresh Review
          </button>
        </div>

        {loading ? (
          <div className="bg-surface rounded-card shadow-sm p-8 text-sm text-muted">Analyzing submission…</div>
        ) : error ? (
          <div className="bg-surface rounded-card shadow-sm p-8">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : !review ? (
          <div className="bg-surface rounded-card shadow-sm p-8 text-sm text-muted">No AI review available.</div>
        ) : (
          <>
            <div className="flex items-start gap-3 bg-primary/8 border border-primary/20 rounded-card p-4">
              <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary">AI review generated for this submission</p>
                <p className="text-xs text-muted mt-0.5">
                  Suggested score: <span className="font-semibold text-foreground">{review.suggestedScore}/{review.maxScore}</span>
                  {' '}· Confidence: <span className="font-semibold text-foreground capitalize">{review.confidence}</span>
                  {' '}· Model: <span className="font-semibold text-foreground">{review.metadata.usedModel}</span>
                  {review.metadata.usedFallback ? ' (fallback)' : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
              <div className="flex flex-col gap-6">
                <div className="bg-surface rounded-card shadow-sm p-6">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">AI Summary</p>
                  <p className="text-sm text-foreground leading-relaxed">{review.summary}</p>
                </div>

                <div className="bg-surface rounded-card shadow-sm p-6">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Score Rationale</p>
                  <p className="text-sm text-foreground leading-relaxed">{review.scoreRationale}</p>
                </div>

                <div className="bg-surface rounded-card shadow-sm p-6">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Rubric Breakdown</p>
                  <div className="flex flex-col gap-3">
                    {review.rubricBreakdown.map((item, index) => (
                      <div key={`${item.criterion}-${index}`} className="rounded-card border border-black/8 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">{item.criterion}</p>
                          <span className="text-sm font-bold text-primary">{item.score}/{item.maxScore}</span>
                        </div>
                        <p className="text-xs text-muted mt-2 leading-relaxed">{item.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-surface rounded-card shadow-sm p-6">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Strengths</p>
                    <div className="flex flex-col gap-2">
                      {review.strengths.length > 0 ? review.strengths.map((item, index) => (
                        <p key={index} className="text-sm text-foreground leading-relaxed">• {item}</p>
                      )) : (
                        <p className="text-sm text-muted">No strengths were highlighted.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-surface rounded-card shadow-sm p-6">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Improvements</p>
                    <div className="flex flex-col gap-2">
                      {review.improvements.length > 0 ? review.improvements.map((item, index) => (
                        <p key={index} className="text-sm text-foreground leading-relaxed">• {item}</p>
                      )) : (
                        <p className="text-sm text-muted">No improvement points were highlighted.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-surface rounded-card shadow-sm p-6">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Suggested Feedback for Student</p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{review.feedbackForStudent}</p>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="bg-surface rounded-card shadow-sm p-6">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Submission Details</p>
                  <div className="flex flex-col gap-3 text-sm">
                    <p><span className="text-muted">Student:</span> <span className="font-semibold text-foreground">{review.studentName}</span></p>
                    <p><span className="text-muted">Assignment:</span> <span className="font-semibold text-foreground">{review.assignmentTitle}</span></p>
                    {review.subjectName && <p><span className="text-muted">Subject:</span> <span className="font-semibold text-foreground">{review.subjectName}</span></p>}
                    {review.className && <p><span className="text-muted">Class:</span> <span className="font-semibold text-foreground">{review.className}</span></p>}
                    {review.submittedAt && (
                      <p>
                        <span className="text-muted">Submitted:</span>{' '}
                        <span className="font-semibold text-foreground">
                          {new Date(review.submittedAt).toLocaleString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-surface rounded-card shadow-sm p-6">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Submission Content</p>
                  {review.submissionText ? (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{review.submissionText}</p>
                  ) : (
                    <p className="text-sm text-muted italic">No text submission was provided.</p>
                  )}

                  {review.submissionUrl && (
                    <a
                      href={review.submissionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:text-primary-deep"
                    >
                      <ExternalLink size={14} /> Open attached submission
                    </a>
                  )}
                </div>

                <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-3">
                  <button
                    onClick={applyToGrading}
                    className="h-11 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors"
                  >
                    Use Suggested Score and Feedback
                  </button>
                  <button
                    onClick={() => onNavigate('grading-screen')}
                    className="h-11 border border-black/15 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors"
                  >
                    Return to Manual Grading
                  </button>
                  {applied && (
                    <p className="flex items-center gap-2 text-sm text-green-600 font-semibold">
                      <CheckCircle2 size={16} /> Draft copied to grading form. Open the grading screen to review and submit.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
