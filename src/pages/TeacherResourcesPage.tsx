import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Video, Link, BookOpen, Clock, CheckCircle2, XCircle, Filter, Plus, Loader } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props   = { onNavigate: (page: string) => void }
type Status  = 'approved' | 'pending' | 'rejected'
type ResType = 'pdf' | 'video' | 'link' | 'doc'

interface Resource {
  id:         string
  title:      string
  type:       ResType
  subject:    string
  subject_id: string | null
  class_name: string
  class_id:   string | null
  file_url:   string | null
  status:     Status
  admin_note: string | null
  created_at: string
}

interface ClassOption   { id: string; name: string }
interface SubjectOption { id: string; name: string }

const typeIcon  = { pdf: FileText, video: Video, link: Link, doc: BookOpen }
const typeColor: Record<string, string> = {
  pdf:   'bg-red-50 text-red-600',
  video: 'bg-primary/10 text-primary',
  link:  'bg-green-50 text-green-700',
  doc:   'bg-amber-50 text-amber-700',
}
const statusStyle: Record<Status, string> = {
  approved: 'bg-green-50 text-green-700',
  pending:  'bg-amber-50 text-amber-700',
  rejected: 'bg-red-50 text-red-600',
}
const statusIcon = { approved: CheckCircle2, pending: Clock, rejected: XCircle }

function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TeacherResourcesPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [resources,  setResources]  = useState<Resource[]>([])
  const [loading,    setLoading]    = useState(true)
  const [classes,    setClasses]    = useState<ClassOption[]>([])
  const [subjects,   setSubjects]   = useState<SubjectOption[]>([])
  const [filter,     setFilter]     = useState<Status | 'all'>('all')
  const [subFilter,  setSubFilter]  = useState('All')
  const [showUpload, setShowUpload] = useState(false)
  const [uploaded,   setUploaded]   = useState(false)

  // Form state
  const [newTitle,     setNewTitle]     = useState('')
  const [newSubjectId, setNewSubjectId] = useState('')
  const [newClassId,   setNewClassId]   = useState('')
  const [newType,      setNewType]      = useState<ResType>('pdf')
  const [newLink,      setNewLink]      = useState('')
  const [newFile,      setNewFile]      = useState<File | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [formError,    setFormError]    = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (profile?.id) loadAll() }, [profile?.id])

  async function loadAll() {
    setLoading(true)

    const [resRes, taRes] = await Promise.all([
      supabase
        .from('teacher_resources')
        .select('id, title, type, file_url, status, admin_note, created_at, class_id, subject_id, classes!class_id(name), subjects!subject_id(name)')
        .eq('teacher_id', profile!.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('teacher_assignments')
        .select('class_id, subject_id, classes!class_id(name), subjects!subject_id(name)')
        .eq('teacher_id', profile!.id),
    ])

    if (resRes.error) logSupabaseError('Resources/load', resRes.error)
    if (taRes.error)  logSupabaseError('Resources/ta',   taRes.error)

    type RRaw = {
      id: string; title: string; type: string; file_url: string | null
      status: string; admin_note: string | null; created_at: string
      class_id: string | null; subject_id: string | null
      classes: { name: string } | null; subjects: { name: string } | null
    }
    type TARaw = {
      class_id: string; subject_id: string
      classes: { name: string } | null; subjects: { name: string } | null
    }

    const rows: Resource[] = ((resRes.data ?? []) as unknown as RRaw[]).map(r => ({
      id:         r.id,
      title:      r.title,
      type:       (r.type as ResType) || 'doc',
      subject:    r.subjects?.name ?? '—',
      subject_id: r.subject_id,
      class_name: r.classes?.name ?? '—',
      class_id:   r.class_id,
      file_url:   r.file_url,
      status:     (r.status as Status) || 'pending',
      admin_note: r.admin_note,
      created_at: r.created_at,
    }))
    setResources(rows)

    const classMap   = new Map<string, string>()
    const subjectMap = new Map<string, string>()
    for (const r of (taRes.data ?? []) as unknown as TARaw[]) {
      if (r.classes?.name)  classMap.set(r.class_id, r.classes.name)
      if (r.subjects?.name) subjectMap.set(r.subject_id, r.subjects.name)
    }
    const clsArr  = [...classMap.entries()].map(([id, name]) => ({ id, name }))
    const subjArr = [...subjectMap.entries()].map(([id, name]) => ({ id, name }))
    setClasses(clsArr)
    setSubjects(subjArr)
    if (clsArr[0])  setNewClassId(clsArr[0].id)
    if (subjArr[0]) setNewSubjectId(subjArr[0].id)

    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) { setFormError('Title is required.'); return }
    if (newType !== 'link' && !newFile) { setFormError('Please select a file to upload.'); return }
    if (newType === 'link' && !newLink.trim()) { setFormError('Please enter a URL.'); return }
    setFormError(null)
    setSaving(true)

    let fileUrl: string | null = newLink.trim() || null

    if (newType !== 'link' && newFile) {
      const ext  = newFile.name.split('.').pop() ?? ''
      const path = `${profile!.school_id}/${profile!.id}/${Date.now()}.${ext}`
      const { data: upData, error: upErr } = await supabase.storage
        .from('teacher-resources')
        .upload(path, newFile, { upsert: false })
      if (upErr) {
        logSupabaseError('Resources/upload', upErr as any)
        setFormError('File upload failed. Please try again.')
        setSaving(false)
        return
      }
      const { data: urlData } = supabase.storage.from('teacher-resources').getPublicUrl(upData.path)
      fileUrl = urlData.publicUrl
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('teacher_resources')
      .insert({
        school_id:  profile!.school_id!,
        teacher_id: profile!.id,
        class_id:   newClassId   || null,
        subject_id: newSubjectId || null,
        title:      newTitle.trim(),
        type:       newType,
        file_url:   fileUrl,
        status:     'pending',
      })
      .select('id, title, type, file_url, status, admin_note, created_at, class_id, subject_id, classes!class_id(name), subjects!subject_id(name)')
      .single()

    if (insertErr) {
      logSupabaseError('Resources/insert', insertErr)
      setFormError('Failed to save resource. Please try again.')
      setSaving(false)
      return
    }

    type RRaw = {
      id: string; title: string; type: string; file_url: string | null
      status: string; admin_note: string | null; created_at: string
      class_id: string | null; subject_id: string | null
      classes: { name: string } | null; subjects: { name: string } | null
    }
    const r = inserted as unknown as RRaw
    const newRow: Resource = {
      id: r.id, title: r.title, type: (r.type as ResType) || 'doc',
      subject: r.subjects?.name ?? '—', subject_id: r.subject_id,
      class_name: r.classes?.name ?? '—', class_id: r.class_id,
      file_url: r.file_url, status: 'pending',
      admin_note: null, created_at: r.created_at,
    }
    setResources(prev => [newRow, ...prev])
    setSaving(false)
    setUploaded(true)
    setNewTitle(''); setNewLink(''); setNewFile(null)
  }

  function openUpload() {
    setShowUpload(true); setUploaded(false); setFormError(null)
    setNewTitle(''); setNewLink(''); setNewFile(null); setNewType('pdf')
  }

  const subjectTabs  = ['All', ...subjects.map(s => s.name)]
  const visible      = resources.filter(r =>
    (filter === 'all' || r.status === filter) &&
    (subFilter === 'All' || r.subject === subFilter)
  )
  const counts = {
    approved: resources.filter(r => r.status === 'approved').length,
    pending:  resources.filter(r => r.status === 'pending').length,
    rejected: resources.filter(r => r.status === 'rejected').length,
  }

  return (
    <DashboardLayout
      activePage="resources"
      onNavigate={onNavigate}
      title="Resources"
      subtitle="Upload teaching materials — reviewed by admin before students can access"
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[1000px] flex flex-col gap-6">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Approved',         value: loading ? '—' : counts.approved, color: 'text-green-600', status: 'approved' as Status },
            { label: 'Pending Approval', value: loading ? '—' : counts.pending,  color: 'text-amber-600', status: 'pending'  as Status },
            { label: 'Rejected',         value: loading ? '—' : counts.rejected, color: 'text-red-600',   status: 'rejected' as Status },
          ].map(s => (
            <button
              key={s.label}
              onClick={() => setFilter(filter === s.status ? 'all' : s.status)}
              className={`bg-surface rounded-card shadow-sm p-5 text-left hover:shadow-md transition-all ${filter === s.status ? 'ring-2 ring-primary' : ''}`}
            >
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-canvas rounded-card p-1 overflow-x-auto">
            {subjectTabs.map(s => (
              <button key={s} onClick={() => setSubFilter(s)}
                className={`px-3 h-8 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${subFilter === s ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}>
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={openUpload}
            className="flex items-center gap-1.5 h-9 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary ml-auto shrink-0"
          >
            <Plus size={13} /> Upload Resource
          </button>
        </div>

        {/* Info banner */}
        <div className="bg-primary/6 border border-primary/20 rounded-card p-4 flex items-start gap-3">
          <Clock size={14} className="text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-primary leading-relaxed">
            All uploaded materials are reviewed by the school admin before being made available to students. Approved resources appear in the student resource library automatically.
          </p>
        </div>

        {/* Resource list */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface rounded-card shadow-sm p-5 h-20 animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <Filter size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {resources.length === 0 ? 'No resources yet. Upload your first one.' : 'No resources match the current filter.'}
            </p>
            {resources.length === 0 && (
              <button onClick={openUpload} className="mt-3 text-sm text-primary font-semibold hover:underline">
                Upload a resource →
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map(r => {
              const Icon  = typeIcon[r.type] ?? BookOpen
              const SIcon = statusIcon[r.status]
              return (
                <div key={r.id} className="bg-surface rounded-card shadow-sm p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className={`size-10 rounded-card flex items-center justify-center shrink-0 ${typeColor[r.type] ?? 'bg-canvas text-muted'}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground leading-snug">{r.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted">
                        {r.subject !== '—' && <><span>{r.subject}</span><span>·</span></>}
                        {r.class_name !== '—' && <><span>{r.class_name}</span><span>·</span></>}
                        <span>{fmtDate(r.created_at)}</span>
                      </div>
                      {r.admin_note && (
                        <p className="text-xs text-red-500 mt-1.5 leading-snug">{r.admin_note}</p>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusStyle[r.status]}`}>
                      <SIcon size={11} />
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setShowUpload(false)} />
          <div className="relative z-10 bg-white rounded-card shadow-xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/8 sticky top-0 bg-white">
              <h2 className="text-base font-bold text-foreground">Upload Resource</h2>
              <button onClick={() => !saving && setShowUpload(false)} className="text-muted hover:text-foreground">✕</button>
            </div>

            {uploaded ? (
              <div className="p-6 text-center">
                <div className="size-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                  <Clock size={24} className="text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Submitted for Review</h3>
                <p className="text-sm text-muted leading-relaxed mb-6">
                  Your resource has been submitted. The school admin will review and approve it before students can access it. You'll be notified once approved.
                </p>
                <button onClick={() => setShowUpload(false)}
                  className="h-10 px-6 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">

                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Resource Title <span className="text-red-500">*</span></label>
                  <input required value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Physics Textbook SS2"
                    className="h-10 px-3 border border-black/20 rounded-input text-sm outline-none focus:border-primary" />
                </div>

                {/* Subject + Class */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-foreground">Subject</label>
                    <select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)}
                      className="h-10 px-3 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary">
                      {subjects.length === 0
                        ? <option value="">No subjects</option>
                        : subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                      }
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-foreground">Class</label>
                    <select value={newClassId} onChange={e => setNewClassId(e.target.value)}
                      className="h-10 px-3 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary">
                      {classes.length === 0
                        ? <option value="">No classes</option>
                        : classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                      }
                    </select>
                  </div>
                </div>

                {/* Type picker */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Type</label>
                  <div className="flex gap-2">
                    {(['pdf', 'video', 'link', 'doc'] as const).map(t => {
                      const Icon = typeIcon[t]
                      return (
                        <button key={t} type="button" onClick={() => { setNewType(t); setNewFile(null) }}
                          className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-input border text-xs font-semibold transition-colors ${newType === t ? 'border-primary bg-primary/8 text-primary' : 'border-black/15 text-muted hover:border-primary/40'}`}>
                          <Icon size={14} />
                          {t.toUpperCase()}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Link URL or file drop zone */}
                {newType === 'link' ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-foreground">URL <span className="text-red-500">*</span></label>
                    <input type="url" value={newLink} onChange={e => setNewLink(e.target.value)}
                      placeholder="https://..."
                      className="h-10 px-3 border border-black/20 rounded-input text-sm outline-none focus:border-primary" />
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept={newType === 'pdf' ? '.pdf' : newType === 'video' ? 'video/*' : '.doc,.docx,.odt'}
                      onChange={e => setNewFile(e.target.files?.[0] ?? null)}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-black/20 rounded-card p-6 flex flex-col items-center gap-2 text-center cursor-pointer hover:border-primary/40 transition-colors"
                    >
                      <Upload size={20} className="text-muted" />
                      {newFile ? (
                        <>
                          <p className="text-sm font-semibold text-primary">{newFile.name}</p>
                          <p className="text-xs text-muted">{formatSize(newFile.size)}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-foreground">Click to upload or drag &amp; drop</p>
                          <p className="text-xs text-muted">
                            {newType === 'pdf' ? 'PDF — max 50 MB' : newType === 'video' ? 'MP4, MOV — max 500 MB' : 'DOC, DOCX — max 20 MB'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Warning */}
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-card px-3 py-2">
                  This resource will be submitted to the school admin for approval before students can access it.
                </p>

                {formError && (
                  <p className="text-xs text-red-600 font-medium">{formError}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowUpload(false)}
                    disabled={saving}
                    className="h-10 px-5 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors disabled:opacity-40">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 h-10 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving ? <><Loader size={14} className="animate-spin" /> Uploading…</> : 'Submit for Review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
