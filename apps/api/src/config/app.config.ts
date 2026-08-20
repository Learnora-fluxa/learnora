export const appConfig = () => ({
  app: {
    port: process.env.API_PORT ? Number(process.env.API_PORT) : 3000,
    env: process.env.NODE_ENV ?? 'development',
  },
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    jwtSecret: process.env.SUPABASE_JWT_SECRET ?? '',
  },
  ai: {
    model: process.env.OPENAI_MODEL ?? 'gpt-5-mini',
  },
})
