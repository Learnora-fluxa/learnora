import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { SupabaseModule } from '../../providers/supabase/supabase.module.js'
import { PlatformAdminsController } from './platform-admins.controller.js'
import { PlatformAdminsService } from './platform-admins.service.js'

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [PlatformAdminsController],
  providers: [PlatformAdminsService],
})
export class PlatformAdminsModule {}
