import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseService {
  readonly admin: SupabaseClient
  private readonly url: string
  private readonly serviceRoleKey: string

  constructor(configService: ConfigService) {
    this.url = configService.getOrThrow<string>('SUPABASE_URL')
    this.serviceRoleKey = configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY')
    this.admin = this.createIsolatedClient()
  }

  /**
   * A fresh client for one-off auth calls like signUp(). If signUp() gets a
   * session back (email confirmation off), it attaches that user's JWT to
   * the client -- doing that on the shared `admin` client would silently
   * downgrade every later query from service role to that user.
   */
  createIsolatedClient(): SupabaseClient {
    return createClient(this.url, this.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
}
