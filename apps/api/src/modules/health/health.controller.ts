import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return { status: 'ok', service: 'learnora-api' }
  }

  @Get('ready')
  getReadiness() {
    return { status: 'ready' }
  }
}
