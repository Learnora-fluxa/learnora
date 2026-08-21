import { useState, useEffect } from 'react'
import { Save, ChevronDown } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { logSupabaseError } from '../../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

const DAYS    = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const PERIODS = [
  { label: '8:00–8:45',   start: '08:00', end: '08:45' },
  { label: '8:45–9:30',   start: '08:45', end: '09:30' },
  { label: '10:00–10:45', start: '10:00', end: '10:45' },
  { label: '10:45–11:30', start: '10:45', end: '11:30' },
  { label: '12:00–12:45', start: '12:00', end: '12:45' },
  { label: '1:45–2:30',   start: '13:45', end: '14:30' },
  { label: '2:30–3:15',   start: '14:30', end: '15:15' },
]

const SUBJECT_COLORS: Record<string, string> = {}
const COLOR_OPTIONS = [
  'bg-primary/15 text-primary', 'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700', 'bg-red-100 text-red-600',
  'bg-purple-100 text-purple-600', 'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-600', 'bg-sky-100 text-sky-700',
]
function subjectColor(name: string) {
  if (!SUBJECT_COLORS[name]) {
    const keys = Object.keys(SUBJECT_COLORS)
    SUBJECT_COLORS[name] = COLOR_OPTIONS[keys.length % COLOR_OPTIONS.length]
  }
  return SUBJECT_COLORS[name]
}

type CellKey = string // `${day}-${period}`
type Grid    = Record<CellKey, string> // subjectId

interface ClassOpt   { id: string; name: string }
interface SubjectOpt { id: string; name: string }

const db = supabase as unknown as { from: (t: string) => any }

export default function TimetableManagementPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [classes,   setClasses]   = useState<ClassOpt[]>([])
  const [subjects,  setSubjects]  = useState<SubjectOpt[]>([])
  const [classId,   setClassId]   = useState('')
  const [grid,      setGrid]      = useState<Grid>({})
  const [editing,   setEditing]   = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)

  useEffect(() => { if (profile?.school_id) loadMeta() }, [profile?.school_id])
  useEffect(() => { if (classId) loadGrid(classId) }, [classId])

  async function loadMeta() {
    const schoolId = profile!.school_id!
    const [clsRes, subRes] = await Promise.all([
      supabase.from('classes').select('id, name').eq('school_id', schoolId).order('name'),
      supabase.from('subjects').select('id, name').eq('school_id', schoolId).order('name'),
    ])
    const cls  = (clsRes.data ?? []) as ClassOpt[]
    const subs = (subRes.data ?? []) as SubjectOpt[]
    setClasses(cls)
    setSubjects(subs)
    if (cls.length > 0) setClassId(cls[0].id)
    setLoading(false)
  }

  async function loadGrid(cid: string) {
    const { data } = await db.from('timetable_entries')
      .select('day, period, subject_id')
      .eq('class_id', cid)

    const g: Grid = {}
    for (const e of (data ?? []) as { day: string; period: number; subject_id: string | null }[]) {
      if (e.subject_id) g[`${e.day}-${e.period}`] = e.subject_id
    }
    setGrid(g)
  }

  function setCell(key: string, subjectId: string) {
    setGrid(prev => ({ ...prev, [key]: subjectId }))
    setEditing(null)
  }

  function clearCell(key: string) {
    setGrid(prev => { const g = { ...prev }; delete g[key]; return g })
    setEditing(null)
  }

  async function saveTimetable() {
    setSaving(true)
    const schoolId = profile!.school_id!
    const rows: any[] = []

    DAYS.forEach(day => {
      PERIODS.forEach((p, pi) => {
        const key = `${day}-${pi}`
        const sid = grid[key]
        if (sid) {
          rows.push({
            school_id:  schoolId,
            class_id:   classId,
            day,
            period:     pi,
            subject_id: sid,
            start_time: p.start,
            end_time:   p.end,
          })
        }
      })
    })

    const { error: delErr } = await db.from('timetable_entries')
      .delete()
      .eq('class_id', classId)
    logSupabaseError('TimetableMgmt.delete', delErr)

    if (rows.length > 0) {
      const { error: insErr } = await db.from('timetable_entries').insert(rows)
      logSupabaseError('TimetableMgmt.insert', insErr)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s.name]))

  if (loading) {
    return (
      <DashboardLayout activePage="timetable" onNavigate={onNavigate} title="Timetable" nav={adminNav} user={sidebarUser}>
        <div className="text-center py-20 text-sm text-muted">Loading…</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      activePage="timetable"
      onNavigate={onNavigate}
      title="Timetable Management"
      subtitle="Manage class schedules across all periods"
      nav={adminNav}
      user={sidebarUser}
    >
      <div className="flex flex-col gap-5">
        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select
              value={classId}
              onChange={e => setClassId(e.target.value)}
              className="h-10 pl-4 pr-8 border border-black/20 rounded-pill text-sm font-semibold text-foreground bg-white outline-none focus:border-primary appearance-none"
            >
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
          <button
            onClick={saveTimetable}
            disabled={saving}
            className="flex items-center gap-2 h-10 px-4 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors disabled:opacity-50"
          >
            <Save size={14} /> {saving ? 'Saving…' : 'Save Timetable'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
        </div>

        {classes.length === 0 ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center text-sm text-muted">
            No classes found. Create a class first.
          </div>
        ) : (
          <div className="bg-surface rounded-card shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-canvas">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted w-28">Period</th>
                  {DAYS.map(d => (
                    <th key={d} className="px-3 py-3 text-center text-xs font-semibold text-muted">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/4">
                {PERIODS.map((period, pi) => (
                  <tr key={pi} className="hover:bg-canvas/40 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted font-medium">{period.label}</td>
                    {DAYS.map(day => {
                      const k       = `${day}-${pi}`
                      const sid     = grid[k]
                      const name    = sid ? (subjectMap[sid] ?? '?') : null
                      const isEdit  = editing === k
                      return (
                        <td key={day} className="px-2 py-2 text-center">
                          {isEdit ? (
                            <select
                              autoFocus
                              defaultValue={sid ?? ''}
                              onBlur={() => setEditing(null)}
                              onChange={e => {
                                if (e.target.value) setCell(k, e.target.value)
                                else clearCell(k)
                              }}
                              className="w-full h-8 px-2 border border-primary rounded text-xs outline-none bg-white"
                            >
                              <option value="">— Free —</option>
                              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          ) : (
                            <button
                              onClick={() => setEditing(k)}
                              className={`w-full rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                                name
                                  ? subjectColor(name)
                                  : 'bg-black/4 text-muted/50 hover:bg-primary/8 hover:text-primary'
                              }`}
                            >
                              {name ?? '—'}
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted">Click any cell to assign a subject. Click an assigned cell to change or clear it.</p>
      </div>
    </DashboardLayout>
  )
}
