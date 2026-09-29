import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getSubscriptionOverview, trialDaysLeft } from '../../lib/schoolSubscription'

type Props = { onNavigate: (page: string) => void }

/** Shown to school admins once their free trial has run out. No lockout -- just a nudge. */
export default function TrialEndedBanner({ onNavigate }: Props) {
  const { session } = useAuth()
  const [trialEnded, setTrialEnded] = useState(false)

  useEffect(() => {
    if (!session) return
    let cancelled = false
    getSubscriptionOverview(session)
      .then(o => {
        if (!cancelled) setTrialEnded(trialDaysLeft(o.school.status, o.school.trialEndsAt) === 0)
      })
      .catch(() => { /* The banner is optional; the billing page surfaces real errors. */ })
    return () => { cancelled = true }
  }, [session])

  if (!trialEnded) return null

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-card px-5 py-4 bg-amber-50 border border-amber-200">
      <AlertCircle size={18} className="text-amber-600 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-900">Your free trial has ended</p>
        <p className="text-xs text-amber-800 mt-0.5">Choose a subscription to keep using Learnora for your school.</p>
      </div>
      <button
        onClick={() => onNavigate('subscription')}
        className="h-9 px-4 bg-primary text-white text-sm font-semibold rounded-full hover:bg-primary-deep transition-colors shrink-0"
      >
        Upgrade now
      </button>
    </div>
  )
}
