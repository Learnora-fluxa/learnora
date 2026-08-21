import { useState } from 'react'
import { CreditCard, CheckCircle2, AlertCircle, Save, ExternalLink } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

const gateways = [
  { id: 'paystack',     name: 'Paystack',     logo: '🟢', desc: 'Nigerian payment gateway — cards, bank transfer, USSD',      popular: true  },
  { id: 'flutterwave',  name: 'Flutterwave',  logo: '🟠', desc: 'Pan-African payments — cards, mobile money, bank transfer', popular: false },
  { id: 'stripe',       name: 'Stripe',       logo: '🔵', desc: 'International cards and payment methods',                   popular: false },
]

export default function PaymentIntegrationPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [active,    setActive]    = useState('paystack')
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? `${window.location.origin}/api`
  const callbackUrl = `${window.location.origin}/parent/payment-success`
  const [pubKey,    setPubKey]    = useState('Managed by Learnora')
  const [webhookURL, setWebhookURL] = useState(`${apiBaseUrl}/payments/webhooks/paystack`)
  const [testMode,  setTestMode]  = useState(false)
  const [saved,     setSaved]     = useState(false)

  return (
    <DashboardLayout
      activePage="subscription"
      onNavigate={onNavigate}
      title="Payment Integration"
      subtitle="Review Learnora-managed payment endpoints and gateway status"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[720px] flex flex-col gap-6">

        {/* Gateway selector */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h2 className="text-sm font-bold text-foreground mb-4">Select Payment Gateway</h2>
          <div className="flex flex-col gap-3">
            {gateways.map(g => (
              <button
                key={g.id}
                onClick={() => setActive(g.id)}
                className={`flex items-center gap-4 p-4 rounded-card border-2 text-left transition-all ${active === g.id ? 'border-primary bg-primary/4' : 'border-black/8 hover:border-black/20'}`}
              >
                <span className="text-2xl">{g.logo}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{g.name}</p>
                    {g.popular && <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">Popular</span>}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{g.desc}</p>
                </div>
                {active === g.id && <CheckCircle2 size={18} className="text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* API keys */}
        <div className="bg-surface rounded-card shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">API Configuration</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                onClick={() => setTestMode(!testMode)}
                className={`w-9 h-5 rounded-full relative transition-colors ${testMode ? 'bg-amber-500' : 'bg-primary'}`}
              >
                <span className={`absolute inset-y-[2px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${testMode ? 'left-[18px]' : 'left-[2px]'}`} />
              </button>
              <span className="text-xs font-semibold text-foreground">{testMode ? 'Test mode' : 'Live mode'}</span>
            </label>
          </div>

          {testMode && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-card text-xs text-amber-700">
              <AlertCircle size={13} className="shrink-0" />
              Test mode active. Payments will not be real. Switch to Live before going to production.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Public Key</label>
            <input
              value={pubKey}
              onChange={e => setPubKey(e.target.value)}
              readOnly
              className="w-full h-10 px-3 border border-black/20 rounded-card text-sm font-mono outline-none bg-canvas text-muted"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Secret Key</label>
            <input
              type="password"
              value="Stored securely in backend env"
              readOnly
              className="w-full h-10 px-3 border border-black/20 rounded-card text-sm font-mono outline-none bg-canvas text-muted"
            />
            <p className="text-[10px] text-muted mt-1">Learnora keeps the secret key in backend environment variables. Schools do not enter it here.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Webhook URL</label>
            <div className="flex gap-2">
              <input
                value={webhookURL}
                onChange={e => setWebhookURL(e.target.value)}
                readOnly
                className="flex-1 h-10 px-3 border border-black/20 rounded-card text-sm font-mono outline-none bg-canvas text-muted"
              />
              <button className="flex items-center gap-1 h-10 px-3 border border-black/15 rounded-card text-xs text-muted hover:border-primary hover:text-primary transition-colors">
                <ExternalLink size={12} /> Test
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Callback URL</label>
            <input
              value={callbackUrl}
              readOnly
              className="w-full h-10 px-3 border border-black/20 rounded-card text-sm font-mono outline-none bg-canvas text-muted"
            />
            <p className="text-[10px] text-muted mt-1">Use this as the Paystack redirect/callback URL when initializing browser-based payments.</p>
          </div>
        </div>

        {/* Accepted methods */}
        <div className="bg-surface rounded-card shadow-sm p-5">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <CreditCard size={14} className="text-primary" /> Accepted Payment Methods
          </h2>
          <div className="flex flex-wrap gap-2">
            {['Card (Visa/Mastercard)', 'Bank Transfer', 'USSD', 'Mobile Money', 'Learnora Wallet'].map(m => (
              <span key={m} className="flex items-center gap-1.5 h-8 px-3 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                <CheckCircle2 size={11} /> {m}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }}
            className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors"
          >
            <Save size={15} /> Save Configuration
          </button>
          {saved && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
              <CheckCircle2 size={16} /> Saved!
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
