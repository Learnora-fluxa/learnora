import { useState, useEffect } from 'react'
import {
  DollarSign, Building2, CreditCard, Plus, Trash2,
  CheckCircle2, Eye, EyeOff, Save, AlertCircle, Info, Loader2,
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type Tab = 'structure' | 'bank' | 'paystack'

type FeeItem = { id: number; label: string; amount: string; mandatory: boolean }

const LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3']
const TERMS  = ['First Term', 'Second Term', 'Third Term']

const defaultItems = (): FeeItem[] => [
  { id: 1, label: 'Tuition Fee',  amount: '60000', mandatory: true  },
  { id: 2, label: 'PTA Levy',     amount: '5000',  mandatory: true  },
  { id: 3, label: 'Textbook Fee', amount: '10000', mandatory: true  },
  { id: 4, label: 'Uniform Levy', amount: '8000',  mandatory: false },
  { id: 5, label: 'Lab Fee',      amount: '7000',  mandatory: false },
]

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

export default function AdminFeeSetupPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [tab,      setTab]      = useState<Tab>('structure')
  const [selLevel, setSelLevel] = useState('SS1')
  const [selTerm,  setSelTerm]  = useState('First Term')
  const [items,    setItems]    = useState<FeeItem[]>(defaultItems())
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState<Tab | null>(null)

  // bank details
  const [bankName,   setBankName]   = useState('')
  const [acctName,   setAcctName]   = useState('')
  const [acctNumber, setAcctNumber] = useState('')

  // paystack
  const [pubKey,    setPubKey]    = useState('')
  const [secKey,    setSecKey]    = useState('')
  const [showSec,   setShowSec]   = useState(false)
  const [subAcctId, setSubAcctId] = useState('')

  // Load bank + paystack settings on mount
  useEffect(() => {
    if (profile?.school_id) {
      loadSettings()
      loadFeeStructure(selLevel, selTerm)
    }
  }, [profile?.school_id])

  // Reload fee structure when level/term changes
  useEffect(() => {
    if (profile?.school_id) loadFeeStructure(selLevel, selTerm)
  }, [selLevel, selTerm])

  async function loadSettings() {
    const { data } = await supabase
      .from('school_settings')
      .select('bank_name, account_number, account_name, bank_account_number, bank_account_name, paystack_public_key, paystack_secret_key, paystack_subaccount_code')
      .eq('school_id', profile!.school_id!)
      .maybeSingle()
    if (data) {
      setBankName(data.bank_name ?? '')
      // Prefer the new columns (used by offline payment flow); fall back to legacy columns
      setAcctNumber((data.bank_account_number ?? data.account_number) ?? '')
      setAcctName((data.bank_account_name ?? data.account_name) ?? '')
      setPubKey(data.paystack_public_key ?? '')
      setSecKey(data.paystack_secret_key ?? '')
      setSubAcctId(data.paystack_subaccount_code ?? '')
    }
  }

  async function loadFeeStructure(level: string, term: string) {
    const { data } = await supabase
      .from('fee_level_configs')
      .select('items')
      .eq('school_id', profile!.school_id!)
      .eq('level', level)
      .eq('term', term)
      .maybeSingle()
    if (data?.items && Array.isArray(data.items)) {
      setItems(data.items as FeeItem[])
    } else {
      setItems(defaultItems())
    }
  }

  const total = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)

  function addItem() {
    const newId = Math.max(0, ...items.map(i => i.id)) + 1
    setItems(p => [...p, { id: newId, label: '', amount: '', mandatory: false }])
    setSaved(null)
  }

  function removeItem(id: number) {
    setItems(p => p.filter(i => i.id !== id))
    setSaved(null)
  }

  function updateItem<K extends keyof FeeItem>(id: number, key: K, val: FeeItem[K]) {
    setItems(p => p.map(i => i.id === id ? { ...i, [key]: val } : i))
    setSaved(null)
  }

  async function saveStructure() {
    if (!profile?.school_id) return
    setSaving(true)
    const { error } = await supabase
      .from('fee_level_configs')
      .upsert(
        { school_id: profile.school_id, level: selLevel, term: selTerm, items },
        { onConflict: 'school_id,level,term' }
      )
    logSupabaseError('AdminFeeSetup.saveStructure', error)
    setSaving(false)
    flash('structure')
  }

  async function saveBank() {
    if (!profile?.school_id) return
    setSaving(true)
    const { error } = await supabase
      .from('school_settings')
      .upsert(
        {
          school_id:           profile.school_id,
          bank_name:           bankName,
          account_name:        acctName,
          account_number:      acctNumber,
          // Also write new columns used by the offline payment page
          bank_account_name:   acctName,
          bank_account_number: acctNumber,
        },
        { onConflict: 'school_id' }
      )
    logSupabaseError('AdminFeeSetup.saveBank', error)
    setSaving(false)
    flash('bank')
  }

  async function savePaystack() {
    if (!profile?.school_id) return
    setSaving(true)
    const { error } = await supabase
      .from('school_settings')
      .upsert(
        { school_id: profile.school_id, paystack_public_key: pubKey, paystack_secret_key: secKey, paystack_subaccount_code: subAcctId },
        { onConflict: 'school_id' }
      )
    logSupabaseError('AdminFeeSetup.savePaystack', error)
    setSaving(false)
    flash('paystack')
  }

  function flash(t: Tab) {
    setSaved(t)
    setTimeout(() => setSaved(null), 2500)
  }

  const tabs: { id: Tab; label: string; icon: typeof DollarSign }[] = [
    { id: 'structure', label: 'Fee Structure', icon: DollarSign },
    { id: 'bank',      label: 'Bank Account',  icon: Building2  },
    { id: 'paystack',  label: 'Paystack',      icon: CreditCard },
  ]

  return (
    <DashboardLayout
      activePage="admin-fee-setup"
      onNavigate={onNavigate}
      title="Fee Setup"
      subtitle="Configure school fees, payment accounts, and Paystack integration"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[820px] flex flex-col gap-6">

        <div className="flex gap-1 bg-canvas rounded-input p-1 w-fit">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors ${tab === t.id ? 'bg-surface shadow text-foreground' : 'text-muted hover:text-foreground'}`}
              >
                <Icon size={14} />{t.label}
              </button>
            )
          })}
        </div>

        {tab === 'structure' && (
          <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-base font-bold text-foreground">Fee Structure</h3>
              <p className="text-sm text-muted mt-0.5">Set the fee breakdown for each class level and term.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <label className="text-xs font-semibold text-muted uppercase tracking-wide">Level</label>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map(l => (
                    <button key={l} type="button" onClick={() => setSelLevel(l)}
                      className={`h-9 px-3 rounded-full text-xs font-bold border transition-colors ${selLevel === l ? 'border-primary bg-primary/8 text-primary' : 'border-black/15 text-muted hover:border-primary/40'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted uppercase tracking-wide">Term</label>
                <div className="flex gap-2">
                  {TERMS.map(t => (
                    <button key={t} type="button" onClick={() => setSelTerm(t)}
                      className={`h-9 px-3 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${selTerm === t ? 'border-primary bg-primary/8 text-primary' : 'border-black/15 text-muted hover:border-primary/40'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-canvas/60 rounded-card px-4 py-2.5 text-sm font-semibold text-foreground">
              Editing: <span className="text-primary">{selLevel} — {selTerm}</span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-[1fr_140px_auto_auto] gap-2 text-xs font-semibold text-muted px-1">
                <span>Fee Item</span><span>Amount (&#8358;)</span><span>Mandatory</span><span />
              </div>
              {items.map(item => (
                <div key={item.id} className="grid grid-cols-[1fr_140px_auto_auto] gap-2 items-center">
                  <input
                    value={item.label}
                    onChange={e => updateItem(item.id, 'label', e.target.value)}
                    placeholder="e.g. Tuition Fee"
                    className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary"
                  />
                  <input
                    type="number" min={0}
                    value={item.amount}
                    onChange={e => updateItem(item.id, 'amount', e.target.value)}
                    placeholder="0"
                    className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => updateItem(item.id, 'mandatory', !item.mandatory)}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors shrink-0 ${item.mandatory ? 'bg-primary' : 'bg-black/15'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 size-5 bg-white rounded-full shadow transition-transform ${item.mandatory ? 'translate-x-5' : ''}`} />
                  </button>
                  <button type="button" onClick={() => removeItem(item.id)}
                    className="size-9 rounded-input flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={addItem}
              className="flex items-center gap-2 text-sm text-primary font-semibold hover:underline self-start">
              <Plus size={14} /> Add fee item
            </button>

            <div className="flex items-center justify-between bg-primary/8 border border-primary/20 rounded-card px-5 py-3.5">
              <span className="text-sm font-bold text-foreground">Total for {selLevel} — {selTerm}</span>
              <span className="text-xl font-bold text-primary">{fmt(total)}</span>
            </div>

            <div className="flex justify-end">
              <button onClick={saveStructure} disabled={saving}
                className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : saved === 'structure' ? <CheckCircle2 size={14} /> : <Save size={14} />}
                {saving ? 'Saving…' : saved === 'structure' ? 'Saved!' : 'Save Fee Structure'}
              </button>
            </div>
          </div>
        )}

        {tab === 'bank' && (
          <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-base font-bold text-foreground">School Bank Account</h3>
              <p className="text-sm text-muted mt-0.5">This account receives fee payments remitted by Learnora. It is also shown to parents for direct bank transfers.</p>
            </div>

            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-card px-4 py-3 text-sm text-blue-800">
              <Info size={15} className="shrink-0 mt-0.5" />
              <p>Account details are verified before activation. Changes may take up to 24 hours to reflect for parents.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Bank Name <span className="text-red-500">*</span></label>
                <select value={bankName} onChange={e => setBankName(e.target.value)}
                  className="h-11 px-3 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary">
                  <option value="">Select bank</option>
                  {['Access Bank','GTBank','First Bank','Zenith Bank','UBA','Sterling Bank','Fidelity Bank','FCMB','Polaris Bank','Stanbic IBTC','Union Bank','Wema Bank'].map(b => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Account Number <span className="text-red-500">*</span></label>
                <input
                  type="text" maxLength={10} value={acctNumber}
                  onChange={e => setAcctNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit NUBAN"
                  className="h-11 px-4 border border-black/20 rounded-input text-sm outline-none focus:border-primary font-mono tracking-widest"
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-semibold text-foreground">Account Name <span className="text-red-500">*</span></label>
                <input
                  type="text" value={acctName} onChange={e => setAcctName(e.target.value)}
                  placeholder="As it appears on the bank statement"
                  className="h-11 px-4 border border-black/20 rounded-input text-sm outline-none focus:border-primary"
                />
                <p className="text-xs text-muted">Must match the registered school name exactly.</p>
              </div>
            </div>

            {(bankName && acctNumber.length === 10 && acctName) && (
              <div className="bg-canvas rounded-card p-4 flex flex-col gap-1.5 text-sm">
                <p className="font-semibold text-foreground mb-1">Bank Details Preview</p>
                <div className="flex justify-between"><span className="text-muted">Bank</span><span className="font-semibold text-foreground">{bankName}</span></div>
                <div className="flex justify-between"><span className="text-muted">Account Number</span><span className="font-mono font-semibold text-foreground">{acctNumber}</span></div>
                <div className="flex justify-between"><span className="text-muted">Account Name</span><span className="font-semibold text-foreground">{acctName}</span></div>
                <p className="text-xs text-muted mt-1">This is what parents see when they choose offline/bank transfer payment.</p>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={saveBank} disabled={saving}
                className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : saved === 'bank' ? <CheckCircle2 size={14} /> : <Save size={14} />}
                {saving ? 'Saving…' : saved === 'bank' ? 'Saved!' : 'Save Bank Details'}
              </button>
            </div>
          </div>
        )}

        {tab === 'paystack' && (
          <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-base font-bold text-foreground">Paystack Integration</h3>
              <p className="text-sm text-muted mt-0.5">Connect your school Paystack account so fees paid by parents are split and remitted directly to your school account.</p>
            </div>

            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-card px-4 py-3 text-sm text-amber-800">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">How it works</p>
                <p className="mt-0.5">Parents pay via Paystack on Learnora. Paystack splits the payment: Learnora deducts a platform fee and the remainder is remitted to your school subaccount within 24 hours.</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Paystack Public Key <span className="text-red-500">*</span></label>
                <input
                  type="text" value={pubKey} onChange={e => setPubKey(e.target.value)}
                  placeholder="pk_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="h-11 px-4 border border-black/20 rounded-input text-sm font-mono outline-none focus:border-primary"
                />
                <p className="text-xs text-muted">Found in your Paystack Dashboard under Settings &rarr; API Keys &amp; Webhooks.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Paystack Secret Key <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={showSec ? 'text' : 'password'}
                    value={secKey} onChange={e => setSecKey(e.target.value)}
                    placeholder="sk_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="h-11 w-full px-4 pr-10 border border-black/20 rounded-input text-sm font-mono outline-none focus:border-primary"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowSec(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                    {showSec ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-xs text-muted">Keep this secret — never share it publicly.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Subaccount Code</label>
                <input
                  type="text" value={subAcctId} onChange={e => setSubAcctId(e.target.value)}
                  placeholder="ACCT_xxxxxxxxxxxxxxx"
                  className="h-11 px-4 border border-black/20 rounded-input text-sm font-mono outline-none focus:border-primary"
                />
                <p className="text-xs text-muted">
                  Create a subaccount in Paystack Dashboard under Settlement &rarr; Subaccounts, then paste the code here.
                </p>
              </div>
            </div>

            <div className="bg-canvas rounded-card p-4">
              <p className="text-sm font-bold text-foreground mb-3">Setup Steps</p>
              <ol className="flex flex-col gap-2 text-sm text-muted list-decimal list-inside">
                <li>Create a Paystack business account at paystack.com</li>
                <li>Go to Settings &rarr; API Keys and copy your Live Public and Secret keys above</li>
                <li>Go to Settlement &rarr; Subaccounts &rarr; Create subaccount with your school bank details</li>
                <li>Copy the subaccount code (starts with ACCT_) and paste above</li>
                <li>Save — parents can now pay online and funds settle to your account automatically</li>
              </ol>
            </div>

            <div className="flex justify-end">
              <button onClick={savePaystack} disabled={saving}
                className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : saved === 'paystack' ? <CheckCircle2 size={14} /> : <Save size={14} />}
                {saving ? 'Saving…' : saved === 'paystack' ? 'Saved!' : 'Save Paystack Settings'}
              </button>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
