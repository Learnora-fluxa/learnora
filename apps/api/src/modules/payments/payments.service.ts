import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { SupabaseService } from '../../providers/supabase/supabase.service.js'

type ConfirmSchoolPaymentInput = {
  amount?: number
  paymentMethod?: string
  reference?: string
  paidAt?: string
  notes?: string
  adminName?: string
  adminEmail?: string
  adminPhone?: string
}

type FeeSetupItemInput = {
  id?: string
  label?: string
  amount?: string | number
  mandatory?: boolean
}

type PublishFeeSetupInput = {
  classId?: string
  termId?: string
  dueDate?: string | null
  items?: FeeSetupItemInput[]
}

type AdminOfflineCollectionInput = {
  studentId?: string
  amount?: number
  note?: string
  method?: string
}

type ParentPaymentContextInput = {
  childId?: string | null
}

type ParentRecordPaymentInput = {
  childId?: string | null
  amount?: number
  reference?: string
  paidAt?: string
  method?: string
}

type SettlementCreateInput = {
  schoolId?: string
  periodStart?: string | null
  periodEnd?: string | null
  notes?: string
}

type SettlementMarkPaidInput = {
  payoutReference?: string
  paidAt?: string
  notes?: string
}

type SchoolRow = {
  id: string
  name: string
  code: string
  email: string | null
  phone: string | null
  subscription_plan: string | null
  subscription_status: string | null
  student_count: number | null
}

type InvoiceRow = {
  id: string
  amount: number
  paid_amount: number | null
  status: string | null
  due_date: string | null
  created_at: string | null
  fee_structure_id: string | null
}

type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' | 'Pending'

type PlatformPaymentConfig = {
  paystackPublicKey: string
  processorFeeBps: number
  platformFeeBps: number
}

type PaystackInitializeResponse = {
  status: boolean
  message: string
  data?: {
    authorization_url?: string
    access_code?: string
    reference?: string
  }
}

type PaymentAmountBreakdown = {
  grossAmount: number
  processorFeeAmount: number
  platformFeeAmount: number
  netSchoolAmount: number
}

type PaymentAllocation = {
  invoiceId: string
  invoiceAmount: number
  allocatedAmount: number
  paymentId: string
  paymentReference: string
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  private requireRole(user: AuthenticatedUser, allowedRoles: AuthenticatedUser['role'][]) {
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have access to this payment action.')
    }
  }

  private requireSchoolId(user: AuthenticatedUser) {
    if (!user.schoolId) {
      throw new BadRequestException('No school is linked to the current user.')
    }
    return user.schoolId
  }

  private deriveStudentPaymentStatus(expected: number, paid: number, hasPendingOffline: boolean): PaymentStatus {
    if (hasPendingOffline) return 'Pending'
    if (expected <= 0) return 'Unpaid'
    if (paid >= expected) return 'Paid'
    if (paid > 0) return 'Partial'
    return 'Unpaid'
  }

  private roundMoney(value: number) {
    return Number(value.toFixed(2))
  }

  private isMissingRelationError(message?: string | null, relation?: string) {
    if (!message) return false
    return relation
      ? message.includes(`'public.${relation}'`) || message.includes(`relation "${relation}" does not exist`)
      : message.includes("in the schema cache") || message.includes('does not exist')
  }

  private throwSettlementMigrationRequired() {
    throw new BadRequestException(
      'Learnora settlement features require database migration 010_learnora_settlement_ledger.sql to be applied.',
    )
  }

  private async getPlatformPaymentConfig(): Promise<PlatformPaymentConfig> {
    const { data, error } = await this.supabaseService.admin
      .from('platform_config')
      .select('paystack_public_key, payment_processor_fee_bps, platform_fee_bps')
      .maybeSingle()

    if (error && !error.message.includes('paystack_public_key')) {
      throw new BadRequestException(error.message)
    }

    const row = (error?.message.includes('paystack_public_key') ? null : data) as {
      paystack_public_key: string | null
      payment_processor_fee_bps: number | null
      platform_fee_bps: number | null
    } | null

    return {
      paystackPublicKey: this.configService.get<string>('PAYSTACK_PUBLIC_KEY') ?? row?.paystack_public_key ?? '',
      processorFeeBps: Number(row?.payment_processor_fee_bps ?? 150),
      platformFeeBps: Number(row?.platform_fee_bps ?? 300),
    }
  }

  private calculatePaymentAmounts(amount: number, config: PlatformPaymentConfig): PaymentAmountBreakdown {
    const grossAmount = this.roundMoney(amount)
    const processorFeeAmount = this.roundMoney((grossAmount * config.processorFeeBps) / 10_000)
    const platformFeeAmount = this.roundMoney((grossAmount * config.platformFeeBps) / 10_000)
    const netSchoolAmount = this.roundMoney(Math.max(grossAmount - processorFeeAmount - platformFeeAmount, 0))

    return {
      grossAmount,
      processorFeeAmount,
      platformFeeAmount,
      netSchoolAmount,
    }
  }

  private getPaystackSecretKey() {
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY')?.trim() ?? ''
    if (!secret) {
      throw new BadRequestException('PAYSTACK_SECRET_KEY is not configured on the API server.')
    }
    return secret
  }

  private getAppBaseUrl() {
    const configured = (this.configService.get<string>('APP_BASE_URL') ?? 'http://localhost:5173').trim()

    try {
      const url = new URL(configured)
      if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.protocol === 'https:') {
        url.protocol = 'http:'
      }
      return url.toString().replace(/\/$/, '')
    } catch {
      return configured.replace(/\/$/, '')
    }
  }

  private getApiPublicBaseUrl() {
    const configured = this.configService.get<string>('API_PUBLIC_BASE_URL')
    if (configured) {
      const normalized = configured.trim().replace(/\/$/, '')
      return normalized.endsWith('/api') ? normalized : `${normalized}/api`
    }

    const port = this.configService.get<string>('API_PORT') ?? '3000'
    return `http://localhost:${port}/api`
  }

  private getParentPaymentSuccessUrl(reference?: string) {
    const url = new URL('/parent/payment-success', this.getAppBaseUrl())
    if (reference) {
      url.searchParams.set('reference', reference)
    }
    return url.toString()
  }

  private getPaystackCallbackUrl(reference?: string) {
    const url = new URL('payments/callback/paystack', `${this.getApiPublicBaseUrl()}/`)
    if (reference) {
      url.searchParams.set('reference', reference)
    }
    return url.toString()
  }

  private normalizeQueryParam(value?: string | string[] | null) {
    if (Array.isArray(value)) {
      return typeof value[0] === 'string' ? value[0].trim() : ''
    }
    return typeof value === 'string' ? value.trim() : ''
  }

  private async initializePaystackHostedPayment(params: {
    email: string
    amountKobo: number
    reference: string
    callbackUrl: string
    metadata: Record<string, unknown>
  }) {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getPaystackSecretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
        currency: 'NGN',
      }),
    })

    const payload = await response.json().catch(() => ({})) as PaystackInitializeResponse

    if (!response.ok || !payload?.status || !payload.data?.authorization_url) {
      throw new BadRequestException(
        payload?.message || 'Could not initialize Paystack hosted payment.',
      )
    }

    return {
      authorizationUrl: payload.data.authorization_url,
      accessCode: payload.data.access_code ?? '',
      reference: payload.data.reference ?? params.reference,
    }
  }

  private async writeLedgerEntries(
    entries: Array<{
      schoolId?: string | null
      paymentTransactionId?: string | null
      settlementId?: string | null
      entryGroup: string
      accountCode: string
      direction: 'debit' | 'credit'
      amount: number
      description: string
    }>,
  ) {
    if (!entries.length) return

    const { error } = await this.supabaseService.admin
      .from('payment_ledger_entries')
      .insert(
        entries.map(entry => ({
          school_id: entry.schoolId ?? null,
          payment_transaction_id: entry.paymentTransactionId ?? null,
          settlement_id: entry.settlementId ?? null,
          entry_group: entry.entryGroup,
          account_code: entry.accountCode,
          direction: entry.direction,
          amount: this.roundMoney(entry.amount),
          description: entry.description,
        })),
      )

    if (error) {
      if (this.isMissingRelationError(error.message, 'payment_ledger_entries')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(error.message)
    }
  }

  private async createSuccessfulPaymentLedger(
    schoolId: string,
    paymentTransactionId: string,
    amounts: PaymentAmountBreakdown,
    reference: string,
  ) {
    const entryGroup = `payment:${paymentTransactionId}`
    const entries: Array<{
      schoolId?: string | null
      paymentTransactionId?: string | null
      settlementId?: string | null
      entryGroup: string
      accountCode: string
      direction: 'debit' | 'credit'
      amount: number
      description: string
    }> = [
      {
        schoolId,
        paymentTransactionId,
        entryGroup,
        accountCode: 'cash_clearing',
        direction: 'debit',
        amount: amounts.grossAmount,
        description: `Parent payment received ${reference}`,
      },
      {
        schoolId,
        paymentTransactionId,
        entryGroup,
        accountCode: 'school_payable',
        direction: 'credit',
        amount: amounts.netSchoolAmount,
        description: `Liability to school for ${reference}`,
      },
      {
        schoolId,
        paymentTransactionId,
        entryGroup,
        accountCode: 'platform_fee_revenue',
        direction: 'credit',
        amount: amounts.platformFeeAmount,
        description: `Learnora platform fee for ${reference}`,
      },
      {
        schoolId,
        paymentTransactionId,
        entryGroup,
        accountCode: 'processor_fee_clearing',
        direction: 'credit',
        amount: amounts.processorFeeAmount,
        description: `Processor fee reserve for ${reference}`,
      },
    ]

    await this.writeLedgerEntries(entries.filter(entry => entry.amount > 0))
  }

  private async createSettlementDisbursementLedger(
    schoolId: string,
    settlementId: string,
    netAmount: number,
    payoutReference: string,
  ) {
    const entryGroup = `settlement:${settlementId}`
    await this.writeLedgerEntries([
      {
        schoolId,
        settlementId,
        entryGroup,
        accountCode: 'school_payable',
        direction: 'debit',
        amount: netAmount,
        description: `Settlement payout ${payoutReference}`,
      },
      {
        schoolId,
        settlementId,
        entryGroup,
        accountCode: 'cash_bank',
        direction: 'credit',
        amount: netAmount,
        description: `Cash disbursed for settlement ${payoutReference}`,
      },
    ])
  }

  private async updateWebhookEventStatus(
    webhookEventId: string,
    status: 'processed' | 'ignored' | 'failed',
    errorMessage?: string | null,
  ) {
    await this.supabaseService.admin
      .from('payment_webhook_events')
      .update({
        status,
        error_message: errorMessage ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', webhookEventId)
  }

  private async finalizeTransactionByReference(params: {
    reference: string
    paidAt?: string | null
    method?: string | null
    providerStatus?: string | null
    metadata?: Record<string, unknown>
  }) {
    const db = this.supabaseService.admin
    const paidAtIso = params.paidAt ? new Date(params.paidAt).toISOString() : new Date().toISOString()
    const methodLabel = params.method?.trim() || 'paystack'

    const { data: transaction, error: transactionError } = await db
      .from('payment_transactions')
      .select('id, school_id, student_id, status, gross_amount, processor_fee_amount, platform_fee_amount, net_school_amount, metadata')
      .eq('external_reference', params.reference)
      .maybeSingle()

    if (transactionError) {
      if (this.isMissingRelationError(transactionError.message, 'payment_transactions')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(transactionError.message)
    }
    if (!transaction) {
      throw new NotFoundException(`Payment transaction not found for reference ${params.reference}.`)
    }

    if (!transaction.student_id) {
      throw new BadRequestException('Payment transaction is missing a linked student.')
    }

    if (transaction.status === 'succeeded') {
      return {
        transactionId: transaction.id as string,
        schoolId: transaction.school_id as string,
        childId: transaction.student_id as string,
        reference: params.reference,
        alreadyProcessed: true,
      }
    }

    const allocations = await this.allocateStudentPayment(
      transaction.school_id as string,
      transaction.student_id as string,
      Number(transaction.gross_amount ?? 0),
      {
        baseReference: params.reference,
        methodLabel,
        paystackStatus: params.providerStatus ?? null,
        paidAt: paidAtIso,
        confirmedBy: null,
      },
    )

    const invoiceIds = [...new Set(allocations.map(row => row.invoiceId))]
    const existingMetadata =
      transaction.metadata && typeof transaction.metadata === 'object' && !Array.isArray(transaction.metadata)
        ? transaction.metadata as Record<string, unknown>
        : {}

    const { error: finalizeError } = await db
      .from('payment_transactions')
      .update({
        invoice_ids: invoiceIds,
        status: 'succeeded',
        payment_method: methodLabel,
        confirmed_at: paidAtIso,
        metadata: {
          ...existingMetadata,
          ...(params.metadata ?? {}),
          allocationCount: allocations.length,
          allocations: allocations.map(row => ({
            invoiceId: row.invoiceId,
            amount: row.allocatedAmount,
            paymentId: row.paymentId,
          })),
        },
      })
      .eq('id', transaction.id as string)

    if (finalizeError) {
      if (this.isMissingRelationError(finalizeError.message, 'payment_transactions')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(finalizeError.message)
    }

    const { data: existingLedgerRows, error: existingLedgerError } = await db
      .from('payment_ledger_entries')
      .select('id')
      .eq('payment_transaction_id', transaction.id as string)
      .limit(1)

    if (existingLedgerError) {
      if (this.isMissingRelationError(existingLedgerError.message, 'payment_ledger_entries')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(existingLedgerError.message)
    }

    if (!(existingLedgerRows ?? []).length) {
      await this.createSuccessfulPaymentLedger(
        transaction.school_id as string,
        transaction.id as string,
        {
          grossAmount: Number(transaction.gross_amount ?? 0),
          processorFeeAmount: Number(transaction.processor_fee_amount ?? 0),
          platformFeeAmount: Number(transaction.platform_fee_amount ?? 0),
          netSchoolAmount: Number(transaction.net_school_amount ?? 0),
        },
        params.reference,
      )
    }

    return {
      transactionId: transaction.id as string,
      schoolId: transaction.school_id as string,
      childId: transaction.student_id as string,
      reference: params.reference,
      alreadyProcessed: false,
    }
  }

  private async resolveParentChild(user: AuthenticatedUser, preferredChildId?: string | null) {
    this.requireRole(user, ['parent'])
    const schoolId = this.requireSchoolId(user)
    const db = this.supabaseService.admin

    const { data, error } = await db
      .from('parent_student_links')
      .select('student_id')
      .eq('parent_id', user.id)
      .eq('school_id', schoolId)

    if (error) {
      throw new BadRequestException(error.message)
    }

    const studentIds = (data ?? []).map((row: { student_id: string }) => row.student_id)
    if (!studentIds.length) {
      return { schoolId, childId: null as string | null, studentIds }
    }

    const childId = preferredChildId && studentIds.includes(preferredChildId)
      ? preferredChildId
      : studentIds[0]

    return { schoolId, childId, studentIds }
  }

  private async fetchParentFeeSnapshot(user: AuthenticatedUser, preferredChildId?: string | null) {
    const { schoolId, childId } = await this.resolveParentChild(user, preferredChildId)
    if (!childId) {
      return {
        childId: null,
        hasLinkedChild: false,
        childName: '',
        className: '',
        schoolName: '',
        feeItems: [] as Array<{ invoiceId: string; label: string; amount: number; paid: number }>,
        payments: [] as Array<{ ref: string; amount: number; date: string; method: string; items: string }>,
        nearestDue: null as string | null,
        schoolBank: { name: '', acct: '', acctName: '' },
        paystackPublicKey: '',
        totalBalance: 0,
      }
    }

    const db = this.supabaseService.admin
    const [profileRes, enrollRes, invoiceRes, paymentRes, settingsRes, schoolRes, platformConfig] = await Promise.all([
      db.from('profiles').select('full_name').eq('id', childId).maybeSingle(),
      db.from('class_enrollments').select('class_id, classes(name)').eq('student_id', childId).limit(1).maybeSingle(),
      db.from('invoices')
        .select('id, amount, paid_amount, status, due_date, fee_structure_id')
        .eq('student_id', childId)
        .eq('school_id', schoolId),
      db.from('payments')
        .select('invoice_id, amount, paystack_reference, paystack_status, paid_at')
        .eq('student_id', childId)
        .order('paid_at', { ascending: false }),
      db.from('school_settings')
        .select('bank_name, account_number, account_name, bank_account_name, bank_account_number, paystack_public_key')
        .eq('school_id', schoolId)
        .maybeSingle(),
      db.from('schools').select('name').eq('id', schoolId).maybeSingle(),
      this.getPlatformPaymentConfig(),
    ])

    if (profileRes.error) throw new BadRequestException(profileRes.error.message)
    if (enrollRes.error) throw new BadRequestException(enrollRes.error.message)
    if (invoiceRes.error) throw new BadRequestException(invoiceRes.error.message)
    if (paymentRes.error) throw new BadRequestException(paymentRes.error.message)
    if (settingsRes.error) throw new BadRequestException(settingsRes.error.message)
    if (schoolRes.error) throw new BadRequestException(schoolRes.error.message)

    const childName = (profileRes.data as { full_name: string | null } | null)?.full_name ?? 'Child'
    const classRelation = (enrollRes.data as {
      class_id: string | null
      classes: { name: string }[] | { name: string } | null
    } | null)?.classes
    const className = Array.isArray(classRelation)
      ? (classRelation[0]?.name ?? '')
      : (classRelation?.name ?? '')
    const schoolName = (schoolRes.data as { name: string | null } | null)?.name ?? '—'

    const invoices = (invoiceRes.data ?? []) as unknown as Array<{
      id: string
      amount: number
      paid_amount: number | null
      status: string | null
      due_date: string | null
      fee_structure_id: string | null
    }>

    const feeStructureIds = [...new Set(invoices.map(invoice => invoice.fee_structure_id).filter((value): value is string => Boolean(value)))]
    const feeStructureMap = new Map<string, string>()

    if (feeStructureIds.length) {
      const { data: feeStructureData, error: feeStructureError } = await db
        .from('fee_structures')
        .select('id, name')
        .in('id', feeStructureIds)

      if (feeStructureError) {
        throw new BadRequestException(feeStructureError.message)
      }

      for (const row of (feeStructureData ?? []) as Array<{ id: string; name: string | null }>) {
        feeStructureMap.set(row.id, row.name ?? 'Fee')
      }
    }

    const paymentRows = (paymentRes.data ?? []) as Array<{
      invoice_id: string
      amount: number
      paystack_reference: string | null
      paystack_status: string | null
      paid_at: string | null
    }>

    const feeItems = invoices.map(invoice => ({
      invoiceId: invoice.id,
      label: invoice.fee_structure_id ? (feeStructureMap.get(invoice.fee_structure_id) ?? 'Fee') : 'Fee',
      amount: Number(invoice.amount ?? 0),
      paid: Number(invoice.paid_amount ?? 0),
    }))

    const payments = paymentRows.map(payment => ({
      ref: payment.paystack_reference ?? 'N/A',
      amount: Number(payment.amount ?? 0),
      date: payment.paid_at
        ? new Date(payment.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—',
      method: payment.paystack_status === 'success' ? 'Paystack' : 'Bank Transfer',
      items: (() => {
        const feeStructureId = invoices.find(item => item.id === payment.invoice_id)?.fee_structure_id
        return feeStructureId ? (feeStructureMap.get(feeStructureId) ?? 'Payment') : 'Payment'
      })(),
    }))

    const unpaidDues = invoices
      .filter(invoice => invoice.status !== 'paid' && invoice.status !== 'waived' && invoice.due_date)
      .map(invoice => invoice.due_date!)
      .sort()

    const settings = settingsRes.data as {
      bank_name: string | null
      account_number: string | null
      account_name: string | null
      bank_account_name: string | null
      bank_account_number: string | null
      paystack_public_key: string | null
    } | null

    const totalBalance = feeItems.reduce((sum, item) => sum + Math.max(item.amount - item.paid, 0), 0)

    return {
      childId,
      hasLinkedChild: true,
      childName,
      className,
      schoolName,
      feeItems,
      payments,
      nearestDue: unpaidDues[0] ?? null,
      schoolBank: {
        name: settings?.bank_name ?? '',
        acct: settings?.bank_account_number ?? settings?.account_number ?? '',
        acctName: settings?.bank_account_name ?? settings?.account_name ?? '',
      },
      paystackPublicKey: platformConfig.paystackPublicKey,
      totalBalance,
    }
  }

  private async listOpenInvoicesForChild(schoolId: string, childId: string) {
    const db = this.supabaseService.admin
    const { data, error } = await db
      .from('invoices')
      .select('id, amount, paid_amount, status, due_date, created_at, fee_structure_id')
      .eq('student_id', childId)
      .eq('school_id', schoolId)
      .in('status', ['unpaid', 'partial', 'pending_offline'])
      .order('created_at', { ascending: true })

    if (error) {
      throw new BadRequestException(error.message)
    }

    return (data ?? []) as InvoiceRow[]
  }

  private async allocateStudentPayment(
    schoolId: string,
    childId: string,
    amount: number,
    options: {
      baseReference: string
      methodLabel: string
      paystackStatus?: string | null
      paidAt?: string | null
      confirmedBy?: string | null
      clearPendingOffline?: boolean
    },
  ): Promise<PaymentAllocation[]> {
    const db = this.supabaseService.admin
    const openInvoices = await this.listOpenInvoicesForChild(schoolId, childId)

    if (!openInvoices.length) {
      throw new BadRequestException('No open invoices were found for this student.')
    }

    let remaining = amount
    let paymentIndex = 0
    const allocations: PaymentAllocation[] = []

    for (const invoice of openInvoices) {
      if (remaining <= 0) break

      const alreadyPaid = Number(invoice.paid_amount ?? 0)
      const outstanding = Math.max(Number(invoice.amount ?? 0) - alreadyPaid, 0)
      if (outstanding <= 0) continue

      const allocation = Math.min(outstanding, remaining)
      const nextPaid = alreadyPaid + allocation
      const nextStatus = nextPaid >= Number(invoice.amount ?? 0) ? 'paid' : 'partial'
      const paymentReference = paymentIndex === 0 ? options.baseReference : `${options.baseReference}-${paymentIndex + 1}`

      const { error: updateError } = await db
        .from('invoices')
        .update({
          paid_amount: nextPaid,
          status: nextStatus,
          payment_method: options.methodLabel,
          paystack_reference: paymentReference,
          confirmed_by: options.confirmedBy ?? null,
          confirmed_at: options.confirmedBy ? (options.paidAt ?? new Date().toISOString()) : null,
        })
        .eq('id', invoice.id)

      if (updateError) {
        throw new BadRequestException(updateError.message)
      }

      const { data: paymentRow, error: paymentInsertError } = await db
        .from('payments')
        .insert({
          school_id: schoolId,
          invoice_id: invoice.id,
          student_id: childId,
          amount: allocation,
          paystack_reference: paymentReference,
          paystack_status: options.paystackStatus ?? null,
          paid_at: options.paidAt ?? new Date().toISOString(),
        })
        .select('id')
        .single()

      if (paymentInsertError) {
        throw new BadRequestException(paymentInsertError.message)
      }

      allocations.push({
        invoiceId: invoice.id,
        invoiceAmount: Number(invoice.amount ?? 0),
        allocatedAmount: allocation,
        paymentId: (paymentRow as { id: string }).id,
        paymentReference,
      })

      remaining -= allocation
      paymentIndex += 1
    }

    if (remaining > 0) {
      throw new BadRequestException('Payment amount exceeds the total outstanding balance for this student.')
    }

    return allocations
  }

  async getAdminFeeSetupMeta(user: AuthenticatedUser) {
    this.requireRole(user, ['admin'])
    const schoolId = this.requireSchoolId(user)
    const db = this.supabaseService.admin

    const [classRes, termRes, settingsRes, platformConfig] = await Promise.all([
      db.from('classes').select('id, name, level').eq('school_id', schoolId).order('name'),
      db.from('terms').select('id, name, is_current').eq('school_id', schoolId).order('start_date', { ascending: false }),
      db.from('school_settings')
        .select('bank_name, account_number, account_name, bank_account_name, bank_account_number, paystack_subaccount_code')
        .eq('school_id', schoolId)
        .maybeSingle(),
      this.getPlatformPaymentConfig(),
    ])

    if (classRes.error) throw new BadRequestException(classRes.error.message)
    if (termRes.error) throw new BadRequestException(termRes.error.message)
    if (settingsRes.error) throw new BadRequestException(settingsRes.error.message)

    const settings = settingsRes.data as {
      bank_name: string | null
      account_number: string | null
      account_name: string | null
      bank_account_name: string | null
      bank_account_number: string | null
      paystack_subaccount_code: string | null
    } | null

    return {
      classes: classRes.data ?? [],
      terms: termRes.data ?? [],
      settings: {
        bankName: settings?.bank_name ?? '',
        accountNumber: settings?.bank_account_number ?? settings?.account_number ?? '',
        accountName: settings?.bank_account_name ?? settings?.account_name ?? '',
        paystackPublicKey: platformConfig.paystackPublicKey,
        paystackSubaccountCode: settings?.paystack_subaccount_code ?? '',
      },
    }
  }

  async getAdminFeeSetupStructure(user: AuthenticatedUser, classId: string, termId: string) {
    this.requireRole(user, ['admin'])
    const schoolId = this.requireSchoolId(user)
    if (!classId || !termId) {
      throw new BadRequestException('classId and termId are required.')
    }

    const db = this.supabaseService.admin
    const { data: liveData, error: liveError } = await db
      .from('fee_structures')
      .select('id, name, amount, is_mandatory, due_date')
      .eq('school_id', schoolId)
      .eq('class_id', classId)
      .eq('term_id', termId)
      .order('created_at', { ascending: true })

    if (liveError) throw new BadRequestException(liveError.message)

    const liveRows = (liveData ?? []) as Array<{
      id: string
      name: string
      amount: number
      is_mandatory: boolean | null
      due_date: string | null
    }>

    if (liveRows.length) {
      return {
        items: liveRows.map(row => ({
          id: row.id,
          label: row.name,
          amount: String(row.amount ?? ''),
          mandatory: row.is_mandatory ?? true,
          feeStructureId: row.id,
        })),
        dueDate: liveRows[0]?.due_date ?? '',
        source: 'live',
      }
    }

    const { data: draftData, error: draftError } = await db
      .from('fee_level_configs')
      .select('items')
      .eq('school_id', schoolId)
      .eq('level', classId)
      .eq('term', termId)
      .maybeSingle()

    if (draftError) throw new BadRequestException(draftError.message)

    const draftItems = Array.isArray(draftData?.items) ? draftData.items : []

    return {
      items: draftItems
        .map((item, index) => {
          const row = item as FeeSetupItemInput
          return {
            id: typeof row.id === 'string' ? row.id : `draft-${index}`,
            label: typeof row.label === 'string' ? row.label : '',
            amount: typeof row.amount === 'string' || typeof row.amount === 'number' ? String(row.amount ?? '') : '',
            mandatory: typeof row.mandatory === 'boolean' ? row.mandatory : true,
            feeStructureId: null,
          }
        })
        .filter(item => item.label || item.amount),
      dueDate: '',
      source: draftItems.length ? 'draft' : 'empty',
    }
  }

  async publishAdminFeeSetup(user: AuthenticatedUser, body: PublishFeeSetupInput) {
    this.requireRole(user, ['admin'])
    const schoolId = this.requireSchoolId(user)

    if (!body.classId || !body.termId) {
      throw new BadRequestException('classId and termId are required.')
    }

    const normalizedItems = (body.items ?? [])
      .map(item => ({
        label: item.label?.trim() ?? '',
        amount: typeof item.amount === 'number' ? item.amount : Number(item.amount ?? 0),
        mandatory: item.mandatory ?? true,
      }))
      .filter(item => item.label && item.amount > 0)

    if (!normalizedItems.length) {
      throw new BadRequestException('Add at least one fee item with a valid amount before publishing.')
    }

    const db = this.supabaseService.admin
    const { error: draftError } = await db
      .from('fee_level_configs')
      .upsert(
        {
          school_id: schoolId,
          level: body.classId,
          term: body.termId,
          items: normalizedItems.map((item, index) => ({
            id: `published-${index}`,
            label: item.label,
            amount: String(item.amount),
            mandatory: item.mandatory,
          })),
        },
        { onConflict: 'school_id,level,term' },
      )

    if (draftError) {
      throw new BadRequestException(draftError.message)
    }

    const { data: existingStructures, error: existingError } = await db
      .from('fee_structures')
      .select('id, name')
      .eq('school_id', schoolId)
      .eq('class_id', body.classId)
      .eq('term_id', body.termId)

    if (existingError) {
      throw new BadRequestException(existingError.message)
    }

    const existingByName = new Map(
      ((existingStructures ?? []) as Array<{ id: string; name: string }>).map(row => [row.name.trim().toLowerCase(), row.id]),
    )
    const nextNames = new Set(normalizedItems.map(item => item.label.trim().toLowerCase()))
    const removedStructures = ((existingStructures ?? []) as Array<{ id: string; name: string }>).filter(
      row => !nextNames.has(row.name.trim().toLowerCase()),
    )

    const publishedStructures: Array<{ id: string; name: string; amount: number }> = []

    for (const item of normalizedItems) {
      const payload = {
        school_id: schoolId,
        class_id: body.classId,
        term_id: body.termId,
        name: item.label,
        amount: item.amount,
        due_date: body.dueDate ?? null,
        is_mandatory: item.mandatory,
      }

      const existingId = existingByName.get(item.label.toLowerCase())

      if (existingId) {
        const { error } = await db.from('fee_structures').update(payload).eq('id', existingId)
        if (error) throw new BadRequestException(error.message)
        publishedStructures.push({ id: existingId, name: item.label, amount: item.amount })
      } else {
        const { data, error } = await db.from('fee_structures').insert(payload).select('id, name, amount').single()
        if (error || !data) throw new BadRequestException(error?.message ?? 'Could not create fee structure.')
        publishedStructures.push(data as { id: string; name: string; amount: number })
      }
    }

    let deletedStructures = 0
    let deletedInvoices = 0

    if (removedStructures.length) {
      const removedStructureIds = removedStructures.map(row => row.id)
      const removedStructureNames = new Map(removedStructures.map(row => [row.id, row.name]))
      const { data: removableInvoices, error: removableInvoicesError } = await db
        .from('invoices')
        .select('id, fee_structure_id, paid_amount')
        .eq('school_id', schoolId)
        .eq('term_id', body.termId)
        .in('fee_structure_id', removedStructureIds)

      if (removableInvoicesError) {
        throw new BadRequestException(removableInvoicesError.message)
      }

      const blockedStructureIds = new Set(
        ((removableInvoices ?? []) as Array<{
          id: string
          fee_structure_id: string | null
          paid_amount: number | null
        }>)
          .filter(row => Number(row.paid_amount ?? 0) > 0 && row.fee_structure_id)
          .map(row => row.fee_structure_id as string),
      )

      if (blockedStructureIds.size) {
        const blockedNames = [...blockedStructureIds].map(id => removedStructureNames.get(id) ?? 'Fee item')
        throw new BadRequestException(
          `Cannot delete fee item${blockedNames.length === 1 ? '' : 's'} with recorded payments: ${blockedNames.join(', ')}.`,
        )
      }

      const { error: deleteInvoicesError, count: deletedInvoiceCount } = await db
        .from('invoices')
        .delete({ count: 'exact' })
        .eq('school_id', schoolId)
        .eq('term_id', body.termId)
        .in('fee_structure_id', removedStructureIds)

      if (deleteInvoicesError) {
        throw new BadRequestException(deleteInvoicesError.message)
      }

      const { error: deleteStructuresError, count: deletedStructureCount } = await db
        .from('fee_structures')
        .delete({ count: 'exact' })
        .eq('school_id', schoolId)
        .eq('class_id', body.classId)
        .eq('term_id', body.termId)
        .in('id', removedStructureIds)

      if (deleteStructuresError) {
        throw new BadRequestException(deleteStructuresError.message)
      }

      deletedInvoices = deletedInvoiceCount ?? 0
      deletedStructures = deletedStructureCount ?? 0
    }

    const { data: enrollments, error: enrollmentError } = await db
      .from('class_enrollments')
      .select('student_id')
      .eq('school_id', schoolId)
      .eq('class_id', body.classId)

    if (enrollmentError) {
      throw new BadRequestException(enrollmentError.message)
    }

    const studentIds = [...new Set(((enrollments ?? []) as Array<{ student_id: string }>).map(row => row.student_id))]
    let createdInvoices = 0
    let updatedInvoices = 0

    if (studentIds.length) {
      const structureIds = publishedStructures.map(row => row.id)
      const { data: existingInvoices, error: invoiceLookupError } = await db
        .from('invoices')
        .select('id, student_id, fee_structure_id, paid_amount')
        .eq('school_id', schoolId)
        .eq('term_id', body.termId)
        .in('student_id', studentIds)
        .in('fee_structure_id', structureIds)

      if (invoiceLookupError) {
        throw new BadRequestException(invoiceLookupError.message)
      }

      const invoiceMap = new Map(
        ((existingInvoices ?? []) as Array<{
          id: string
          student_id: string
          fee_structure_id: string | null
          paid_amount: number | null
        }>).map(row => [`${row.student_id}:${row.fee_structure_id}`, row]),
      )

      for (const studentId of studentIds) {
        for (const structure of publishedStructures) {
          const key = `${studentId}:${structure.id}`
          const existingInvoice = invoiceMap.get(key)

          if (existingInvoice) {
            const paidAmount = Number(existingInvoice.paid_amount ?? 0)
            const nextStatus = paidAmount <= 0 ? 'unpaid' : paidAmount >= structure.amount ? 'paid' : 'partial'
            const { error } = await db
              .from('invoices')
              .update({
                amount: structure.amount,
                due_date: body.dueDate ?? null,
                status: nextStatus,
              })
              .eq('id', existingInvoice.id)

            if (error) throw new BadRequestException(error.message)
            updatedInvoices += 1
          } else {
            const { error } = await db
              .from('invoices')
              .insert({
                school_id: schoolId,
                student_id: studentId,
                term_id: body.termId,
                fee_structure_id: structure.id,
                amount: structure.amount,
                paid_amount: 0,
                due_date: body.dueDate ?? null,
                status: 'unpaid',
              })

            if (error) throw new BadRequestException(error.message)
            createdInvoices += 1
          }
        }
      }
    }

    return {
      message: 'Fee structure published successfully.',
      publishedStructures: publishedStructures.length,
      createdInvoices,
      updatedInvoices,
      deletedStructures,
      deletedInvoices,
      studentsMatched: studentIds.length,
    }
  }

  async updateAdminBankSettings(
    user: AuthenticatedUser,
    body: { bankName?: string; accountName?: string; accountNumber?: string },
  ) {
    this.requireRole(user, ['admin'])
    const schoolId = this.requireSchoolId(user)

    const { error } = await this.supabaseService.admin
      .from('school_settings')
      .upsert(
        {
          school_id: schoolId,
          bank_name: body.bankName?.trim() ?? '',
          account_name: body.accountName?.trim() ?? '',
          account_number: body.accountNumber?.trim() ?? '',
          bank_account_name: body.accountName?.trim() ?? '',
          bank_account_number: body.accountNumber?.trim() ?? '',
        },
        { onConflict: 'school_id' },
      )

    if (error) throw new BadRequestException(error.message)

    return { message: 'Bank settings saved.' }
  }

  async updateAdminPaystackSettings(
    user: AuthenticatedUser,
    body: { subaccountCode?: string },
  ) {
    this.requireRole(user, ['admin'])
    const schoolId = this.requireSchoolId(user)

    const { error } = await this.supabaseService.admin
      .from('school_settings')
      .upsert(
        {
          school_id: schoolId,
          paystack_subaccount_code: body.subaccountCode?.trim() ?? '',
        },
        { onConflict: 'school_id' },
      )

    if (error) throw new BadRequestException(error.message)

    return { message: 'Paystack settings saved.' }
  }

  async getAdminFeeCollection(user: AuthenticatedUser) {
    this.requireRole(user, ['admin'])
    const schoolId = this.requireSchoolId(user)
    const db = this.supabaseService.admin

    const { data: studentData, error: studentError } = await db
      .from('profiles')
      .select('id, full_name')
      .eq('school_id', schoolId)
      .eq('role', 'student')

    if (studentError) throw new BadRequestException(studentError.message)

    const studentProfiles = (studentData ?? []) as Array<{ id: string; full_name: string | null }>
    const studentIds = studentProfiles.map(student => student.id)

    if (!studentIds.length) {
      return {
        students: [],
        totals: { expected: 0, paid: 0, balance: 0, pendingCount: 0 },
      }
    }

    const [classRes, invoiceRes] = await Promise.all([
      db.from('class_enrollments').select('student_id, classes(name)').in('student_id', studentIds),
      db.from('invoices').select('id, student_id, amount, paid_amount, status, created_at, payment_method').eq('school_id', schoolId),
    ])

    if (classRes.error) throw new BadRequestException(classRes.error.message)
    if (invoiceRes.error) throw new BadRequestException(invoiceRes.error.message)

    const classMap: Record<string, string> = {}
    for (const row of (classRes.data ?? []) as unknown as Array<{
      student_id: string
      classes: { name: string }[] | { name: string } | null
    }>) {
      if (!classMap[row.student_id]) {
        classMap[row.student_id] = Array.isArray(row.classes)
          ? (row.classes[0]?.name ?? '—')
          : (row.classes?.name ?? '—')
      }
    }

    const byStudent: Record<string, { invoiceId: string | null; expected: number; paid: number; lastIso: string; hasPendingOffline: boolean }> = {}
    for (const invoice of (invoiceRes.data ?? []) as Array<{
      id: string
      student_id: string
      amount: number
      paid_amount: number | null
      status: string | null
      created_at: string | null
      payment_method: string | null
    }>) {
      if (!byStudent[invoice.student_id]) {
        byStudent[invoice.student_id] = { invoiceId: null, expected: 0, paid: 0, lastIso: '', hasPendingOffline: false }
      }

      const bucket = byStudent[invoice.student_id]
      if (!bucket.invoiceId) bucket.invoiceId = invoice.id

      if (invoice.status === 'pending_offline') {
        bucket.hasPendingOffline = true
        bucket.expected += Number(invoice.amount ?? 0)
      } else {
        bucket.expected += Number(invoice.amount ?? 0)
        bucket.paid += Number(invoice.paid_amount ?? 0)
      }

      const createdAt = invoice.created_at ?? ''
      if (createdAt > bucket.lastIso) {
        bucket.lastIso = createdAt
      }
    }

    const students = studentProfiles.map(student => {
      const bucket = byStudent[student.id]
      const expected = bucket?.expected ?? 0
      const paid = bucket?.paid ?? 0
      const hasPendingOffline = bucket?.hasPendingOffline ?? false
      return {
        id: student.id,
        name: student.full_name ?? 'Unknown',
        className: classMap[student.id] ?? '—',
        invoiceId: bucket?.invoiceId ?? null,
        expected,
        paid,
        lastPayment: bucket?.lastIso
          ? new Date(bucket.lastIso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—',
        hasPendingOffline,
        status: this.deriveStudentPaymentStatus(expected, paid, hasPendingOffline),
      }
    })

    return {
      students,
      totals: {
        expected: students.reduce((sum, student) => sum + student.expected, 0),
        paid: students.reduce((sum, student) => sum + student.paid, 0),
        balance: students.reduce((sum, student) => sum + student.expected, 0) - students.reduce((sum, student) => sum + student.paid, 0),
        pendingCount: students.filter(student => student.status === 'Pending').length,
      },
    }
  }

  async getAdminFinanceOverview(user: AuthenticatedUser) {
    this.requireRole(user, ['admin'])
    const schoolId = this.requireSchoolId(user)
    const db = this.supabaseService.admin

    const [invRes, payRes, txRes, settlementRes] = await Promise.all([
      db
        .from('invoices')
        .select('id, amount, status, due_date, created_at, profiles!student_id(full_name), fee_structures!fee_structure_id(name, classes!class_id(name))')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false }),
      db
        .from('payments')
        .select('id, amount, paid_at, paystack_reference, profiles!student_id(full_name)')
        .eq('school_id', schoolId)
        .order('paid_at', { ascending: false })
        .limit(100),
      db
        .from('payment_transactions')
        .select('id, gross_amount, net_school_amount, status, payment_method, external_reference, created_at, confirmed_at, settlement_id')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(100),
      db
        .from('school_settlements')
        .select('id, period_start, period_end, transaction_count, gross_amount, processor_fee_amount, platform_fee_amount, net_amount, status, payout_reference, paid_at, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(12),
    ])

    if (invRes.error) throw new BadRequestException(invRes.error.message)
    if (payRes.error) throw new BadRequestException(payRes.error.message)
    if (txRes.error && !this.isMissingRelationError(txRes.error.message, 'payment_transactions')) {
      throw new BadRequestException(txRes.error.message)
    }
    if (settlementRes.error && !this.isMissingRelationError(settlementRes.error.message, 'school_settlements')) {
      throw new BadRequestException(settlementRes.error.message)
    }

    type InvoiceViewRow = {
      id: string
      amount: number
      status: string
      due_date: string | null
      created_at: string
      profiles: { full_name: string }[] | { full_name: string } | null
      fee_structures: { name: string; classes: { name: string }[] | { name: string } | null }[] | { name: string; classes: { name: string }[] | { name: string } | null } | null
    }

    type PaymentViewRow = {
      id: string
      amount: number
      paid_at: string | null
      paystack_reference: string | null
      profiles: { full_name: string }[] | { full_name: string } | null
    }

    const invData = (invRes.data ?? []) as unknown as InvoiceViewRow[]
    const payData = (payRes.data ?? []) as unknown as PaymentViewRow[]
    const txData = ((this.isMissingRelationError(txRes.error?.message, 'payment_transactions') ? [] : txRes.data) ?? []) as Array<{
      id: string
      gross_amount: number
      net_school_amount: number
      status: string
      payment_method: string | null
      external_reference: string | null
      created_at: string
      confirmed_at: string | null
      settlement_id: string | null
    }>
    const settlementData = ((this.isMissingRelationError(settlementRes.error?.message, 'school_settlements') ? [] : settlementRes.data) ?? []) as Array<{
      id: string
      period_start: string | null
      period_end: string | null
      transaction_count: number
      gross_amount: number
      processor_fee_amount: number
      platform_fee_amount: number
      net_amount: number
      status: string
      payout_reference: string | null
      paid_at: string | null
      created_at: string
    }>

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const expected = invData.reduce((sum, row) => sum + Number(row.amount ?? 0), 0)
    const collected = payData.reduce((sum, row) => sum + Number(row.amount ?? 0), 0)
    const outstanding = Math.max(expected - collected, 0)
    const overdueRows = invData.filter(row =>
      (row.status === 'unpaid' || row.status === 'partial') &&
      row.due_date &&
      new Date(row.due_date) < thirtyDaysAgo,
    )

    const bucketMap = new Map<string, { className: string; total: number; paid: number; amount: number }>()
    for (const invoice of invData) {
      const structure = Array.isArray(invoice.fee_structures) ? invoice.fee_structures[0] : invoice.fee_structures
      const classRelation = structure?.classes
      const className = Array.isArray(classRelation) ? (classRelation[0]?.name ?? 'General') : (classRelation?.name ?? 'General')
      const current = bucketMap.get(className) ?? { className, total: 0, paid: 0, amount: 0 }
      current.total += 1
      if (invoice.status === 'paid') current.paid += 1
      current.amount += Number(invoice.amount ?? 0)
      bucketMap.set(className, current)
    }

    return {
      stats: {
        expected,
        collected,
        outstanding,
        overdue: overdueRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
        overdueCount: overdueRows.length,
        outstandingCount: invData.filter(row => row.status !== 'paid' && row.status !== 'waived').length,
      },
      buckets: [...bucketMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 6),
      invoices: invData.map(row => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
        const structure = Array.isArray(row.fee_structures) ? row.fee_structures[0] : row.fee_structures
        const classRelation = structure?.classes
        return {
          id: row.id,
          amount: Number(row.amount ?? 0),
          status: row.status,
          dueDate: row.due_date,
          createdAt: row.created_at,
          studentName: profile?.full_name ?? '—',
          className: Array.isArray(classRelation) ? (classRelation[0]?.name ?? '—') : (classRelation?.name ?? '—'),
          feeName: structure?.name ?? '—',
        }
      }),
      payments: payData.map(row => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
        return {
          id: row.id,
          amount: Number(row.amount ?? 0),
          paidAt: row.paid_at,
          reference: row.paystack_reference,
          studentName: profile?.full_name ?? '—',
        }
      }),
      settlementSummary: {
        availableBalance: txData
          .filter(row => row.status === 'succeeded' && !row.settlement_id)
          .reduce((sum, row) => sum + Number(row.net_school_amount ?? 0), 0),
        unsettledPayments: txData.filter(row => row.status === 'succeeded' && !row.settlement_id).length,
        recentTransactions: txData.slice(0, 8).map(row => ({
          id: row.id,
          grossAmount: Number(row.gross_amount ?? 0),
          netSchoolAmount: Number(row.net_school_amount ?? 0),
          status: row.status,
          method: row.payment_method ?? 'paystack',
          reference: row.external_reference ?? row.id,
          createdAt: row.created_at,
          confirmedAt: row.confirmed_at,
          settled: Boolean(row.settlement_id),
        })),
        recentSettlements: settlementData.map(row => ({
          id: row.id,
          periodStart: row.period_start,
          periodEnd: row.period_end,
          transactionCount: Number(row.transaction_count ?? 0),
          grossAmount: Number(row.gross_amount ?? 0),
          processorFeeAmount: Number(row.processor_fee_amount ?? 0),
          platformFeeAmount: Number(row.platform_fee_amount ?? 0),
          netAmount: Number(row.net_amount ?? 0),
          status: row.status,
          payoutReference: row.payout_reference,
          paidAt: row.paid_at,
          createdAt: row.created_at,
        })),
      },
    }
  }

  async recordAdminOfflineCollection(user: AuthenticatedUser, body: AdminOfflineCollectionInput) {
    this.requireRole(user, ['admin'])
    const schoolId = this.requireSchoolId(user)

    if (!body.studentId) throw new BadRequestException('studentId is required')
    if (!body.amount || body.amount <= 0) throw new BadRequestException('amount must be greater than 0')

    await this.allocateStudentPayment(schoolId, body.studentId, body.amount, {
      baseReference: body.note?.trim() ? `ADMIN-${randomBytes(4).toString('hex')}` : `OFF-${randomBytes(4).toString('hex')}`,
      methodLabel: body.method?.trim() || 'offline',
      paystackStatus: null,
      paidAt: new Date().toISOString(),
      confirmedBy: user.id,
    })

    return { message: 'Offline payment recorded successfully.' }
  }

  async confirmAdminPendingOffline(user: AuthenticatedUser, studentId: string) {
    this.requireRole(user, ['admin'])
    const schoolId = this.requireSchoolId(user)
    const db = this.supabaseService.admin

    const { data: pendingInvoices, error } = await db
      .from('invoices')
      .select('id, amount, paid_amount')
      .eq('student_id', studentId)
      .eq('school_id', schoolId)
      .eq('status', 'pending_offline')

    if (error) throw new BadRequestException(error.message)
    if (!pendingInvoices?.length) throw new NotFoundException('No pending offline invoices were found for this student.')

    for (const invoice of pendingInvoices as Array<{ id: string; amount: number; paid_amount: number | null }>) {
      const paidAmount = Number(invoice.amount ?? 0)

      const { error: updateError } = await db
        .from('invoices')
        .update({
          status: 'paid',
          paid_amount: paidAmount,
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)

      if (updateError) throw new BadRequestException(updateError.message)

      const { error: paymentInsertError } = await db
        .from('payments')
        .insert({
          school_id: schoolId,
          invoice_id: invoice.id,
          student_id: studentId,
          amount: paidAmount,
          paystack_reference: `OFFCONF-${invoice.id}`,
          paystack_status: null,
          paid_at: new Date().toISOString(),
        })

      if (paymentInsertError) throw new BadRequestException(paymentInsertError.message)
    }

    return { message: 'Pending offline transfers confirmed successfully.' }
  }

  async getParentFees(user: AuthenticatedUser, query: ParentPaymentContextInput) {
    this.requireRole(user, ['parent'])
    return this.fetchParentFeeSnapshot(user, query.childId)
  }

  async getParentPaymentContext(user: AuthenticatedUser, query: ParentPaymentContextInput) {
    this.requireRole(user, ['parent'])
    const snapshot = await this.fetchParentFeeSnapshot(user, query.childId)

    return {
      childId: snapshot.childId,
      hasLinkedChild: snapshot.hasLinkedChild,
      schoolName: snapshot.schoolName,
      childName: snapshot.childName,
      className: snapshot.className,
      balance: snapshot.totalBalance,
      bankDetails: snapshot.schoolBank,
      paystackPublicKey: snapshot.paystackPublicKey,
    }
  }

  async initializeParentPayment(user: AuthenticatedUser, body: ParentRecordPaymentInput) {
    this.requireRole(user, ['parent'])
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('amount must be greater than 0')
    }
    if (!user.email) {
      throw new BadRequestException('Parent email is required before initializing payment.')
    }

    const { schoolId, childId } = await this.resolveParentChild(user, body.childId)
    if (!childId) throw new BadRequestException('No linked child was found for this parent.')

    const config = await this.getPlatformPaymentConfig()
    const reference = body.reference?.trim() || `LRN-${Date.now()}-${randomBytes(3).toString('hex')}`.toUpperCase()
    const amounts = this.calculatePaymentAmounts(body.amount, config)

    const db = this.supabaseService.admin
    const initIdempotencyKey = `init:${user.id}:${reference}`
    const { data: existingByInit, error: existingByInitError } = await db
      .from('payment_transactions')
      .select('id')
      .eq('idempotency_key', initIdempotencyKey)
      .maybeSingle()

    if (existingByInitError) {
      if (this.isMissingRelationError(existingByInitError.message, 'payment_transactions')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(existingByInitError.message)
    }

    let transactionId = existingByInit?.id as string | undefined

    if (!transactionId) {
      const { data: existingByReference, error: existingByReferenceError } = await db
        .from('payment_transactions')
        .select('id')
        .eq('external_reference', reference)
        .maybeSingle()

      if (existingByReferenceError) {
        if (this.isMissingRelationError(existingByReferenceError.message, 'payment_transactions')) {
          this.throwSettlementMigrationRequired()
        }
        throw new BadRequestException(existingByReferenceError.message)
      }

      transactionId = existingByReference?.id as string | undefined
    }

    if (!transactionId) {
      const { data, error } = await db
        .from('payment_transactions')
        .insert({
          school_id: schoolId,
          student_id: childId,
          parent_id: user.id,
          provider: 'learnora_paystack',
          external_reference: reference,
          idempotency_key: initIdempotencyKey,
          gross_amount: amounts.grossAmount,
          processor_fee_amount: amounts.processorFeeAmount,
          platform_fee_amount: amounts.platformFeeAmount,
          net_school_amount: amounts.netSchoolAmount,
          status: 'initialized',
          payment_method: body.method?.trim() || 'paystack',
          metadata: {
            initializedBy: user.id,
            childId,
          },
        })
        .select('id')
        .single()

      if (error || !data) {
        if (this.isMissingRelationError(error?.message, 'payment_transactions')) {
          this.throwSettlementMigrationRequired()
        }
        throw new BadRequestException(error?.message ?? 'Could not initialize payment transaction.')
      }

      transactionId = (data as { id: string }).id
    }

    const callbackUrl = this.getPaystackCallbackUrl(reference)
    const paystack = await this.initializePaystackHostedPayment({
      email: user.email,
      amountKobo: Math.round(amounts.grossAmount * 100),
      reference,
      callbackUrl,
      metadata: {
        transactionId,
        parentId: user.id,
        childId,
        schoolId,
      },
    })

    const { error: pendingError } = await db
      .from('payment_transactions')
      .update({
        status: 'pending',
        payment_method: 'paystack',
        metadata: {
          initializedBy: user.id,
          childId,
          authorizationUrl: paystack.authorizationUrl,
          accessCode: paystack.accessCode,
          callbackUrl,
        },
      })
      .eq('id', transactionId)

    if (pendingError) {
      if (this.isMissingRelationError(pendingError.message, 'payment_transactions')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(pendingError.message)
    }

    return {
      transactionId,
      childId,
      reference,
      amount: amounts.grossAmount,
      publicKey: config.paystackPublicKey,
      callbackUrl,
      authorizationUrl: paystack.authorizationUrl,
    }
  }

  async submitParentOffline(user: AuthenticatedUser, body: ParentPaymentContextInput) {
    this.requireRole(user, ['parent'])
    const { schoolId, childId } = await this.resolveParentChild(user, body.childId)
    if (!childId) throw new BadRequestException('No linked child was found for this parent.')

    const db = this.supabaseService.admin
    const { error } = await db
      .from('invoices')
      .update({ status: 'pending_offline', payment_method: 'bank_transfer' })
      .eq('student_id', childId)
      .eq('school_id', schoolId)
      .in('status', ['unpaid', 'partial'])

    if (error) throw new BadRequestException(error.message)

    return { message: 'Offline transfer submitted for confirmation.', childId }
  }

  async recordParentPayment(user: AuthenticatedUser, body: ParentRecordPaymentInput) {
    this.requireRole(user, ['parent'])
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('amount must be greater than 0')
    }

    const { schoolId, childId } = await this.resolveParentChild(user, body.childId)
    if (!childId) throw new BadRequestException('No linked child was found for this parent.')

    const reference = body.reference?.trim() || `PAY-${randomBytes(6).toString('hex')}`
    const methodLabel = body.method?.trim() || 'paystack'
    const paidAtIso = body.paidAt ? new Date(body.paidAt).toISOString() : new Date().toISOString()
    const config = await this.getPlatformPaymentConfig()
    const idempotencyKey = `parent:${user.id}:${reference}`
    const db = this.supabaseService.admin

    const { data: existingTransaction, error: existingError } = await db
      .from('payment_transactions')
      .select('id, status, external_reference')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existingError) {
      if (this.isMissingRelationError(existingError.message, 'payment_transactions')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(existingError.message)
    }

    if (existingTransaction && existingTransaction.status === 'succeeded') {
      return {
        message: 'Payment already recorded.',
        childId,
        reference: existingTransaction.external_reference ?? reference,
        transactionId: existingTransaction.id,
      }
    }

    let transactionId = existingTransaction?.id ?? null

    if (!transactionId) {
      const { data: existingByReference, error: existingByReferenceError } = await db
        .from('payment_transactions')
        .select('id, status, external_reference')
        .eq('external_reference', reference)
        .maybeSingle()

      if (existingByReferenceError) {
        if (this.isMissingRelationError(existingByReferenceError.message, 'payment_transactions')) {
          this.throwSettlementMigrationRequired()
        }
        throw new BadRequestException(existingByReferenceError.message)
      }

      if (existingByReference?.status === 'succeeded') {
        return {
          message: 'Payment already recorded.',
          childId,
          reference: existingByReference.external_reference ?? reference,
          transactionId: existingByReference.id,
        }
      }

      if (existingByReference?.id) {
        transactionId = existingByReference.id
      }
    }

    if (!transactionId) {
      const amounts = this.calculatePaymentAmounts(body.amount, config)
      const { data: createdTransaction, error: createTransactionError } = await db
        .from('payment_transactions')
        .insert({
          school_id: schoolId,
          student_id: childId,
          parent_id: user.id,
          provider: 'learnora_paystack',
          external_reference: reference,
          idempotency_key: idempotencyKey,
          gross_amount: amounts.grossAmount,
          processor_fee_amount: amounts.processorFeeAmount,
          platform_fee_amount: amounts.platformFeeAmount,
          net_school_amount: amounts.netSchoolAmount,
          status: methodLabel === 'paystack' ? 'pending' : 'initialized',
          payment_method: methodLabel,
          metadata: {
            source: 'parent_record_payment',
            childId,
          },
        })
        .select('id')
        .single()

      if (createTransactionError || !createdTransaction) {
        if (this.isMissingRelationError(createTransactionError?.message, 'payment_transactions')) {
          this.throwSettlementMigrationRequired()
        }
        throw new BadRequestException(createTransactionError?.message ?? 'Could not create payment transaction.')
      }

      transactionId = (createdTransaction as { id: string }).id
    }

    try {
      await this.finalizeTransactionByReference({
        reference,
        paidAt: paidAtIso,
        method: methodLabel,
        providerStatus: methodLabel === 'paystack' ? 'success' : null,
        metadata: {
          source: 'parent_record_payment',
          childId,
          parentId: user.id,
        },
      })
    } catch (error) {
      await db
        .from('payment_transactions')
        .update({
          status: 'failed',
          confirmed_at: new Date().toISOString(),
          metadata: {
            childId,
            error: error instanceof Error ? error.message : 'Payment allocation failed',
          },
        })
        .eq('id', transactionId)

      throw error
    }

    return {
      message: 'Payment recorded successfully.',
      childId,
      reference,
      transactionId,
    }
  }

  async handlePaystackWebhook(signature: string | undefined, rawBody: string) {
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY') ?? ''
    if (!secret) {
      throw new BadRequestException('PAYSTACK_SECRET_KEY is not configured on the API server.')
    }

    const expectedSignature = createHmac('sha512', secret).update(rawBody).digest('hex')
    const provided = signature?.trim() ?? ''
    const isValid =
      provided.length === expectedSignature.length &&
      timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(provided))

    if (!isValid) {
      throw new UnauthorizedException('Invalid Paystack signature.')
    }

    let event: {
      event?: string
      data?: {
        id?: string | number
        reference?: string
        paid_at?: string
        transaction_date?: string
        status?: string
        gateway_response?: string
        channel?: string
        metadata?: Record<string, unknown>
      }
    }

    try {
      event = JSON.parse(rawBody) as typeof event
    } catch {
      throw new BadRequestException('Invalid webhook payload.')
    }

    const eventId = String(event.data?.id ?? event.data?.reference ?? `paystack-${Date.now()}`)
    const db = this.supabaseService.admin
    const { data: existingEvent, error: existingEventError } = await db
      .from('payment_webhook_events')
      .select('id, status')
      .eq('event_id', eventId)
      .maybeSingle()

    if (existingEventError) {
      if (this.isMissingRelationError(existingEventError.message, 'payment_webhook_events')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(existingEventError.message)
    }

    if (existingEvent && ['processed', 'ignored'].includes(existingEvent.status)) {
      return { received: true, duplicate: true }
    }

    let webhookEventId = existingEvent?.id as string | undefined

    if (!webhookEventId) {
      const { data: insertedEvent, error: insertEventError } = await db
        .from('payment_webhook_events')
        .insert({
          provider: 'paystack',
          event_id: eventId,
          event_type: event.event ?? 'unknown',
          status: 'received',
          payload: event,
        })
        .select('id')
        .single()

      if (insertEventError || !insertedEvent) {
        if (this.isMissingRelationError(insertEventError?.message, 'payment_webhook_events')) {
          this.throwSettlementMigrationRequired()
        }
        throw new BadRequestException(insertEventError?.message ?? 'Could not persist webhook event.')
      }

      webhookEventId = (insertedEvent as { id: string }).id
    }

    if (event.event !== 'charge.success') {
      await this.updateWebhookEventStatus(webhookEventId, 'ignored')
      return { received: true, ignored: true }
    }

    const reference = event.data?.reference?.trim()
    if (!reference) {
      await this.updateWebhookEventStatus(webhookEventId, 'failed', 'Missing payment reference')
      throw new BadRequestException('Webhook payload is missing a payment reference.')
    }

    try {
      const result = await this.finalizeTransactionByReference({
        reference,
        paidAt: event.data?.paid_at ?? event.data?.transaction_date ?? new Date().toISOString(),
        method: event.data?.channel ?? 'paystack',
        providerStatus: event.data?.status ?? 'success',
        metadata: {
          webhookEventId,
          gatewayResponse: event.data?.gateway_response ?? null,
          webhookConfirmedAt: new Date().toISOString(),
        },
      })

      await this.updateWebhookEventStatus(webhookEventId, 'processed')
      return {
        received: true,
        processed: true,
        transactionId: result.transactionId,
        reference,
        duplicate: result.alreadyProcessed,
      }
    } catch (error) {
      await this.updateWebhookEventStatus(
        webhookEventId,
        'failed',
        error instanceof Error ? error.message : 'Webhook processing failed',
      )
      throw error
    }
  }

  getPaystackCallbackRedirect(reference?: string | string[], trxref?: string | string[]) {
    const resolvedReference = this.normalizeQueryParam(reference) || this.normalizeQueryParam(trxref) || ''
    return this.getParentPaymentSuccessUrl(resolvedReference || undefined)
  }

  async getSuperAdminSettlementOverview(user: AuthenticatedUser) {
    this.requireRole(user, ['super_admin'])
    const db = this.supabaseService.admin

    const [settlementRes, transactionRes, schoolRes] = await Promise.all([
      db
        .from('school_settlements')
        .select('id, school_id, net_amount, status, created_at, paid_at')
        .order('created_at', { ascending: false })
        .limit(200),
      db
        .from('payment_transactions')
        .select('id, school_id, net_school_amount, status, settlement_id')
        .eq('status', 'succeeded')
        .order('created_at', { ascending: false })
        .limit(500),
      db
        .from('schools')
        .select('id, name')
        .order('name'),
    ])

    if (settlementRes.error && !this.isMissingRelationError(settlementRes.error.message, 'school_settlements')) {
      throw new BadRequestException(settlementRes.error.message)
    }
    if (transactionRes.error && !this.isMissingRelationError(transactionRes.error.message, 'payment_transactions')) {
      throw new BadRequestException(transactionRes.error.message)
    }
    if (schoolRes.error) throw new BadRequestException(schoolRes.error.message)

    const settlements = ((this.isMissingRelationError(settlementRes.error?.message, 'school_settlements') ? [] : settlementRes.data) ?? []) as Array<{
      id: string
      school_id: string
      net_amount: number
      status: string
      created_at: string
      paid_at: string | null
    }>
    const transactions = ((this.isMissingRelationError(transactionRes.error?.message, 'payment_transactions') ? [] : transactionRes.data) ?? []) as Array<{
      id: string
      school_id: string
      net_school_amount: number
      status: string
      settlement_id: string | null
    }>
    const schools = (schoolRes.data ?? []) as Array<{ id: string; name: string }>
    const schoolNameById = new Map(schools.map(school => [school.id, school.name]))

    return {
      totals: {
        availableBalance: transactions
          .filter(row => !row.settlement_id)
          .reduce((sum, row) => sum + Number(row.net_school_amount ?? 0), 0),
        unsettledPayments: transactions.filter(row => !row.settlement_id).length,
        pendingSettlements: settlements.filter(row => ['pending', 'approved', 'processing'].includes(row.status)).length,
        paidSettlements: settlements.filter(row => row.status === 'paid').length,
      },
      schoolBalances: schools.map(school => {
        const available = transactions
          .filter(row => row.school_id === school.id && !row.settlement_id)
          .reduce((sum, row) => sum + Number(row.net_school_amount ?? 0), 0)
        const pendingSettlementCount = settlements.filter(
          row => row.school_id === school.id && ['pending', 'approved', 'processing'].includes(row.status),
        ).length

        return {
          schoolId: school.id,
          schoolName: school.name,
          availableBalance: available,
          pendingSettlementCount,
        }
      }).filter(row => row.availableBalance > 0 || row.pendingSettlementCount > 0),
      recentSettlements: settlements.slice(0, 12).map(row => ({
        id: row.id,
        schoolId: row.school_id,
        schoolName: schoolNameById.get(row.school_id) ?? 'Unknown school',
        netAmount: Number(row.net_amount ?? 0),
        status: row.status,
        createdAt: row.created_at,
        paidAt: row.paid_at,
      })),
    }
  }

  async listSuperAdminSettlements(user: AuthenticatedUser) {
    this.requireRole(user, ['super_admin'])
    const db = this.supabaseService.admin

    const [settlementRes, schoolRes] = await Promise.all([
      db
        .from('school_settlements')
        .select('id, school_id, period_start, period_end, transaction_count, gross_amount, processor_fee_amount, platform_fee_amount, net_amount, status, payout_reference, notes, paid_at, created_at')
        .order('created_at', { ascending: false })
        .limit(200),
      db.from('schools').select('id, name').order('name'),
    ])

    if (settlementRes.error) {
      if (this.isMissingRelationError(settlementRes.error.message, 'school_settlements')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(settlementRes.error.message)
    }
    if (schoolRes.error) throw new BadRequestException(schoolRes.error.message)

    const schoolNameById = new Map(((schoolRes.data ?? []) as Array<{ id: string; name: string }>).map(row => [row.id, row.name]))

    return {
      settlements: ((settlementRes.data ?? []) as Array<{
        id: string
        school_id: string
        period_start: string | null
        period_end: string | null
        transaction_count: number
        gross_amount: number
        processor_fee_amount: number
        platform_fee_amount: number
        net_amount: number
        status: string
        payout_reference: string | null
        notes: string | null
        paid_at: string | null
        created_at: string
      }>).map(row => ({
        id: row.id,
        schoolId: row.school_id,
        schoolName: schoolNameById.get(row.school_id) ?? 'Unknown school',
        periodStart: row.period_start,
        periodEnd: row.period_end,
        transactionCount: Number(row.transaction_count ?? 0),
        grossAmount: Number(row.gross_amount ?? 0),
        processorFeeAmount: Number(row.processor_fee_amount ?? 0),
        platformFeeAmount: Number(row.platform_fee_amount ?? 0),
        netAmount: Number(row.net_amount ?? 0),
        status: row.status,
        payoutReference: row.payout_reference,
        notes: row.notes,
        paidAt: row.paid_at,
        createdAt: row.created_at,
      })),
    }
  }

  async createSettlement(user: AuthenticatedUser, body: SettlementCreateInput) {
    this.requireRole(user, ['super_admin'])
    if (!body.schoolId) {
      throw new BadRequestException('schoolId is required')
    }

    const db = this.supabaseService.admin
    let query = db
      .from('payment_transactions')
      .select('id, school_id, gross_amount, processor_fee_amount, platform_fee_amount, net_school_amount, created_at, settlement_id')
      .eq('school_id', body.schoolId)
      .eq('status', 'succeeded')
      .is('settlement_id', null)
      .order('created_at', { ascending: true })

    if (body.periodStart) {
      query = query.gte('created_at', `${body.periodStart}T00:00:00.000Z`)
    }
    if (body.periodEnd) {
      query = query.lte('created_at', `${body.periodEnd}T23:59:59.999Z`)
    }

    const { data: eligibleRows, error: eligibleError } = await query

    if (eligibleError) {
      if (this.isMissingRelationError(eligibleError.message, 'payment_transactions')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(eligibleError.message)
    }

    const transactions = (eligibleRows ?? []) as Array<{
      id: string
      school_id: string
      gross_amount: number
      processor_fee_amount: number
      platform_fee_amount: number
      net_school_amount: number
      created_at: string
      settlement_id: string | null
    }>

    if (!transactions.length) {
      throw new BadRequestException('No unsettled successful payments were found for this school in the selected period.')
    }

    const grossAmount = transactions.reduce((sum, row) => sum + Number(row.gross_amount ?? 0), 0)
    const processorFeeAmount = transactions.reduce((sum, row) => sum + Number(row.processor_fee_amount ?? 0), 0)
    const platformFeeAmount = transactions.reduce((sum, row) => sum + Number(row.platform_fee_amount ?? 0), 0)
    const netAmount = transactions.reduce((sum, row) => sum + Number(row.net_school_amount ?? 0), 0)
    const sortedDates = transactions.map(row => row.created_at.slice(0, 10)).sort()

    const { data: settlementRow, error: settlementError } = await db
      .from('school_settlements')
      .insert({
        school_id: body.schoolId,
        period_start: body.periodStart ?? sortedDates[0] ?? null,
        period_end: body.periodEnd ?? sortedDates[sortedDates.length - 1] ?? null,
        transaction_count: transactions.length,
        gross_amount: this.roundMoney(grossAmount),
        processor_fee_amount: this.roundMoney(processorFeeAmount),
        platform_fee_amount: this.roundMoney(platformFeeAmount),
        net_amount: this.roundMoney(netAmount),
        status: 'pending',
        notes: body.notes?.trim() || null,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (settlementError || !settlementRow) {
      if (this.isMissingRelationError(settlementError?.message, 'school_settlements')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(settlementError?.message ?? 'Could not create settlement.')
    }

    const settlementId = (settlementRow as { id: string }).id
    const transactionIds = transactions.map(row => row.id)

    const { error: linkError } = await db
      .from('payment_transactions')
      .update({ settlement_id: settlementId })
      .in('id', transactionIds)

    if (linkError) {
      if (this.isMissingRelationError(linkError.message, 'payment_transactions')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(linkError.message)
    }

    const { error: ledgerLinkError } = await db
      .from('payment_ledger_entries')
      .update({ settlement_id: settlementId })
      .in('payment_transaction_id', transactionIds)

    if (ledgerLinkError) {
      if (this.isMissingRelationError(ledgerLinkError.message, 'payment_ledger_entries')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(ledgerLinkError.message)
    }

    return {
      message: 'Settlement batch created.',
      settlementId,
      transactionCount: transactions.length,
      netAmount: this.roundMoney(netAmount),
    }
  }

  async approveSettlement(user: AuthenticatedUser, settlementId: string) {
    this.requireRole(user, ['super_admin'])

    const { data, error } = await this.supabaseService.admin
      .from('school_settlements')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', settlementId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (error) {
      if (this.isMissingRelationError(error.message, 'school_settlements')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(error.message)
    }
    if (!data) {
      throw new BadRequestException('Only pending settlements can be approved.')
    }

    return { message: 'Settlement approved.', settlementId }
  }

  async markSettlementPaid(user: AuthenticatedUser, settlementId: string, body: SettlementMarkPaidInput) {
    this.requireRole(user, ['super_admin'])

    const db = this.supabaseService.admin
    const { data: settlement, error: settlementError } = await db
      .from('school_settlements')
      .select('id, school_id, net_amount, status')
      .eq('id', settlementId)
      .maybeSingle()

    if (settlementError) {
      if (this.isMissingRelationError(settlementError.message, 'school_settlements')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(settlementError.message)
    }
    if (!settlement) {
      throw new NotFoundException('Settlement not found.')
    }
    if (!['approved', 'processing', 'pending'].includes(settlement.status)) {
      throw new BadRequestException('Only pending, approved, or processing settlements can be marked paid.')
    }

    const payoutReference = body.payoutReference?.trim() || `SET-${Date.now()}-${randomBytes(3).toString('hex')}`.toUpperCase()
    const paidAtIso = body.paidAt ? new Date(body.paidAt).toISOString() : new Date().toISOString()

    const { error: updateError } = await db
      .from('school_settlements')
      .update({
        status: 'paid',
        payout_reference: payoutReference,
        paid_at: paidAtIso,
        notes: body.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settlementId)

    if (updateError) {
      if (this.isMissingRelationError(updateError.message, 'school_settlements')) {
        this.throwSettlementMigrationRequired()
      }
      throw new BadRequestException(updateError.message)
    }

    await this.createSettlementDisbursementLedger(
      (settlement as { school_id: string }).school_id,
      settlementId,
      Number((settlement as { net_amount: number }).net_amount ?? 0),
      payoutReference,
    )

    return {
      message: 'Settlement marked as paid.',
      settlementId,
      payoutReference,
    }
  }

  async confirmSchoolSubscription(
    user: AuthenticatedUser,
    schoolId: string,
    body: ConfirmSchoolPaymentInput,
  ) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can confirm school subscription payments.')
    }

    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('amount must be greater than 0')
    }

    if (!body.paymentMethod?.trim()) {
      throw new BadRequestException('paymentMethod is required')
    }

    if (!body.paidAt) {
      throw new BadRequestException('paidAt is required')
    }

    const db = this.supabaseService.admin

    const { data: schoolData, error: schoolError } = await db
      .from('schools')
      .select('id, name, code, email, phone, subscription_plan, subscription_status, student_count')
      .eq('id', schoolId)
      .maybeSingle()

    if (schoolError) {
      throw new BadRequestException(schoolError.message)
    }

    if (!schoolData) {
      throw new NotFoundException('School not found')
    }

    const school = schoolData as SchoolRow
    const adminEmail = body.adminEmail?.trim() || school.email
    const adminName = body.adminName?.trim() || null
    const adminPhone = body.adminPhone?.trim() || school.phone || null

    if (!adminEmail) {
      throw new BadRequestException('An admin email is required before confirming the payment.')
    }

    const inviteToken = randomBytes(16).toString('hex')
    const invitePayload = {
      school_id: school.id,
      email: adminEmail,
      full_name: adminName,
      role: 'admin',
      token: inviteToken,
      status: 'pending',
    }

    const { data: existingInviteData, error: inviteLookupError } = await db
      .from('invitations')
      .select('id')
      .eq('school_id', school.id)
      .eq('email', adminEmail)
      .eq('role', 'admin')
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (inviteLookupError) {
      throw new BadRequestException(inviteLookupError.message)
    }

    let invitationId: string | null = null

    const existingInvite = existingInviteData?.[0]
    if (existingInvite && existingInvite.id) {
      invitationId = existingInvite.id as string
      const { error: inviteUpdateError } = await db
        .from('invitations')
        .update({
          ...invitePayload,
          status: 'pending',
        })
        .eq('id', invitationId)

      if (inviteUpdateError) {
        throw new BadRequestException(inviteUpdateError.message)
      }
    } else {
      const { data: insertedInviteData, error: inviteInsertError } = await db
        .from('invitations')
        .insert(invitePayload)
        .select('id')
        .single()

      if (inviteInsertError) {
        throw new BadRequestException(inviteInsertError.message)
      }

      invitationId = insertedInviteData.id as string
    }

    const paidAtIso = new Date(body.paidAt).toISOString()

    const { error: schoolUpdateError } = await db
      .from('schools')
      .update({
        subscription_status: 'active',
        subscription_confirmed_by: user.id,
        subscription_confirmed_at: new Date().toISOString(),
        subscription_payment_method: body.paymentMethod.trim(),
      })
      .eq('id', school.id)

    if (schoolUpdateError) {
      throw new BadRequestException(schoolUpdateError.message)
    }

    const estimatedMrr = Math.round((school.student_count ?? 0) * body.amount)
    const { error: platformSchoolError } = await db
      .from('platform_schools')
      .upsert({
        school_id: school.id,
        plan: school.subscription_plan,
        status: 'active',
        students_billed: school.student_count ?? 0,
        mrr_ngn: estimatedMrr,
        onboarded_at: new Date().toISOString(),
      }, { onConflict: 'school_id' })

    if (platformSchoolError) {
      throw new BadRequestException(platformSchoolError.message)
    }

    const { error: paymentError } = await db
      .from('platform_subscription_payments')
      .insert({
        school_id: school.id,
        amount: body.amount,
        payment_method: body.paymentMethod.trim(),
        reference: body.reference?.trim() || null,
        paid_at: paidAtIso,
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.id,
        notes: body.notes?.trim() || null,
        status: 'confirmed',
        invitation_id: invitationId,
      })

    if (paymentError) {
      throw new BadRequestException(paymentError.message)
    }

    return {
      message: 'School subscription payment confirmed.',
      school: {
        id: school.id,
        name: school.name,
        code: school.code,
        subscriptionStatus: 'active',
      },
      invitation: {
        id: invitationId,
        email: adminEmail,
        fullName: adminName,
        token: inviteToken,
      },
    }
  }
}
