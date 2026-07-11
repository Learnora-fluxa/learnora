import { useState, useEffect } from 'react'
import { Award, Star, Lock, Trophy } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Badge {
  id:          string
  title:       string
  description: string
  icon:        string
  category:    string
  earned:      boolean
  earnedDate?: string
  xp:          number
}

// Static badge catalog — earned status derived from real DB data
const BADGE_CATALOG: Omit<Badge, 'earned' | 'earnedDate'>[] = [
  { id: 'first_login',       title: 'First Steps',          description: 'Created your Learnora account',                icon: '🚀', category: 'Milestones',  xp: 50  },
  { id: 'first_lesson',      title: 'First Lesson',         description: 'Completed your very first lesson',             icon: '📗', category: 'Learning',    xp: 100 },
  { id: 'first_assignment',  title: 'First Submission',     description: 'Submitted your first assignment',              icon: '📝', category: 'Milestones',  xp: 100 },
  { id: 'streak_7',          title: '7-Day Streak',         description: 'Studied every day for a week',                 icon: '🔥', category: 'Consistency', xp: 150 },
  { id: 'streak_30',         title: '30-Day Streak',        description: 'Studied every day for a full month',           icon: '📅', category: 'Consistency', xp: 500 },
  { id: 'five_subjects',     title: 'Polymath',             description: 'Completed lessons across 5 different subjects', icon: '🧠', category: 'Learning',    xp: 300 },
  { id: 'ten_lessons',       title: 'Knowledge Seeker',     description: 'Completed 10 or more lessons',                 icon: '📚', category: 'Learning',    xp: 200 },
  { id: 'high_scorer',       title: 'High Achiever',        description: 'Maintained an average grade of 80%+',          icon: '⭐', category: 'Excellence',  xp: 400 },
  { id: 'perfect_attendance',title: 'Perfect Attendance',   description: 'Not a single absence on record',               icon: '🎖️', category: 'Excellence',  xp: 350 },
  { id: 'five_assignments',  title: 'Consistent Learner',   description: 'Submitted 5 or more assignments',              icon: '✅', category: 'Milestones',  xp: 200 },
]

const categories = ['All', 'Milestones', 'Learning', 'Consistency', 'Excellence']

export default function AchievementsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [badges, setBadges]   = useState<Badge[]>([])
  const [tab,    setTab]      = useState('All')
  const [loading,setLoading]  = useState(true)

  useEffect(() => { if (profile?.id) deriveAchievements() }, [profile?.id])

  async function deriveAchievements() {
    setLoading(true)
    const sid      = profile!.id
    const schoolId = profile!.school_id!

    const [lpRes, gsRes, attRes, subRes] = await Promise.all([
      supabase.from('lesson_progress')
        .select('completed_at, lesson_id')
        .eq('student_id', sid).eq('completed', true)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: true }),
      supabase.from('grade_summaries')
        .select('subject_id, average_score')
        .eq('student_id', sid).eq('school_id', schoolId),
      supabase.from('attendance_records')
        .select('status')
        .eq('student_id', sid).eq('school_id', schoolId),
      supabase.from('assignment_submissions')
        .select('id, submitted_at')
        .eq('student_id', sid)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: true }),
    ])

    const lpRows  = (lpRes.data  ?? []) as { completed_at: string; lesson_id: string }[]
    const gsRows  = (gsRes.data  ?? []) as { subject_id: string; average_score: number | null }[]
    const attRows = (attRes.data ?? []) as { status: string }[]
    const subRows = (subRes.data ?? []) as { id: string; submitted_at: string }[]

    // Compute streak
    const days = new Set(lpRows.map(r => r.completed_at.slice(0, 10)))
    const today = new Date()
    let streak = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      if (days.has(d.toISOString().slice(0, 10))) streak++
      else if (i > 0) break
    }

    // Average grade across all subjects
    const avgGrade = gsRows.length > 0
      ? gsRows.reduce((sum, g) => sum + (g.average_score ?? 0), 0) / gsRows.length
      : 0

    const hasAbsence = attRows.some(a => a.status === 'absent')

    function fmtDate(iso: string) {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const joinedDate   = profile?.created_at ? fmtDate(profile.created_at) : ''
    const firstLesson  = lpRows[0]?.completed_at  ? fmtDate(lpRows[0].completed_at) : ''
    const firstSubmit  = subRows[0]?.submitted_at ? fmtDate(subRows[0].submitted_at) : ''

    const result: Badge[] = BADGE_CATALOG.map(b => {
      let earned = false
      let earnedDate: string | undefined

      if (b.id === 'first_login')        { earned = true;                           earnedDate = joinedDate  }
      if (b.id === 'first_lesson')       { earned = lpRows.length > 0;              earnedDate = firstLesson }
      if (b.id === 'first_assignment')   { earned = subRows.length > 0;             earnedDate = firstSubmit }
      if (b.id === 'streak_7')           { earned = streak >= 7  }
      if (b.id === 'streak_30')          { earned = streak >= 30 }
      if (b.id === 'five_subjects')      { earned = new Set(gsRows.map(g => g.subject_id)).size >= 5 }
      if (b.id === 'ten_lessons')        { earned = lpRows.length >= 10 }
      if (b.id === 'high_scorer')        { earned = avgGrade >= 80 && gsRows.length > 0 }
      if (b.id === 'perfect_attendance') { earned = attRows.length > 0 && !hasAbsence }
      if (b.id === 'five_assignments')   { earned = subRows.length >= 5 }

      return { ...b, earned, earnedDate }
    })

    setBadges(result)
    setLoading(false)
  }

  const filtered   = tab === 'All' ? badges : badges.filter(b => b.category === tab)
  const totalXP    = badges.filter(b => b.earned).reduce((s, b) => s + b.xp, 0)
  const earnedCount = badges.filter(b => b.earned).length
  const level = Math.floor(totalXP / 500) + 1

  return (
    <DashboardLayout
      activePage="profile"
      onNavigate={onNavigate}
      title="Achievements"
      subtitle="Badges and milestones you've unlocked"
      user={sidebarUser}
    >
      {loading ? (
        <div className="text-center py-16 text-sm text-muted">Loading achievements…</div>
      ) : <>
      {/* XP Banner */}
      <div className="bg-gradient-to-r from-[#4b75ff] to-[#005cf7] rounded-card p-6 flex items-center justify-between mb-5 text-white">
        <div>
          <p className="text-sm font-semibold opacity-80 mb-1">Total XP Earned</p>
          <p className="text-3xl font-bold">{totalXP.toLocaleString()} XP</p>
          <p className="text-sm opacity-70 mt-1">{earnedCount} of {badges.length} badges unlocked</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <Trophy size={32} className="mx-auto mb-1 opacity-80" />
            <p className="text-xs font-semibold opacity-70">Level {level}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-surface rounded-card shadow-sm p-5 mb-5">
        {(() => {
          const xpPerLevel = 500
          const xpInLevel  = totalXP % xpPerLevel
          const nextLevel  = level + 1
          const pct        = Math.min((xpInLevel / xpPerLevel) * 100, 100)
          return (
            <>
              <div className="flex justify-between text-xs font-semibold text-muted mb-2">
                <span>Progress to Level {nextLevel}</span>
                <span>{xpInLevel} / {xpPerLevel} XP</span>
              </div>
              <div className="h-2.5 bg-canvas rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </>
          )
        })()}
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setTab(c)}
            className={`h-8 px-4 rounded-full text-xs font-semibold transition-colors ${tab === c ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-foreground shadow-sm'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(badge => (
          <div
            key={badge.id}
            className={`bg-surface rounded-card shadow-sm p-5 flex flex-col items-center text-center transition-all ${badge.earned ? '' : 'opacity-50'}`}
          >
            <div className={`size-16 rounded-full flex items-center justify-center text-3xl mb-3 ${badge.earned ? 'bg-primary/10' : 'bg-canvas'}`}>
              {badge.earned ? badge.icon : <Lock size={22} className="text-muted" />}
            </div>
            <p className="text-sm font-bold text-foreground mb-1">{badge.title}</p>
            <p className="text-xs text-muted leading-relaxed mb-3">{badge.description}</p>
            <div className="flex items-center gap-1.5">
              <Star size={11} className={badge.earned ? 'text-amber-500' : 'text-muted'} fill={badge.earned ? '#f59e0b' : 'none'} />
              <span className={`text-xs font-bold ${badge.earned ? 'text-amber-600' : 'text-muted'}`}>{badge.xp} XP</span>
            </div>
            {badge.earned && badge.earnedDate && (
              <p className="text-[10px] text-muted mt-1.5">{badge.earnedDate}</p>
            )}
            {!badge.earned && (
              <span className="text-[10px] font-semibold text-muted mt-1.5 bg-canvas px-2 py-0.5 rounded-full">Locked</span>
            )}
          </div>
        ))}
      </div>

      {/* Earned XP per category summary */}
      <div className="bg-surface rounded-card shadow-sm p-5 mt-5">
        <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <Award size={14} className="text-primary" /> XP by Category
        </h2>
        <div className="flex flex-col gap-3">
          {['Learning', 'Consistency', 'Excellence', 'Milestones', 'Collaboration'].map(cat => {
            const catBadges = badges.filter(b => b.category === cat)
            const catXP     = catBadges.filter(b => b.earned).reduce((s, b) => s + b.xp, 0)
            const catTotal  = catBadges.reduce((s, b) => s + b.xp, 0)
            const pct       = catTotal > 0 ? Math.round((catXP / catTotal) * 100) : 0
            return (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-foreground">{cat}</span>
                  <span className="text-muted">{catXP} / {catTotal} XP</span>
                </div>
                <div className="h-2 bg-canvas rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      </>}
    </DashboardLayout>
  )
}
