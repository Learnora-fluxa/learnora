import { useEffect, useState } from 'react'
import { Landmark, Check, X, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { approveTransfer, listPendingTransfers, rejectTransfer, type PendingTransfer } from '../../lib/schoolSubscription'

type Props = { onChange?: () => void }

/** Bank transfers school admins submitted from Subscription & Billing, awaiting a super admin. */
export default function PendingTransfersPanel({ onChange }: Props) {
  const { session } = useAuth()
  const [rows,  setRows]  = useState<PendingTransfer[]>([])
  const [busy,  setBusy]  = useState<string | null>(null)
  const [error, setError] = useState('')

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!session) return
    let cancelled = false
    listPendingTransfers(session)
      .then(res => { if (!cancelled) setRows(res.payments) })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load pending transfers.') })
    return () => { cancelled = true }
  }, [session, refreshKey])

  async function act(row: PendingTransfer, action: 'approve' | 'reject') {
    let reason = ''
    if (action === 'reject') {
      const input = window.prompt(`Reason for rejecting ${row.schoolName}'s transfer (shown in their billing history):`)
      if (input === null) return
      reason = input
    }
    setBusy(row.id)
    setError('')
    try {
      if (action === 'approve') await approveTransfer(session, row.id)
      else await rejectTransfer(session, row.id, reason)
      setRefreshKey(k => k + 1)
      onChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setBusy(null)
    }
  }

  if (!rows.length && !error) return null

  return (
    <div className="bg-surface rounded-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-black/6">
        <Landmark size={16} className="text-primary" />
        <h3 className="text-base font-bold text-foreground">Bank transfers awaiting confirmation</h3>
        <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">{rows.length}</span>
      </div>
      {error && <p className="px-6 py-3 text-sm text-red-600">{error}</p>}
      <div className="divide-y divide-black/6">
        {rows.map(row => (
          <div key={row.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {row.schoolName} · ₦{row.amount.toLocaleString()}
              </p>
              <p className="text-xs text-muted">
                Ref: {row.reference ?? '—'} · Paid {new Date(row.paidAt).toLocaleDateString()}
              </p>
              {row.notes && <p className="text-xs text-muted mt-0.5">{row.notes}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => act(row, 'reject')}
                disabled={busy !== null}
                className="h-9 px-4 border border-black/15 text-sm font-semibold rounded-full hover:border-red-400 hover:text-red-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <X size={14} /> Reject
              </button>
              <button
                onClick={() => act(row, 'approve')}
                disabled={busy !== null}
                className="h-9 px-4 bg-primary text-white text-sm font-semibold rounded-full hover:bg-primary-deep transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {busy === row.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
