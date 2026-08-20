import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller.js'
import { SupabaseJwtGuard } from './supabase-jwt.guard.js'
import { SupabaseModule } from '../../providers/supabase/supabase.module.js'

@Module({
  imports: [SupabaseModule],
  controllers: [AuthController],
  providers: [SupabaseJwtGuard],
  exports: [SupabaseJwtGuard],
})
export class AuthModule {}
