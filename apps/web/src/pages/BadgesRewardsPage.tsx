import { useState, useEffect } from 'react'
import { Gift, Star, Zap, Trophy, Lock } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Reward {
  id:       string
  title:    string
  desc:     string
  icon:     string
  cost:     number
  unlocked: boolean
  claimed:  boolean
}

const REWARDS: Reward[] = [
  { id: 'custom_avatar',   title: 'Custom Avatar Frame',   desc: 'Unlock a golden frame for your profile picture.',  icon: '🖼️', cost: 200,  unlocked: false, claimed: false },
  { id: 'dark_theme',      title: 'Premium Dark Theme',    desc: 'Access the exclusive Midnight theme.',             icon: '🌙', cost: 300,  unlocked: false, claimed: false },
  { id: 'xp_boost',        title: 'XP Boost (24h)',        desc: 'Earn double XP for 24 hours.',                    icon: '⚡', cost: 150,  unlocked: false, claimed: false },
  { id: 'leaderboard_pin', title: 'Leaderboard Pin',       desc: 'Pin yourself at the top of class for 1 day.',     icon: '📌', cost: 500,  unlocked: false, claimed: false },
  { id: 'emoji_pack',      title: 'Emoji Reaction Pack',   desc: 'Unlock 12 exclusive emojis for forum posts.',     icon: '🎭', cost: 100,  unlocked: false, claimed: false },
  { id: 'early_access',    title: 'Beta Feature Access',   desc: 'Be first to try upcoming Learnora features.',     icon: '🔬', cost: 800,  unlocked: false, claimed: false },
]

export default function BadgesRewardsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [rewards,  setRewards]  = useState<Reward[]>(REWARDS)
  const [totalXP,  setTotalXP]  = useState(0)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { if (profile?.id) load() }, [profile?.id])

  async function load() {
    setLoading(true)
    const sid = profile!.id
    const db  = supabase as unknown as { from: (t: string) => any }

    const [lpRes, subRes, claimsRes] = await Promise.all([
      supabase.from('lesson_progress')
        .select('id').eq('student_id', sid).eq('completed', true),
      supabase.from('assignment_submissions')
        .select('id').eq('student_id', sid),
      db.from('badge_claims')
        .select('reward_id').eq('student_id', sid),
    ])

    const xp = ((lpRes.data?.length ?? 0) * 50) + ((subRes.data?.length ?? 0) * 30)
    setTotalXP(xp)

    const claimedIds = new Set<string>(
      (claimsRes.data ?? []).map((c: any) => c.reward_id as string)
    )

    setRewards(REWARDS.map(r => ({
      ...r,
      unlocked: xp >= r.cost,
      claimed:  claimedIds.has(r.id),
    })))
    setLoading(false)
  }

  async function claim(id: string) {
    const db = supabase as unknown as { from: (t: string) => any }
    await db.from('badge_claims').insert({
      student_id: profile!.id,
      school_id:  profile!.school_id!,
      reward_id:  id,
    })
    setRewards(prev => prev.map(r => r.id === id ? { ...r, claimed: true } : r))
  }

  const unlocked = rewards.filter(r => r.unlocked && !r.claimed).length
  const claimed  = rewards.filter(r => r.claimed).length

  return (
    <DashboardLayout
      activePage="profile"
      onNavigate={onNavigate}
      title="Badges & Rewards"
      subtitle="Spend your XP on exclusive rewards"
      user={sidebarUser}
    >
      {loading ? (
        <div className="text-center py-16 text-sm text-muted">Loading…</div>
      ) : (
        <div className="max-w-[860px] flex flex-col gap-5">

          {/* XP balance */}
          <div className="bg-gradient-to-r from-[#4b75ff] to-[#005cf7] rounded-card p-6 text-white flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold opacity-80">Available XP</p>
              <p className="text-3xl font-bold mt-1">{totalXP.toLocaleString()} XP</p>
              <p className="text-xs opacity-70 mt-1">{unlocked} reward{unlocked !== 1 ? 's' : ''} unlocked · {claimed} claimed</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Trophy size={36} className="opacity-80" />
              <p className="text-xs font-semibold opacity-70">Level {Math.floor(totalXP / 500) + 1}</p>
            </div>
          </div>

          {/* How to earn */}
          <div className="bg-surface rounded-card shadow-sm p-5">
            <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
              <Zap size={12} className="text-amber-500" /> How to earn XP
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Complete a lesson', xp: '+50 XP' },
                { label: 'Submit assignment', xp: '+30 XP' },
                { label: '7-day streak',      xp: '+150 XP' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between bg-canvas rounded-card px-3 py-2.5">
                  <p className="text-xs text-muted">{item.label}</p>
                  <span className="text-xs font-bold text-amber-600">{item.xp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rewards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map(r => (
              <div key={r.id}
                className={`bg-surface rounded-card shadow-sm p-5 flex flex-col items-center text-center gap-3 transition-all ${r.unlocked ? '' : 'opacity-50'}`}>
                <div className={`size-16 rounded-full flex items-center justify-center text-3xl ${r.unlocked ? 'bg-amber-50' : 'bg-canvas'}`}>
                  {r.unlocked ? r.icon : <Lock size={22} className="text-muted" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{r.title}</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{r.desc}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
                  <Star size={11} fill="#f59e0b" className="text-amber-500" /> {r.cost} XP
                </div>
                {r.claimed ? (
                  <span className="h-8 px-4 bg-green-50 text-green-600 text-xs font-bold rounded-full flex items-center">Claimed</span>
                ) : r.unlocked ? (
                  <button onClick={() => claim(r.id)}
                    className="h-8 px-4 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary-deep transition-colors flex items-center gap-1.5">
                    <Gift size={11} /> Claim
                  </button>
                ) : (
                  <span className="h-8 px-4 bg-canvas text-muted text-xs font-semibold rounded-full flex items-center">
                    Need {r.cost} XP
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
