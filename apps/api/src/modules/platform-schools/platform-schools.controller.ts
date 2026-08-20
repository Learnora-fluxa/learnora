import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard.js'
import { PlatformSchoolsService } from './platform-schools.service.js'

@Controller('platform/schools')
@UseGuards(SupabaseJwtGuard)
export class PlatformSchoolsController {
  constructor(private readonly platformSchoolsService: PlatformSchoolsService) {}

  @Patch(':schoolId/plan')
  updatePlan(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('schoolId') schoolId: string,
    @Body() body: { plan?: string },
  ) {
    return this.platformSchoolsService.updatePlan(user!, schoolId, body)
  }

  @Patch(':schoolId/rate')
  updateRate(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('schoolId') schoolId: string,
    @Body() body: { rate?: number; reason?: string },
  ) {
    return this.platformSchoolsService.updateRate(user!, schoolId, body)
  }

  @Post(':schoolId/extend-trial')
  extendTrial(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('schoolId') schoolId: string,
    @Body() body: { days?: number },
  ) {
    return this.platformSchoolsService.extendTrial(user!, schoolId, body)
  }

  @Post(':schoolId/generate-invoice')
  generateInvoice(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('schoolId') schoolId: string,
    @Body() body: { termLabel?: string; studentCount?: number; dueDate?: string | null },
  ) {
    return this.platformSchoolsService.generateInvoice(user!, schoolId, body)
  }

  @Post(':schoolId/reset-admin-password')
  resetAdminPassword(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('schoolId') schoolId: string,
    @Body() body: { redirectTo?: string },
  ) {
    return this.platformSchoolsService.resetAdminPassword(user!, schoolId, body)
  }

  @Post(':schoolId/impersonate-admin')
  impersonateAdmin(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('schoolId') schoolId: string,
    @Body() body: { redirectTo?: string },
  ) {
    return this.platformSchoolsService.impersonateAdmin(user!, schoolId, body)
  }

  @Post(':schoolId/suspend')
  suspendSchool(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('schoolId') schoolId: string,
    @Body() body: { reason?: string },
  ) {
    return this.platformSchoolsService.suspendSchool(user!, schoolId, body)
  }

  @Delete(':schoolId')
  deleteSchool(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('schoolId') schoolId: string,
  ) {
    return this.platformSchoolsService.deleteSchool(user!, schoolId)
  }
}
