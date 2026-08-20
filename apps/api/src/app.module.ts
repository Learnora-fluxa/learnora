import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { appConfig } from './config/app.config.js'
import { envSchema } from './config/env.schema.js'
import { HealthModule } from './modules/health/health.module.js'
import { AuthModule } from './modules/auth/auth.module.js'
import { PaymentsModule } from './modules/payments/payments.module.js'
import { PlatformSchoolsModule } from './modules/platform-schools/platform-schools.module.js'
import { LiveClassesModule } from './modules/live-classes/live-classes.module.js'
import { AiModule } from './modules/ai/ai.module.js'
import { SupabaseModule } from './providers/supabase/supabase.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: (env) => envSchema.parse(env),
    }),
    SupabaseModule,
    HealthModule,
    AuthModule,
    PaymentsModule,
    PlatformSchoolsModule,
    LiveClassesModule,
    AiModule,
  ],
})
export class AppModule {}
