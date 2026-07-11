import { useState, useEffect, useCallback } from 'react'
import { Check, Pencil, Save, X, Users, Building2, TrendingUp, Info, Loader } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { superAdminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface PlatformConfig {
  id:                string
  per_student_price: number
  updated_at:        string
  updated_by:        string | null
}

interface PlatformStats {
  schoolCount:  number
  studentCount: number
  termRevenue:  number
}

const fmt = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG')

const PLAN_FEATURES = [
  'Core LMS — courses, modules & lessons',
  'Assignment management & grading',
  'Attendance tracking',
  'Parent portal with fee payment (Paystack)',
  'Live classes',
  'Advanced analytics & reports',
  'AI Tutor for all students',
  'Custom school branding',
  'Finance & invoice management',
  'Timetable management',
  'SMS & email notifications',
  'Offline-first PWA access',
  'Priority support',
  'API access & webhooks',
]

const CALCULATOR_PRESETS = [50, 100, 250, 500, 1000]

export default function PlansAndPricingPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [config,       setConfig]      = useState<PlatformConfig | null>(null)
  const [stats,        setStats]       = useState<PlatformStats | null>(null)
  const [loading,      setLoading]     = useState(true)
  const [error,        setError]       = useState<string | null>(null)
  const [editing,      setEditing]     = useState(false)
  const [draftPrice,   setDraftPrice]  = useState('')
  const [saving,       setSaving]      = useState(false)
  const [saveError,    setSaveError]   = useState<string | null>(null)
  const [calcStudents, setCalcStudents]= useState(250)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [cfgRes, schoolRes] = await Promise.all([
      supabase.from('platform_config').select('id, per_student_price, updated_at, updated_by').maybeSingle(),
      supabase.from('schools').select('student_count, subscription_status'),
    ])

    if (cfgRes.error) { logSupabaseError('PlansAndPricing/config', cfgRes.error); setError(cfgRes.error.message) }
    if (schoolRes.error) logSupabaseError('PlansAndPricing/schools', schoolRes.error)

    const cfg = cfgRes.data as PlatformConfig | null
    setConfig(cfg)

    const schools      = (schoolRes.data ?? []) as { student_count: number | null; subscription_status: string }[]
    const active       = schools.filter(s => s.subscription_status === 'active')
    const studentCount = active.reduce((s, r) => s + (r.student_count ?? 0), 0)
    const price        = cfg?.per_student_price ?? 850
    setStats({
      schoolCount:  schools.length,
      studentCount,
      termRevenue:  studentCount * price,
    })

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function startEdit() {
    setDraftPrice(String(config?.per_student_price ?? 850))
    setSaveError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setSaveError(null)
  }

  async function handleSave() {
    const newPrice = parseInt(draftPrice)
    if (isNaN(newPrice) || newPrice < 1) { setSaveError('Please enter a valid price greater than 0.'); return }
    if (!config?.id) { setSaveError('Config row not found. Please refresh and try again.'); return }

    setSaving(true)
    setSaveError(null)

    const { error } = await supabase
      .from('platform_config')
      .update({ per_student_price: newPrice, updated_at: new Date().toISOString(), updated_by: profile!.id })
      .eq('id', config.id)

    if (error) {
      logSupabaseError('PlansAndPricing/save', error)
      setSaveError(error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setEditing(false)
    await load()
  }

  const price = config?.per_student_price ?? 850
  const termCost = Math.round(calcStudents * price)

  return (
    <DashboardLayout
      activePage="plans-pricing"
      onNavigate={onNavigate}
      title="Plans & Pricing"
      subtitle="Single platform-wide price per student per term"
      nav={superAdminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[1000px] flex flex-col gap-6">

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-card px-5 py-4">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">How billing works</p>
            <p className="mt-0.5 text-blue-700">
              All schools are billed a single flat rate <strong>per student per term</strong>.
              Changing the price here immediately affects all new invoices — existing invoices are not retroactively updated.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-card px-5 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Price card */}
        <div className="bg-primary rounded-card p-8 text-white">
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div>
              <p className="text-sm text-white/70 mb-2">Platform price per student / per term</p>
              {loading ? (
                <div className="h-14 w-48 bg-white/20 rounded-card animate-pulse" />
              ) : editing ? (
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-bold">₦</span>
                  <input
                    type="number"
                    min="1"
                    value={draftPrice}
                    onChange={e => setDraftPrice(e.target.value)}
                    className="w-36 h-14 px-4 bg-white/20 border-2 border-white rounded-card text-4xl font-bold text-white placeholder:text-white/40 outline-none focus:bg-white/30"
                    autoFocus
                  />
                </div>
              ) : (
                <p className="text-5xl font-bold">{fmt(price)}</p>
              )}
              {saveError && (
                <p className="mt-2 text-sm text-red-300">{saveError}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {editing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 h-10 px-5 bg-white text-primary text-sm font-bold rounded-pill hover:bg-white/90 transition-colors disabled:opacity-60"
                  >
                    {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Saving…' : 'Save Price'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="flex items-center gap-2 h-10 px-5 bg-white/20 text-white text-sm font-semibold rounded-pill hover:bg-white/30 transition-colors"
                  >
                    <X size={14} /> Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={startEdit}
                  disabled={loading}
                  className="flex items-center gap-2 h-10 px-5 bg-white/20 text-white text-sm font-semibold rounded-pill hover:bg-white/30 transition-colors disabled:opacity-40"
                >
                  <Pencil size={14} /> Edit Price
                </button>
              )}
            </div>
          </div>

          {!loading && config?.updated_at && (
            <p className="text-xs text-white/50 mt-4">
              Last updated: {new Date(config.updated_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Platform stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Schools',   value: loading ? '—' : String(stats?.schoolCount  ?? 0), Icon: Building2,  color: 'bg-primary/10 text-primary'  },
            { label: 'Total Students',  value: loading ? '—' : (stats?.studentCount ?? 0).toLocaleString(), Icon: Users, color: 'bg-green-50 text-green-600'  },
            { label: 'Est. Term Revenue', value: loading ? '—' : fmt(stats?.termRevenue ?? 0), Icon: TrendingUp, color: 'bg-amber-50 text-amber-600' },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="bg-surface rounded-card shadow-sm p-5">
              <div className={`size-10 rounded-card ${color} flex items-center justify-center mb-3`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Calculator */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h3 className="text-sm font-bold text-foreground mb-4">Term Cost Calculator</h3>
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted">Number of students</label>
              <input
                type="number"
                min={1}
                value={calcStudents}
                onChange={e => setCalcStudents(Math.max(1, Number(e.target.value)))}
                className="h-10 w-36 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {CALCULATOR_PRESETS.map(n => (
                <button
                  key={n}
                  onClick={() => setCalcStudents(n)}
                  className={`h-8 px-3 text-xs font-semibold rounded-full border transition-colors ${calcStudents === n ? 'border-primary bg-primary/8 text-primary' : 'border-black/15 text-muted hover:border-primary/40'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-canvas rounded-card px-5 py-4 flex items-center justify-between">
            <p className="text-sm text-muted">{calcStudents.toLocaleString()} students × {fmt(price)} / student</p>
            <p className="text-2xl font-bold text-primary">{fmt(termCost)} <span className="text-sm font-normal text-muted">/ term</span></p>
          </div>
          <p className="text-xs text-muted mt-2">Annual run rate (3 terms): <span className="font-semibold">{fmt(termCost * 3)}</span></p>
        </div>

        {/* What's included */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h3 className="text-sm font-bold text-foreground mb-4">What's included for every school</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PLAN_FEATURES.map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                <Check size={13} className="text-green-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
