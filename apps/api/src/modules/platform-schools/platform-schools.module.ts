import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { SupabaseModule } from '../../providers/supabase/supabase.module.js'
import { PlatformSchoolsController } from './platform-schools.controller.js'
import { PlatformSchoolsService } from './platform-schools.service.js'

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [PlatformSchoolsController],
  providers: [PlatformSchoolsService],
})
export class PlatformSchoolsModule {}
