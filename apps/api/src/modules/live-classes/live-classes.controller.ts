import { Controller, Param, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator.js'
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'

@Controller('live-sessions')
export class LiveClassesController {
  @Post(':sessionId/start')
  @UseGuards(SupabaseJwtGuard)
  start(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return {
      message: 'Live class start endpoint scaffolded',
      sessionId,
      user,
    }
  }

  @Post(':sessionId/join')
  @UseGuards(SupabaseJwtGuard)
  join(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    return {
      message: 'Live class join endpoint scaffolded',
      sessionId,
      user,
    }
  }
}
