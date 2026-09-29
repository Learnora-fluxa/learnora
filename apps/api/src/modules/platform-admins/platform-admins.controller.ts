import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard.js'
import { PlatformAdminsService } from './platform-admins.service.js'
import type { CreateSuperAdminBody } from './platform-admins.types.js'

@Controller('platform/super-admins')
export class PlatformAdminsController {
  constructor(private readonly platformAdminsService: PlatformAdminsService) {}

  /**
   * POST /api/platform/super-admins
   * An existing super admin creates another super admin.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SupabaseJwtGuard)
  createSuperAdmin(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: CreateSuperAdminBody,
  ) {
    return this.platformAdminsService.createSuperAdmin(user!, body)
  }

  /**
   * POST /api/platform/super-admins/bootstrap
   * Creates the very first super admin. Requires the
   * `x-bootstrap-secret` header to match SUPER_ADMIN_BOOTSTRAP_SECRET and
   * only works while no super admin exists yet.
   */
  @Post('bootstrap')
  @HttpCode(HttpStatus.CREATED)
  bootstrapSuperAdmin(
    @Headers('x-bootstrap-secret') secret: string | undefined,
    @Body() body: CreateSuperAdminBody,
  ) {
    return this.platformAdminsService.bootstrapSuperAdmin(secret, body)
  }
}
