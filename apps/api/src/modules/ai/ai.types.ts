import type { AuthenticatedUser } from '../auth/auth.types.js'

export type AssistantType =
  | 'student'
  | 'teacher'
  | 'parent'
  | 'admin'
  | 'super_admin'

export type TaskType =
  | 'explain'
  | 'summarize'
  | 'recommend'
  | 'generate_quiz'
  | 'study_help'
  | 'report_explanation'
  | 'teaching_support'
  | 'operational_summary'
  | 'general'

export type AssistantRequest = {
  prompt: string
  sessionId?: string
  courseId?: string
  subjectId?: string
  childId?: string
}

export type RetrievalSource = {
  type: string
  label: string
  recordId?: string
}

export type RetrievedContext = {
  assistantType: AssistantType
  taskType: TaskType
  schoolId: string | null
  summaryBlocks: string[]
  knowledgeBlocks?: string[]
  requestedSubjectLabel?: string
  requestedCourseLabel?: string
  sources: RetrievalSource[]
  childId?: string
}

export type AssistantResponse = {
  sessionId: string
  assistantType: AssistantType
  taskType: TaskType
  answer: string
  sources: RetrievalSource[]
  metadata: {
    usedModel: string
    usedFallback: boolean
  }
}

export type AssignmentReviewCriterion = {
  criterion: string
  score: number
  maxScore: number
  comment: string
}

export type AssignmentReviewResponse = {
  submissionId: string
  assignmentId: string
  studentId: string
  studentName: string
  assignmentTitle: string
  subjectName?: string
  className?: string
  submittedAt: string | null
  submissionText: string | null
  submissionUrl: string | null
  maxScore: number
  summary: string
  suggestedScore: number
  scoreRationale: string
  strengths: string[]
  improvements: string[]
  feedbackForStudent: string
  rubricBreakdown: AssignmentReviewCriterion[]
  confidence: 'low' | 'medium' | 'high'
  metadata: {
    usedModel: string
    usedFallback: boolean
  }
}

export type AssistantExecutionContext = {
  user: AuthenticatedUser
  request: AssistantRequest
}
