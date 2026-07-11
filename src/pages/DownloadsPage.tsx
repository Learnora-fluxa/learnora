import { useState, useEffect } from 'react'
import { Download, Video, FileText, Wifi, WifiOff, Trash2, PlayCircle, HardDrive, RefreshCw, Settings2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }
type Tab   = 'videos' | 'pdfs'

interface LessonItem {
  id:        string
  title:     string
  subject:   string
  hasVideo:  boolean
  duration:  string
}

function fmtBytes(bytes: number) {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

export default function DownloadsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [tab,        setTab]        = useState<Tab>('videos')
  const [online,     setOnline]     = useState(navigator.onLine)
  const [usedBytes,  setUsedBytes]  = useState(0)
  const [totalBytes, setTotalBytes] = useState(5 * 1024 ** 3)
  const [lessons,    setLessons]    = useState<LessonItem[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    // Real online status
    const handleOnline  = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    // Real storage estimate
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(({ usage, quota }) => {
        setUsedBytes(usage ?? 0)
        setTotalBytes(quota ?? 5 * 1024 ** 3)
      })
    }

    if (profile?.id) loadLessons()

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [profile?.id])

  async function loadLessons() {
    setLoading(true)

    // Get student's enrolled class IDs
    const { data: enrollData, error: enrollErr } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', profile!.id)
    if (enrollErr) { logSupabaseError('Downloads/enrollments', enrollErr); setLoading(false); return }

    const classIds = (enrollData ?? []).map((r: { class_id: string }) => r.class_id)
    if (classIds.length === 0) { setLoading(false); return }

    // Get courses for those classes → modules → lessons
    const { data, error } = await supabase
      .from('lessons')
      .select('id, title, video_url, order_index, modules(id, title, course_id, courses(id, subject_id, class_id, subjects(name)))')
      .order('order_index', { ascending: true })
    if (error) { logSupabaseError('Downloads/lessons', error); setLoading(false); return }

    type LRaw = {
      id: string; title: string; video_url: string | null; order_index: number
      modules: {
        id: string; title: string; course_id: string
        courses: { id: string; subject_id: string; class_id: string; subjects: { name: string } | null } | null
      } | null
    }

    const items: LessonItem[] = ((data ?? []) as unknown as LRaw[])
      .filter(l => {
        const classId = l.modules?.courses?.class_id
        return classId ? classIds.includes(classId) : false
      })
      .map(l => ({
        id:       l.id,
        title:    l.title,
        subject:  l.modules?.courses?.subjects?.name ?? '—',
        hasVideo: !!l.video_url,
        duration: '—',
      }))

    setLessons(items)
    setLoading(false)
  }

  const videos  = lessons.filter(l => l.hasVideo)
  const allLessons = lessons

  const pct     = Math.min(100, Math.round((usedBytes / totalBytes) * 100))
  const usedFmt = fmtBytes(usedBytes)
  const totalFmt= fmtBytes(totalBytes)
  const freeFmt = fmtBytes(Math.max(0, totalBytes - usedBytes))

  const displayed = tab === 'videos' ? videos : allLessons

  return (
    <DashboardLayout activePage="downloads" onNavigate={onNavigate} title="Downloads & Offline" subtitle="Access your content without internet">
      <div className="max-w-[800px] flex flex-col gap-5">

        {/* Offline status banner */}
        <div className={`flex items-center justify-between gap-4 p-4 rounded-card border ${online ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-3">
            {online
              ? <Wifi    size={16} className="text-green-600 shrink-0" />
              : <WifiOff size={16} className="text-amber-600 shrink-0" />}
            <div>
              <p className="text-sm font-semibold text-foreground">{online ? 'Online — content up to date' : 'Offline mode active'}</p>
              <p className="text-xs text-muted">{online ? 'All downloaded content is synced.' : 'Showing only downloaded content.'}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${online ? 'text-green-600' : 'text-amber-600'}`}>
            <span className={`size-2 rounded-full ${online ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
            {online ? 'Live' : 'Offline'}
          </div>
        </div>

        {/* Storage bar */}
        <div className="bg-surface rounded-card shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <HardDrive size={15} className="text-muted" /> Device Storage Used
            </p>
            <p className="text-sm font-bold text-foreground">{usedFmt} / {totalFmt}</p>
          </div>
          <div className="h-3 bg-black/8 rounded-full overflow-hidden mb-1">
            <div className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-400' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted">{pct}% used · {freeFmt} free</p>
          <div className="flex gap-2 mt-4">
            <button onClick={() => onNavigate('storage-management')}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-muted border border-black/15 rounded-pill hover:border-primary hover:text-primary transition-colors">
              <Settings2 size={12} /> Manage storage
            </button>
            <button onClick={() => onNavigate('offline-sync')}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-pill hover:bg-amber-100 transition-colors">
              <RefreshCw size={12} /> Sync status
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-canvas rounded-pill p-1 w-fit">
          {(['videos', 'pdfs'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`h-9 px-5 rounded-full text-sm font-semibold capitalize transition-colors ${tab === t ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}>
              {t === 'videos'
                ? `Videos (${loading ? '…' : videos.length})`
                : `All Lessons (${loading ? '…' : allLessons.length})`}
            </button>
          ))}
        </div>

        {/* Content list */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted">Loading your content…</div>
          ) : displayed.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              {tab === 'videos'
                ? 'No video lessons in your enrolled courses.'
                : 'No lessons found in your enrolled courses.'}
            </div>
          ) : (
            <div className="divide-y divide-black/4">
              {displayed.map(item => (
                <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={`size-10 rounded-card flex items-center justify-center shrink-0 ${tab === 'videos' ? 'bg-primary/10' : 'bg-amber-50'}`}>
                    {tab === 'videos'
                      ? <Video    size={16} className="text-primary"    />
                      : <FileText size={16} className="text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted">{item.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {tab === 'videos' && item.hasVideo && (
                      <button
                        onClick={() => {
                          sessionStorage.setItem('learnora_selected_lesson', item.id)
                          onNavigate('m/lesson')
                        }}
                        className="size-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                      >
                        <PlayCircle size={14} className="text-primary" />
                      </button>
                    )}
                    <button className="size-8 rounded-full bg-canvas flex items-center justify-center hover:bg-red-50 transition-colors"
                      onClick={() => {/* local cache clear — handled by OfflineSyncPage */}}>
                      <Trash2 size={13} className="text-muted hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Download more */}
        <button onClick={() => onNavigate('courses')}
          className="flex items-center justify-center gap-2 h-12 border-2 border-dashed border-black/15 rounded-card text-sm font-semibold text-muted hover:border-primary hover:text-primary transition-colors">
          <Download size={16} /> Browse more content
        </button>
      </div>
    </DashboardLayout>
  )
}
