import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { SupabaseService } from '../../providers/supabase/supabase.service.js'
import type { AuthenticatedUser, LearnoraRole } from './auth.types.js'

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string }
      user?: AuthenticatedUser
    }>()
    const authHeader = request.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token')
    }

    const token = authHeader.slice('Bearer '.length)
    const { data: authUser, error: authError } = await this.supabaseService.admin.auth.getUser(token)

    if (authError || !authUser.user) {
      throw new UnauthorizedException('Invalid or expired token')
    }

    const { data: profile, error: profileError } = await this.supabaseService.admin
      .from('profiles')
      .select('id, email, role, school_id')
      .eq('id', authUser.user.id)
      .maybeSingle()

    if (profileError || !profile) {
      throw new UnauthorizedException('Profile not found for token')
    }

    const role = (profile.role ?? 'student') as LearnoraRole
    request.user = {
      id: profile.id,
      email: profile.email ?? authUser.user.email,
      role,
      schoolId: profile.school_id ?? null,
    }

    return true
  }
}
