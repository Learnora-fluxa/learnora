import { useState, useEffect } from 'react'
import { CheckCircle2, ChevronRight, CreditCard, RefreshCw } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

// PLAN_RATES removed — price now loaded from platform_config (single flat rate)
const PLAN_LABELS: Record<string, string> = {
  starter:    'Starter Plan',
  growth:     'Growth Plan',
  enterprise: 'Enterprise Plan',
  free:       'Free Plan',
}

const planFeatures = [
  'Unlimited students',
  'AI Tutor for all students',
  'Advanced analytics & reports',
  'Parent portal with fee payment',
  'Custom school branding',
  'Priority support',
  'SMS & email notifications',
  'Offline-first PWA access',
]

interface SchoolInfo {
  name:                string
  subscription_plan:   string
  subscription_status: string
  student_count:       number
  trial_ends_at?:      string | null
}

export default function SubscriptionBillingPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [school,          setSchool]         = useState<SchoolInfo | null>(null)
  const [loading,         setLoading]        = useState(true)
  const [pricePerStudent, setPricePerStudent]= useState<number>(850)

  useEffect(() => { if (profile?.school_id) loadData() }, [profile?.school_id])

  async function loadData() {
    setLoading(true)
    const [schoolRes, cfgRes] = await Promise.all([
      supabase.from('schools').select('name, subscription_plan, subscription_status, student_count').eq('id', profile!.school_id!).maybeSingle(),
      supabase.from('platform_config').select('per_student_price').maybeSingle(),
    ])
    if (schoolRes.error) logSupabaseError('SubscriptionBilling/school', schoolRes.error)
    if (cfgRes.error)    logSupabaseError('SubscriptionBilling/config', cfgRes.error)
    setSchool((schoolRes.data as SchoolInfo | null) ?? null)
    setPricePerStudent((cfgRes.data as { per_student_price: number } | null)?.per_student_price ?? 850)
    setLoading(false)
  }

  const plan      = school?.subscription_plan  ?? 'free'
  const status    = school?.subscription_status ?? 'active'
  const planLabel = PLAN_LABELS[plan] ?? `${plan} Plan`
  const termCost  = pricePerStudent * (school?.student_count ?? 0)

  const statusBadge = status === 'active'    ? 'bg-green-50 text-green-700'   :
                      status === 'trial'     ? 'bg-amber-50 text-amber-700'   :
                                               'bg-red-50 text-red-600'

  return (
    <DashboardLayout
      activePage="subscription"
      onNavigate={onNavigate}
      title="Subscription & Billing"
      subtitle="Manage your school's Learnora subscription"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[900px] flex flex-col gap-6">

        {/* Current plan */}
        <div className="bg-primary rounded-card p-6 text-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-white/70 mb-1">Current Plan</p>
              {loading ? (
                <div className="h-7 w-40 bg-white/20 rounded animate-pulse mb-1" />
              ) : (
                <h2 className="text-2xl font-bold mb-1">{planLabel}</h2>
              )}
              {loading ? (
                <div className="h-4 w-56 bg-white/20 rounded animate-pulse" />
              ) : (
                <p className="text-sm text-white/80">
                  {school?.name ?? '—'} · {school?.student_count ?? 0} active students
                </p>
              )}
            </div>
            <div className="text-right">
              {loading ? (
                <div className="h-9 w-24 bg-white/20 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold">₦{pricePerStudent.toLocaleString()}</p>
                  <p className="text-sm text-white/70">per student / term</p>
                </>
              )}
            </div>
          </div>
          <hr className="border-white/20 my-4" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-white/80">
              <span>Status:</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${statusBadge}`}>
                {status}
              </span>
              {!loading && (
                <span>
                  Term cost: <span className="font-semibold text-white">₦{termCost.toLocaleString()}</span>
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button className="h-9 px-4 bg-white/20 text-white text-sm font-semibold rounded-full hover:bg-white/30 transition-colors">
                Manage Plan
              </button>
              {plan !== 'enterprise' && (
                <button className="h-9 px-4 border border-white/30 text-white text-sm font-semibold rounded-full hover:bg-white/10 transition-colors">
                  Upgrade
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Plan features */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h3 className="text-base font-bold text-foreground mb-4">Included in your plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {planFeatures.map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Billing info + invoices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <div className="bg-surface rounded-card shadow-sm p-6">
            <h3 className="text-base font-bold text-foreground mb-4">Payment Method</h3>
            <div className="flex items-center gap-3 p-4 border border-black/10 rounded-card mb-4">
              <CreditCard size={18} className="text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Paystack · Auto-debit</p>
                <p className="text-xs text-muted">Contact Learnora support to update</p>
              </div>
            </div>
            <button className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
              <RefreshCw size={13} /> Request payment update
            </button>
          </div>

          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/6">
              <h3 className="text-base font-bold text-foreground">Billing History</h3>
              <button onClick={() => onNavigate('admin-support')} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                Contact support <ChevronRight size={12} />
              </button>
            </div>
            <div className="px-6 py-8 text-center text-sm text-muted">
              <p>Term billing history is managed by Learnora.</p>
              <button onClick={() => onNavigate('admin-support')} className="mt-2 text-xs text-primary font-semibold hover:underline">
                Request a billing statement →
              </button>
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  )
}
