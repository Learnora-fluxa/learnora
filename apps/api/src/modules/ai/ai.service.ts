import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { SupabaseService } from '../../providers/supabase/supabase.service.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { AiLlmService } from './ai-llm.service.js'
import { AiPolicyService } from './ai-policy.service.js'
import { AiRetrievalService } from './ai-retrieval.service.js'
import type { AssignmentReviewResponse, AssistantRequest, AssistantResponse, RetrievedContext } from './ai.types.js'

@Injectable()
export class AiService {
  private static readonly CACHE_TTL_HOURS = 24

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly aiPolicyService: AiPolicyService,
    private readonly aiRetrievalService: AiRetrievalService,
    private readonly aiLlmService: AiLlmService,
  ) {}

  async respond(user: AuthenticatedUser, request: AssistantRequest): Promise<AssistantResponse> {
    this.aiPolicyService.validatePrompt(request.prompt)

    const context = await this.aiRetrievalService.buildContext(user, request)
    const sessionId = await this.ensureSession(user, request, context.assistantType)
    const cacheKey = this.buildCacheKey(user, request, context)

    await this.storeMessage({
      sessionId,
      schoolId: user.schoolId,
      role: 'user',
      content: request.prompt.trim(),
    })

    const cachedResponse = await this.getCachedResponse(cacheKey)
    const modelResponse = cachedResponse ?? await this.aiLlmService.generateResponse({
      prompt: request.prompt,
      context,
    })

    if (!cachedResponse) {
      await this.storeCachedResponse({
        cacheKey,
        schoolId: user.schoolId,
        assistantType: context.assistantType,
        taskType: context.taskType,
        prompt: request.prompt,
        answer: modelResponse.answer,
        model: modelResponse.model,
        usedFallback: modelResponse.usedFallback,
      })
    }

    await this.storeMessage({
      sessionId,
      schoolId: user.schoolId,
      role: 'assistant',
      content: modelResponse.answer,
    })

    return {
      sessionId,
      assistantType: context.assistantType,
      taskType: context.taskType,
      answer: modelResponse.answer,
      sources: context.sources,
      metadata: {
        usedModel: modelResponse.model,
        usedFallback: modelResponse.usedFallback,
      },
    }
  }

  async reviewSubmission(user: AuthenticatedUser, submissionId: string): Promise<AssignmentReviewResponse> {
    if (!['teacher', 'admin', 'super_admin'].includes(user.role)) {
      throw new ForbiddenException('Only teacher or admin roles can use assignment AI review.')
    }

    const { data, error } = await this.supabaseService.admin
      .from('assignment_submissions')
      .select(`
        id,
        assignment_id,
        student_id,
        submitted_at,
        submission_text,
        submission_url,
        status,
        student:profiles!student_id(full_name, email),
        assignment:assignments!assignment_id(
          id,
          title,
          instructions,
          max_score,
          teacher_id,
          subjects(name),
          classes(name)
        )
      `)
      .eq('id', submissionId)
      .maybeSingle()

    if (error || !data) {
      throw new NotFoundException('Submission not found.')
    }

    const submission = data as unknown as {
      id: string
      assignment_id: string
      student_id: string
      submitted_at: string | null
      submission_text: string | null
      submission_url: string | null
      status: string | null
      student: { full_name: string | null; email: string | null } | null
      assignment: {
        id: string
        title: string
        instructions: string | null
        max_score: number | null
        teacher_id: string | null
        subjects: { name: string | null } | null
        classes: { name: string | null } | null
      } | null
    }

    if (!submission.assignment) {
      throw new NotFoundException('Assignment details not found for this submission.')
    }

    if (user.role === 'teacher' && submission.assignment.teacher_id !== user.id) {
      throw new ForbiddenException('You can only review submissions for your own assignments.')
    }

    const maxScore = submission.assignment.max_score ?? 100
    const llmReview = await this.aiLlmService.generateAssignmentReview({
      submission: {
        assignmentTitle: submission.assignment.title,
        className: submission.assignment.classes?.name ?? undefined,
        subjectName: submission.assignment.subjects?.name ?? undefined,
        instructions: submission.assignment.instructions,
        maxScore,
        studentName: submission.student?.full_name ?? submission.student?.email ?? 'Student',
        submissionText: submission.submission_text,
        submissionUrl: submission.submission_url,
      },
    })

    return {
      submissionId: submission.id,
      assignmentId: submission.assignment_id,
      studentId: submission.student_id,
      studentName: submission.student?.full_name ?? submission.student?.email ?? 'Student',
      assignmentTitle: submission.assignment.title,
      subjectName: submission.assignment.subjects?.name ?? undefined,
      className: submission.assignment.classes?.name ?? undefined,
      submittedAt: submission.submitted_at,
      submissionText: submission.submission_text,
      submissionUrl: submission.submission_url,
      maxScore,
      summary: llmReview.review.summary,
      suggestedScore: llmReview.review.suggestedScore,
      scoreRationale: llmReview.review.scoreRationale,
      strengths: llmReview.review.strengths,
      improvements: llmReview.review.improvements,
      feedbackForStudent: llmReview.review.feedbackForStudent,
      rubricBreakdown: llmReview.review.rubricBreakdown,
      confidence: llmReview.review.confidence,
      metadata: {
        usedModel: llmReview.model,
        usedFallback: llmReview.usedFallback,
      },
    }
  }

  private buildCacheKey(
    user: AuthenticatedUser,
    request: AssistantRequest,
    context: RetrievedContext,
  ) {
    const normalizedPrompt = this.normalizePrompt(request.prompt)
    const fingerprint = JSON.stringify({
      schoolId: user.schoolId,
      assistantType: context.assistantType,
      taskType: context.taskType,
      prompt: normalizedPrompt,
      subjectId: request.subjectId ?? null,
      courseId: request.courseId ?? null,
      childId: request.childId ?? null,
      summaryBlocks: context.summaryBlocks,
      knowledgeBlocks: context.knowledgeBlocks ?? [],
    })

    return createHash('sha256').update(fingerprint).digest('hex')
  }

  private normalizePrompt(prompt: string) {
    return prompt.trim().replace(/\s+/g, ' ').toLowerCase()
  }

  private async getCachedResponse(cacheKey: string) {
    const { data, error } = await this.supabaseService.admin
      .from('ai_response_cache')
      .select('id, response_text, model, used_fallback, hit_count')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (error || !data) {
      return null
    }

    await this.supabaseService.admin
      .from('ai_response_cache')
      .update({
        hit_count: (data.hit_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)

    return {
      answer: data.response_text,
      model: data.model,
      usedFallback: data.used_fallback ?? false,
    }
  }

  private async storeCachedResponse(params: {
    cacheKey: string
    schoolId: string | null | undefined
    assistantType: AssistantResponse['assistantType']
    taskType: AssistantResponse['taskType']
    prompt: string
    answer: string
    model: string
    usedFallback: boolean
  }) {
    if (!params.schoolId) return

    const expiresAt = new Date(Date.now() + AiService.CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString()

    await this.supabaseService.admin
      .from('ai_response_cache')
      .upsert({
        school_id: params.schoolId,
        cache_key: params.cacheKey,
        assistant_type: params.assistantType,
        task_type: params.taskType,
        prompt_normalized: this.normalizePrompt(params.prompt),
        response_text: params.answer,
        model: params.model,
        used_fallback: params.usedFallback,
        hit_count: 0,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'cache_key' })
  }

  async listSessions(user: AuthenticatedUser) {
    const { data, error } = await this.supabaseService.admin
      .from('ai_sessions')
      .select('id, title, subject, created_at')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      throw new BadRequestException(error.message)
    }

    return data ?? []
  }

  async getSession(user: AuthenticatedUser, sessionId: string) {
    const { data: session, error: sessionError } = await this.supabaseService.admin
      .from('ai_sessions')
      .select('id, title, subject, created_at, school_id, student_id')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      throw new NotFoundException('AI session not found.')
    }

    if (session.student_id !== user.id && user.role !== 'super_admin') {
      throw new NotFoundException('AI session not found.')
    }

    const { data: messages, error: messageError } = await this.supabaseService.admin
      .from('ai_messages')
      .select('id, role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messageError) {
      throw new BadRequestException(messageError.message)
    }

    return {
      session,
      messages: messages ?? [],
    }
  }

  private async ensureSession(
    user: AuthenticatedUser,
    request: AssistantRequest,
    assistantType: string,
  ): Promise<string> {
    if (request.sessionId) {
      const { data: existing, error } = await this.supabaseService.admin
        .from('ai_sessions')
        .select('id, student_id')
        .eq('id', request.sessionId)
        .maybeSingle()

      if (error || !existing || (existing.student_id !== user.id && user.role !== 'super_admin')) {
        throw new NotFoundException('AI session not found.')
      }

      return existing.id
    }

    const title = request.prompt.trim().slice(0, 80)
    // Transitional note: current schema uses student_id, but we store the current user's profile id for all roles
    // until the role-aware AI schema migration is applied.
    const { data, error } = await this.supabaseService.admin
      .from('ai_sessions')
      .insert({
        school_id: user.schoolId,
        student_id: user.id,
        title,
        subject: assistantType,
      })
      .select('id')
      .single()

    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Unable to create AI session.')
    }

    return data.id
  }

  private async storeMessage(params: {
    sessionId: string
    schoolId: string | null | undefined
    role: 'user' | 'assistant'
    content: string
  }) {
    if (!params.schoolId) {
      throw new BadRequestException('AI assistant messages require a school-scoped session.')
    }

    const { error } = await this.supabaseService.admin.from('ai_messages').insert({
      session_id: params.sessionId,
      school_id: params.schoolId,
      role: params.role,
      content: params.content,
    })

    if (error) {
      throw new BadRequestException(error.message)
    }
  }
}
