import { useState } from 'react'
import { Shield, AlertCircle, CheckCircle2, Search, FileText } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

type Result = { student: string; score: number; flag: 'clear' | 'suspicious' | 'high' }

const FLAG_META = {
  clear:      { label: 'Clear',      color: 'text-green-600 bg-green-50',  Icon: CheckCircle2 },
  suspicious: { label: 'Suspicious', color: 'text-amber-600 bg-amber-50',  Icon: AlertCircle  },
  high:       { label: 'High risk',  color: 'text-red-500 bg-red-50',      Icon: Shield       },
}

export default function PlagiarismCheckPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [assignmentTitle, setTitle] = useState('')
  const [results, setResults]       = useState<Result[]>([])
  const [running, setRunning]       = useState(false)

  async function runCheck() {
    if (!assignmentTitle.trim()) return
    setRunning(true)

    // Fetch submissions for the searched assignment title
    const schoolId = profile!.school_id!
    const { data: assigns } = await supabase
      .from('assignments')
      .select('id')
      .ilike('title', `%${assignmentTitle.trim()}%`)
      .eq('school_id', schoolId)
      .limit(1)

    const assignId = (assigns as { id: string }[] | null)?.[0]?.id

    if (!assignId) {
      setResults([{ student: 'No matching assignment found', score: 0, flag: 'clear' }])
      setRunning(false)
      return
    }

    const { data: subs } = await supabase
      .from('assignment_submissions')
      .select('student_id, content')
      .eq('assignment_id', assignId)
      .limit(30)

    const studentIds = [...new Set((subs ?? []).map((s: any) => s.student_id))]
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds)
    const nameMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name ?? 'Unknown']))

    // Simulate similarity scores (real plagiarism detection requires NLP backend)
    const analyzed: Result[] = (subs ?? []).map((s: any, i: number) => {
      const seed   = (s.student_id.charCodeAt(0) + i) % 100
      const score  = seed < 15 ? seed + 5 : seed < 50 ? seed * 0.4 : seed * 0.15
      const pct    = Math.round(Math.min(score, 95))
      const flag   = pct > 70 ? 'high' : pct > 40 ? 'suspicious' : 'clear'
      return { student: nameMap[s.student_id] ?? 'Unknown', score: pct, flag }
    })

    setResults(analyzed.sort((a, b) => b.score - a.score))
    setRunning(false)
  }

  const highCount = results.filter(r => r.flag === 'high').length
  const susCount  = results.filter(r => r.flag === 'suspicious').length

  return (
    <DashboardLayout
      activePage="teacher-assignments"
      onNavigate={onNavigate}
      title="Plagiarism Check"
      subtitle="Scan assignment submissions for similarity"
      user={sidebarUser}
    >
      <div className="max-w-[780px] flex flex-col gap-5">

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-card p-4 flex items-start gap-3">
          <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Similarity scores are illustrative. Production plagiarism detection requires an NLP service (e.g. Turnitin, Copyleaks). Scores shown are simulated for UI purposes.
          </p>
        </div>

        {/* Search */}
        <div className="bg-surface rounded-card shadow-sm p-5 flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={assignmentTitle} onChange={e => setTitle(e.target.value)}
              placeholder="Search assignment title…"
              className="w-full h-10 pl-9 pr-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary"
            />
          </div>
          <button onClick={runCheck} disabled={!assignmentTitle.trim() || running}
            className="flex items-center gap-2 h-10 px-5 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-40 shrink-0">
            <Shield size={13} /> {running ? 'Scanning…' : 'Run scan'}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <>
            {(highCount > 0 || susCount > 0) && (
              <div className="flex gap-3 flex-wrap">
                {highCount > 0 && (
                  <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
                    {highCount} high-risk submission{highCount > 1 ? 's' : ''}
                  </span>
                )}
                {susCount > 0 && (
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                    {susCount} suspicious submission{susCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}

            <div className="bg-surface rounded-card shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-black/6">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">{results.length} submissions scanned</p>
              </div>
              <div className="divide-y divide-black/4">
                {results.map((r, i) => {
                  const { label, color, Icon } = FLAG_META[r.flag]
                  return (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="size-9 rounded-full bg-canvas flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-muted" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{r.student}</p>
                      </div>
                      {/* Similarity bar */}
                      <div className="w-24 hidden sm:block">
                        <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${r.score}%`,
                            background: r.flag === 'high' ? '#ef4444' : r.flag === 'suspicious' ? '#f59e0b' : '#10b981'
                          }} />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-muted w-10 text-right shrink-0">{r.score}%</span>
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${color}`}>
                        <Icon size={10} /> {label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
