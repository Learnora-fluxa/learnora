import { Controller, Get, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator.js'
import { SupabaseJwtGuard } from './supabase-jwt.guard.js'
import type { AuthenticatedUser } from './auth.types.js'

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(SupabaseJwtGuard)
  getMe(@CurrentUser() user: AuthenticatedUser | undefined) {
    return { user }
  }
}
