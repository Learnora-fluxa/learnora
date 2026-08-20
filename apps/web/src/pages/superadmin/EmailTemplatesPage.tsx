import { useState, useEffect, useCallback } from 'react'
import { Mail, Edit2, Save, CheckCircle2, ChevronRight, Eye, Plus, Trash2, X, Loader } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { superAdminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface Template {
  id:         string
  key:        string
  name:       string
  category:   string
  subject:    string
  body:       string
  updated_at: string
}

const categoryColors: Record<string, string> = {
  Onboarding:    'bg-primary/10 text-primary',
  Auth:          'bg-amber-50 text-amber-600',
  Finance:       'bg-green-50 text-green-700',
  Notifications: 'bg-teal-50 text-teal-600',
  General:       'bg-canvas text-muted',
}

const CATEGORIES = ['Onboarding', 'Auth', 'Finance', 'Notifications', 'General']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export default function EmailTemplatesPage({ onNavigate }: Props) {
  const { profile }  = useAuth()

  const [templates,    setTemplates]   = useState<Template[]>([])
  const [loading,      setLoading]     = useState(true)
  const [loadError,    setLoadError]   = useState<string | null>(null)
  const [selected,     setSelected]    = useState<Template | null>(null)

  // Edit state
  const [editing,  setEditing]  = useState(false)
  const [draftSub, setDraftSub] = useState('')
  const [draftBody,setDraftBody]= useState('')
  const [saving,   setSaving]   = useState(false)
  const [saveOk,   setSaveOk]   = useState(false)
  const [saveErr,  setSaveErr]  = useState<string | null>(null)
  const [preview,  setPreview]  = useState(false)

  // Delete state
  const [deleting,   setDeleting]  = useState(false)
  const [confirmDel, setConfirmDel]= useState(false)

  // New template modal
  const [showNew,    setShowNew]    = useState(false)
  const [newKey,     setNewKey]     = useState('')
  const [newName,    setNewName]    = useState('')
  const [newCat,     setNewCat]     = useState('General')
  const [newSubject, setNewSubject] = useState('')
  const [newBody,    setNewBody]    = useState('')
  const [creating,   setCreating]   = useState(false)
  const [createErr,  setCreateErr]  = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { data, error } = await supabase
      .from('email_templates')
      .select('id, key, name, category, subject, body, updated_at')
      .order('category')
      .order('name')
    if (error) {
      logSupabaseError('EmailTemplates/load', error)
      setLoadError(error.message)
      setLoading(false)
      return
    }
    const rows = (data ?? []) as Template[]
    setTemplates(rows)
    if (!selected && rows.length > 0) {
      const first = rows[0]
      setSelected(first); setDraftSub(first.subject); setDraftBody(first.body)
    }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  function selectTemplate(t: Template) {
    setSelected(t); setDraftSub(t.subject); setDraftBody(t.body)
    setEditing(false); setPreview(false); setSaveOk(false); setSaveErr(null); setConfirmDel(false)
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true); setSaveErr(null); setSaveOk(false)
    const { error } = await supabase
      .from('email_templates')
      .update({ subject: draftSub.trim(), body: draftBody.trim(), updated_at: new Date().toISOString(), updated_by: profile!.id })
      .eq('id', selected.id)
    if (error) {
      logSupabaseError('EmailTemplates/save', error)
      setSaveErr(error.message); setSaving(false); return
    }
    setSaving(false); setEditing(false); setSaveOk(true)
    setTimeout(() => setSaveOk(false), 2500)
    // Update local state + re-fetch
    setTemplates(prev => prev.map(t => t.id === selected.id ? { ...t, subject: draftSub, body: draftBody, updated_at: new Date().toISOString() } : t))
    setSelected(prev => prev ? { ...prev, subject: draftSub, body: draftBody } : prev)
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    const { error } = await supabase.from('email_templates').delete().eq('id', selected.id)
    if (error) {
      logSupabaseError('EmailTemplates/delete', error)
      setSaveErr(error.message); setDeleting(false); setConfirmDel(false); return
    }
    const remaining = templates.filter(t => t.id !== selected.id)
    setTemplates(remaining)
    setSelected(remaining[0] ?? null)
    if (remaining[0]) { setDraftSub(remaining[0].subject); setDraftBody(remaining[0].body) }
    setDeleting(false); setConfirmDel(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim())    { setCreateErr('Name is required.'); return }
    if (!newSubject.trim()) { setCreateErr('Subject is required.'); return }
    if (!newBody.trim())    { setCreateErr('Body is required.'); return }
    const keyToUse = newKey.trim() || slugify(newName)
    setCreating(true); setCreateErr(null)

    const { data: inserted, error } = await supabase
      .from('email_templates')
      .insert({ key: keyToUse, name: newName.trim(), category: newCat, subject: newSubject.trim(), body: newBody.trim(), updated_by: profile!.id })
      .select('id, key, name, category, subject, body, updated_at')
      .single()

    if (error) {
      logSupabaseError('EmailTemplates/create', error)
      setCreateErr(error.message === 'duplicate key value violates unique constraint "email_templates_key_key"'
        ? `Key "${keyToUse}" already exists. Use a different key.`
        : error.message)
      setCreating(false); return
    }

    const newTpl = inserted as Template
    const updated = [...templates, newTpl].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    setTemplates(updated)
    selectTemplate(newTpl)
    setShowNew(false)
    setNewName(''); setNewKey(''); setNewCat('General'); setNewSubject(''); setNewBody('')
    setCreating(false)
  }

  const categories = [...new Set(templates.map(t => t.category))]

  return (
    <DashboardLayout
      activePage="platform-settings"
      onNavigate={onNavigate}
      title="Email Templates"
      subtitle="Manage transactional and notification email templates"
      nav={superAdminNav}
      user={profileToSidebarUser(profile)}
    >
      {loadError ? (
        <div className="bg-red-50 border border-red-200 rounded-card px-5 py-4 text-sm text-red-700">{loadError}</div>
      ) : (
        <div className="flex gap-5 h-[calc(100vh-160px)] min-h-0">

          {/* ── Left: template list ── */}
          <div className="w-72 shrink-0 bg-surface rounded-card shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-black/6 flex items-center justify-between">
              <p className="text-xs font-bold text-muted uppercase tracking-wider">Templates</p>
              <button
                onClick={() => { setShowNew(true); setCreateErr(null) }}
                className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                title="New template"
              >
                <Plus size={13} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-sm text-muted text-center">Loading…</div>
              ) : templates.length === 0 ? (
                <div className="p-4 text-sm text-muted text-center">No templates yet.</div>
              ) : categories.map(cat => (
                <div key={cat}>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider px-4 pt-4 pb-1.5">{cat}</p>
                  {templates.filter(t => t.category === cat).map(t => (
                    <button
                      key={t.id}
                      onClick={() => selectTemplate(t)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${selected?.id === t.id ? 'bg-primary/6' : 'hover:bg-canvas'}`}
                    >
                      <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${selected?.id === t.id ? 'bg-primary text-white' : 'bg-canvas text-muted'}`}>
                        <Mail size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold truncate ${selected?.id === t.id ? 'text-primary' : 'text-foreground'}`}>{t.name}</p>
                        <p className="text-[10px] text-muted mt-0.5">{fmtDate(t.updated_at)}</p>
                      </div>
                      <ChevronRight size={12} className={`shrink-0 ${selected?.id === t.id ? 'text-primary' : 'text-muted'}`} />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: editor ── */}
          {selected ? (
            <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">

              {/* Header */}
              <div className="bg-surface rounded-card shadow-sm p-5 flex items-start justify-between gap-4 flex-wrap shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-sm font-bold text-foreground">{selected.name}</h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryColors[selected.category] ?? 'bg-canvas text-muted'}`}>
                      {selected.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted">Key: <code className="bg-canvas px-1 rounded">{selected.key}</code> · Last edited: {fmtDate(selected.updated_at)}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {saveOk && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                      <CheckCircle2 size={13} /> Saved
                    </span>
                  )}
                  {saveErr && <span className="text-xs text-red-500">{saveErr}</span>}

                  {/* Delete */}
                  {confirmDel ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600">Delete this template?</span>
                      <button onClick={handleDelete} disabled={deleting}
                        className="h-8 px-3 bg-red-500 text-white text-xs font-semibold rounded-pill hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center gap-1">
                        {deleting ? <Loader size={11} className="animate-spin" /> : null} Yes, delete
                      </button>
                      <button onClick={() => setConfirmDel(false)} className="h-8 px-3 border border-black/20 text-xs font-semibold rounded-pill hover:bg-canvas transition-colors">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDel(true)}
                      className="size-8 flex items-center justify-center border border-black/10 rounded-full text-muted hover:text-red-500 hover:border-red-300 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}

                  <button
                    onClick={() => setPreview(!preview)}
                    className={`flex items-center gap-1.5 h-9 px-3 border rounded-pill text-xs font-semibold transition-colors ${preview ? 'border-primary text-primary bg-primary/6' : 'border-black/20 text-muted hover:text-foreground'}`}
                  >
                    <Eye size={12} /> Preview
                  </button>

                  {editing ? (
                    <>
                      <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-1.5 h-9 px-4 bg-primary text-white text-xs font-semibold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-60">
                        {saving ? <Loader size={12} className="animate-spin" /> : <Save size={12} />}
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => { setEditing(false); setDraftSub(selected.subject); setDraftBody(selected.body) }}
                        className="h-9 px-3 border border-black/20 text-xs font-semibold rounded-pill hover:bg-canvas transition-colors">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { setEditing(true); setPreview(false) }}
                      className="flex items-center gap-1.5 h-9 px-4 border border-black/20 rounded-pill text-xs font-semibold text-foreground hover:bg-canvas transition-colors">
                      <Edit2 size={12} /> Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Subject */}
              <div className="bg-surface rounded-card shadow-sm p-5 shrink-0">
                <label className="block text-xs font-semibold text-muted mb-2">Subject Line</label>
                {editing ? (
                  <input value={draftSub} onChange={e => setDraftSub(e.target.value)}
                    className="w-full h-10 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary" />
                ) : (
                  <p className="text-sm text-foreground font-medium bg-canvas rounded-card px-3 py-2.5">{selected.subject}</p>
                )}
              </div>

              {/* Body */}
              <div className="bg-surface rounded-card shadow-sm p-5 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <label className="text-xs font-semibold text-muted">Email Body</label>
                  <p className="text-[10px] text-muted">Use {'{{variable}}'} for dynamic values</p>
                </div>
                {preview ? (
                  <div className="flex-1 overflow-y-auto bg-canvas rounded-card p-5 text-sm text-foreground whitespace-pre-wrap leading-relaxed border border-black/8">
                    {draftBody}
                  </div>
                ) : editing ? (
                  <textarea value={draftBody} onChange={e => setDraftBody(e.target.value)}
                    className="flex-1 resize-none border border-black/20 rounded-card p-4 text-sm font-mono leading-relaxed outline-none focus:border-primary" />
                ) : (
                  <div className="flex-1 overflow-y-auto bg-canvas rounded-card p-5 text-sm text-foreground whitespace-pre-wrap leading-relaxed font-mono border border-black/8">
                    {selected.body}
                  </div>
                )}
              </div>
            </div>
          ) : !loading && (
            <div className="flex-1 flex items-center justify-center text-muted text-sm">
              Select a template from the list, or create a new one.
            </div>
          )}
        </div>
      )}

      {/* ── New template modal ── */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !creating && setShowNew(false)} />
          <div className="relative z-10 bg-white rounded-card shadow-xl w-full max-w-[560px] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/8 shrink-0">
              <h2 className="text-base font-bold text-foreground">New Email Template</h2>
              <button onClick={() => !creating && setShowNew(false)} className="text-muted hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Display Name <span className="text-red-500">*</span></label>
                  <input required value={newName} onChange={e => { setNewName(e.target.value); if (!newKey) setNewKey(slugify(e.target.value)) }}
                    placeholder="Invoice Issued"
                    className="h-10 px-3 border border-black/20 rounded-input text-sm outline-none focus:border-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Category</label>
                  <select value={newCat} onChange={e => setNewCat(e.target.value)}
                    className="h-10 px-3 border border-black/20 rounded-input text-sm bg-white outline-none focus:border-primary">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">
                  Key <span className="text-xs font-normal text-muted">(unique slug, auto-filled from name)</span>
                </label>
                <input value={newKey} onChange={e => setNewKey(e.target.value)}
                  placeholder="invoice_issued"
                  className="h-10 px-3 border border-black/20 rounded-input text-sm font-mono outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Subject <span className="text-red-500">*</span></label>
                <input required value={newSubject} onChange={e => setNewSubject(e.target.value)}
                  placeholder="Your invoice #{{invoice_number}}"
                  className="h-10 px-3 border border-black/20 rounded-input text-sm outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Body <span className="text-red-500">*</span></label>
                <textarea required rows={8} value={newBody} onChange={e => setNewBody(e.target.value)}
                  placeholder={'Hi {{first_name}},\n\n...'}
                  className="px-3 py-2.5 border border-black/20 rounded-input text-sm font-mono leading-relaxed resize-none outline-none focus:border-primary" />
              </div>
              {createErr && <p className="text-xs text-red-600 font-medium">{createErr}</p>}
              <div className="flex gap-3 pt-1 shrink-0">
                <button type="button" onClick={() => setShowNew(false)} disabled={creating}
                  className="h-10 px-5 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors disabled:opacity-40">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 h-10 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {creating ? <><Loader size={14} className="animate-spin" /> Creating…</> : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
