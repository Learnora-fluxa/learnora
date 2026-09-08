import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true })

  app.setGlobalPrefix('api')
  app.enableCors()
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  )

  const port = process.env.PORT
    ? Number(process.env.PORT)
    : process.env.API_PORT
      ? Number(process.env.API_PORT)
      : 3000
  await app.listen(port)

  // Make it obvious in the deploy logs which environment and which Supabase
  // project this instance is actually talking to, so a misconfigured env var
  // (e.g. a dev deploy pointed at prod, or vice versa) is caught immediately.
  const nodeEnv = process.env.NODE_ENV ?? 'development'
  const supabaseHost = process.env.SUPABASE_URL
    ? new URL(process.env.SUPABASE_URL).host
    : 'unset'
  console.log(`[learnora-api] env=${nodeEnv} port=${port} supabase=${supabaseHost}`)
}

void bootstrap()
