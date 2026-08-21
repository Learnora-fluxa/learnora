import type { Session } from '@supabase/supabase-js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined

function requireApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error('Missing VITE_API_BASE_URL for platform billing.')
  }

  return API_BASE_URL.replace(/\/$/, '')
}

async function apiRequest<T>(session: Session | null, path: string, init?: RequestInit): Promise<T> {
  const token = session?.access_token
  if (!token) {
    throw new Error('You must be signed in to manage school billing.')
  }

  const response = await fetch(`${requireApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof payload?.message === 'string'
        ? payload.message
        : typeof payload?.error === 'string'
          ? payload.error
          : 'Platform billing request failed.'
    throw new Error(message)
  }

  return payload as T
}

export type ConfirmSchoolSubscriptionPayload = {
  amount: number
  paymentMethod: string
  reference?: string
  paidAt: string
  notes?: string
  adminName?: string
  adminEmail?: string
  adminPhone?: string
}

export type ConfirmSchoolSubscriptionReply = {
  message: string
  school: {
    id: string
    name: string
    code: string
    subscriptionStatus: string
  }
  invitation: {
    id: string | null
    email: string
    fullName: string | null
    token: string
  }
}

export function confirmSchoolSubscription(
  session: Session | null,
  schoolId: string,
  payload: ConfirmSchoolSubscriptionPayload,
) {
  return apiRequest<ConfirmSchoolSubscriptionReply>(session, `/payments/platform/schools/${schoolId}/confirm-subscription`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
