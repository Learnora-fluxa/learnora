import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard.js'
import { SchoolSubscriptionService } from './school-subscription.service.js'

@Controller('school-subscription')
@UseGuards(SupabaseJwtGuard)
export class SchoolSubscriptionController {
  constructor(private readonly schoolSubscriptionService: SchoolSubscriptionService) {}

  // ── School admin ──

  @Get()
  getOverview(@CurrentUser() user: AuthenticatedUser | undefined) {
    return this.schoolSubscriptionService.getOverview(user!)
  }

  @Post('bank-transfer')
  submitBankTransfer(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { studentCount?: number; reference?: string; paidAt?: string; notes?: string },
  ) {
    return this.schoolSubscriptionService.submitBankTransfer(user!, body)
  }

  @Post('paystack/initialize')
  initializePaystack(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { studentCount?: number; callbackUrl?: string },
  ) {
    return this.schoolSubscriptionService.initializePaystack(user!, body)
  }

  @Post('paystack/verify')
  verifyPaystack(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { reference?: string },
  ) {
    return this.schoolSubscriptionService.verifyPaystack(user!, body)
  }

  // ── Super admin ──

  @Get('pending-transfers')
  listPendingTransfers(@CurrentUser() user: AuthenticatedUser | undefined) {
    return this.schoolSubscriptionService.listPendingTransfers(user!)
  }

  @Post('payments/:paymentId/approve')
  approveTransfer(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('paymentId') paymentId: string,
  ) {
    return this.schoolSubscriptionService.approveTransfer(user!, paymentId)
  }

  @Post('payments/:paymentId/reject')
  rejectTransfer(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('paymentId') paymentId: string,
    @Body() body: { reason?: string },
  ) {
    return this.schoolSubscriptionService.rejectTransfer(user!, paymentId, body)
  }
}
