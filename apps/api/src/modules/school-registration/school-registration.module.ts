import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../providers/supabase/supabase.module.js'
import { SchoolRegistrationController } from './school-registration.controller.js'
import { SchoolRegistrationService } from './school-registration.service.js'

@Module({
  imports: [SupabaseModule],
  controllers: [SchoolRegistrationController],
  providers: [SchoolRegistrationService],
})
export class SchoolRegistrationModule {}
