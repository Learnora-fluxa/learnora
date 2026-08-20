import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AssignmentReviewResponse, RetrievedContext } from './ai.types.js'

@Injectable()
export class AiLlmService {
  constructor(private readonly configService: ConfigService) {}

  async generateResponse(params: {
    prompt: string
    context: RetrievedContext
    userName?: string
  }): Promise<{ answer: string; model: string; usedFallback: boolean }> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')
    const model = this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-5-mini'

    if (!apiKey) {
      return {
        answer: this.buildFallbackAnswer(params.prompt, params.context),
        model: 'fallback-local',
        usedFallback: true,
      }
    }

    const systemPrompt = this.buildSystemPrompt(params.context)
    const thinContentRule = this.buildThinContentRule(params.context)
    const userPrompt = [
      `User prompt: ${params.prompt}`,
      '',
      'Approved context:',
      ...params.context.summaryBlocks.map((block) => `- ${block}`),
      ...(params.context.knowledgeBlocks?.length
        ? [
            '',
            'Approved instructional context:',
            ...params.context.knowledgeBlocks.map((block) => `- ${block}`),
          ]
        : []),
      '',
      'Rules:',
      '- Answer the user directly in the first sentence. Do not start with "I cannot tell from this message alone" when the authenticated role is present in context.',
      '- If the user asks what role they are, state the authenticated role clearly and directly.',
      '- Use the approved context as your grounding source for school-specific facts and scope.',
      '- You may use general educational knowledge to explain concepts or draft teaching materials when the requested subject/course scope is present.',
      thinContentRule,
      '- Do not invent grades, attendance, fees, or internal decisions.',
      '- If the context is incomplete, say so clearly and give the safest helpful answer possible.',
      '- For teacher quiz requests, provide a practical draft with a title, instructions, and 5-10 questions with answers or marking guide when possible.',
      '- Responses should be straight, clear, and comprehensive.',
      '- Keep the tone supportive and school-appropriate.',
    ].join('\n')

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: systemPrompt }],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: userPrompt }],
          },
        ],
      }),
    })

    if (!response.ok) {
      return {
        answer: this.buildFallbackAnswer(params.prompt, params.context),
        model,
        usedFallback: true,
      }
    }

    const payload = (await response.json()) as {
      output_text?: string
      output?: Array<{
        type?: string
        content?: Array<
          | { type?: string; text?: string }
          | { type?: string; refusal?: string }
        >
      }>
    }
    const text = payload.output_text?.trim() || this.extractOutputText(payload)

    return {
      answer: text || this.buildFallbackAnswer(params.prompt, params.context),
      model,
      usedFallback: !text,
    }
  }

  async generateAssignmentReview(params: {
    submission: {
      assignmentTitle: string
      className?: string
      subjectName?: string
      instructions?: string | null
      maxScore: number
      studentName: string
      submissionText?: string | null
      submissionUrl?: string | null
    }
  }): Promise<{
    review: Pick<
      AssignmentReviewResponse,
      | 'summary'
      | 'suggestedScore'
      | 'scoreRationale'
      | 'strengths'
      | 'improvements'
      | 'feedbackForStudent'
      | 'rubricBreakdown'
      | 'confidence'
    >
    model: string
    usedFallback: boolean
  }> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')
    const model = this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-5-mini'

    if (!apiKey) {
      return {
        review: this.buildFallbackAssignmentReview(params.submission),
        model: 'fallback-local',
        usedFallback: true,
      }
    }

    const prompt = [
      'You are Learnora AI assisting a teacher with grading one student assignment.',
      'Return strict JSON only with no markdown fences.',
      '',
      'Required JSON shape:',
      JSON.stringify({
        summary: 'string',
        suggestedScore: 0,
        scoreRationale: 'string',
        strengths: ['string'],
        improvements: ['string'],
        feedbackForStudent: 'string',
        rubricBreakdown: [
          { criterion: 'Understanding', score: 0, maxScore: 0, comment: 'string' },
        ],
        confidence: 'low',
      }),
      '',
      'Rules:',
      '- Base the review only on the assignment brief and the student submission provided.',
      '- Do not invent facts that are not visible in the submission.',
      '- Keep suggestedScore between 0 and the assignment max score.',
      '- Provide 3-5 rubric criteria that add up exactly to the assignment max score.',
      '- Keep feedbackForStudent constructive, direct, and school-appropriate.',
      '- If the submission is too thin to assess confidently, lower confidence and say that clearly.',
      '',
      `Assignment title: ${params.submission.assignmentTitle}`,
      `Class: ${params.submission.className ?? 'Not provided'}`,
      `Subject: ${params.submission.subjectName ?? 'Not provided'}`,
      `Student: ${params.submission.studentName}`,
      `Max score: ${params.submission.maxScore}`,
      `Instructions: ${params.submission.instructions?.trim() || 'No instructions provided.'}`,
      `Submission text: ${params.submission.submissionText?.trim() || 'No text submission provided.'}`,
      `Submission file URL: ${params.submission.submissionUrl?.trim() || 'No file submission provided.'}`,
    ].join('\n')

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'user',
            content: [{ type: 'input_text', text: prompt }],
          },
        ],
      }),
    })

    if (!response.ok) {
      return {
        review: this.buildFallbackAssignmentReview(params.submission),
        model,
        usedFallback: true,
      }
    }

    const payload = (await response.json()) as {
      output_text?: string
      output?: Array<{
        type?: string
        content?: Array<
          | { type?: string; text?: string }
          | { type?: string; refusal?: string }
        >
      }>
    }
    const text = payload.output_text?.trim() || this.extractOutputText(payload)
    const parsed = this.parseAssignmentReviewJson(text, params.submission.maxScore)

    if (!parsed) {
      return {
        review: this.buildFallbackAssignmentReview(params.submission),
        model,
        usedFallback: true,
      }
    }

    return {
      review: parsed,
      model,
      usedFallback: false,
    }
  }

  private buildSystemPrompt(context: RetrievedContext): string {
    const roleLabel = `${context.assistantType} assistant`
    const teacherScopeRule = context.assistantType === 'teacher' && context.requestedSubjectLabel
      ? [
          `Current teaching subject scope: ${context.requestedSubjectLabel}.`,
          context.requestedCourseLabel ? `Current course scope: ${context.requestedCourseLabel}.` : null,
          'If the teacher asks a question that is clearly outside this teaching scope, do not answer the unrelated question.',
          'Instead, briefly say it is outside the current teaching scope and invite a follow-up related to the scoped subject, course, assessment, rubric, or lesson workflow.',
          'Examples of outside-scope prompts include unrelated celebrity, sports, entertainment, or general trivia questions.',
        ].filter(Boolean).join(' ')
      : ''

    return [
      `You are the Learnora AI ${roleLabel}.`,
      `Current task type: ${context.taskType}.`,
      'You are role-aware, tenant-scoped, and safety-bounded.',
      'You know the authenticated account role from context and should state it plainly when asked.',
      'Never disclose data outside the current user scope.',
      'Never fabricate school records or official academic decisions.',
      teacherScopeRule,
      'Be concise, practical, and supportive.',
    ].join(' ')
  }

  private buildThinContentRule(context: RetrievedContext) {
    if (context.assistantType === 'teacher') {
      return '- When school-authored lesson content is thin, say that the response is a teacher-support draft based on the scoped topic.'
    }

    if (context.assistantType === 'student') {
      return '- When school-authored lesson content is thin, say that the response is a study-support explanation based on the scoped assignment or topic.'
    }

    if (context.assistantType === 'parent') {
      return '- When school-authored lesson content is thin, say that the response is a parent-support explanation based on the approved child context.'
    }

    return '- When school-authored operational content is thin, say that the response is a scoped support draft based on the approved context.'
  }

  private extractOutputText(payload: {
    output?: Array<{
      type?: string
      content?: Array<
        | { type?: string; text?: string }
        | { type?: string; refusal?: string }
      >
    }>
  }): string {
    const chunks: string[] = []

    for (const item of payload.output ?? []) {
      for (const content of item.content ?? []) {
        if (content.type === 'output_text' && 'text' in content && typeof content.text === 'string') {
          chunks.push(content.text)
        }
      }
    }

    return chunks.join('\n').trim()
  }

  private buildFallbackAnswer(prompt: string, context: RetrievedContext): string {
    const intro = {
      student: 'Here is a grounded study response based on your Learnora context.',
      teacher: 'Here is a grounded teaching support response based on your Learnora context.',
      parent: 'Here is a grounded parent-friendly response based on your Learnora context.',
      admin: 'Here is a grounded school operations response based on your Learnora context.',
      super_admin: 'Here is a grounded platform response based on your Learnora context.',
    }[context.assistantType]

    return [
      intro,
      '',
      `Your request: ${prompt}`,
      '',
      'What I can confirm from approved data:',
      ...context.summaryBlocks.map((block) => `- ${block}`),
      '',
      'If you want, ask a more specific follow-up and I will narrow the answer to one topic, child, class, or workflow.',
    ].join('\n')
  }

  private parseAssignmentReviewJson(
    raw: string,
    maxScore: number,
  ): Pick<
    AssignmentReviewResponse,
    | 'summary'
    | 'suggestedScore'
    | 'scoreRationale'
    | 'strengths'
    | 'improvements'
    | 'feedbackForStudent'
    | 'rubricBreakdown'
    | 'confidence'
  > | null {
    if (!raw) return null

    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    try {
      const parsed = JSON.parse(cleaned) as {
        summary?: unknown
        suggestedScore?: unknown
        scoreRationale?: unknown
        strengths?: unknown
        improvements?: unknown
        feedbackForStudent?: unknown
        rubricBreakdown?: unknown
        confidence?: unknown
      }

      const rubricBreakdown = Array.isArray(parsed.rubricBreakdown)
        ? parsed.rubricBreakdown
            .map((item) => {
              const row = item as Record<string, unknown>
              const score = typeof row.score === 'number' ? row.score : Number(row.score ?? 0)
              const criterionMax = typeof row.maxScore === 'number' ? row.maxScore : Number(row.maxScore ?? 0)

              return {
                criterion: typeof row.criterion === 'string' ? row.criterion : 'Criterion',
                score: Number.isFinite(score) ? score : 0,
                maxScore: Number.isFinite(criterionMax) ? criterionMax : 0,
                comment: typeof row.comment === 'string' ? row.comment : '',
              }
            })
            .filter((item) => item.maxScore >= 0)
        : []

      const rubricMax = rubricBreakdown.reduce((sum, item) => sum + item.maxScore, 0)
      const normalizedRubric = rubricBreakdown.length > 0
        ? this.normalizeRubricBreakdown(rubricBreakdown, maxScore, rubricMax)
        : this.defaultRubric(maxScore)

      const suggestedScoreRaw =
        typeof parsed.suggestedScore === 'number'
          ? parsed.suggestedScore
          : Number(parsed.suggestedScore ?? 0)

      return {
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'AI review generated for this submission.',
        suggestedScore: this.clampScore(suggestedScoreRaw, maxScore),
        scoreRationale: typeof parsed.scoreRationale === 'string' ? parsed.scoreRationale : 'Score based on visible submission quality and assignment fit.',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter((item): item is string => typeof item === 'string').slice(0, 5) : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements.filter((item): item is string => typeof item === 'string').slice(0, 5) : [],
        feedbackForStudent: typeof parsed.feedbackForStudent === 'string' ? parsed.feedbackForStudent : 'Review the teacher notes and revise your answer for clarity and completeness.',
        rubricBreakdown: normalizedRubric,
        confidence: parsed.confidence === 'low' || parsed.confidence === 'medium' || parsed.confidence === 'high'
          ? parsed.confidence
          : 'medium',
      }
    } catch {
      return null
    }
  }

  private normalizeRubricBreakdown(
    rubric: Array<{ criterion: string; score: number; maxScore: number; comment: string }>,
    maxScore: number,
    rubricMax: number,
  ) {
    if (rubricMax === maxScore) {
      return rubric.map((item) => ({
        ...item,
        score: this.clampScore(item.score, item.maxScore),
      }))
    }

    const scaled = rubric.map((item) => ({
      ...item,
      maxScore: Math.max(1, Math.round((item.maxScore / Math.max(rubricMax, 1)) * maxScore)),
    }))

    let difference = maxScore - scaled.reduce((sum, item) => sum + item.maxScore, 0)
    let index = 0
    while (difference !== 0 && scaled.length > 0) {
      const target = scaled[index % scaled.length]
      if (difference > 0) {
        target.maxScore += 1
        difference -= 1
      } else if (target.maxScore > 1) {
        target.maxScore -= 1
        difference += 1
      }
      index += 1
      if (index > scaled.length * 10) break
    }

    return scaled.map((item) => ({
      ...item,
      score: this.clampScore(item.score, item.maxScore),
    }))
  }

  private defaultRubric(maxScore: number) {
    const buckets = [0.35, 0.25, 0.2, 0.2]
    const labels = ['Understanding', 'Accuracy', 'Clarity', 'Completeness']
    const base = buckets.map((ratio, index) => ({
      criterion: labels[index] ?? `Criterion ${index + 1}`,
      maxScore: Math.max(1, Math.round(maxScore * ratio)),
      score: 0,
      comment: '',
    }))

    let difference = maxScore - base.reduce((sum, item) => sum + item.maxScore, 0)
    let index = 0
    while (difference !== 0) {
      base[index % base.length].maxScore += difference > 0 ? 1 : -1
      difference += difference > 0 ? -1 : 1
      index += 1
    }

    return base
  }

  private clampScore(score: number, maxScore: number) {
    if (!Number.isFinite(score)) return 0
    return Math.max(0, Math.min(maxScore, Math.round(score * 100) / 100))
  }

  private buildFallbackAssignmentReview(params: {
    assignmentTitle: string
    instructions?: string | null
    maxScore: number
    submissionText?: string | null
  }): Pick<
    AssignmentReviewResponse,
    | 'summary'
    | 'suggestedScore'
    | 'scoreRationale'
    | 'strengths'
    | 'improvements'
    | 'feedbackForStudent'
    | 'rubricBreakdown'
    | 'confidence'
  > {
    const text = params.submissionText?.trim() ?? ''
    const hasEnoughContent = text.length >= 120
    const suggestedScore = hasEnoughContent
      ? Math.round(params.maxScore * 0.65)
      : Math.round(params.maxScore * 0.3)

    return {
      summary: hasEnoughContent
        ? `This is a grounded draft review for "${params.assignmentTitle}" based on the visible submission text.`
        : `The submission for "${params.assignmentTitle}" appears too thin for a confident score, so this is only a cautious draft review.`,
      suggestedScore,
      scoreRationale: hasEnoughContent
        ? 'The submission shows enough visible content for a provisional teacher review, but it still needs teacher judgment before grading.'
        : 'There is limited visible content, so the suggested score is conservative and should be reviewed against the original assignment requirements.',
      strengths: hasEnoughContent
        ? ['The student provided a written response.', 'There is enough visible material for a first-pass review.']
        : ['A submission record exists for this assignment.'],
      improvements: hasEnoughContent
        ? ['Check alignment with the exact instructions.', 'Verify accuracy, detail, and completeness before publishing the grade.']
        : ['Ask the student to provide a fuller written response or attachment.', 'Compare the submission against the assignment brief before grading.'],
      feedbackForStudent: hasEnoughContent
        ? 'You made a clear attempt. To improve your grade, strengthen your explanation, add more precise details from the lesson, and make sure each part of the task is fully answered.'
        : 'Your submission appears incomplete from the visible content. Add a fuller explanation, cover each part of the task clearly, and resubmit if your teacher allows revisions.',
      rubricBreakdown: this.defaultRubric(params.maxScore).map((item, index) => ({
        ...item,
        score: index === 0 ? Math.min(item.maxScore, Math.round(suggestedScore * 0.4)) : Math.min(item.maxScore, Math.round(suggestedScore / 4)),
        comment: 'Draft fallback criterion for teacher review.',
      })),
      confidence: hasEnoughContent ? 'medium' : 'low',
    }
  }
}
