import { Module } from '@nestjs/common'
import { AiController } from './ai.controller.js'
import { AiService } from './ai.service.js'
import { AiPolicyService } from './ai-policy.service.js'
import { AiRetrievalService } from './ai-retrieval.service.js'
import { AiLlmService } from './ai-llm.service.js'
import { SupabaseModule } from '../../providers/supabase/supabase.module.js'
import { AuthModule } from '../auth/auth.module.js'

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [AiController],
  providers: [AiService, AiPolicyService, AiRetrievalService, AiLlmService],
})
export class AiModule {}
