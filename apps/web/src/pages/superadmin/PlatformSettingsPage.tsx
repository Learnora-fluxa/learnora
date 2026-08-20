import { useState, useEffect } from 'react'
import { Globe, Mail, Bell, Shield, Wrench, AlertTriangle, Save, Landmark, Loader2 } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { superAdminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

function ToggleRow({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-black/6 last:border-0">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${value ? 'bg-primary' : 'bg-black/15'}`}
      >
        <span className={`absolute inset-y-[2px] w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${value ? 'left-[22px]' : 'left-[2px]'}`} />
      </button>
    </div>
  )
}

const DEFAULTS = {
  platform_name:   'Learnora',
  support_email:   'support@learnora.io',
  from_name:       'Learnora Platform',
  email_notifs:    'true',
  alert_notifs:    'true',
  billing_notifs:  'true',
  require_2fa:     'false',
  audit_log:       'true',
  school_signup:   'false',
  maintenance:     'false',
}

export default function PlatformSettingsPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [saveError,     setSaveError]     = useState('')

  // Learnora bank account (for offline subscription payments)
  const [bankName,       setBankName]       = useState('')
  const [bankAcctName,   setBankAcctName]   = useState('')
  const [bankAcctNumber, setBankAcctNumber] = useState('')
  const [savingBank,     setSavingBank]     = useState(false)
  const [bankSaved,      setBankSaved]      = useState(false)

  const [platformName,  setPlatformName]  = useState('Learnora')
  const [supportEmail,  setSupportEmail]  = useState('support@learnora.io')
  const [fromName,      setFromName]      = useState('Learnora Platform')
  const [emailNotifs,   setEmailNotifs]   = useState(true)
  const [alertNotifs,   setAlertNotifs]   = useState(true)
  const [billingNotifs, setBillingNotifs] = useState(true)
  const [twoFA,         setTwoFA]         = useState(false)
  const [auditLog,      setAuditLog]      = useState(true)
  const [schoolSignup,  setSchoolSignup]  = useState(false)
  const [maintenance,   setMaintenance]   = useState(false)

  useEffect(() => { loadSettings(); loadBankDetails() }, [])

  async function loadSettings() {
    setLoading(true)
    const { data, error } = await supabase.from('platform_settings').select('key, value')
    if (error) {
      logSupabaseError('PlatformSettings/load', error)
      setLoading(false)
      return
    }
    const map: Record<string, string> = {}
    for (const row of (data ?? []) as { key: string; value: string }[]) {
      map[row.key] = row.value
    }

    const get = (k: string) => map[k] ?? DEFAULTS[k as keyof typeof DEFAULTS] ?? ''
    setPlatformName(get('platform_name'))
    setSupportEmail(get('support_email'))
    setFromName(get('from_name'))
    setEmailNotifs(get('email_notifs')   === 'true')
    setAlertNotifs(get('alert_notifs')   === 'true')
    setBillingNotifs(get('billing_notifs') === 'true')
    setTwoFA(get('require_2fa')          === 'true')
    setAuditLog(get('audit_log')         === 'true')
    setSchoolSignup(get('school_signup') === 'true')
    setMaintenance(get('maintenance')    === 'true')
    setLoading(false)
  }

  async function loadBankDetails() {
    const { data } = await supabase
      .from('platform_config')
      .select('bank_name, bank_account_name, bank_account_number')
      .maybeSingle()
    const d = data as { bank_name: string | null; bank_account_name: string | null; bank_account_number: string | null } | null
    if (d) {
      setBankName(d.bank_name ?? '')
      setBankAcctName(d.bank_account_name ?? '')
      setBankAcctNumber(d.bank_account_number ?? '')
    }
  }

  async function saveBankDetails() {
    setSavingBank(true)
    const { data: existing } = await supabase.from('platform_config').select('id').maybeSingle()
    if (existing) {
      await supabase.from('platform_config').update({
        bank_name:           bankName.trim()       || null,
        bank_account_name:   bankAcctName.trim()   || null,
        bank_account_number: bankAcctNumber.trim() || null,
      }).eq('id', existing.id)
    }
    setSavingBank(false)
    setBankSaved(true)
    setTimeout(() => setBankSaved(false), 2500)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')

    const rows = [
      { key: 'platform_name',  value: platformName  },
      { key: 'support_email',  value: supportEmail  },
      { key: 'from_name',      value: fromName      },
      { key: 'email_notifs',   value: String(emailNotifs)   },
      { key: 'alert_notifs',   value: String(alertNotifs)   },
      { key: 'billing_notifs', value: String(billingNotifs) },
      { key: 'require_2fa',    value: String(twoFA)         },
      { key: 'audit_log',      value: String(auditLog)      },
      { key: 'school_signup',  value: String(schoolSignup)  },
      { key: 'maintenance',    value: String(maintenance)   },
    ].map(r => ({
      ...r,
      updated_at: new Date().toISOString(),
      updated_by: profile?.id ?? null,
    }))

    const { error } = await supabase.from('platform_settings').upsert(rows, { onConflict: 'key' })
    if (error) {
      logSupabaseError('PlatformSettings/save', error)
      setSaveError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  return (
    <DashboardLayout
      activePage="platform-settings"
      onNavigate={onNavigate}
      title="Platform Settings"
      subtitle="Configure global platform behaviour and preferences"
      nav={superAdminNav}
      user={sidebarUser}
    >
      <div className="max-w-[760px] flex flex-col gap-6">

        {loading ? (
          <div className="bg-surface rounded-card shadow-sm p-10 text-center text-sm text-muted">Loading settings…</div>
        ) : (
          <>
            {/* Branding */}
            <div className="bg-surface rounded-card shadow-sm p-6">
              <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <Globe size={16} className="text-primary" /> Branding & Identity
              </h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">Platform Name</label>
                  <input
                    value={platformName} onChange={e => setPlatformName(e.target.value)}
                    className="w-full h-11 px-4 border border-black/20 rounded-card text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">Platform URL</label>
                  <input
                    defaultValue="https://app.learnora.io"
                    className="w-full h-11 px-4 border border-black/20 rounded-card text-sm text-foreground outline-none focus:border-primary bg-canvas"
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="bg-surface rounded-card shadow-sm p-6">
              <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <Mail size={16} className="text-primary" /> Email Configuration
              </h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">Support Email</label>
                  <input
                    value={supportEmail} onChange={e => setSupportEmail(e.target.value)}
                    className="w-full h-11 px-4 border border-black/20 rounded-card text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">From Name (for system emails)</label>
                  <input
                    value={fromName} onChange={e => setFromName(e.target.value)}
                    className="w-full h-11 px-4 border border-black/20 rounded-card text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-surface rounded-card shadow-sm p-6">
              <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                <Bell size={16} className="text-primary" /> Platform Notifications
              </h2>
              <ToggleRow label="Email Notifications"  description="Send system event emails to super admins"        value={emailNotifs}   onChange={setEmailNotifs}   />
              <ToggleRow label="Critical Alerts"       description="Notify when failed payments or system errors occur" value={alertNotifs}   onChange={setAlertNotifs}   />
              <ToggleRow label="Billing Reminders"     description="Send billing digest emails monthly"                value={billingNotifs} onChange={setBillingNotifs} />
            </div>

            {/* Security */}
            <div className="bg-surface rounded-card shadow-sm p-6">
              <h2 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                <Shield size={16} className="text-primary" /> Security
              </h2>
              <ToggleRow label="Require 2FA for Super Admins"       description="All super admin accounts must enable two-factor authentication" value={twoFA}        onChange={setTwoFA}        />
              <ToggleRow label="Audit Logging"                       description="Log all super admin actions for compliance"                     value={auditLog}     onChange={setAuditLog}     />
              <ToggleRow label="Allow Self-Service School Signup"    description="Schools can sign up without manual approval"                    value={schoolSignup} onChange={setSchoolSignup} />
            </div>

            {/* Bank Account — offline subscription payments */}
            <div className="bg-surface rounded-card shadow-sm p-6">
              <h2 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
                <Landmark size={16} className="text-primary" /> Learnora Bank Account
              </h2>
              <p className="text-xs text-muted mb-4">Schools that pay their subscription by bank transfer will see these details.</p>
              <div className="flex flex-col gap-4">
                {[
                  { label: 'Bank Name',       value: bankName,       set: setBankName,       ph: 'e.g. Access Bank'         },
                  { label: 'Account Name',    value: bankAcctName,   set: setBankAcctName,   ph: 'e.g. Learnora Technologies Ltd' },
                  { label: 'Account Number',  value: bankAcctNumber, set: setBankAcctNumber, ph: '10-digit NUBAN number'    },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-semibold text-muted mb-1.5">{f.label}</label>
                    <input
                      value={f.value}
                      onChange={e => f.set(e.target.value)}
                      placeholder={f.ph}
                      className="w-full h-11 px-4 border border-black/20 rounded-card text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={saveBankDetails}
                  disabled={savingBank}
                  className="flex items-center gap-2 h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-50"
                >
                  {savingBank ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {savingBank ? 'Saving…' : 'Save Bank Details'}
                </button>
                {bankSaved && <span className="text-sm text-green-600 font-medium">Bank details saved.</span>}
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-surface rounded-card border-2 border-red-200 p-6">
              <h2 className="text-base font-bold text-red-600 mb-1 flex items-center gap-2">
                <AlertTriangle size={16} /> Danger Zone
              </h2>
              <p className="text-xs text-muted mb-4">These actions affect the entire platform. Use with extreme caution.</p>
              <div className="flex items-center justify-between gap-4 py-4 border-b border-black/6">
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Wrench size={14} className="text-amber-600" /> Maintenance Mode
                  </p>
                  <p className="text-xs text-muted mt-0.5">All school users see a maintenance page. Super admins can still log in.</p>
                </div>
                <button
                  onClick={() => setMaintenance(!maintenance)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${maintenance ? 'bg-red-500' : 'bg-black/15'}`}
                >
                  <span className={`absolute inset-y-[2px] w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${maintenance ? 'left-[22px]' : 'left-[2px]'}`} />
                </button>
              </div>
              {maintenance && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 rounded-card">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-600 font-medium">Maintenance mode is ON. All school users are currently blocked.</p>
                </div>
              )}
            </div>

            {/* Save */}
            {saveError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-card px-4 py-3">{saveError}</p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors disabled:opacity-50"
              >
                <Save size={15} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {saved && <span className="text-sm text-green-600 font-medium">Settings saved successfully.</span>}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
