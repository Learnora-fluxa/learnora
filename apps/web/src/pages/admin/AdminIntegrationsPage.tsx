import { useState } from 'react'
import { CheckCircle2, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

interface Integration {
  id:          string
  name:        string
  description: string
  logo:        string
  category:    string
  connected:   boolean
  status?:     'active' | 'error' | 'syncing'
  lastSync?:   string
}

const integrations: Integration[] = [
  { id: 'google_drive',  name: 'Google Drive',      description: 'Share course materials and assignments directly from Drive',  logo: '📁', category: 'Storage',       connected: true,  status: 'active',  lastSync: '2 hours ago' },
  { id: 'google_meet',   name: 'Google Meet',        description: 'Launch Google Meet directly from live classes',              logo: '🎥', category: 'Video',         connected: true,  status: 'active',  lastSync: '5 hours ago' },
  { id: 'zoom',          name: 'Zoom',               description: 'Alternative video conferencing for live classes',            logo: '💻', category: 'Video',         connected: false },
  { id: 'microsoft_teams', name: 'Microsoft Teams',  description: 'Integrate with Teams for messaging and video',              logo: '🔷', category: 'Collaboration', connected: false },
  { id: 'google_forms',  name: 'Google Forms',       description: 'Import quiz/assignment results from Google Forms',          logo: '📋', category: 'Assessments',   connected: true,  status: 'syncing', lastSync: 'Syncing…' },
  { id: 'paystack',      name: 'Paystack',           description: 'Accept school fees and payments (configured in Finance)',   logo: '🟢', category: 'Payments',      connected: true,  status: 'active',  lastSync: 'Live' },
  { id: 'flutterwave',   name: 'Flutterwave',        description: 'Alternative payment gateway',                               logo: '🟠', category: 'Payments',      connected: false },
  { id: 'sms_gateway',   name: 'SMS Gateway',        description: 'Send automated SMS alerts to parents and staff',            logo: '📱', category: 'Notifications', connected: false },
  { id: 'whatsapp',      name: 'WhatsApp Business',  description: 'Send fee reminders and updates via WhatsApp',              logo: '💬', category: 'Notifications', connected: false },
]

const categories = ['All', ...Array.from(new Set(integrations.map(i => i.category)))]

const statusStyle: Record<string, string> = {
  active:  'bg-green-50 text-green-700',
  error:   'bg-red-50 text-red-600',
  syncing: 'bg-amber-50 text-amber-600',
}

export default function AdminIntegrationsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [items,    setItems]    = useState(integrations)
  const [category, setCategory] = useState('All')

  function toggle(id: string) {
    setItems(prev => prev.map(i => i.id === id
      ? { ...i, connected: !i.connected, status: !i.connected ? 'active' : undefined, lastSync: !i.connected ? 'Just now' : undefined }
      : i
    ))
  }

  const visible = category === 'All' ? items : items.filter(i => i.category === category)
  const connected = items.filter(i => i.connected).length

  return (
    <DashboardLayout
      activePage="settings"
      onNavigate={onNavigate}
      title="Integrations"
      subtitle="Connect third-party tools to your school"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-5">

        {/* Summary */}
        <div className="flex items-center gap-4 p-4 bg-surface rounded-card shadow-sm">
          <div className="size-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{connected} of {items.length} integrations connected</p>
            <p className="text-xs text-muted">All active integrations are syncing normally</p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors ${category === c ? 'bg-primary text-white' : 'bg-surface text-muted shadow-sm hover:text-foreground'}`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Integration cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map(item => (
            <div key={item.id} className={`bg-surface rounded-card shadow-sm p-5 flex flex-col gap-4 border-2 transition-all ${item.connected ? 'border-primary/15' : 'border-transparent'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.logo}</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.name}</p>
                    <span className="text-[10px] font-semibold bg-canvas text-muted px-2 py-0.5 rounded-full">{item.category}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggle(item.id)}
                  className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${item.connected ? 'bg-primary' : 'bg-black/15'}`}
                >
                  <span className={`absolute inset-y-[2px] w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${item.connected ? 'left-[22px]' : 'left-[2px]'}`} />
                </button>
              </div>
              <p className="text-xs text-muted leading-relaxed">{item.description}</p>
              {item.connected && item.status && (
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${statusStyle[item.status]}`}>
                    {item.status === 'syncing' ? <RefreshCw size={9} className="animate-spin" /> : <CheckCircle2 size={9} />}
                    {item.status}
                  </span>
                  <span className="text-[10px] text-muted">{item.lastSync}</span>
                </div>
              )}
              {item.connected && (
                <button className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline mt-auto">
                  <ExternalLink size={10} /> Configure
                </button>
              )}
              {!item.connected && (
                <button onClick={() => toggle(item.id)} className="h-8 bg-canvas rounded-full text-xs font-semibold text-muted hover:bg-primary/10 hover:text-primary transition-colors">
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 p-4 bg-canvas rounded-card border border-black/8 text-xs text-muted">
          <AlertCircle size={13} className="shrink-0 text-amber-500" />
          Missing an integration? Contact <span className="text-primary font-semibold">Learnora support</span> to request a new connector.
        </div>
      </div>
    </DashboardLayout>
  )
}
