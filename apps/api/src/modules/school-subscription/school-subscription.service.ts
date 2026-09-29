import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomBytes } from 'node:crypto'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { SupabaseService } from '../../providers/supabase/supabase.service.js'

const DEFAULT_RATE_NGN = 850

type SchoolRow = {
  id: string
  name: string
  subscription_plan: string | null
  subscription_status: string | null
}

type PlatformSchoolRow = {
  custom_rate_ngn: number | null
  trial_ends_at: string | null
}

type PaymentRow = {
  id: string
  school_id: string
  amount: number
  payment_method: string
  reference: string | null
  paid_at: string
  notes: string | null
  status: string
  created_at: string
}

type PaystackVerifyResponse = {
  status: boolean
  message: string
  data?: {
    status?: string
    reference?: string
    amount?: number
    currency?: string
    paid_at?: string
    metadata?: { purpose?: string; school_id?: string; student_count?: number } | string
  }
}

@Injectable()
export class SchoolSubscriptionService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  private get db() {
    return this.supabaseService.admin
  }

  // ── Guards / lookups ──────────────────────────────────────────────────────

  private ensureSchoolAdmin(user: AuthenticatedUser) {
    if (user.role !== 'admin' || !user.schoolId) {
      throw new ForbiddenException('Only school admins can manage their school subscription.')
    }
    return user.schoolId
  }

  private ensureSuperAdmin(user: AuthenticatedUser) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can review subscription payments.')
    }
  }

  private async getSchool(schoolId: string) {
    const { data, error } = await this.db
      .from('schools')
      .select('id, name, subscription_plan, subscription_status')
      .eq('id', schoolId)
      .maybeSingle()
    if (error) throw new InternalServerErrorException(error.message)
    if (!data) throw new NotFoundException('School not found.')
    return data as SchoolRow
  }

  private async getPlatformSchool(schoolId: string) {
    const { data, error } = await this.db
      .from('platform_schools')
      .select('custom_rate_ngn, trial_ends_at')
      .eq('school_id', schoolId)
      .maybeSingle()
    if (error) throw new InternalServerErrorException(error.message)
    return data as PlatformSchoolRow | null
  }

  private async getPlatformConfig() {
    const { data, error } = await this.db
      .from('platform_config')
      .select('per_student_price, bank_name, bank_account_name, bank_account_number')
      .maybeSingle()
    if (error) throw new InternalServerErrorException(error.message)
    return data as {
      per_student_price: number | null
      bank_name: string | null
      bank_account_name: string | null
      bank_account_number: string | null
    } | null
  }

  /** Same rate the super admin's invoice generator uses: custom rate, else the platform price. */
  private async getRate(schoolId: string) {
    const [platform, config] = await Promise.all([this.getPlatformSchool(schoolId), this.getPlatformConfig()])
    return Number(platform?.custom_rate_ngn ?? config?.per_student_price ?? DEFAULT_RATE_NGN)
  }

  private async countStudents(schoolId: string) {
    const { count, error } = await this.db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('role', 'student')
      .eq('is_active', true)
    if (error) throw new InternalServerErrorException(error.message)
    return count ?? 0
  }

  private parseStudentCount(value: unknown) {
    const count = Number(value)
    if (!Number.isInteger(count) || count <= 0) {
      throw new BadRequestException('studentCount must be a positive whole number.')
    }
    return count
  }

  private async ensureNoPendingTransfer(schoolId: string) {
    const { data, error } = await this.db
      .from('platform_subscription_payments')
      .select('id')
      .eq('school_id', schoolId)
      .eq('status', 'pending_review')
      .limit(1)
    if (error) throw new InternalServerErrorException(error.message)
    if (data?.length) {
      throw new ConflictException('You already have a bank transfer awaiting confirmation.')
    }
  }

  private async activate(schoolId: string, params: {
    paymentMethod: string
    confirmedBy: string | null
    studentCount: number
    rate: number
  }) {
    const now = new Date().toISOString()
    const school = await this.getSchool(schoolId)
    const plan = school.subscription_plan && school.subscription_plan !== 'free' ? school.subscription_plan : 'starter'

    const { error: schoolError } = await this.db
      .from('schools')
      .update({
        subscription_plan: plan,
        subscription_status: 'active',
        subscription_payment_method: params.paymentMethod,
        subscription_confirmed_by: params.confirmedBy,
        subscription_confirmed_at: now,
      })
      .eq('id', schoolId)
    if (schoolError) throw new InternalServerErrorException(schoolError.message)

    const { error: platformError } = await this.db
      .from('platform_schools')
      .upsert({
        school_id: schoolId,
        plan,
        status: 'active',
        students_billed: params.studentCount,
        mrr_ngn: params.studentCount * params.rate,
      }, { onConflict: 'school_id' })
    if (platformError) throw new InternalServerErrorException(platformError.message)
  }

  // ── School admin ──────────────────────────────────────────────────────────

  async getOverview(user: AuthenticatedUser) {
    const schoolId = this.ensureSchoolAdmin(user)
    const [school, platform, config, studentCount, paymentsRes] = await Promise.all([
      this.getSchool(schoolId),
      this.getPlatformSchool(schoolId),
      this.getPlatformConfig(),
      this.countStudents(schoolId),
      this.db
        .from('platform_subscription_payments')
        .select('id, amount, payment_method, reference, paid_at, status, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    if (paymentsRes.error) throw new InternalServerErrorException(paymentsRes.error.message)

    const rate = Number(platform?.custom_rate_ngn ?? config?.per_student_price ?? DEFAULT_RATE_NGN)
    const payments = (paymentsRes.data ?? []) as PaymentRow[]

    return {
      school: {
        id: school.id,
        name: school.name,
        plan: school.subscription_plan ?? 'free',
        status: school.subscription_status ?? 'trial',
        trialEndsAt: platform?.trial_ends_at ?? null,
      },
      pricing: { ratePerStudent: rate, currency: 'NGN', activeStudents: studentCount },
      bankDetails: config?.bank_account_number
        ? {
            bankName: config.bank_name,
            accountName: config.bank_account_name,
            accountNumber: config.bank_account_number,
          }
        : null,
      paystackEnabled: Boolean(this.configService.get<string>('PAYSTACK_SECRET_KEY')?.trim()),
      pendingTransfer: payments.find(p => p.status === 'pending_review') ?? null,
      payments: payments.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.payment_method,
        reference: p.reference,
        paidAt: p.paid_at,
        status: p.status,
      })),
    }
  }

  async submitBankTransfer(
    user: AuthenticatedUser,
    body: { studentCount?: number; reference?: string; paidAt?: string; notes?: string },
  ) {
    const schoolId = this.ensureSchoolAdmin(user)
    const studentCount = this.parseStudentCount(body.studentCount)
    const reference = body.reference?.trim()
    if (!reference) throw new BadRequestException('reference is required.')
    const paidAt = body.paidAt ? new Date(body.paidAt) : null
    if (!paidAt || Number.isNaN(paidAt.getTime())) throw new BadRequestException('paidAt must be a valid date.')

    await this.ensureNoPendingTransfer(schoolId)
    const rate = await this.getRate(schoolId)
    const amount = studentCount * rate

    const { data, error } = await this.db
      .from('platform_subscription_payments')
      .insert({
        school_id: schoolId,
        amount,
        payment_method: 'bank_transfer',
        reference,
        paid_at: paidAt.toISOString(),
        status: 'pending_review',
        notes: [
          `Submitted by school admin (${user.email ?? user.id}) for ${studentCount} students at ₦${rate}/student.`,
          body.notes?.trim(),
        ].filter(Boolean).join(' '),
      })
      .select('id')
      .single()
    if (error) throw new InternalServerErrorException(error.message)

    return {
      message: 'Transfer submitted. Learnora will activate your subscription once it is confirmed.',
      payment: { id: (data as { id: string }).id, amount, status: 'pending_review' },
    }
  }

  private getPaystackSecret() {
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY')?.trim()
    if (!secret) throw new BadRequestException('Online payment is not available right now.')
    return secret
  }

  async initializePaystack(user: AuthenticatedUser, body: { studentCount?: number; callbackUrl?: string }) {
    const schoolId = this.ensureSchoolAdmin(user)
    const studentCount = this.parseStudentCount(body.studentCount)
    if (!user.email) throw new BadRequestException('Your account has no email address for the receipt.')
    const callbackUrl = body.callbackUrl?.trim()
    if (!callbackUrl) throw new BadRequestException('callbackUrl is required.')

    const rate = await this.getRate(schoolId)
    const amount = studentCount * rate
    const reference = `LSUB-${Date.now()}-${randomBytes(4).toString('hex')}`

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.getPaystackSecret()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(amount * 100),
        currency: 'NGN',
        reference,
        callback_url: callbackUrl,
        metadata: { purpose: 'school_subscription', school_id: schoolId, student_count: studentCount },
      }),
    })
    const payload = await response.json().catch(() => ({})) as {
      status?: boolean
      message?: string
      data?: { authorization_url?: string }
    }
    if (!response.ok || !payload.status || !payload.data?.authorization_url) {
      throw new BadRequestException(payload.message || 'Could not start Paystack payment.')
    }

    return { authorizationUrl: payload.data.authorization_url, reference, amount }
  }

  async verifyPaystack(user: AuthenticatedUser, body: { reference?: string }) {
    const schoolId = this.ensureSchoolAdmin(user)
    const reference = body.reference?.trim()
    if (!reference) throw new BadRequestException('reference is required.')
    return this.confirmPaystackPayment(reference, schoolId)
  }

  /**
   * Verifies a subscription payment with Paystack and activates the school.
   * Called by the admin's callback page (expectedSchoolId set) and by the
   * Paystack webhook (expectedSchoolId null). Safe to call more than once.
   */
  async confirmPaystackPayment(reference: string, expectedSchoolId: string | null) {
    const { data: existing, error: existingError } = await this.db
      .from('platform_subscription_payments')
      .select('id, school_id')
      .eq('reference', reference)
      .eq('payment_method', 'paystack')
      .maybeSingle()
    if (existingError) throw new InternalServerErrorException(existingError.message)
    if (existing) {
      if (expectedSchoolId && (existing as { school_id: string }).school_id !== expectedSchoolId) {
        throw new ForbiddenException('This payment belongs to a different school.')
      }
      return { message: 'Payment already confirmed.', status: 'active', duplicate: true }
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${this.getPaystackSecret()}` },
    })
    const payload = await response.json().catch(() => ({})) as PaystackVerifyResponse
    const tx = payload.data
    if (!response.ok || !payload.status || !tx) {
      throw new BadRequestException(payload.message || 'Could not verify payment.')
    }
    if (tx.status !== 'success') {
      throw new BadRequestException(`Payment was not successful (status: ${tx.status ?? 'unknown'}).`)
    }

    const metadata = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata ?? {})
    const schoolId = typeof metadata.school_id === 'string' ? metadata.school_id : ''
    if (metadata.purpose !== 'school_subscription' || !schoolId || (expectedSchoolId && schoolId !== expectedSchoolId)) {
      throw new ForbiddenException('This payment is not a subscription payment for your school.')
    }

    const amount = Number(tx.amount ?? 0) / 100
    const studentCount = Number(metadata.student_count) || 0
    const rate = await this.getRate(schoolId)

    const { error: insertError } = await this.db.from('platform_subscription_payments').insert({
      school_id: schoolId,
      amount,
      currency: tx.currency ?? 'NGN',
      payment_method: 'paystack',
      reference,
      paid_at: tx.paid_at ?? new Date().toISOString(),
      status: 'confirmed',
      notes: `Paystack payment for ${studentCount} students.`,
    })
    if (insertError) {
      // 23505: a concurrent verify/webhook already recorded this reference.
      if (insertError.code === '23505') return { message: 'Payment already confirmed.', status: 'active', duplicate: true }
      throw new InternalServerErrorException(insertError.message)
    }

    await this.activate(schoolId, { paymentMethod: 'paystack', confirmedBy: null, studentCount, rate })
    return { message: 'Payment confirmed. Your subscription is now active.', status: 'active', amount, duplicate: false }
  }

  // ── Super admin review of bank transfers ─────────────────────────────────

  async listPendingTransfers(user: AuthenticatedUser) {
    this.ensureSuperAdmin(user)
    const { data, error } = await this.db
      .from('platform_subscription_payments')
      .select('id, school_id, amount, reference, paid_at, notes, created_at, schools(name)')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })
    if (error) throw new InternalServerErrorException(error.message)

    return {
      payments: (data ?? []).map(row => {
        const r = row as unknown as PaymentRow & { schools: { name: string } | null }
        return {
          id: r.id,
          schoolId: r.school_id,
          schoolName: r.schools?.name ?? 'Unknown school',
          amount: Number(r.amount),
          reference: r.reference,
          paidAt: r.paid_at,
          notes: r.notes,
          submittedAt: r.created_at,
        }
      }),
    }
  }

  private async getPendingPayment(paymentId: string) {
    const { data, error } = await this.db
      .from('platform_subscription_payments')
      .select('id, school_id, amount, payment_method, reference, paid_at, notes, status, created_at')
      .eq('id', paymentId)
      .maybeSingle()
    if (error) throw new InternalServerErrorException(error.message)
    if (!data) throw new NotFoundException('Payment not found.')
    const payment = data as PaymentRow
    if (payment.status !== 'pending_review') {
      throw new ConflictException(`This payment has already been ${payment.status}.`)
    }
    return payment
  }

  async approveTransfer(user: AuthenticatedUser, paymentId: string) {
    this.ensureSuperAdmin(user)
    const payment = await this.getPendingPayment(paymentId)
    const rate = await this.getRate(payment.school_id)

    const { error } = await this.db
      .from('platform_subscription_payments')
      .update({ status: 'confirmed', confirmed_by: user.id, confirmed_at: new Date().toISOString() })
      .eq('id', paymentId)
      .eq('status', 'pending_review')
    if (error) throw new InternalServerErrorException(error.message)

    await this.activate(payment.school_id, {
      paymentMethod: 'bank_transfer',
      confirmedBy: user.id,
      studentCount: rate > 0 ? Math.round(Number(payment.amount) / rate) : 0,
      rate,
    })
    return { message: 'Transfer confirmed and subscription activated.' }
  }

  async rejectTransfer(user: AuthenticatedUser, paymentId: string, body: { reason?: string }) {
    this.ensureSuperAdmin(user)
    const payment = await this.getPendingPayment(paymentId)
    const reason = body.reason?.trim()

    const { error } = await this.db
      .from('platform_subscription_payments')
      .update({
        status: 'rejected',
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
        notes: [payment.notes, reason ? `Rejected: ${reason}` : 'Rejected.'].filter(Boolean).join(' '),
      })
      .eq('id', paymentId)
      .eq('status', 'pending_review')
    if (error) throw new InternalServerErrorException(error.message)

    return { message: 'Transfer rejected.' }
  }
}
