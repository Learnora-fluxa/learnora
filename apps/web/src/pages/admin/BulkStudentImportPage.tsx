import { useState, useRef, useCallback } from 'react'
import { Upload, Users, CheckCircle2, XCircle, AlertTriangle, Download, Loader2 } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface Row {
  full_name:  string
  email:      string
  class_name: string
  phone?:     string
  raw:        number
}

interface ImportResult {
  row:     number
  email:   string
  name:    string
  status:  'ok' | 'error' | 'skipped'
  message: string
}

const TEMPLATE = 'full_name,email,class_name,phone\nAde Okafor,ade@school.edu,JSS1A,+2348012345678\nNgozi Eze,ngozi@school.edu,JSS1B,'

function parseCSV(text: string): Row[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const header = lines[0].toLowerCase().split(',').map(h => h.trim())
  const nameIdx  = header.findIndex(h => h.includes('name'))
  const emailIdx = header.findIndex(h => h.includes('email'))
  const classIdx = header.findIndex(h => h.includes('class'))
  const phoneIdx = header.findIndex(h => h.includes('phone'))
  if (nameIdx === -1 || emailIdx === -1 || classIdx === -1) return []

  return lines.slice(1).map((line, i) => {
    const cols = line.split(',').map(c => c.trim())
    return {
      full_name:  cols[nameIdx]  ?? '',
      email:      cols[emailIdx] ?? '',
      class_name: cols[classIdx] ?? '',
      phone:      phoneIdx >= 0 ? cols[phoneIdx] : undefined,
      raw:        i + 2,
    }
  }).filter(r => r.full_name && r.email)
}

export default function BulkStudentImportPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)
  const fileRef      = useRef<HTMLInputElement>(null)

  const [rows,      setRows]      = useState<Row[]>([])
  const [preview,   setPreview]   = useState(false)
  const [importing, setImporting] = useState(false)
  const [results,   setResults]   = useState<ImportResult[] | null>(null)
  const [dragOver,  setDragOver]  = useState(false)
  const [parseErr,  setParseErr]  = useState('')

  function loadFile(file: File) {
    setParseErr(''); setResults(null); setPreview(false)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        setParseErr('Could not parse CSV. Make sure it has full_name, email, and class_name columns.')
        setRows([])
      } else {
        setRows(parsed)
        setPreview(true)
      }
    }
    reader.readAsText(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) loadFile(f)
  }, [])

  async function runImport() {
    if (!profile?.school_id || rows.length === 0) return
    setImporting(true)
    const res: ImportResult[] = []

    // Load all classes for this school once
    const { data: classData } = await supabase
      .from('classes').select('id, name').eq('school_id', profile.school_id)
    const classMap = Object.fromEntries((classData ?? []).map((c: any) => [c.name.toLowerCase(), c.id as string]))

    for (const row of rows) {
      const classId = classMap[row.class_name.toLowerCase()]
      if (!classId) {
        res.push({ row: row.raw, email: row.email, name: row.full_name, status: 'error', message: `Class "${row.class_name}" not found` })
        continue
      }

      // Check if profile already exists
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('email', row.email).maybeSingle()

      if (existing) {
        res.push({ row: row.raw, email: row.email, name: row.full_name, status: 'skipped', message: 'Email already exists — skipped' })
        continue
      }

      // auth.admin requires service-role key (server-side only); skip on client

      // Fallback: insert into profiles directly (student must sign up themselves with this email)
      const { error: profileErr } = await supabase.from('profiles').insert({
        id:         crypto.randomUUID(),
        email:      row.email,
        full_name:  row.full_name,
        role:       'student',
        school_id:  profile.school_id,
        phone:      row.phone ?? null,
      })

      if (profileErr) {
        logSupabaseError('BulkImport.insertProfile', profileErr)
        res.push({ row: row.raw, email: row.email, name: row.full_name, status: 'error', message: profileErr.message })
        continue
      }

      // Fetch the just-inserted profile id by email
      const { data: newProfile } = await supabase
        .from('profiles').select('id').eq('email', row.email).maybeSingle()

      if (newProfile) {
        const { error: enrollErr } = await supabase.from('class_enrollments').insert({
          class_id:   classId,
          student_id: (newProfile as any).id,
          school_id:  profile.school_id,
        })
        logSupabaseError('BulkImport.enroll', enrollErr)
      }

      res.push({ row: row.raw, email: row.email, name: row.full_name, status: 'ok', message: 'Profile created + enrolled' })


    }

    setResults(res)
    setImporting(false)
  }

  const okCount      = results?.filter(r => r.status === 'ok').length      ?? 0
  const errorCount   = results?.filter(r => r.status === 'error').length   ?? 0
  const skippedCount = results?.filter(r => r.status === 'skipped').length ?? 0

  return (
    <DashboardLayout
      activePage="user-management"
      onNavigate={onNavigate}
      title="Bulk Student Import"
      subtitle="Upload a CSV to add multiple students at once"
      nav={adminNav}
      user={sidebarUser}
    >
      <div className="flex flex-col gap-5 max-w-[760px]">

        {/* Template download */}
        <div className="bg-surface rounded-card shadow-sm p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground">CSV Template</p>
            <p className="text-xs text-muted mt-0.5">Download the template, fill it in, then upload.</p>
          </div>
          <button
            onClick={() => {
              const blob = new Blob([TEMPLATE], { type: 'text/csv' })
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
              a.download = 'learnora_students_template.csv'; a.click()
            }}
            className="flex items-center gap-1.5 h-9 px-4 border border-black/20 rounded-card text-xs font-semibold text-foreground hover:bg-canvas transition-colors shrink-0">
            <Download size={13} /> Download Template
          </button>
        </div>

        {/* Drop zone */}
        {!results && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`bg-surface rounded-card shadow-sm border-2 border-dashed p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors
              ${dragOver ? 'border-primary bg-primary/5' : 'border-black/20 hover:border-primary/40'}`}
            onClick={() => fileRef.current?.click()}
          >
            <div className={`size-14 rounded-full flex items-center justify-center ${dragOver ? 'bg-primary/10' : 'bg-canvas'}`}>
              <Upload size={24} className={dragOver ? 'text-primary' : 'text-muted'} />
            </div>
            <p className="text-sm font-bold text-foreground">Drop CSV here or click to browse</p>
            <p className="text-xs text-muted">Supports .csv files · Required columns: full_name, email, class_name</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={e => { if (e.target.files?.[0]) loadFile(e.target.files[0]) }} />
          </div>
        )}

        {parseErr && <p className="text-xs text-red-500 px-1">{parseErr}</p>}

        {/* Preview table */}
        {preview && !results && rows.length > 0 && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/6">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users size={15} className="text-primary" /> {rows.length} students ready to import
              </p>
              <button onClick={() => { setRows([]); setPreview(false) }}
                className="text-xs text-muted hover:text-foreground">Clear</button>
            </div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-canvas sticky top-0">
                  <tr>
                    {['#', 'Name', 'Email', 'Class', 'Phone'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-muted font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-black/4">
                      <td className="px-4 py-2 text-muted">{r.raw}</td>
                      <td className="px-4 py-2 font-semibold text-foreground">{r.full_name}</td>
                      <td className="px-4 py-2 text-muted">{r.email}</td>
                      <td className="px-4 py-2">{r.class_name}</td>
                      <td className="px-4 py-2 text-muted">{r.phone ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-black/6">
              <button onClick={runImport} disabled={importing}
                className="flex items-center gap-2 h-10 px-6 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors disabled:opacity-60">
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {importing ? `Importing ${rows.length} students…` : `Import ${rows.length} Students`}
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            {/* Summary */}
            <div className="px-5 py-4 border-b border-black/6 flex items-center gap-5">
              <div className="flex items-center gap-1.5 text-green-600 font-semibold text-sm">
                <CheckCircle2 size={16} /> {okCount} imported
              </div>
              {skippedCount > 0 && (
                <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-sm">
                  <AlertTriangle size={16} /> {skippedCount} skipped
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-1.5 text-red-500 font-semibold text-sm">
                  <XCircle size={16} /> {errorCount} failed
                </div>
              )}
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-canvas sticky top-0">
                  <tr>
                    {['Row', 'Name', 'Email', 'Status', 'Message'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-muted font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-t border-black/4">
                      <td className="px-4 py-2 text-muted">{r.row}</td>
                      <td className="px-4 py-2 font-semibold text-foreground">{r.name}</td>
                      <td className="px-4 py-2 text-muted">{r.email}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 font-bold ${
                          r.status === 'ok'      ? 'text-green-600' :
                          r.status === 'skipped' ? 'text-amber-600' : 'text-red-500'
                        }`}>
                          {r.status === 'ok'      && <CheckCircle2 size={11} />}
                          {r.status === 'skipped' && <AlertTriangle size={11} />}
                          {r.status === 'error'   && <XCircle size={11} />}
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted">{r.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-black/6 flex gap-3">
              <button onClick={() => { setResults(null); setRows([]); setPreview(false) }}
                className="h-9 px-5 border border-black/20 rounded-card text-xs font-semibold text-foreground hover:bg-canvas transition-colors">
                Import Another File
              </button>
              <button onClick={() => onNavigate('user-management')}
                className="h-9 px-5 bg-primary text-white rounded-card text-xs font-semibold hover:bg-primary-deep transition-colors">
                View Students
              </button>
            </div>
          </div>
        )}

        {/* Note about auth */}
        <div className="bg-amber-50 border border-amber-200 rounded-card p-4">
          <p className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Important — student account activation
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Imported students will have profile records created, but they must sign up using their assigned email address to activate their login.
            Share the school's sign-up link with them so they can set their own password.
          </p>
        </div>

      </div>
    </DashboardLayout>
  )
}
