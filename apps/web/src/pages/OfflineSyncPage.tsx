import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw, CheckCircle2, HardDrive, Trash2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

interface CacheEntry { url: string; size: string }

export default function OfflineSyncPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [online,        setOnline]        = useState(navigator.onLine)
  const [swActive,      setSwActive]      = useState(false)
  const [cacheEntries,  setCacheEntries]  = useState<CacheEntry[]>([])
  const [cacheBytes,    setCacheBytes]    = useState(0)
  const [clearing,      setClearing]      = useState(false)
  const [cleared,       setCleared]       = useState(false)

  useEffect(() => {
    const up   = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online',  up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistration('/sw.js').then(reg => {
      setSwActive(!!reg?.active)
    })
    loadCacheInfo()
  }, [])

  async function loadCacheInfo() {
    if (!('caches' in window)) return
    try {
      const keys  = await caches.keys()
      const lnKey = keys.find(k => k.startsWith('learnora-'))
      if (!lnKey) return
      const cache   = await caches.open(lnKey)
      const reqs    = await cache.keys()
      let totalBytes = 0
      const entries: CacheEntry[] = []
      for (const req of reqs) {
        const res = await cache.match(req)
        if (!res) continue
        const buf  = await res.clone().arrayBuffer()
        totalBytes += buf.byteLength
        entries.push({
          url:  new URL(req.url).pathname,
          size: buf.byteLength > 1024
            ? `${(buf.byteLength / 1024).toFixed(1)} KB`
            : `${buf.byteLength} B`,
        })
      }
      setCacheEntries(entries)
      setCacheBytes(totalBytes)
    } catch { /* ignore — caches API may be restricted */ }
  }

  async function clearCache() {
    setClearing(true)
    try {
      const keys = await caches.keys()
      await Promise.all(keys.filter(k => k.startsWith('learnora-')).map(k => caches.delete(k)))
      setCacheEntries([])
      setCacheBytes(0)
      setCleared(true)
      setTimeout(() => setCleared(false), 2500)
    } catch { /* ignore */ }
    setClearing(false)
  }

  const cacheMB = (cacheBytes / (1024 * 1024)).toFixed(2)

  return (
    <DashboardLayout
      activePage="downloads"
      onNavigate={onNavigate}
      title="Offline & Cache"
      subtitle="Service Worker status and cached assets"
      user={sidebarUser}
    >
      <div className="max-w-[680px] flex flex-col gap-5">

        {/* Network status */}
        <div className={`flex items-center gap-3 p-4 rounded-card border ${
          online
            ? 'bg-green-50 border-green-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          {online
            ? <Wifi size={18} className="text-green-600 shrink-0" />
            : <WifiOff size={18} className="text-amber-600 shrink-0" />
          }
          <div>
            <p className={`text-sm font-bold ${online ? 'text-green-800' : 'text-amber-800'}`}>
              {online ? 'You are online' : 'You are offline'}
            </p>
            <p className={`text-xs mt-0.5 ${online ? 'text-green-700' : 'text-amber-700'}`}>
              {online
                ? 'All features available. The app shell is cached for offline use.'
                : 'Cached pages are still accessible. Database changes will fail until reconnected.'
              }
            </p>
          </div>
        </div>

        {/* SW status */}
        <div className="bg-surface rounded-card shadow-sm p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${swActive ? 'bg-green-50' : 'bg-canvas'}`}>
              <RefreshCw size={16} className={swActive ? 'text-green-600' : 'text-muted'} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Service Worker</p>
              <p className="text-xs text-muted mt-0.5">
                {swActive ? 'Active — app shell is cached for offline use' : 'Not yet registered (will activate on next page load)'}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${swActive ? 'bg-green-100 text-green-700' : 'bg-canvas text-muted'}`}>
            {swActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Cache stats */}
        <div className="bg-surface rounded-card shadow-sm p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <HardDrive size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Cached assets</p>
              <p className="text-xs text-muted mt-0.5">
                {cacheEntries.length} files · {cacheMB} MB used
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cleared && <CheckCircle2 size={14} className="text-green-500" />}
            <button onClick={clearCache} disabled={clearing || cacheEntries.length === 0}
              className="flex items-center gap-1.5 h-8 px-3 border border-black/20 rounded-card text-xs font-semibold text-foreground hover:bg-canvas disabled:opacity-40 transition-colors">
              <Trash2 size={11} className="text-red-400" />
              {clearing ? 'Clearing…' : 'Clear cache'}
            </button>
          </div>
        </div>

        {/* Cached file list */}
        {cacheEntries.length > 0 && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-black/6">
              <p className="text-xs font-bold text-muted uppercase tracking-wider">Cached files</p>
            </div>
            <div className="divide-y divide-black/4 max-h-72 overflow-y-auto">
              {cacheEntries.map((e, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-2.5 gap-4">
                  <p className="text-xs text-foreground truncate font-mono">{e.url || '/'}</p>
                  <span className="text-[10px] text-muted shrink-0">{e.size}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {cacheEntries.length === 0 && (
          <div className="bg-surface rounded-card shadow-sm p-8 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">No cached files yet</p>
            <p className="text-xs text-muted">The Service Worker will cache assets automatically as you browse.</p>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
