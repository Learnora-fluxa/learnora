import { useState, useEffect } from 'react'
import { HardDrive, Video, FileText, Image, AlertCircle, Loader2, Info } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface StorageCategory {
  id:    string
  label: string
  mb:    number
  Icon:  typeof Video
  color: string
}

const EMPTY_CATS: StorageCategory[] = [
  { id: 'videos', label: 'Videos',       mb: 0, Icon: Video,    color: '#8b5cf6' },
  { id: 'pdfs',   label: 'PDFs',         mb: 0, Icon: FileText, color: '#ef4444' },
  { id: 'images', label: 'Images',       mb: 0, Icon: Image,    color: '#10b981' },
]

const MAX_MB = 5120 // 5 GB nominal school bucket quota

export default function StorageManagementPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [categories, setCategories] = useState<StorageCategory[]>(EMPTY_CATS)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')

  useEffect(() => { if (profile?.school_id) loadStorage() }, [profile?.school_id])

  async function loadStorage() {
    setLoading(true)
    setError('')
    const schoolId = profile!.school_id!

    let videoBytes = 0, pdfBytes = 0, imgBytes = 0

    // List top-level objects in the school's folder (direct files + sub-folder names)
    const { data: topLevel, error: topErr } = await supabase.storage
      .from('message-attachments')
      .list(schoolId, { limit: 100 })

    if (topErr) { setError(topErr.message); setLoading(false); return }

    const topFiles   = (topLevel ?? []).filter(item => item.metadata)
    const subFolders = (topLevel ?? []).filter(item => !item.metadata)

    // Accumulate bytes from direct files
    for (const file of topFiles) {
      const size = (file.metadata as any)?.size ?? 0
      const mime = (file.metadata as any)?.mimetype ?? ''
      accumulate(mime, size, (v, p, i) => { videoBytes += v; pdfBytes += p; imgBytes += i })
    }

    // Walk sub-folders (conversation IDs) — cap at 20 to stay within rate limits
    for (const folder of subFolders.slice(0, 20)) {
      const { data: files } = await supabase.storage
        .from('message-attachments')
        .list(`${schoolId}/${folder.name}`, { limit: 50 })
      for (const file of files ?? []) {
        const size = (file.metadata as any)?.size ?? 0
        const mime = (file.metadata as any)?.mimetype ?? ''
        accumulate(mime, size, (v, p, i) => { videoBytes += v; pdfBytes += p; imgBytes += i })
      }
    }

    setCategories([
      { id: 'videos', label: 'Videos',  mb: toMB(videoBytes), Icon: Video,    color: '#8b5cf6' },
      { id: 'pdfs',   label: 'PDFs',    mb: toMB(pdfBytes),   Icon: FileText, color: '#ef4444' },
      { id: 'images', label: 'Images',  mb: toMB(imgBytes),   Icon: Image,    color: '#10b981' },
    ])
    setLoading(false)
  }

  function accumulate(mime: string, size: number, cb: (v: number, p: number, i: number) => void) {
    if (mime.startsWith('video/'))       cb(size, 0, 0)
    else if (mime === 'application/pdf') cb(0, size, 0)
    else if (mime.startsWith('image/'))  cb(0, 0, size)
  }

  function toMB(bytes: number) { return Math.max(0, Math.round(bytes / 1024 / 1024)) }

  function fmt(mb: number) {
    if (mb === 0) return '0 MB'
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`
  }

  const usedMB  = categories.reduce((s, c) => s + c.mb, 0)
  const freeMB  = Math.max(0, MAX_MB - usedMB)
  const usedPct = Math.min(Math.round((usedMB / MAX_MB) * 100), 100)

  return (
    <DashboardLayout
      activePage="downloads"
      onNavigate={onNavigate}
      title="Storage Management"
      subtitle="Cloud storage used by this school's workspace"
      user={sidebarUser}
    >
      <div className="max-w-[640px] flex flex-col gap-5">

        {/* Usage overview */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive size={20} className="text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">School Storage</p>
              <p className="text-xs text-muted">{fmt(usedMB)} used of {fmt(MAX_MB)}</p>
            </div>
            {loading
              ? <Loader2 size={16} className="ml-auto text-primary animate-spin" />
              : <p className="ml-auto text-lg font-bold text-foreground">{usedPct}%</p>
            }
          </div>
          <div className="h-3 bg-canvas rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${usedPct}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] text-muted">
            <span>{fmt(usedMB)} used</span>
            <span>{fmt(freeMB)} free</span>
          </div>

          {usedPct > 80 && (
            <div className="flex items-center gap-2 mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-card p-3">
              <AlertCircle size={12} className="shrink-0" /> Storage is nearly full. Contact your school admin.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-card p-3">
              <AlertCircle size={12} className="shrink-0" /> Could not load storage data: {error}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-black/6">
            <p className="text-xs font-bold text-muted uppercase tracking-wider">By file type</p>
          </div>
          <div className="divide-y divide-black/4">
            {categories.map(c => {
              const pct  = MAX_MB > 0 ? Math.round((c.mb / MAX_MB) * 100) : 0
              const Icon = c.Icon
              return (
                <div key={c.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="size-10 rounded-card flex items-center justify-center shrink-0" style={{ background: c.color + '18' }}>
                    <Icon size={16} style={{ color: c.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1.5">
                      <p className="text-sm font-semibold text-foreground">{c.label}</p>
                      <p className="text-xs text-muted">{loading ? '…' : fmt(c.mb)}</p>
                    </div>
                    <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: c.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Info note */}
        <div className="bg-surface rounded-card shadow-sm p-5">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">About school storage</p>
              <p className="text-xs text-muted leading-relaxed">
                This shows files uploaded to your school's message-attachments bucket in Supabase Storage.
                File management (deletions, quota changes) is handled by your school admin.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
