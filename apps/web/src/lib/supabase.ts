import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment variables')
}

// Dev-only visibility: prints which Supabase project this build is pointed
// at, so it's obvious if a local run or preview deploy is accidentally
// wired to the wrong (e.g. production) project. Never logs the key.
if (import.meta.env.DEV) {
  try {
    console.info(`[learnora-web] Supabase project: ${new URL(supabaseUrl).host}`)
  } catch {
    console.info('[learnora-web] Supabase project: (unable to parse VITE_SUPABASE_URL)')
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)
