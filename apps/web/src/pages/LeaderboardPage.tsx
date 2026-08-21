import { Trophy, Medal, Flame, TrendingUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }
type Tab   = 'class' | 'school'

interface BoardEntry {
  rank:    number
  name:    string
  points:  number
  avgScore:number
  change:  number
  me:      boolean
}

const medalColor = ['text-amber-500', 'text-gray-400', 'text-orange-600']
const medalBg    = ['bg-amber-50', 'bg-gray-50', 'bg-orange-50']

export default function LeaderboardPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [tab,      setTab]      = useState<Tab>('class')
  const [classBoard, setClassBoard] = useState<BoardEntry[]>([])
  const [schoolBoard, setSchoolBoard] = useState<BoardEntry[]>([])
  const [className,  setClassName]  = useState('')
  const [loading,    setLoading]    = useState(true)

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    setLoading(true)
    const studentId = profile!.id
    const schoolId  = profile!.school_id!

    const [ceRes] = await Promise.all([
      supabase.from('class_enrollments')
        .select('class_id, classes(id, name)')
        .eq('student_id', studentId)
        .limit(1).maybeSingle(),
    ])

    const ce = ceRes.data as unknown as { class_id: string; classes: { id: string; name: string } | null } | null
    setClassName(ce?.classes?.name ?? '')

    const classId = ce?.class_id ?? null

    const [gsSchoolRes, gsClassRes] = await Promise.all([
      supabase.from('grade_summaries')
        .select('student_id, avg_score, profiles!student_id(full_name)')
        .eq('school_id', schoolId)
        .order('avg_score', { ascending: false })
        .limit(100),
      classId ? (supabase as unknown as { from: (t: string) => any }).from('class_enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('school_id', schoolId)
        : Promise.resolve({ data: [] }),
    ])

    function buildBoard(rows: { student_id: string; avg_score: number | null; profiles: { full_name: string | null } | null }[]): BoardEntry[] {
      const byStudent: Record<string, { scores: number[]; name: string }> = {}
      for (const r of rows) {
        if (!byStudent[r.student_id]) byStudent[r.student_id] = { scores: [], name: r.profiles?.full_name ?? 'Unknown' }
        if (r.avg_score != null) byStudent[r.student_id].scores.push(r.avg_score)
      }
      const entries = Object.entries(byStudent).map(([sid, v]) => {
        const avg = v.scores.length ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length) : 0
        return { studentId: sid, name: v.name, avgScore: avg, points: avg * 10 }
      })
      entries.sort((a, b) => b.points - a.points)
      return entries.map((e, i) => ({
        rank:     i + 1,
        name:     e.name,
        avgScore: e.avgScore,
        points:   e.points,
        change:   0,
        me:       e.studentId === studentId,
      }))
    }

    const schoolRows = (gsSchoolRes.data ?? []) as unknown as { student_id: string; avg_score: number | null; profiles: { full_name: string | null } | null }[]
    const classEnrolled = new Set((gsClassRes.data ?? []).map((r: any) => r.student_id as string))
    const classRows = classEnrolled.size > 0 ? schoolRows.filter(r => classEnrolled.has(r.student_id)) : schoolRows

    setSchoolBoard(buildBoard(schoolRows))
    setClassBoard(buildBoard(classRows))
    setLoading(false)
  }

  const board   = tab === 'class' ? classBoard : schoolBoard
  const myEntry = board.find(e => e.me)

  return (
    <DashboardLayout activePage="analysis" onNavigate={onNavigate} title="Leaderboard" subtitle="See how you rank against your peers" user={sidebarUser}>
      <div className="max-w-[720px] flex flex-col gap-5">

        {/* Tabs */}
        <div className="flex gap-1 bg-canvas rounded-pill p-1 w-fit">
          {(['class', 'school'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`h-9 px-5 rounded-full text-sm font-semibold capitalize transition-colors ${tab === t ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}
            >
              {t === 'class' ? (className || 'My Class') : 'My School'}
            </button>
          ))}
        </div>

        {/* My rank banner */}
        <div className="bg-primary rounded-card p-5 flex items-center gap-4">
          <div className="size-12 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
            {(profile?.full_name ?? '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-white text-xs mb-0.5">Your rank in {tab === 'class' ? (className || 'class') : 'school'}</p>
            <p className="text-3xl font-bold text-white">{myEntry ? `#${myEntry.rank}` : '—'}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-white/80 text-sm mb-1">
              <TrendingUp size={13} /> {myEntry?.points ?? 0} pts
            </div>
            <div className="flex items-center gap-1.5 text-white/80 text-sm">
              <Trophy size={13} className="text-amber-300" /> avg {myEntry?.avgScore ?? 0}%
            </div>
          </div>
        </div>

        {/* Podium */}
        {!loading && board.length >= 3 && (
          <div className="flex items-end justify-center gap-4 py-4">
            {[board[1], board[0], board[2]].map((p, i) => {
              const displayRank = i === 0 ? 2 : i === 1 ? 1 : 3
              const heights = ['h-24', 'h-32', 'h-20']
              return (
                <div key={p.rank} className="flex flex-col items-center gap-2">
                  <div className={`size-12 rounded-full ${p.me ? 'bg-primary' : 'bg-canvas border border-black/10'} flex items-center justify-center text-sm font-bold ${p.me ? 'text-white' : 'text-foreground'}`}>
                    {p.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <p className="text-xs font-semibold text-foreground text-center max-w-[80px] leading-tight">{p.name.split(' ')[0]}</p>
                  <div className={`w-20 ${heights[i]} ${medalBg[displayRank - 1]} rounded-t-lg flex items-end justify-center pb-2`}>
                    <Medal size={20} className={medalColor[displayRank - 1]} />
                  </div>
                  <span className="text-xs font-bold text-foreground">#{displayRank}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Full board */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted">Loading…</div>
          ) : board.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">No data yet. Grades will appear once teachers submit results.</div>
          ) : (
            <div className="divide-y divide-black/4">
              {board.map(p => (
                <div key={p.rank} className={`flex items-center gap-4 px-5 py-3.5 ${p.me ? 'bg-primary/6 border-l-2 border-primary' : ''}`}>
                  <div className={`w-7 text-center shrink-0 ${p.rank <= 3 ? 'text-base' : 'text-sm'}`}>
                    {p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank - 1] : <span className="text-muted font-semibold">{p.rank}</span>}
                  </div>
                  <div className={`size-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${p.me ? 'bg-primary text-white' : 'bg-canvas text-foreground'}`}>
                    {p.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${p.me ? 'text-primary' : 'text-foreground'}`}>
                      {p.name}{p.me ? ' (You)' : ''}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>Avg {p.avgScore}%</span>
                      <span className="flex items-center gap-0.5"><Flame size={10} className="text-red-400" /> {p.points} pts</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{p.points}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How points work */}
        <div className="bg-surface rounded-card shadow-sm p-5">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Trophy size={13} className="text-amber-500" /> How Points Work
          </h2>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted">
            {[
              ['Complete a lesson', '+20 pts'],
              ['Submit assignment on time', '+30 pts'],
              ['Score 80%+ on a quiz', '+50 pts'],
              ['Daily study session', '+10 pts'],
              ['Maintain a 7-day streak', '+100 pts'],
              ['Help a classmate (forum)', '+15 pts'],
            ].map(([action, pts]) => (
              <div key={action} className="flex items-center justify-between">
                <span>{action}</span>
                <span className="text-primary font-semibold">{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
