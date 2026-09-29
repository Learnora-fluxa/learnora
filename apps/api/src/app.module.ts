import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { appConfig } from './config/app.config.js'
import { envSchema } from './config/env.schema.js'
import { HealthModule } from './modules/health/health.module.js'
import { AuthModule } from './modules/auth/auth.module.js'
import { PaymentsModule } from './modules/payments/payments.module.js'
import { PlatformSchoolsModule } from './modules/platform-schools/platform-schools.module.js'
import { PlatformAdminsModule } from './modules/platform-admins/platform-admins.module.js'
import { SchoolRegistrationModule } from './modules/school-registration/school-registration.module.js'
import { SchoolSubscriptionModule } from './modules/school-subscription/school-subscription.module.js'
import { LiveClassesModule } from './modules/live-classes/live-classes.module.js'
import { AiModule } from './modules/ai/ai.module.js'
import { SupabaseModule } from './providers/supabase/supabase.module.js'

// Most-specific file wins: a local `.env.development.local` (git-ignored, real
// dev secrets) takes priority over the committed `.env.development` example,
// which in turn falls back to a plain `.env` if that's all that exists.
// This mirrors Vite's env file precedence on the web app, so both apps pick
// the right project (dev vs prod) the same way.
const nodeEnv = process.env.NODE_ENV ?? 'development'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${nodeEnv}.local`,
        `.env.${nodeEnv}`,
        '.env.local',
        '.env',
      ],
      load: [appConfig],
      validate: (env) => envSchema.parse(env),
    }),
    SupabaseModule,
    HealthModule,
    AuthModule,
    PaymentsModule,
    PlatformSchoolsModule,
    PlatformAdminsModule,
    SchoolRegistrationModule,
    SchoolSubscriptionModule,
    LiveClassesModule,
    AiModule,
  ],
})
export class AppModule {}
