import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { SupabaseJwtGuard } from '../auth/supabase-jwt.guard.js'
import { CurrentUser } from '../../common/decorators/current-user.decorator.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { PaymentsService } from './payments.service.js'

type InitializePaymentBody = {
  invoiceId: string
  callbackUrl?: string
}

@Controller('payments')
@UseGuards(SupabaseJwtGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('admin/fee-setup/meta')
  getAdminFeeSetupMeta(@CurrentUser() user: AuthenticatedUser | undefined) {
    return this.paymentsService.getAdminFeeSetupMeta(user!)
  }

  @Get('admin/fee-setup/structure')
  getAdminFeeSetupStructure(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('classId') classId: string,
    @Query('termId') termId: string,
  ) {
    return this.paymentsService.getAdminFeeSetupStructure(user!, classId, termId)
  }

  @Post('admin/fee-setup/publish')
  publishAdminFeeSetup(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: {
      classId?: string
      termId?: string
      dueDate?: string | null
      items?: Array<{ id?: string; label?: string; amount?: string | number; mandatory?: boolean }>
    },
  ) {
    return this.paymentsService.publishAdminFeeSetup(user!, body)
  }

  @Patch('admin/settings/bank')
  updateAdminBankSettings(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { bankName?: string; accountName?: string; accountNumber?: string },
  ) {
    return this.paymentsService.updateAdminBankSettings(user!, body)
  }

  @Patch('admin/settings/paystack')
  updateAdminPaystackSettings(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { subaccountCode?: string },
  ) {
    return this.paymentsService.updateAdminPaystackSettings(user!, body)
  }

  @Get('admin/fee-collection')
  getAdminFeeCollection(@CurrentUser() user: AuthenticatedUser | undefined) {
    return this.paymentsService.getAdminFeeCollection(user!)
  }

  @Get('admin/finance-overview')
  getAdminFinanceOverview(@CurrentUser() user: AuthenticatedUser | undefined) {
    return this.paymentsService.getAdminFinanceOverview(user!)
  }

  @Post('admin/fee-collection/offline')
  recordAdminOfflineCollection(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { studentId?: string; amount?: number; note?: string; method?: string },
  ) {
    return this.paymentsService.recordAdminOfflineCollection(user!, body)
  }

  @Post('admin/fee-collection/students/:studentId/confirm-pending')
  confirmAdminPendingOffline(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('studentId') studentId: string,
  ) {
    return this.paymentsService.confirmAdminPendingOffline(user!, studentId)
  }

  @Get('parent/fees')
  getParentFees(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('childId') childId?: string,
  ) {
    return this.paymentsService.getParentFees(user!, { childId })
  }

  @Get('parent/payment-context')
  getParentPaymentContext(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('childId') childId?: string,
  ) {
    return this.paymentsService.getParentPaymentContext(user!, { childId })
  }

  @Post('parent/initialize')
  initializeParentPayment(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { childId?: string | null; amount?: number; reference?: string; method?: string },
  ) {
    return this.paymentsService.initializeParentPayment(user!, body)
  }

  @Post('parent/offline')
  submitParentOffline(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { childId?: string | null },
  ) {
    return this.paymentsService.submitParentOffline(user!, body)
  }

  @Post('parent/record')
  recordParentPayment(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { childId?: string | null; amount?: number; reference?: string; paidAt?: string; method?: string },
  ) {
    return this.paymentsService.recordParentPayment(user!, body)
  }

  @Post('initialize')
  initialize(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: InitializePaymentBody,
  ) {
    return {
      message: 'Payment initialization endpoint scaffolded',
      owner: 'payments',
      user,
      invoiceId: body.invoiceId,
      callbackUrl: body.callbackUrl ?? null,
    }
  }

  @Post('invoices/:invoiceId/resend-receipt')
  resendReceipt(@Param('invoiceId') invoiceId: string) {
    return {
      message: 'Receipt resend endpoint scaffolded',
      invoiceId,
    }
  }

  @Post('platform/schools/:schoolId/confirm-subscription')
  confirmSchoolSubscription(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('schoolId') schoolId: string,
    @Body() body: {
      amount?: number
      paymentMethod?: string
      reference?: string
      paidAt?: string
      notes?: string
      adminName?: string
      adminEmail?: string
      adminPhone?: string
    },
  ) {
    return this.paymentsService.confirmSchoolSubscription(user!, schoolId, body)
  }

  @Get('super-admin/settlements/overview')
  getSuperAdminSettlementOverview(@CurrentUser() user: AuthenticatedUser | undefined) {
    return this.paymentsService.getSuperAdminSettlementOverview(user!)
  }

  @Get('super-admin/settlements')
  listSuperAdminSettlements(@CurrentUser() user: AuthenticatedUser | undefined) {
    return this.paymentsService.listSuperAdminSettlements(user!)
  }

  @Post('super-admin/settlements')
  createSettlement(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: { schoolId?: string; periodStart?: string | null; periodEnd?: string | null; notes?: string },
  ) {
    return this.paymentsService.createSettlement(user!, body)
  }

  @Post('super-admin/settlements/:settlementId/approve')
  approveSettlement(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('settlementId') settlementId: string,
  ) {
    return this.paymentsService.approveSettlement(user!, settlementId)
  }

  @Post('super-admin/settlements/:settlementId/mark-paid')
  markSettlementPaid(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('settlementId') settlementId: string,
    @Body() body: { payoutReference?: string; paidAt?: string; notes?: string },
  ) {
    return this.paymentsService.markSettlementPaid(user!, settlementId, body)
  }
}
