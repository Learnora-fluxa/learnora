import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common'
import { randomInt, randomUUID } from 'node:crypto'
import { SupabaseService } from '../../providers/supabase/supabase.service.js'
import type { RegisterSchoolBody } from './school-registration.types.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const TRIAL_DAYS = 30
const MAX_CODE_ATTEMPTS = 5

const DEFAULT_SUBJECTS = [
  'Mathematics', 'English Language', 'Basic Science', 'Social Studies',
  'Civic Education', 'Computer Science', 'French', 'Physical Education',
  'Christian Religious Studies', 'Further Mathematics',
]

type NormalizedInput = {
  schoolName: string
  schoolEmail: string | null
  schoolPhone: string | null
  schoolAddress: string | null
  schoolState: string | null
  adminName: string
  adminEmail: string
  adminPhone: string | null
  password: string
  redirectTo: string | undefined
}

// Same format the web app used: up to 3 initials + 4 digits, e.g. "GHS-4821".
function generateSchoolCode(schoolName: string) {
  const initials = schoolName
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .join('')
    .slice(0, 3) || 'SCH'
  return `${initials}-${randomInt(1000, 10000)}`
}

function optional(value: string | undefined) {
  return value?.trim() || null
}

@Injectable()
export class SchoolRegistrationService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.admin
  }

  private normalize(body: RegisterSchoolBody): NormalizedInput {
    const schoolName = body.schoolName?.trim() ?? ''
    const adminName = body.adminName?.trim() ?? ''
    const adminEmail = body.adminEmail?.trim().toLowerCase() ?? ''
    const schoolEmail = body.schoolEmail?.trim().toLowerCase() || null
    const password = body.password ?? ''

    if (!schoolName) throw new BadRequestException('schoolName is required.')
    if (!adminName) throw new BadRequestException('adminName is required.')
    if (!EMAIL_PATTERN.test(adminEmail)) {
      throw new BadRequestException('A valid adminEmail is required.')
    }
    if (schoolEmail && !EMAIL_PATTERN.test(schoolEmail)) {
      throw new BadRequestException('schoolEmail is not a valid email.')
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(`password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
    }

    return {
      schoolName,
      schoolEmail,
      schoolPhone: optional(body.schoolPhone),
      schoolAddress: optional(body.schoolAddress),
      schoolState: optional(body.schoolState),
      adminName,
      adminEmail,
      adminPhone: optional(body.adminPhone),
      password,
      redirectTo: optional(body.redirectTo) ?? undefined,
    }
  }

  private async ensureEmailAvailable(email: string) {
    const { data, error } = await this.db
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .limit(1)

    if (error) throw new InternalServerErrorException(error.message)
    if (data?.length) {
      throw new ConflictException('An account with this email already exists. Sign in instead.')
    }
  }

  private async createAuthUser(input: NormalizedInput) {
    // signUp() (not admin.createUser) so Supabase sends its confirmation
    // email exactly as it did when the browser called it directly.
    const { data, error } = await this.supabaseService.createIsolatedClient().auth.signUp({
      email: input.adminEmail,
      password: input.password,
      options: {
        data: { full_name: input.adminName },
        emailRedirectTo: input.redirectTo,
      },
    })

    if (error) {
      if (/already (been )?registered|already exists/i.test(error.message)) {
        throw new ConflictException('An account with this email already exists. Sign in instead.')
      }
      throw new BadRequestException(error.message)
    }
    // Supabase returns a user with no identities (instead of an error) when
    // the email is already registered, to avoid leaking which emails exist.
    if (!data.user || data.user.identities?.length === 0) {
      throw new ConflictException('An account with this email already exists. Sign in instead.')
    }

    return { userId: data.user.id, emailConfirmed: Boolean(data.session) }
  }

  private async insertSchool(schoolId: string, input: NormalizedInput) {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = generateSchoolCode(input.schoolName)
      const { error } = await this.db.from('schools').insert({
        id: schoolId,
        name: input.schoolName,
        code,
        email: input.schoolEmail,
        phone: input.schoolPhone,
        address: input.schoolAddress,
        state: input.schoolState,
        onboarding_admin_name: input.adminName,
        onboarding_admin_email: input.adminEmail,
        onboarding_admin_phone: input.adminPhone,
        // Every self-serve school starts on a free trial; the admin picks a
        // payment option later from Subscription & Billing.
        subscription_plan: 'free',
        subscription_status: 'trial',
      })

      if (!error) return code
      // 23505 = unique_violation; only the code can collide since the id is fresh.
      if (error.code !== '23505') throw new Error(`Failed to create school: ${error.message}`)
    }
    throw new Error('Could not generate a unique school code. Please try again.')
  }

  private async seedStarterData(schoolId: string) {
    const now = new Date()
    const yr = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1

    const { error: termError } = await this.db.from('terms').insert({
      school_id: schoolId,
      name: `First Term ${yr}/${yr + 1}`,
      start_date: `${yr}-09-01`,
      end_date: `${yr + 1}-01-31`,
      is_current: true,
    })
    if (termError) throw new Error(`Failed to create term: ${termError.message}`)

    const { data: subjects, error: subjectsError } = await this.db
      .from('subjects')
      .insert(DEFAULT_SUBJECTS.map(name => ({ name, school_id: schoolId })))
      .select('id')
    if (subjectsError) throw new Error(`Failed to create subjects: ${subjectsError.message}`)

    const { data: cls, error: classError } = await this.db
      .from('classes')
      .insert({ school_id: schoolId, name: 'SS1A', level: 'SS1', arm: 'A' })
      .select('id')
      .single()
    if (classError) throw new Error(`Failed to create starter class: ${classError.message}`)

    const { error: linkError } = await this.db.from('class_subjects').insert(
      (subjects ?? []).map(s => ({ class_id: cls.id, subject_id: s.id, school_id: schoolId })),
    )
    if (linkError) throw new Error(`Failed to link class subjects: ${linkError.message}`)
  }

  /** Best-effort undo so a failed signup can be retried with the same email. */
  private async rollback(userId: string, schoolId: string | null) {
    const steps: [string, () => PromiseLike<{ error: { message: string } | null }>][] = [
      // Deleting the auth user cascades to the profile row.
      ['auth user', () => this.db.auth.admin.deleteUser(userId)],
    ]
    if (schoolId) {
      for (const table of ['class_subjects', 'classes', 'subjects', 'terms', 'platform_schools']) {
        steps.push([table, () => this.db.from(table).delete().eq('school_id', schoolId)])
      }
      steps.push(['school', () => this.db.from('schools').delete().eq('id', schoolId)])
    }

    for (const [label, run] of steps) {
      try {
        const { error } = await run()
        if (error) console.warn(`[school-registration] rollback of ${label} failed: ${error.message}`)
      } catch (err) {
        console.warn(`[school-registration] rollback of ${label} failed: ${String(err)}`)
      }
    }
  }

  async register(body: RegisterSchoolBody) {
    const input = this.normalize(body)
    await this.ensureEmailAvailable(input.adminEmail)

    const { userId, emailConfirmed } = await this.createAuthUser(input)
    const schoolId = randomUUID()
    let schoolCreated = false

    try {
      const code = await this.insertSchool(schoolId, input)
      schoolCreated = true

      // The on_auth_user_created trigger already inserted a default profile;
      // upsert so this also works if the trigger is missing.
      const { error: profileError } = await this.db.from('profiles').upsert(
        {
          id: userId,
          school_id: schoolId,
          role: 'admin',
          full_name: input.adminName,
          email: input.adminEmail,
          phone: input.adminPhone,
          is_active: true,
        },
        { onConflict: 'id' },
      )
      if (profileError) throw new Error(`Failed to create admin profile: ${profileError.message}`)

      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const { error: platformError } = await this.db.from('platform_schools').upsert(
        { school_id: schoolId, plan: 'free', status: 'trial', trial_ends_at: trialEndsAt },
        { onConflict: 'school_id' },
      )
      if (platformError) throw new Error(`Failed to start trial: ${platformError.message}`)

      await this.seedStarterData(schoolId)

      return {
        message: 'School registered.',
        school: {
          id: schoolId,
          name: input.schoolName,
          code,
          subscriptionStatus: 'trial',
          trialEndsAt,
        },
        requiresEmailConfirmation: !emailConfirmed,
      }
    } catch (err) {
      await this.rollback(userId, schoolCreated ? schoolId : null)
      const message = err instanceof Error ? err.message : 'School registration failed.'
      console.error(`[school-registration] ${message}`)
      throw new InternalServerErrorException(message)
    }
  }
}
