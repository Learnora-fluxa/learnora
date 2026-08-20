import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import type { AssistantRequest, AssistantType, TaskType } from './ai.types.js'

@Injectable()
export class AiPolicyService {
  validatePrompt(prompt: string) {
    if (!prompt.trim()) {
      throw new BadRequestException('Prompt is required.')
    }

    if (prompt.trim().length < 3) {
      throw new BadRequestException('Prompt is too short.')
    }
  }

  resolveAssistantType(user: AuthenticatedUser): AssistantType {
    return user.role
  }

  resolveTaskType(prompt: string, assistantType: AssistantType): TaskType {
    const text = prompt.toLowerCase()

    if (assistantType === 'teacher') {
      if (text.includes('quiz') || text.includes('question')) return 'generate_quiz'
      if (text.includes('lesson') || text.includes('rubric') || text.includes('assignment')) return 'teaching_support'
    }

    if (assistantType === 'parent') {
      if (text.includes('report card') || text.includes('report')) return 'report_explanation'
      if (text.includes('how is my child') || text.includes('progress')) return 'summarize'
    }

    if (assistantType === 'admin' || assistantType === 'super_admin') {
      if (text.includes('summary') || text.includes('trend') || text.includes('risk')) return 'operational_summary'
    }

    if (text.includes('explain')) return 'explain'
    if (text.includes('summary') || text.includes('summarize')) return 'summarize'
    if (text.includes('recommend') || text.includes('suggest')) return 'recommend'
    if (text.includes('quiz') || text.includes('flashcard') || text.includes('practice')) return 'generate_quiz'
    if (text.includes('study')) return 'study_help'

    return 'general'
  }

  validateScope(user: AuthenticatedUser, request: AssistantRequest) {
    if (user.role === 'super_admin') {
      throw new ForbiddenException(
        'Super admin AI assistant mode is not enabled until the role-aware AI schema migration is applied.',
      )
    }

    if (!user.schoolId) {
      throw new ForbiddenException('Assistant access requires a school context.')
    }

    if (request.childId && user.role !== 'parent') {
      throw new ForbiddenException('Only parents can scope the assistant to a child.')
    }
  }
}
