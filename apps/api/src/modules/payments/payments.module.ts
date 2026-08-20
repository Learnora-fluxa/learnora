import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller.js'
import { PaymentsPublicController } from './payments-public.controller.js'
import { AuthModule } from '../auth/auth.module.js'
import { SupabaseModule } from '../../providers/supabase/supabase.module.js'
import { PaymentsService } from './payments.service.js'

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [PaymentsController, PaymentsPublicController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
