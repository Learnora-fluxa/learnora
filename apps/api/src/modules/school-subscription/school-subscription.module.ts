import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { SupabaseModule } from '../../providers/supabase/supabase.module.js'
import { SchoolSubscriptionController } from './school-subscription.controller.js'
import { SchoolSubscriptionService } from './school-subscription.service.js'

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [SchoolSubscriptionController],
  providers: [SchoolSubscriptionService],
  // PaymentsModule's Paystack webhook forwards subscription charges here.
  exports: [SchoolSubscriptionService],
})
export class SchoolSubscriptionModule {}
