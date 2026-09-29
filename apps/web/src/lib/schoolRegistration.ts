const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined

export type RegisterSchoolPayload = {
  schoolName: string
  schoolEmail: string
  schoolPhone: string
  schoolAddress: string
  schoolState: string
  adminName: string
  adminEmail: string
  adminPhone: string
  password: string
  redirectTo?: string
}

export type RegisterSchoolReply = {
  message: string
  school: { id: string; name: string; code: string; subscriptionStatus: string; trialEndsAt: string }
  requiresEmailConfirmation: boolean
}

// Public endpoint: the admin has no session yet, so no Authorization header.
export async function registerSchool(payload: RegisterSchoolPayload): Promise<RegisterSchoolReply> {
  if (!API_BASE_URL) {
    throw new Error('Missing VITE_API_BASE_URL for school registration.')
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/schools/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof body?.message === 'string' ? body.message : 'Registration failed. Please try again.')
  }
  return body as RegisterSchoolReply
}
