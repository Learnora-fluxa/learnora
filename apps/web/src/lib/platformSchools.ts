import type { Session } from '@supabase/supabase-js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined

function requireApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error('Missing VITE_API_BASE_URL for platform school actions.')
  }

  return API_BASE_URL.replace(/\/$/, '')
}

async function apiRequest<T>(session: Session | null, path: string, init?: RequestInit): Promise<T> {
  const token = session?.access_token
  if (!token) {
    throw new Error('You must be signed in to manage platform schools.')
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
          : 'Platform school request failed.'
    throw new Error(message)
  }

  return payload as T
}

export type PlatformSchoolReply = {
  message: string
}

export function updatePlatformSchoolPlan(session: Session | null, schoolId: string, plan: string) {
  return apiRequest<PlatformSchoolReply & { school: { id: string; name: string; plan: string } }>(
    session,
    `/platform/schools/${schoolId}/plan`,
    { method: 'PATCH', body: JSON.stringify({ plan }) },
  )
}

export function updatePlatformSchoolRate(session: Session | null, schoolId: string, payload: { rate: number; reason: string }) {
  return apiRequest<PlatformSchoolReply & { school: { id: string; name: string }; rate: number; reason: string }>(
    session,
    `/platform/schools/${schoolId}/rate`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  )
}

export function extendPlatformSchoolTrial(session: Session | null, schoolId: string, days: number) {
  return apiRequest<PlatformSchoolReply & { school: { id: string; name: string; trialEndsAt: string } }>(
    session,
    `/platform/schools/${schoolId}/extend-trial`,
    { method: 'POST', body: JSON.stringify({ days }) },
  )
}

export function generatePlatformSchoolInvoice(
  session: Session | null,
  schoolId: string,
  payload: { termLabel: string; studentCount: number; dueDate?: string | null },
) {
  return apiRequest<PlatformSchoolReply & {
    invoice: { id: string; termLabel: string; studentCount: number; rate: number; totalAmount: number }
  }>(
    session,
    `/platform/schools/${schoolId}/generate-invoice`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

export function resetPlatformSchoolAdminPassword(
  session: Session | null,
  schoolId: string,
  payload: { redirectTo?: string },
) {
  return apiRequest<PlatformSchoolReply & { adminEmail: string }>(
    session,
    `/platform/schools/${schoolId}/reset-admin-password`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

export function impersonatePlatformSchoolAdmin(
  session: Session | null,
  schoolId: string,
  payload: { redirectTo?: string },
) {
  return apiRequest<PlatformSchoolReply & { adminEmail: string; actionLink: string }>(
    session,
    `/platform/schools/${schoolId}/impersonate-admin`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

export function suspendPlatformSchool(
  session: Session | null,
  schoolId: string,
  payload?: { reason?: string },
) {
  return apiRequest<PlatformSchoolReply & { school: { id: string; name: string; status: string } }>(
    session,
    `/platform/schools/${schoolId}/suspend`,
    { method: 'POST', body: JSON.stringify(payload ?? {}) },
  )
}

export function deletePlatformSchool(session: Session | null, schoolId: string) {
  return apiRequest<PlatformSchoolReply & { school: { id: string; name: string } }>(
    session,
    `/platform/schools/${schoolId}`,
    { method: 'DELETE' },
  )
}
