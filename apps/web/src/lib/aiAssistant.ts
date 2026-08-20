import type { Session } from '@supabase/supabase-js'

export type AssistantSource = {
  type: string
  label: string
  recordId?: string
}

export type AssistantReply = {
  sessionId: string
  assistantType: 'student' | 'teacher' | 'parent' | 'admin' | 'super_admin'
  taskType: string
  answer: string
  sources: AssistantSource[]
  metadata: {
    usedModel: string
    usedFallback: boolean
  }
}

export type AssistantSessionSummary = {
  id: string
  title: string | null
  subject: string | null
  created_at: string | null
}

export type AssistantSessionDetail = {
  session: {
    id: string
    title: string | null
    subject: string | null
    created_at: string | null
    school_id: string
    student_id: string
  }
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    created_at: string | null
  }>
}

export type AssignmentReviewReply = {
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
  rubricBreakdown: Array<{
    criterion: string
    score: number
    maxScore: number
    comment: string
  }>
  confidence: 'low' | 'medium' | 'high'
  metadata: {
    usedModel: string
    usedFallback: boolean
  }
}

export type TeacherAssistantScope = {
  subjectId?: string
  courseId?: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined
const PENDING_PROMPT_KEY = 'learnora_ai_pending_prompt'
const ACTIVE_SESSION_KEY = 'learnora_ai_active_session'
const PENDING_SCOPE_KEY = 'learnora_ai_pending_scope'

function requireApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error('Missing VITE_API_BASE_URL for Learnora AI assistant.')
  }
  return API_BASE_URL.replace(/\/$/, '')
}

async function apiRequest<T>(session: Session | null, path: string, init?: RequestInit): Promise<T> {
  const token = session?.access_token

  if (!token) {
    throw new Error('You must be signed in to use Learnora AI.')
  }

  const response = await fetch(`${requireApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : typeof payload?.message === 'string'
          ? payload.message
          : 'Learnora AI request failed.'
    throw new Error(message)
  }

  return payload as T
}

export function storePendingAssistantPrompt(prompt: string) {
  sessionStorage.setItem(PENDING_PROMPT_KEY, prompt)
}

export function readPendingAssistantPrompt() {
  return sessionStorage.getItem(PENDING_PROMPT_KEY)
}

export function clearPendingAssistantPrompt() {
  sessionStorage.removeItem(PENDING_PROMPT_KEY)
}

export function storePendingAssistantScope(scope: TeacherAssistantScope) {
  sessionStorage.setItem(PENDING_SCOPE_KEY, JSON.stringify(scope))
}

export function readPendingAssistantScope(): TeacherAssistantScope | null {
  const raw = sessionStorage.getItem(PENDING_SCOPE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as TeacherAssistantScope
  } catch {
    sessionStorage.removeItem(PENDING_SCOPE_KEY)
    return null
  }
}

export function clearPendingAssistantScope() {
  sessionStorage.removeItem(PENDING_SCOPE_KEY)
}

export function setActiveAssistantSession(sessionId: string) {
  sessionStorage.setItem(ACTIVE_SESSION_KEY, sessionId)
}

export function getActiveAssistantSession() {
  return sessionStorage.getItem(ACTIVE_SESSION_KEY)
}

export function clearActiveAssistantSession() {
  sessionStorage.removeItem(ACTIVE_SESSION_KEY)
}

export async function sendAssistantMessage(
  session: Session | null,
  payload: {
    prompt: string
    sessionId?: string
    courseId?: string
    subjectId?: string
    childId?: string
  },
) {
  return apiRequest<AssistantReply>(session, '/ai/assistant', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listAssistantSessions(session: Session | null) {
  return apiRequest<AssistantSessionSummary[]>(session, '/ai/sessions')
}

export async function getAssistantSession(session: Session | null, sessionId: string) {
  return apiRequest<AssistantSessionDetail>(session, `/ai/sessions/${sessionId}`)
}

export async function reviewAssignmentSubmission(session: Session | null, submissionId: string) {
  return apiRequest<AssignmentReviewReply>(session, '/ai/review/submission', {
    method: 'POST',
    body: JSON.stringify({ submissionId }),
  })
}
