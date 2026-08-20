import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.string().optional(),
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  APP_BASE_URL: z.string().optional(),
  API_PUBLIC_BASE_URL: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  DAILY_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  REDIS_URL: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
})
