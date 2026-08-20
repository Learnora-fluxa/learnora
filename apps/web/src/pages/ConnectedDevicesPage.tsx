import { useState } from 'react'
import { Monitor, Smartphone, Tablet, Trash2, Shield } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

type DeviceType = 'desktop' | 'mobile' | 'tablet'

interface Device {
  id:       string
  name:     string
  type:     DeviceType
  browser:  string
  location: string
  lastSeen: string
  isCurrent: boolean
}

const ICON: Record<DeviceType, typeof Monitor> = {
  desktop: Monitor,
  mobile:  Smartphone,
  tablet:  Tablet,
}

// Static list — real device session tracking requires backend session table
const MOCK_DEVICES: Device[] = [
  { id: '1', name: 'Windows PC',   type: 'desktop', browser: 'Chrome 124',   location: 'Lagos, Nigeria',  lastSeen: 'Active now',     isCurrent: true  },
  { id: '2', name: 'iPhone 14',    type: 'mobile',  browser: 'Safari 17',    location: 'Lagos, Nigeria',  lastSeen: '2 hours ago',    isCurrent: false },
  { id: '3', name: 'Android Phone',type: 'mobile',  browser: 'Chrome Mobile',location: 'Abuja, Nigeria',  lastSeen: '3 days ago',     isCurrent: false },
  { id: '4', name: 'iPad Pro',     type: 'tablet',  browser: 'Safari 17',    location: 'Lagos, Nigeria',  lastSeen: '1 week ago',     isCurrent: false },
]

export default function ConnectedDevicesPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES)

  function remove(id: string) {
    setDevices(prev => prev.filter(d => d.id !== id))
  }

  function removeAll() {
    setDevices(prev => prev.filter(d => d.isCurrent))
  }

  return (
    <DashboardLayout
      activePage="settings"
      onNavigate={onNavigate}
      title="Connected Devices"
      subtitle="Manage the devices logged into your account"
      user={sidebarUser}
    >
      <div className="max-w-[680px] flex flex-col gap-5">

        {/* Security note */}
        <div className="bg-primary/5 border border-primary/20 rounded-card p-4 flex items-start gap-3">
          <Shield size={16} className="text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-foreground leading-relaxed">
            If you see a device you don't recognise, remove it immediately and change your password to secure your account.
          </p>
        </div>

        {/* Device list */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-black/6 flex items-center justify-between">
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">{devices.length} Active Sessions</p>
            {devices.length > 1 && (
              <button onClick={removeAll} className="text-xs text-red-500 font-semibold hover:underline">
                Sign out other devices
              </button>
            )}
          </div>

          <div className="divide-y divide-black/4">
            {devices.map(d => {
              const Icon = ICON[d.type]
              return (
                <div key={d.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="size-11 rounded-full bg-canvas flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{d.name}</p>
                      {d.isCurrent && (
                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">This device</span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5">{d.browser} · {d.location}</p>
                    <p className="text-xs text-muted mt-0.5">{d.lastSeen}</p>
                  </div>
                  {!d.isCurrent && (
                    <button onClick={() => remove(d.id)}
                      className="size-8 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors group">
                      <Trash2 size={14} className="text-muted group-hover:text-red-500" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Info */}
        <p className="text-xs text-muted text-center">
          Real device tracking requires a session management backend. Shown data is illustrative.
        </p>
      </div>
    </DashboardLayout>
  )
}
