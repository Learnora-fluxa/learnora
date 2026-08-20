import type { PostgrestError } from '@supabase/supabase-js'

export function logSupabaseError(context: string, error: PostgrestError | null | undefined) {
  if (!error) return
  console.error(`[Supabase:${context}]`, error.code, error.message, error.details)
}

export function logAuthError(context: string, error: { message: string } | null | undefined) {
  if (!error) return
  console.error(`[Auth:${context}]`, error.message)
}

// Extract the real error message from a failed supabase.functions.invoke() call.
// On non-2xx responses invoke() returns a FunctionsHttpError whose `context` is
// the raw Response — the function's JSON body (with our `error` field) is there.
export async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const ctx = (error as { context: unknown }).context
    if (ctx instanceof Response) {
      try {
        const body = await ctx.clone().json() as { error?: string }
        if (body?.error) return body.error
      } catch { /* body not JSON */ }
    }
  }
  if (error instanceof Error && error.message) return `${fallback} (${error.message})`
  return fallback
}
