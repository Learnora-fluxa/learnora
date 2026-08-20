import { Module } from '@nestjs/common'
import { LiveClassesController } from './live-classes.controller.js'
import { AuthModule } from '../auth/auth.module.js'
import { SupabaseModule } from '../../providers/supabase/supabase.module.js'

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [LiveClassesController],
})
export class LiveClassesModule {}
