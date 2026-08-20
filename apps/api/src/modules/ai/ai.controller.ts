import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator.js'
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { AiService } from './ai.service.js'
import type { AssistantRequest } from './ai.types.js'

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('assistant')
  @UseGuards(SupabaseJwtGuard)
  async assistant(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: AssistantRequest,
  ) {
    return this.aiService.respond(user!, body)
  }

  @Post('review/submission')
  @UseGuards(SupabaseJwtGuard)
  async reviewSubmission(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { submissionId?: string },
  ) {
    if (!body.submissionId) {
      throw new BadRequestException('submissionId is required')
    }

    return this.aiService.reviewSubmission(user!, body.submissionId)
  }

  @Get('sessions')
  @UseGuards(SupabaseJwtGuard)
  async listSessions(@CurrentUser() user: AuthenticatedUser | undefined) {
    return this.aiService.listSessions(user!)
  }

  @Get('sessions/:sessionId')
  @UseGuards(SupabaseJwtGuard)
  async getSession(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('sessionId') sessionId: string,
  ) {
    return this.aiService.getSession(user!, sessionId)
  }
}
