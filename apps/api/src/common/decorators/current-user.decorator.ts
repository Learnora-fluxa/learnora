import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { AuthenticatedUser } from '../../modules/auth/auth.types.js'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>()
    return request.user
  },
)
