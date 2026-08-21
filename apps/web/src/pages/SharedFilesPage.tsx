import { useState, useEffect } from 'react'
import { File, FileText, Image, Video, Download, Search, Filter } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

type FileType = 'pdf' | 'image' | 'video' | 'doc' | 'other'

interface SharedFile {
  id:         string
  name:       string
  type:       FileType
  size:       string
  sharedBy:   string
  course:     string
  uploadedAt: string
  url:        string
}

const TYPE_META: Record<FileType, { Icon: typeof File; color: string; bg: string }> = {
  pdf:   { Icon: FileText, color: 'text-red-500',   bg: 'bg-red-50'    },
  image: { Icon: Image,    color: 'text-blue-500',  bg: 'bg-blue-50'   },
  video: { Icon: Video,    color: 'text-purple-500',bg: 'bg-purple-50' },
  doc:   { Icon: FileText, color: 'text-primary',   bg: 'bg-primary/10'},
  other: { Icon: File,     color: 'text-muted',     bg: 'bg-canvas'    },
}

function guessType(url: string | null): FileType {
  if (!url) return 'other'
  const ext = url.split('.').pop()?.toLowerCase() ?? ''
  if (['pdf'].includes(ext))            return 'pdf'
  if (['png','jpg','jpeg','gif','webp'].includes(ext)) return 'image'
  if (['mp4','webm','mov'].includes(ext)) return 'video'
  if (['doc','docx','txt'].includes(ext)) return 'doc'
  return 'other'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SharedFilesPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [files,   setFiles]   = useState<SharedFile[]>([])
  const [query,   setQuery]   = useState('')
  const [typeFilter, setType] = useState<FileType | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    setLoading(true)
    const schoolId = profile!.school_id!

    // Use message attachments from messages — as a proxy for shared files
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, content, created_at, sender_id, attachment_url')
      .eq('school_id', schoolId)
      .not('attachment_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!msgs || msgs.length === 0) { setLoading(false); return }

    const senderIds = [...new Set(msgs.map((m: any) => m.sender_id))]
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', senderIds)
    const nameMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name ?? 'Unknown']))

    setFiles(msgs.map((m: any) => {
      const url  = m.attachment_url as string
      const name = url.split('/').pop() ?? 'file'
      return {
        id:         m.id,
        name,
        type:       guessType(url),
        size:       '—',
        sharedBy:   nameMap[m.sender_id] ?? 'Unknown',
        course:     'Shared',
        uploadedAt: m.created_at,
        url,
      }
    }))
    setLoading(false)
  }

  const visible = files.filter(f =>
    (typeFilter === 'all' || f.type === typeFilter) &&
    (query === '' || f.name.toLowerCase().includes(query.toLowerCase()) || f.sharedBy.toLowerCase().includes(query.toLowerCase()))
  )

  return (
    <DashboardLayout
      activePage="messages"
      onNavigate={onNavigate}
      title="Shared Files"
      subtitle="All files shared in messages and chats"
      nav={profile?.role === 'teacher' ? teacherNav : undefined}
      user={sidebarUser}
    >
      <div className="max-w-[860px] flex flex-col gap-5">

        {/* Search + filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search files or sender…"
              className="w-full h-10 pl-9 pr-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'pdf', 'image', 'video', 'doc'] as const).map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`h-8 px-3 rounded-full text-xs font-semibold capitalize transition-colors ${typeFilter === t ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-foreground shadow-sm border border-black/8'}`}>
                {t === 'all' ? <><Filter size={10} className="inline mr-1" />All</> : t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* File grid */}
        {loading ? (
          <div className="text-center py-12 text-sm text-muted">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <File size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{query ? `No files matching "${query}"` : 'No shared files yet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.map(f => {
              const { Icon, color, bg } = TYPE_META[f.type]
              return (
                <div key={f.id} className="bg-surface rounded-card shadow-sm p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`size-10 rounded-card ${bg} flex items-center justify-center shrink-0`}>
                      <Icon size={18} className={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate" title={f.name}>{f.name}</p>
                      <p className="text-xs text-muted mt-0.5">{f.type.toUpperCase()} · {f.size}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted flex flex-col gap-0.5">
                    <span>By {f.sharedBy}</span>
                    <span>{fmtDate(f.uploadedAt)}</span>
                  </div>
                  <a href={f.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 h-8 px-3 bg-canvas border border-black/12 rounded-pill text-xs font-semibold text-muted hover:text-primary hover:border-primary transition-colors w-fit">
                    <Download size={11} /> Download
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
