import type { Session } from '@supabase/supabase-js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined

function requireApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error('Missing VITE_API_BASE_URL for finance actions.')
  }

  return API_BASE_URL.replace(/\/$/, '')
}

async function apiRequest<T>(session: Session | null, path: string, init?: RequestInit): Promise<T> {
  const token = session?.access_token
  if (!token) {
    throw new Error('You must be signed in to manage finance actions.')
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
          : 'Finance request failed.'
    throw new Error(message)
  }

  return payload as T
}

export type AdminFeeSetupMetaReply = {
  classes: Array<{ id: string; name: string; level: string | null }>
  terms: Array<{ id: string; name: string; is_current: boolean | null }>
  settings: {
    bankName: string
    accountNumber: string
    accountName: string
    paystackPublicKey: string
    paystackSubaccountCode: string
  }
}

export type AdminFeeSetupStructureReply = {
  items: Array<{ id: string; label: string; amount: string; mandatory: boolean; feeStructureId: string | null }>
  dueDate: string
  source: 'live' | 'draft' | 'empty'
}

export type PublishFeeSetupPayload = {
  classId: string
  termId: string
  dueDate?: string | null
  items: Array<{ id?: string; label: string; amount: string | number; mandatory: boolean }>
}

export type AdminFeeCollectionReply = {
  students: Array<{
    id: string
    name: string
    className: string
    invoiceId: string | null
    expected: number
    paid: number
    lastPayment: string
    hasPendingOffline: boolean
    status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue' | 'Pending'
  }>
  totals: {
    expected: number
    paid: number
    balance: number
    pendingCount: number
  }
}

export type AdminFinanceOverviewReply = {
  stats: {
    expected: number
    collected: number
    outstanding: number
    overdue: number
    overdueCount: number
    outstandingCount: number
  }
  buckets: Array<{ className: string; total: number; paid: number; amount: number }>
  invoices: Array<{
    id: string
    amount: number
    status: string
    dueDate: string | null
    createdAt: string
    studentName: string
    className: string
    feeName: string
  }>
  payments: Array<{
    id: string
    amount: number
    paidAt: string | null
    reference: string | null
    studentName: string
  }>
  settlementSummary: {
    availableBalance: number
    unsettledPayments: number
    recentTransactions: Array<{
      id: string
      grossAmount: number
      netSchoolAmount: number
      status: string
      method: string
      reference: string
      createdAt: string
      confirmedAt: string | null
      settled: boolean
    }>
    recentSettlements: Array<{
      id: string
      periodStart: string | null
      periodEnd: string | null
      transactionCount: number
      grossAmount: number
      processorFeeAmount: number
      platformFeeAmount: number
      netAmount: number
      status: string
      payoutReference: string | null
      paidAt: string | null
      createdAt: string
    }>
  }
}

export type ParentFeesReply = {
  childId: string | null
  hasLinkedChild: boolean
  childName: string
  className: string
  schoolName: string
  feeItems: Array<{ invoiceId: string; label: string; amount: number; paid: number }>
  payments: Array<{ ref: string; amount: number; date: string; method: string; items: string }>
  nearestDue: string | null
  schoolBank: { name: string; acct: string; acctName: string }
  paystackPublicKey: string
  totalBalance: number
}

export type ParentPaymentContextReply = {
  childId: string | null
  hasLinkedChild: boolean
  schoolName: string
  childName: string
  className: string
  balance: number
  bankDetails: { name: string; acct: string; acctName: string }
  paystackPublicKey: string
}

export type ParentInitializePaymentReply = {
  transactionId: string
  childId: string
  reference: string
  amount: number
  publicKey: string
  callbackUrl: string
  authorizationUrl: string
}

export type SuperAdminSettlementOverviewReply = {
  totals: {
    availableBalance: number
    unsettledPayments: number
    pendingSettlements: number
    paidSettlements: number
  }
  schoolBalances: Array<{
    schoolId: string
    schoolName: string
    availableBalance: number
    pendingSettlementCount: number
  }>
  recentSettlements: Array<{
    id: string
    schoolId: string
    schoolName: string
    netAmount: number
    status: string
    createdAt: string
    paidAt: string | null
  }>
}

export type SuperAdminSettlementListReply = {
  settlements: Array<{
    id: string
    schoolId: string
    schoolName: string
    periodStart: string | null
    periodEnd: string | null
    transactionCount: number
    grossAmount: number
    processorFeeAmount: number
    platformFeeAmount: number
    netAmount: number
    status: string
    payoutReference: string | null
    notes: string | null
    paidAt: string | null
    createdAt: string
  }>
}

export function getAdminFeeSetupMeta(session: Session | null) {
  return apiRequest<AdminFeeSetupMetaReply>(session, '/payments/admin/fee-setup/meta')
}

export function getAdminFeeSetupStructure(session: Session | null, classId: string, termId: string) {
  const query = new URLSearchParams({ classId, termId })
  return apiRequest<AdminFeeSetupStructureReply>(session, `/payments/admin/fee-setup/structure?${query.toString()}`)
}

export function publishAdminFeeSetup(session: Session | null, payload: PublishFeeSetupPayload) {
  return apiRequest<{ message: string; publishedStructures: number; createdInvoices: number; updatedInvoices: number; studentsMatched: number }>(
    session,
    '/payments/admin/fee-setup/publish',
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

export function updateAdminBankSettings(session: Session | null, payload: { bankName: string; accountName: string; accountNumber: string }) {
  return apiRequest<{ message: string }>(session, '/payments/admin/settings/bank', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function updateAdminPaystackSettings(session: Session | null, payload: { subaccountCode: string }) {
  return apiRequest<{ message: string }>(session, '/payments/admin/settings/paystack', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function getAdminFeeCollection(session: Session | null) {
  return apiRequest<AdminFeeCollectionReply>(session, '/payments/admin/fee-collection')
}

export function getAdminFinanceOverview(session: Session | null) {
  return apiRequest<AdminFinanceOverviewReply>(session, '/payments/admin/finance-overview')
}

export function recordAdminOfflineCollection(
  session: Session | null,
  payload: { studentId: string; amount: number; note?: string; method?: string },
) {
  return apiRequest<{ message: string }>(session, '/payments/admin/fee-collection/offline', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function confirmAdminPendingOffline(session: Session | null, studentId: string) {
  return apiRequest<{ message: string }>(session, `/payments/admin/fee-collection/students/${studentId}/confirm-pending`, {
    method: 'POST',
  })
}

export function getParentFees(session: Session | null, childId?: string | null) {
  const query = childId ? `?childId=${encodeURIComponent(childId)}` : ''
  return apiRequest<ParentFeesReply>(session, `/payments/parent/fees${query}`)
}

export function getParentPaymentContext(session: Session | null, childId?: string | null) {
  const query = childId ? `?childId=${encodeURIComponent(childId)}` : ''
  return apiRequest<ParentPaymentContextReply>(session, `/payments/parent/payment-context${query}`)
}

export function initializeParentPayment(
  session: Session | null,
  payload: { childId?: string | null; amount: number; reference?: string; method?: string },
) {
  return apiRequest<ParentInitializePaymentReply>(session, '/payments/parent/initialize', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function submitParentOffline(session: Session | null, payload?: { childId?: string | null }) {
  return apiRequest<{ message: string; childId: string }>(session, '/payments/parent/offline', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  })
}

export function recordParentPayment(
  session: Session | null,
  payload: { childId?: string | null; amount: number; reference?: string; paidAt?: string; method?: string },
) {
  return apiRequest<{ message: string; childId: string; reference: string }>(session, '/payments/parent/record', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getSuperAdminSettlementOverview(session: Session | null) {
  return apiRequest<SuperAdminSettlementOverviewReply>(session, '/payments/super-admin/settlements/overview')
}

export function listSuperAdminSettlements(session: Session | null) {
  return apiRequest<SuperAdminSettlementListReply>(session, '/payments/super-admin/settlements')
}

export function createSettlement(
  session: Session | null,
  payload: { schoolId: string; periodStart?: string | null; periodEnd?: string | null; notes?: string },
) {
  return apiRequest<{ message: string; settlementId: string; transactionCount: number; netAmount: number }>(
    session,
    '/payments/super-admin/settlements',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export function approveSettlement(session: Session | null, settlementId: string) {
  return apiRequest<{ message: string; settlementId: string }>(
    session,
    `/payments/super-admin/settlements/${settlementId}/approve`,
    { method: 'POST' },
  )
}

export function markSettlementPaid(
  session: Session | null,
  settlementId: string,
  payload?: { payoutReference?: string; paidAt?: string; notes?: string },
) {
  return apiRequest<{ message: string; settlementId: string; payoutReference: string }>(
    session,
    `/payments/super-admin/settlements/${settlementId}/mark-paid`,
    {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    },
  )
}
