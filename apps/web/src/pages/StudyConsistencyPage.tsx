import { useState, useEffect } from 'react'
import { Flame, Calendar, Trophy, TrendingUp, Target } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

const dayLabels = ['M','T','W','T','F','S','S']
const tileColor = ['bg-black/8', 'bg-primary/50', 'bg-primary']

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function StudyConsistencyPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [heatmapData,    setHeatmapData]    = useState<number[][]>([])
  const [weekLabels,     setWeekLabels]     = useState<string[]>([])
  const [currentStreak,  setCurrentStreak]  = useState(0)
  const [longestStreak,  setLongestStreak]  = useState(0)
  const [daysStudied,    setDaysStudied]    = useState(0)
  const [thisWeekDays,   setThisWeekDays]   = useState(0)
  const [loading,        setLoading]        = useState(true)

  useEffect(() => { if (profile?.id) loadData() }, [profile?.id])

  async function loadData() {
    setLoading(true)
    const schoolId  = profile!.school_id!
    const studentId = profile!.id

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 69)

    const { data } = await supabase
      .from('lesson_progress')
      .select('completed_at')
      .eq('student_id', studentId)
      .eq('school_id', schoolId)
      .eq('completed', true)
      .gte('completed_at', cutoff.toISOString())

    const rows = (data ?? []) as { completed_at: string | null }[]

    const countByDate: Record<string, number> = {}
    for (const r of rows) {
      if (!r.completed_at) continue
      const key = toDateKey(new Date(r.completed_at))
      countByDate[key] = (countByDate[key] ?? 0) + 1
    }

    // Build 10-week grid (Mon→Sun), newest week last
    const today = new Date()
    const todayDOW = (today.getDay() + 6) % 7  // Mon=0
    const gridStart = new Date(today)
    gridStart.setDate(today.getDate() - todayDOW - 63)  // start of 10 weeks ago

    const grid: number[][] = []
    const wLabels: string[] = []
    for (let w = 0; w < 10; w++) {
      const week: number[] = []
      for (let d = 0; d < 7; d++) {
        const day = new Date(gridStart)
        day.setDate(gridStart.getDate() + w * 7 + d)
        const key = toDateKey(day)
        const cnt = countByDate[key] ?? 0
        week.push(cnt >= 2 ? 2 : cnt >= 1 ? 1 : 0)
      }
      grid.push(week)
      const weekStart = new Date(gridStart)
      weekStart.setDate(gridStart.getDate() + w * 7)
      wLabels.push(`W${w + 1}`)
    }
    setHeatmapData(grid)
    setWeekLabels(wLabels)

    // Streak calculation: consecutive days with activity, going back from today
    let streak = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      if (countByDate[toDateKey(d)]) streak++
      else if (i > 0) break
    }

    // Longest streak
    let longest = 0, cur = 0
    const allDates = Object.keys(countByDate).sort()
    for (let i = 0; i < allDates.length; i++) {
      if (i === 0) { cur = 1; continue }
      const prev = new Date(allDates[i - 1])
      const curr = new Date(allDates[i])
      const diff = (curr.getTime() - prev.getTime()) / 86400000
      cur = diff === 1 ? cur + 1 : 1
      if (cur > longest) longest = cur
    }
    if (streak > longest) longest = streak

    // This week unique study days
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - todayDOW)
    let thisWeek = 0
    for (let d = 0; d <= todayDOW; d++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + d)
      if (countByDate[toDateKey(day)]) thisWeek++
    }

    setCurrentStreak(streak)
    setLongestStreak(longest)
    setDaysStudied(Object.keys(countByDate).length)
    setThisWeekDays(thisWeek)
    setLoading(false)
  }

  const totalDays   = daysStudied
  const consistency = totalDays > 0 ? Math.min(Math.round((totalDays / 70) * 100), 100) : 0

  return (
    <DashboardLayout activePage="analysis" onNavigate={onNavigate} title="Study Consistency" subtitle="Streaks, habits, and study activity over time" user={sidebarUser}>
      <div className="flex flex-col gap-6 max-w-[860px]">

        {/* Top stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Current Streak', value: `${currentStreak} days`,  Icon: Flame,      color: 'bg-red-50 text-red-500'       },
            { label: 'Longest Streak', value: `${longestStreak} days`,  Icon: Trophy,     color: 'bg-amber-50 text-amber-600'  },
            { label: 'Days Studied',   value: `${totalDays}/70`,        Icon: Calendar,   color: 'bg-primary/10 text-primary'   },
            { label: 'Consistency',    value: `${consistency}%`,        Icon: TrendingUp, color: 'bg-green-50 text-green-600'  },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="bg-surface rounded-card shadow-sm p-5">
              <div className={`size-10 rounded-card ${color} flex items-center justify-center mb-3`}><Icon size={18} /></div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h2 className="text-base font-bold text-foreground mb-4">10-Week Study Heatmap</h2>
          {loading ? (
            <div className="text-sm text-muted text-center py-8">Loading activity…</div>
          ) : (
            <div className="flex gap-2">
              <div className="flex flex-col gap-1.5 pt-6">
                {dayLabels.map((d, i) => (
                  <div key={i} className="h-6 w-5 flex items-center justify-center text-[10px] text-muted">{d}</div>
                ))}
              </div>
              <div className="flex gap-1.5 overflow-x-auto">
                {heatmapData.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1.5">
                    <div className="h-5 flex items-center justify-center text-[10px] text-muted">{weekLabels[wi]}</div>
                    {week.map((val, di) => (
                      <div
                        key={di}
                        className={`size-6 rounded ${tileColor[val]} transition-colors`}
                        title={val === 0 ? 'No study' : val === 2 ? 'Multiple sessions' : 'Studied'}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-4 mt-4">
            {[['bg-black/8','No study'],['bg-primary/50','Studied'],['bg-primary','Multiple sessions']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1.5 text-xs text-muted">
                <span className={`size-3 rounded ${c}`} />{l}
              </div>
            ))}
          </div>
        </div>

        {/* Subject activity summary */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Target size={15} className="text-primary" /> Study Activity
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            {[
              { label: 'Lessons Completed (70 days)', value: daysStudied, color: 'text-primary' },
              { label: 'Current Streak',              value: `${currentStreak} days`, color: 'text-red-500' },
              { label: 'Longest Streak',              value: `${longestStreak} days`, color: 'text-amber-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-canvas rounded-card p-4">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly goal */}
        <div className="bg-primary rounded-card p-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-white/70 text-xs mb-1">This Week's Goal</p>
            <p className="text-xl font-bold text-white">Study 5 days out of 7</p>
            <p className="text-white/70 text-sm mt-1">
              {thisWeekDays >= 5
                ? "You've hit your weekly goal!"
                : `You've studied ${thisWeekDays} days — ${5 - thisWeekDays} more to hit your goal!`}
            </p>
          </div>
          <div className="size-16 rounded-full bg-white/15 flex items-center justify-center">
            <p className="text-white text-xl font-bold">{thisWeekDays}/5</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
