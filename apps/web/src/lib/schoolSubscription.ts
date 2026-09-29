import type { Session } from '@supabase/supabase-js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined

async function apiRequest<T>(session: Session | null, path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) throw new Error('Missing VITE_API_BASE_URL for subscription requests.')
  const token = session?.access_token
  if (!token) throw new Error('You must be signed in to manage your subscription.')

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof payload?.message === 'string' ? payload.message : 'Subscription request failed.')
  }
  return payload as T
}

export type SubscriptionPayment = {
  id: string
  amount: number
  method: string
  reference: string | null
  paidAt: string
  status: 'confirmed' | 'pending_review' | 'rejected' | string
}

export type SubscriptionOverview = {
  school: { id: string; name: string; plan: string; status: string; trialEndsAt: string | null }
  pricing: { ratePerStudent: number; currency: string; activeStudents: number }
  bankDetails: { bankName: string | null; accountName: string | null; accountNumber: string } | null
  paystackEnabled: boolean
  pendingTransfer: { id: string; amount: number; reference: string | null } | null
  payments: SubscriptionPayment[]
}

export function getSubscriptionOverview(session: Session | null) {
  return apiRequest<SubscriptionOverview>(session, '/school-subscription')
}

export function submitBankTransfer(
  session: Session | null,
  payload: { studentCount: number; reference: string; paidAt: string; notes?: string },
) {
  return apiRequest<{ message: string }>(session, '/school-subscription/bank-transfer', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function startPaystackPayment(session: Session | null, payload: { studentCount: number; callbackUrl: string }) {
  return apiRequest<{ authorizationUrl: string; reference: string; amount: number }>(
    session,
    '/school-subscription/paystack/initialize',
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

export function verifyPaystackPayment(session: Session | null, reference: string) {
  return apiRequest<{ message: string; status: string }>(session, '/school-subscription/paystack/verify', {
    method: 'POST',
    body: JSON.stringify({ reference }),
  })
}

// ── Super admin ──

export type PendingTransfer = {
  id: string
  schoolId: string
  schoolName: string
  amount: number
  reference: string | null
  paidAt: string
  notes: string | null
  submittedAt: string
}

export function listPendingTransfers(session: Session | null) {
  return apiRequest<{ payments: PendingTransfer[] }>(session, '/school-subscription/pending-transfers')
}

export function approveTransfer(session: Session | null, paymentId: string) {
  return apiRequest<{ message: string }>(session, `/school-subscription/payments/${paymentId}/approve`, {
    method: 'POST',
  })
}

export function rejectTransfer(session: Session | null, paymentId: string, reason: string) {
  return apiRequest<{ message: string }>(session, `/school-subscription/payments/${paymentId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

/** Days left in the trial (0 once it has ended), or null when not on a trial. */
export function trialDaysLeft(status: string, trialEndsAt: string | null) {
  if (status !== 'trial' || !trialEndsAt) return null
  const ms = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}
