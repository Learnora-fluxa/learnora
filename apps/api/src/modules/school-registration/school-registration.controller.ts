import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { SchoolRegistrationService } from './school-registration.service.js'
import type { RegisterSchoolBody } from './school-registration.types.js'

@Controller('schools')
export class SchoolRegistrationController {
  constructor(private readonly schoolRegistrationService: SchoolRegistrationService) {}

  /**
   * POST /api/schools/register
   * Public self-serve signup: creates the admin's auth user (Supabase sends
   * the confirmation email), the school, the admin profile and starter data.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: RegisterSchoolBody) {
    return this.schoolRegistrationService.register(body)
  }
}
