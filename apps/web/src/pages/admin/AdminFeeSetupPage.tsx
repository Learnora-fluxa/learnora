import { useState, useEffect, useMemo } from 'react'
import {
  DollarSign, Building2, CreditCard, Plus, Trash2,
  CheckCircle2, Save, AlertCircle, Info, Loader2,
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import {
  getAdminFeeSetupMeta,
  getAdminFeeSetupStructure,
  publishAdminFeeSetup,
  updateAdminBankSettings,
  updateAdminPaystackSettings,
} from '../../lib/financeApi'

type Props = { onNavigate: (page: string) => void }
type Tab = 'structure' | 'bank' | 'paystack'

type FeeItem = {
  id: string
  label: string
  amount: string
  mandatory: boolean
  feeStructureId?: string | null
}

type SchoolClass = {
  id: string
  name: string
  level: string | null
}

type TermOption = {
  id: string
  name: string
  is_current: boolean | null
}

function makeFeeItem(): FeeItem {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: '',
    amount: '',
    mandatory: true,
    feeStructureId: null,
  }
}

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

export default function AdminFeeSetupPage({ onNavigate }: Props) {
  const { profile, session } = useAuth()
  const [tab, setTab] = useState<Tab>('structure')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<Tab | null>(null)

  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [terms, setTerms] = useState<TermOption[]>([])
  const [selClassId, setSelClassId] = useState('')
  const [selTermId, setSelTermId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [items, setItems] = useState<FeeItem[]>([])
  const [structureLoading, setStructureLoading] = useState(true)
  const [structureError, setStructureError] = useState('')
  const [publishSummary, setPublishSummary] = useState('')

  const [bankName, setBankName] = useState('')
  const [acctName, setAcctName] = useState('')
  const [acctNumber, setAcctNumber] = useState('')

  const [pubKey, setPubKey] = useState('')
  const [subAcctId, setSubAcctId] = useState('')

  useEffect(() => {
    if (session && profile?.school_id) {
      loadMeta()
    }
  }, [session, profile?.school_id])

  useEffect(() => {
    if (session && selClassId && selTermId) {
      loadFeeStructure(selClassId, selTermId)
    }
  }, [session, selClassId, selTermId])

  async function loadMeta() {
    if (!session) return

    setStructureLoading(true)
    setStructureError('')

    try {
      const data = await getAdminFeeSetupMeta(session)
      setClasses(data.classes)
      setTerms(data.terms)
      setBankName(data.settings.bankName)
      setAcctName(data.settings.accountName)
      setAcctNumber(data.settings.accountNumber)
      setPubKey(data.settings.paystackPublicKey)
      setSubAcctId(data.settings.paystackSubaccountCode)

      if (data.classes.length) {
        setSelClassId(prev => prev || data.classes[0].id)
      }

      if (data.terms.length) {
        const currentTerm = data.terms.find(term => term.is_current)?.id ?? data.terms[0].id
        setSelTermId(prev => prev || currentTerm)
      }

      if (!data.classes.length || !data.terms.length) {
        setItems([])
        setStructureLoading(false)
      }
    } catch (error) {
      setStructureError(error instanceof Error ? error.message : 'Could not load fee setup.')
      setStructureLoading(false)
    }
  }

  async function loadFeeStructure(classId: string, termId: string) {
    if (!session) return

    setStructureLoading(true)
    setStructureError('')
    setPublishSummary('')

    try {
      const data = await getAdminFeeSetupStructure(session, classId, termId)
      setItems(data.items)
      setDueDate(data.dueDate ?? '')
    } catch (error) {
      setStructureError(error instanceof Error ? error.message : 'Could not load fee structure.')
    } finally {
      setStructureLoading(false)
    }
  }

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0),
    [items],
  )

  function addItem() {
    setItems(prev => [...prev, makeFeeItem()])
    setSaved(null)
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(item => item.id !== id))
    setSaved(null)
  }

  function updateItem<K extends keyof FeeItem>(id: string, key: K, value: FeeItem[K]) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [key]: value } : item))
    setSaved(null)
  }

  async function saveStructure() {
    if (!session || !selClassId || !selTermId) return

    const normalizedItems = items
      .map(item => ({
        ...item,
        label: item.label.trim(),
        amount: String(parseFloat(item.amount) || 0),
      }))
      .filter(item => item.label && Number(item.amount) > 0)

    if (!normalizedItems.length) {
      setStructureError('Add at least one fee item with a valid amount before saving.')
      return
    }

    setSaving(true)
    setStructureError('')
    setPublishSummary('')

    try {
      const reply = await publishAdminFeeSetup(session, {
        classId: selClassId,
        termId: selTermId,
        dueDate: dueDate || null,
        items: normalizedItems,
      })

      setPublishSummary(
        `Published ${reply.publishedStructures} fee item${reply.publishedStructures === 1 ? '' : 's'} and synced ${reply.createdInvoices} new / ${reply.updatedInvoices} existing invoice${reply.createdInvoices + reply.updatedInvoices === 1 ? '' : 's'} for parents to pay.`,
      )
      flash('structure')
      await loadFeeStructure(selClassId, selTermId)
    } catch (error) {
      setStructureError(error instanceof Error ? error.message : 'Could not publish fee structure.')
    } finally {
      setSaving(false)
    }
  }

  async function saveBank() {
    if (!session) return

    setSaving(true)
    try {
      await updateAdminBankSettings(session, {
        bankName,
        accountName: acctName,
        accountNumber: acctNumber,
      })
      flash('bank')
    } catch (error) {
      setStructureError(error instanceof Error ? error.message : 'Could not save bank settings.')
    } finally {
      setSaving(false)
    }
  }

  async function savePaystack() {
    if (!session) return

    setSaving(true)
    try {
      await updateAdminPaystackSettings(session, {
        subaccountCode: subAcctId,
      })
      flash('paystack')
    } catch (error) {
      setStructureError(error instanceof Error ? error.message : 'Could not save Paystack settings.')
    } finally {
      setSaving(false)
    }
  }

  function flash(nextTab: Tab) {
    setSaved(nextTab)
    setTimeout(() => setSaved(null), 2500)
  }

  const tabs: { id: Tab; label: string; icon: typeof DollarSign }[] = [
    { id: 'structure', label: 'Fee Structure', icon: DollarSign },
    { id: 'bank', label: 'Bank Account', icon: Building2 },
    { id: 'paystack', label: 'Paystack', icon: CreditCard },
  ]

  const selectedClass = classes.find(item => item.id === selClassId)
  const selectedTerm = terms.find(item => item.id === selTermId)

  return (
    <DashboardLayout
      activePage="admin-fee-setup"
      onNavigate={onNavigate}
      title="Fee Setup"
      subtitle="Configure live fee structures, publish invoices, and connect payment accounts"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[920px] flex flex-col gap-6">
        <div className="flex gap-1 rounded-input bg-canvas p-1 w-fit">
          {tabs.map(nextTab => {
            const Icon = nextTab.icon
            return (
              <button
                key={nextTab.id}
                onClick={() => setTab(nextTab.id)}
                className={`flex items-center gap-2 rounded-[6px] px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === nextTab.id ? 'bg-surface shadow text-foreground' : 'text-muted hover:text-foreground'
                }`}
              >
                <Icon size={14} />
                {nextTab.label}
              </button>
            )
          })}
        </div>

        {tab === 'structure' && (
          <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-base font-bold text-foreground">Live Fee Structure</h3>
              <p className="text-sm text-muted mt-0.5">
                Publish fees to a real class and term. Parents can only pay what has been turned into invoices here.
              </p>
            </div>

            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-card px-4 py-3 text-sm text-blue-800">
              <Info size={15} className="shrink-0 mt-0.5" />
              <p>Saving this section updates live fee structures and generates or refreshes student invoices for the selected class and term.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted uppercase tracking-wide">Class</label>
                <select
                  value={selClassId}
                  onChange={event => setSelClassId(event.target.value)}
                  className="h-11 px-3 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary"
                >
                  <option value="">Select class</option>
                  {classes.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                {!classes.length && (
                  <button
                    type="button"
                    onClick={() => onNavigate('classes-management')}
                    className="self-start text-xs font-semibold text-primary hover:underline"
                  >
                    Create a class
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted uppercase tracking-wide">Term</label>
                <select
                  value={selTermId}
                  onChange={event => setSelTermId(event.target.value)}
                  className="h-11 px-3 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary"
                >
                  <option value="">Select term</option>
                  {terms.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}{item.is_current ? ' (Current)' : ''}
                    </option>
                  ))}
                </select>
                {!terms.length && (
                  <button
                    type="button"
                    onClick={() => onNavigate('term-calendar')}
                    className="self-start text-xs font-semibold text-primary hover:underline"
                  >
                    Create a term
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted uppercase tracking-wide">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={event => setDueDate(event.target.value)}
                  className="h-11 px-3 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="bg-canvas/60 rounded-card px-4 py-2.5 text-sm font-semibold text-foreground">
              Editing:
              {' '}
              <span className="text-primary">
                {selectedClass?.name ?? 'No class selected'}
                {' — '}
                {selectedTerm?.name ?? 'No term selected'}
              </span>
            </div>

            {structureError && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-card px-4 py-3 text-sm text-red-700">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <p>{structureError}</p>
              </div>
            )}

            {publishSummary && (
              <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-card px-4 py-3 text-sm text-green-700">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                <p>{publishSummary}</p>
              </div>
            )}

            {!classes.length || !terms.length ? (
              <div className="rounded-card border border-dashed border-black/12 px-4 py-8 text-center text-sm text-muted">
                <p>
                  {!classes.length && !terms.length
                    ? 'Create at least one class and one term before publishing fees for parents.'
                    : !classes.length
                      ? 'Create at least one class before publishing fees for parents.'
                      : 'Create at least one term before publishing fees for parents.'}
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  {!classes.length && (
                    <button
                      type="button"
                      onClick={() => onNavigate('classes-management')}
                      className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                    >
                      Go to Classes
                    </button>
                  )}
                  {!terms.length && (
                    <button
                      type="button"
                      onClick={() => onNavigate('term-calendar')}
                      className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                    >
                      Go to Terms
                    </button>
                  )}
                </div>
              </div>
            ) : structureLoading ? (
              <div className="py-10 text-center text-sm text-muted">Loading fee structure…</div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-[1fr_140px_auto_auto] gap-2 px-1 text-xs font-semibold text-muted">
                    <span>Fee Item</span>
                    <span>Amount (&#8358;)</span>
                    <span>Mandatory</span>
                    <span />
                  </div>

                  {items.length === 0 && (
                    <div className="rounded-card border border-dashed border-black/12 px-4 py-6 text-center text-sm text-muted">
                      No fee items added for this class and term yet.
                    </div>
                  )}

                  {items.map(item => (
                    <div key={item.id} className="grid grid-cols-[1fr_140px_auto_auto] gap-2 items-center">
                      <input
                        value={item.label}
                        onChange={event => updateItem(item.id, 'label', event.target.value)}
                        placeholder="e.g. Tuition Fee"
                        className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        min={0}
                        value={item.amount}
                        onChange={event => updateItem(item.id, 'amount', event.target.value)}
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
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="size-9 rounded-input flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-2 text-sm text-primary font-semibold hover:underline self-start"
                >
                  <Plus size={14} />
                  Add fee item
                </button>

                <div className="flex items-center justify-between bg-primary/8 border border-primary/20 rounded-card px-5 py-3.5">
                  <span className="text-sm font-bold text-foreground">
                    Total for {selectedClass?.name ?? 'selected class'} — {selectedTerm?.name ?? 'selected term'}
                  </span>
                  <span className="text-xl font-bold text-primary">{fmt(total)}</span>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={saveStructure}
                    disabled={saving || !selClassId || !selTermId}
                    className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-60"
                  >
                    {saving
                      ? <Loader2 size={14} className="animate-spin" />
                      : saved === 'structure'
                        ? <CheckCircle2 size={14} />
                        : <Save size={14} />
                    }
                    {saving ? 'Publishing…' : saved === 'structure' ? 'Published!' : 'Save & Publish Fees'}
                  </button>
                </div>
              </>
            )}
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
                  {['Access Bank', 'GTBank', 'First Bank', 'Zenith Bank', 'UBA', 'Sterling Bank', 'Fidelity Bank', 'FCMB', 'Polaris Bank', 'Stanbic IBTC', 'Union Bank', 'Wema Bank'].map(bank => (
                    <option key={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Account Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  maxLength={10}
                  value={acctNumber}
                  onChange={e => setAcctNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit NUBAN"
                  className="h-11 px-4 border border-black/20 rounded-input text-sm outline-none focus:border-primary font-mono tracking-widest"
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-semibold text-foreground">Account Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={acctName}
                  onChange={e => setAcctName(e.target.value)}
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
              <h3 className="text-base font-bold text-foreground">Learnora Payments</h3>
              <p className="text-sm text-muted mt-0.5">Parent online payments run through Learnora’s Paystack account. Your school does not need to provide a Paystack secret key.</p>
            </div>

            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-card px-4 py-3 text-sm text-amber-800">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Platform-managed credentials</p>
                <p className="mt-0.5">Learnora keeps the Paystack public and secret keys on the backend. Your school only needs valid bank details for settlement and, optionally, a subaccount code if Learnora later automates split payouts.</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Learnora Paystack Public Key</label>
                <input
                  type="text"
                  value={pubKey}
                  readOnly
                  placeholder="Configured by Learnora backend"
                  className="h-11 px-4 border border-black/20 rounded-input text-sm font-mono outline-none bg-canvas text-muted"
                />
                <p className="text-xs text-muted">This is supplied by Learnora at runtime. It is safe for the payment popup, but not edited per school.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Optional Paystack Subaccount Code</label>
                <input
                  type="text"
                  value={subAcctId}
                  onChange={e => setSubAcctId(e.target.value)}
                  placeholder="ACCT_xxxxxxxxxxxxxxx"
                  className="h-11 px-4 border border-black/20 rounded-input text-sm font-mono outline-none focus:border-primary"
                />
                <p className="text-xs text-muted">
                  Create a subaccount in Paystack Dashboard under Settlement → Subaccounts, then paste the code here.
                </p>
              </div>
            </div>

            <div className="bg-canvas rounded-card p-4">
              <p className="text-sm font-bold text-foreground mb-3">How settlements work</p>
              <ol className="flex flex-col gap-2 text-sm text-muted list-decimal list-inside">
                <li>Parents pay Learnora online using Learnora’s Paystack integration.</li>
                <li>Learnora records the transaction, fees, and school net balance in the settlement ledger.</li>
                <li>Your bank account on the Bank Account tab is used for payout settlement.</li>
                <li>If Learnora enables automated split settlements later, the optional subaccount code can be used.</li>
                <li>No school Paystack secret key is stored or exposed in this dashboard.</li>
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
