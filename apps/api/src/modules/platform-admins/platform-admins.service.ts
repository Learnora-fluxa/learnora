import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { timingSafeEqual } from 'node:crypto'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { SupabaseService } from '../../providers/supabase/supabase.service.js'
import type { CreateSuperAdminBody } from './platform-admins.types.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

type NormalizedInput = {
  email: string
  fullName: string
  password: string | null
  phone: string | null
  redirectTo: string | undefined
}

@Injectable()
export class PlatformAdminsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  private ensureSuperAdmin(user: AuthenticatedUser) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can create super admins.')
    }
  }

  private normalize(body: CreateSuperAdminBody): NormalizedInput {
    const email = body.email?.trim().toLowerCase() ?? ''
    const fullName = body.fullName?.trim() ?? ''
    const password = body.password ?? null
    const phone = body.phone?.trim() || null

    if (!email || !EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('A valid email is required.')
    }
    if (!fullName) {
      throw new BadRequestException('fullName is required.')
    }
    if (password !== null && (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH)) {
      throw new BadRequestException(`password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
    }

    return { email, fullName, password, phone, redirectTo: body.redirectTo?.trim() || undefined }
  }

  private async countSuperAdmins() {
    const { count, error } = await this.supabaseService.admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'super_admin')

    if (error) throw new InternalServerErrorException(error.message)
    return count ?? 0
  }

  private async ensureEmailAvailable(email: string) {
    const { data, error } = await this.supabaseService.admin
      .from('profiles')
      .select('id, role')
      .ilike('email', email)
      .limit(1)

    if (error) throw new InternalServerErrorException(error.message)
    const existing = data?.[0] as { id: string; role: string } | undefined
    if (existing) {
      throw new ConflictException(
        existing.role === 'super_admin'
          ? 'A super admin with this email already exists.'
          : `An account with this email already exists (role: ${existing.role}).`,
      )
    }
  }

  private async writeAuditLog(actorId: string, action: string, metadata: Record<string, unknown>) {
    const base = {
      school_id: null,
      user_id: actorId,
      action,
      type: 'create' as const,
      module: 'platform-admins',
    }

    const { error } = await this.supabaseService.admin
      .from('audit_logs')
      .insert({ ...base, metadata })

    if (!error) return

    if (error.message.includes("'metadata' column")) {
      const { error: fallbackError } = await this.supabaseService.admin.from('audit_logs').insert(base)
      if (!fallbackError) return
      console.warn(`[platform-admins] audit log write failed: ${fallbackError.message}`)
      return
    }

    // The account already exists at this point, so don't fail the request
    // over an audit log write -- just surface it in the server logs.
    console.warn(`[platform-admins] audit log write failed: ${error.message}`)
  }

  private async create(input: NormalizedInput, actorId: string | null) {
    await this.ensureEmailAvailable(input.email)

    const { data: created, error: createError } = await this.supabaseService.admin.auth.admin.createUser({
      email: input.email,
      email_confirm: true,
      ...(input.password ? { password: input.password } : {}),
      user_metadata: { full_name: input.fullName },
      app_metadata: { role: 'super_admin' },
    })

    if (createError || !created?.user) {
      const message = createError?.message ?? 'Failed to create auth user.'
      if (/already (been )?registered|already exists/i.test(message)) {
        throw new ConflictException('An auth user with this email already exists.')
      }
      throw new BadRequestException(message)
    }

    const userId = created.user.id

    // The on_auth_user_created trigger inserts a default (student) profile,
    // so upsert to promote it to super_admin with no school.
    const { error: profileError } = await this.supabaseService.admin
      .from('profiles')
      .upsert(
        {
          id: userId,
          email: input.email,
          full_name: input.fullName,
          phone: input.phone,
          role: 'super_admin',
          school_id: null,
          is_active: true,
        },
        { onConflict: 'id' },
      )

    if (profileError) {
      // Roll back the auth user so we don't leave a half-created account.
      await this.supabaseService.admin.auth.admin.deleteUser(userId)
      throw new InternalServerErrorException(`Failed to create super admin profile: ${profileError.message}`)
    }

    // No password supplied -> give back a link so the person can set one.
    let passwordSetupLink: string | null = null
    if (!input.password) {
      const { data: link, error: linkError } = await this.supabaseService.admin.auth.admin.generateLink({
        type: 'recovery',
        email: input.email,
        options: { redirectTo: input.redirectTo },
      })
      if (linkError) {
        console.warn(`[platform-admins] could not generate password setup link: ${linkError.message}`)
      } else {
        passwordSetupLink = link?.properties?.action_link ?? null
      }
    }

    await this.writeAuditLog(actorId ?? userId, `Created super admin ${input.email}.`, {
      superAdminId: userId,
      email: input.email,
      bootstrap: actorId === null,
    })

    return {
      message: 'Super admin created.',
      superAdmin: {
        id: userId,
        email: input.email,
        fullName: input.fullName,
        phone: input.phone,
        role: 'super_admin' as const,
      },
      passwordSetupLink,
    }
  }

  async createSuperAdmin(user: AuthenticatedUser, body: CreateSuperAdminBody) {
    this.ensureSuperAdmin(user)
    return this.create(this.normalize(body), user.id)
  }

  async bootstrapSuperAdmin(providedSecret: string | undefined, body: CreateSuperAdminBody) {
    const expected = this.configService.get<string>('SUPER_ADMIN_BOOTSTRAP_SECRET')
    if (!expected) {
      // Hide the endpoint entirely when bootstrap isn't configured.
      throw new NotFoundException()
    }

    const a = Buffer.from(providedSecret ?? '')
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid bootstrap secret.')
    }

    if ((await this.countSuperAdmins()) > 0) {
      throw new ForbiddenException(
        'A super admin already exists. Use POST /api/platform/super-admins as a super admin instead.',
      )
    }

    return this.create(this.normalize(body), null)
  }
}
