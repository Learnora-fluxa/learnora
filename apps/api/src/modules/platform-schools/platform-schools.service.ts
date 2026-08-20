import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { SupabaseService } from '../../providers/supabase/supabase.service.js'

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

type PlatformSchoolRow = {
  school_id: string
  plan: string | null
  status: string | null
  students_billed: number | null
  mrr_ngn: number | null
  onboarded_at: string | null
  custom_rate_ngn: number | null
  rate_reason: string | null
  trial_ends_at: string | null
}

type AdminProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

@Injectable()
export class PlatformSchoolsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private isMissingColumn(errorMessage: string, column: string) {
    return errorMessage.includes(`'${column}' column`) || errorMessage.includes(`column ${column} does not exist`)
  }

  private isMissingTable(errorMessage: string, table: string) {
    return errorMessage.includes(`relation "${table}" does not exist`) || errorMessage.includes(`Could not find the table '${table}'`)
  }

  private migrationRequired(feature: string) {
    throw new BadRequestException(
      `${feature} requires database migration 009_platform_school_actions.sql to be applied.`,
    )
  }

  private ensureSuperAdmin(user: AuthenticatedUser) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can manage platform schools.')
    }
  }

  private async getSchoolOrThrow(schoolId: string) {
    const { data, error } = await this.supabaseService.admin
      .from('schools')
      .select('id, name, code, email, phone, subscription_plan, subscription_status, student_count')
      .eq('id', schoolId)
      .maybeSingle()

    if (error) throw new BadRequestException(error.message)
    if (!data) throw new NotFoundException('School not found.')
    return data as SchoolRow
  }

  private async getPlatformSchool(schoolId: string) {
    const { data, error } = await this.supabaseService.admin
      .from('platform_schools')
      .select('school_id, plan, status, students_billed, mrr_ngn, onboarded_at, custom_rate_ngn, rate_reason, trial_ends_at')
      .eq('school_id', schoolId)
      .maybeSingle()

    if (!error) return (data ?? null) as PlatformSchoolRow | null

    if (
      this.isMissingColumn(error.message, 'custom_rate_ngn') ||
      this.isMissingColumn(error.message, 'rate_reason') ||
      this.isMissingColumn(error.message, 'trial_ends_at')
    ) {
      const fallback = await this.supabaseService.admin
        .from('platform_schools')
        .select('school_id, plan, status, students_billed, mrr_ngn, onboarded_at')
        .eq('school_id', schoolId)
        .maybeSingle()

      if (fallback.error) throw new BadRequestException(fallback.error.message)

      if (!fallback.data) return null
      return {
        ...(fallback.data as Omit<PlatformSchoolRow, 'custom_rate_ngn' | 'rate_reason' | 'trial_ends_at'>),
        custom_rate_ngn: null,
        rate_reason: null,
        trial_ends_at: null,
      }
    }

    throw new BadRequestException(error.message)
  }

  private async getAdminProfile(schoolId: string) {
    const { data, error } = await this.supabaseService.admin
      .from('profiles')
      .select('id, full_name, email')
      .eq('school_id', schoolId)
      .eq('role', 'admin')
      .order('created_at', { ascending: true })
      .limit(1)

    if (error) throw new BadRequestException(error.message)
    return (data?.[0] ?? null) as AdminProfileRow | null
  }

  private async getBaseRate() {
    const { data, error } = await this.supabaseService.admin
      .from('platform_config')
      .select('per_student_price')
      .maybeSingle()

    if (error) throw new BadRequestException(error.message)
    return Number((data as { per_student_price?: number | null } | null)?.per_student_price ?? 850)
  }

  private async writeAuditLog(
    user: AuthenticatedUser,
    schoolId: string | null,
    action: string,
    type: 'create' | 'update' | 'delete' | 'system' | 'login',
    metadata?: Record<string, unknown>,
  ) {
    const payload = {
      school_id: schoolId,
      user_id: user.id,
      action,
      type,
      module: 'platform-schools',
      metadata: metadata ?? null,
    }

    const { error } = await this.supabaseService.admin
      .from('audit_logs')
      .insert(payload)

    if (!error) return

    if (error.message.includes("'metadata' column")) {
      const { error: fallbackError } = await this.supabaseService.admin
        .from('audit_logs')
        .insert({
          school_id: schoolId,
          user_id: user.id,
          action,
          type,
          module: 'platform-schools',
        })

      if (!fallbackError) return
      throw new InternalServerErrorException(`Audit log write failed: ${fallbackError.message}`)
    }

    throw new InternalServerErrorException(`Audit log write failed: ${error.message}`)
  }

  async updatePlan(user: AuthenticatedUser, schoolId: string, body: { plan?: string }) {
    this.ensureSuperAdmin(user)
    const nextPlan = body.plan?.trim().toLowerCase()
    if (!nextPlan) throw new BadRequestException('plan is required')

    const school = await this.getSchoolOrThrow(schoolId)
    const { error: schoolError } = await this.supabaseService.admin
      .from('schools')
      .update({ subscription_plan: nextPlan })
      .eq('id', schoolId)

    if (schoolError) throw new BadRequestException(schoolError.message)

    const { error: platformError } = await this.supabaseService.admin
      .from('platform_schools')
      .upsert({ school_id: schoolId, plan: nextPlan }, { onConflict: 'school_id' })

    if (platformError) throw new BadRequestException(platformError.message)

    await this.writeAuditLog(user, schoolId, `Changed ${school.name} plan to ${nextPlan}.`, 'update', {
      previousPlan: school.subscription_plan,
      nextPlan,
    })

    return {
      message: 'School plan updated.',
      school: { id: school.id, name: school.name, plan: nextPlan },
    }
  }

  async updateRate(user: AuthenticatedUser, schoolId: string, body: { rate?: number; reason?: string }) {
    this.ensureSuperAdmin(user)
    const rate = Number(body.rate)
    const reason = body.reason?.trim()

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new BadRequestException('rate must be greater than 0')
    }
    if (!reason) {
      throw new BadRequestException('reason is required')
    }

    const school = await this.getSchoolOrThrow(schoolId)
    const { error } = await this.supabaseService.admin
      .from('platform_schools')
      .upsert({
        school_id: schoolId,
        custom_rate_ngn: rate,
        rate_reason: reason,
        rate_updated_at: new Date().toISOString(),
        rate_updated_by: user.id,
      }, { onConflict: 'school_id' })

    if (error) {
      if (
        this.isMissingColumn(error.message, 'custom_rate_ngn') ||
        this.isMissingColumn(error.message, 'rate_reason') ||
        this.isMissingColumn(error.message, 'rate_updated_at') ||
        this.isMissingColumn(error.message, 'rate_updated_by')
      ) {
        this.migrationRequired('Custom school rates')
      }
      throw new BadRequestException(error.message)
    }

    await this.writeAuditLog(user, schoolId, `Set custom rate for ${school.name}.`, 'update', {
      rate,
      reason,
    })

    return {
      message: 'Custom rate saved.',
      school: { id: school.id, name: school.name },
      rate,
      reason,
    }
  }

  async extendTrial(user: AuthenticatedUser, schoolId: string, body: { days?: number }) {
    this.ensureSuperAdmin(user)
    const days = Number(body.days)
    if (!Number.isInteger(days) || days <= 0) {
      throw new BadRequestException('days must be a positive integer')
    }

    const school = await this.getSchoolOrThrow(schoolId)
    const currentPlatform = await this.getPlatformSchool(schoolId)
    const now = new Date()
    const baseDate = currentPlatform?.trial_ends_at && new Date(currentPlatform.trial_ends_at) > now
      ? new Date(currentPlatform.trial_ends_at)
      : now
    baseDate.setDate(baseDate.getDate() + days)
    const trialEndsAt = baseDate.toISOString()

    const [schoolRes, platformRes] = await Promise.all([
      this.supabaseService.admin.from('schools').update({ subscription_status: 'trial' }).eq('id', schoolId),
      this.supabaseService.admin.from('platform_schools').upsert({
        school_id: schoolId,
        status: 'trial',
        trial_ends_at: trialEndsAt,
        trial_extended_at: new Date().toISOString(),
        trial_extended_by: user.id,
      }, { onConflict: 'school_id' }),
    ])

    if (schoolRes.error) throw new BadRequestException(schoolRes.error.message)
    if (platformRes.error) {
      if (
        this.isMissingColumn(platformRes.error.message, 'trial_ends_at') ||
        this.isMissingColumn(platformRes.error.message, 'trial_extended_at') ||
        this.isMissingColumn(platformRes.error.message, 'trial_extended_by')
      ) {
        this.migrationRequired('Trial extension')
      }
      throw new BadRequestException(platformRes.error.message)
    }

    await this.writeAuditLog(user, schoolId, `Extended ${school.name} trial by ${days} days.`, 'update', {
      days,
      trialEndsAt,
    })

    return {
      message: 'Trial extended.',
      school: { id: school.id, name: school.name, trialEndsAt },
    }
  }

  async generateInvoice(
    user: AuthenticatedUser,
    schoolId: string,
    body: { termLabel?: string; studentCount?: number; dueDate?: string | null },
  ) {
    this.ensureSuperAdmin(user)
    const termLabel = body.termLabel?.trim()
    const studentCount = Number(body.studentCount)
    if (!termLabel) throw new BadRequestException('termLabel is required')
    if (!Number.isInteger(studentCount) || studentCount <= 0) {
      throw new BadRequestException('studentCount must be a positive integer')
    }

    const school = await this.getSchoolOrThrow(schoolId)
    const platform = await this.getPlatformSchool(schoolId)
    const baseRate = await this.getBaseRate()
    const rate = Number(platform?.custom_rate_ngn ?? baseRate)
    const totalAmount = rate * studentCount

    const { data, error } = await this.supabaseService.admin
      .from('platform_invoices')
      .insert({
        school_id: schoolId,
        term_label: termLabel,
        student_count: studentCount,
        rate_per_student_ngn: rate,
        total_amount_ngn: totalAmount,
        due_date: body.dueDate ?? null,
        status: 'generated',
        generated_at: new Date().toISOString(),
        generated_by: user.id,
      })
      .select('id')
      .single()

    if (error) {
      if (this.isMissingTable(error.message, 'platform_invoices')) {
        this.migrationRequired('Platform invoice generation')
      }
      throw new BadRequestException(error.message)
    }

    await this.writeAuditLog(user, schoolId, `Generated platform invoice for ${school.name}.`, 'create', {
      termLabel,
      studentCount,
      rate,
      totalAmount,
    })

    return {
      message: 'Platform invoice generated.',
      invoice: {
        id: (data as { id: string }).id,
        termLabel,
        studentCount,
        rate,
        totalAmount,
      },
    }
  }

  async resetAdminPassword(user: AuthenticatedUser, schoolId: string, body: { redirectTo?: string }) {
    this.ensureSuperAdmin(user)
    const school = await this.getSchoolOrThrow(schoolId)
    const adminProfile = await this.getAdminProfile(schoolId)
    const adminEmail = adminProfile?.email?.trim() || school.email?.trim()
    if (!adminEmail) {
      throw new BadRequestException('No admin email is configured for this school.')
    }

    const { error } = await this.supabaseService.admin.auth.resetPasswordForEmail(adminEmail, {
      redirectTo: body.redirectTo,
    })

    if (error) throw new BadRequestException(error.message)

    await this.writeAuditLog(user, schoolId, `Sent password reset email to ${adminEmail}.`, 'system', {
      adminEmail,
    })

    return {
      message: 'Password reset email sent.',
      adminEmail,
    }
  }

  async impersonateAdmin(user: AuthenticatedUser, schoolId: string, body: { redirectTo?: string }) {
    this.ensureSuperAdmin(user)
    const school = await this.getSchoolOrThrow(schoolId)
    const adminProfile = await this.getAdminProfile(schoolId)
    const adminEmail = adminProfile?.email?.trim() || school.email?.trim()
    if (!adminEmail) {
      throw new BadRequestException('No admin email is configured for this school.')
    }

    const { data, error } = await this.supabaseService.admin.auth.admin.generateLink({
      type: 'magiclink',
      email: adminEmail,
      options: {
        redirectTo: body.redirectTo,
      },
    })

    if (error) throw new BadRequestException(error.message)

    const actionLink = data?.properties?.action_link
    if (!actionLink) {
      throw new InternalServerErrorException('No impersonation link was generated.')
    }

    await this.writeAuditLog(user, schoolId, `Generated impersonation link for ${adminEmail}.`, 'login', {
      adminEmail,
      impersonatedUserId: adminProfile?.id ?? null,
    })

    return {
      message: 'Impersonation link generated.',
      adminEmail,
      actionLink,
    }
  }

  async suspendSchool(user: AuthenticatedUser, schoolId: string, body: { reason?: string }) {
    this.ensureSuperAdmin(user)
    const school = await this.getSchoolOrThrow(schoolId)
    const reason = body.reason?.trim() || null

    const [schoolRes, platformRes, profileRes] = await Promise.all([
      this.supabaseService.admin
        .from('schools')
        .update({ subscription_status: 'suspended' })
        .eq('id', schoolId),
      this.supabaseService.admin
        .from('platform_schools')
        .upsert({
          school_id: schoolId,
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          suspended_by: user.id,
          suspension_reason: reason,
        }, { onConflict: 'school_id' }),
      this.supabaseService.admin
        .from('profiles')
        .update({ is_active: false })
        .eq('school_id', schoolId),
    ])

    if (schoolRes.error) throw new BadRequestException(schoolRes.error.message)
    if (platformRes.error) {
      if (
        this.isMissingColumn(platformRes.error.message, 'suspended_at') ||
        this.isMissingColumn(platformRes.error.message, 'suspended_by') ||
        this.isMissingColumn(platformRes.error.message, 'suspension_reason')
      ) {
        const fallbackPlatformRes = await this.supabaseService.admin
          .from('platform_schools')
          .upsert({ school_id: schoolId, status: 'suspended' }, { onConflict: 'school_id' })

        if (fallbackPlatformRes.error) throw new BadRequestException(fallbackPlatformRes.error.message)
      } else {
        throw new BadRequestException(platformRes.error.message)
      }
    }
    if (profileRes.error) throw new BadRequestException(profileRes.error.message)

    await this.writeAuditLog(user, schoolId, `Suspended ${school.name}.`, 'update', {
      reason,
    })

    return {
      message: 'School suspended.',
      school: { id: school.id, name: school.name, status: 'suspended' },
    }
  }

  async deleteSchool(user: AuthenticatedUser, schoolId: string) {
    this.ensureSuperAdmin(user)
    const school = await this.getSchoolOrThrow(schoolId)
    const adminProfileRows = await this.supabaseService.admin
      .from('profiles')
      .select('id')
      .eq('school_id', schoolId)

    if (adminProfileRows.error) throw new BadRequestException(adminProfileRows.error.message)
    const profileIds = (adminProfileRows.data ?? []).map((row) => (row as { id: string }).id)

    const tables = [
      'platform_invoices',
      'platform_subscription_payments',
      'audit_logs',
      'feature_flags',
      'support_tickets',
      'notifications',
      'announcements',
      'report_cards',
      'grade_summaries',
      'payments',
      'invoices',
      'fee_structures',
      'live_attendance',
      'session_recordings',
      'live_sessions',
      'attendance_records',
      'grades',
      'assignment_submissions',
      'assignments',
      'course_resources',
      'lesson_progress',
      'lessons',
      'modules',
      'courses',
      'messages',
      'conversation_members',
      'conversations',
      'teacher_assignments',
      'class_enrollments',
      'class_subjects',
      'calendar_events',
      'subjects',
      'classes',
      'terms',
      'parent_student_links',
      'ai_messages',
      'ai_sessions',
      'ai_response_cache',
      'invitations',
      'platform_schools',
    ]

    for (const table of tables) {
      const { error } = await this.supabaseService.admin
        .from(table)
        .delete()
        .eq('school_id', schoolId)

      if (error) throw new BadRequestException(`Failed to delete ${table}: ${error.message}`)
    }

    if (profileIds.length > 0) {
      const { error: profileDeleteError } = await this.supabaseService.admin
        .from('profiles')
        .delete()
        .eq('school_id', schoolId)

      if (profileDeleteError) throw new BadRequestException(profileDeleteError.message)

      for (const profileId of profileIds) {
        const { error } = await this.supabaseService.admin.auth.admin.deleteUser(profileId)
        if (error) throw new BadRequestException(`Failed to delete auth user ${profileId}: ${error.message}`)
      }
    }

    await this.writeAuditLog(user, schoolId, `Deleted school ${school.name}.`, 'delete', {
      schoolName: school.name,
      schoolCode: school.code,
    })

    const { error: schoolDeleteError } = await this.supabaseService.admin
      .from('schools')
      .delete()
      .eq('id', schoolId)

    if (schoolDeleteError) throw new BadRequestException(schoolDeleteError.message)

    return {
      message: 'School deleted permanently.',
      school: { id: school.id, name: school.name },
    }
  }
}
