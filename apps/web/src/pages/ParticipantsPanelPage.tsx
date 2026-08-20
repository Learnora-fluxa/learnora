import { useState, useEffect } from 'react'
import { Mic, MicOff, Video, VideoOff, Hand, Crown, MoreVertical, Search } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Participant {
  id:        string
  name:      string
  initials:  string
  role:      'host' | 'student'
  micOn:     boolean
  camOn:     boolean
  handRaised:boolean
}

export default function ParticipantsPanelPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [participants, setParticipants] = useState<Participant[]>([])
  const [search, setSearch]             = useState('')
  const [loading, setLoading]           = useState(true)

  useEffect(() => { if (profile?.id) loadParticipants() }, [profile?.id])

  async function loadParticipants() {
    setLoading(true)
    const schoolId = profile!.school_id!

    // Fetch students enrolled in teacher's classes
    const { data: taData } = await supabase
      .from('teacher_assignments' as any)
      .select('class_id')
      .eq('teacher_id', profile!.id)
      .eq('school_id', schoolId)
      .limit(1)
      .maybeSingle()

    const classId = (taData as any)?.class_id as string | undefined

    if (classId) {
      const { data: ceData } = await supabase
        .from('class_enrollments' as any)
        .select('student_id, profiles!student_id(id, full_name)')
        .eq('class_id', classId)
        .limit(30)

      const rows = (ceData ?? []) as unknown as {
        student_id: string
        profiles: { id: string; full_name: string | null } | null
      }[]

      const list: Participant[] = rows
        .filter(r => r.profiles?.id)
        .map((r, idx) => {
          const name = r.profiles!.full_name ?? `Student ${idx + 1}`
          return {
            id:         r.profiles!.id,
            name,
            initials:   name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase(),
            role:       'student',
            micOn:      Math.random() > 0.5,
            camOn:      Math.random() > 0.6,
            handRaised: Math.random() > 0.8,
          }
        })

      // Add host (teacher) at the top
      const hostName = profile!.full_name ?? 'You'
      list.unshift({
        id:         profile!.id,
        name:       `${hostName} (You)`,
        initials:   hostName.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase(),
        role:       'host',
        micOn:      true,
        camOn:      false,
        handRaised: false,
      })
      setParticipants(list)
    }
    setLoading(false)
  }

  const filtered = participants.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const raised = filtered.filter(p => p.handRaised)
  const others = filtered.filter(p => !p.handRaised)

  function ParticipantRow({ p }: { p: Participant }) {
    return (
      <div className="flex items-center gap-3 px-5 py-3 hover:bg-canvas/60 transition-colors">
        <div className={`size-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${p.role === 'host' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
          {p.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
            {p.role === 'host' && <Crown size={12} className="text-amber-500 shrink-0" />}
          </div>
          {p.handRaised && (
            <p className="text-xs text-amber-600 font-medium mt-0.5">Hand raised ✋</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`size-7 rounded-full flex items-center justify-center ${p.micOn ? 'text-muted' : 'text-red-400'}`}>
            {p.micOn ? <Mic size={13} /> : <MicOff size={13} />}
          </span>
          <span className={`size-7 rounded-full flex items-center justify-center ${p.camOn ? 'text-muted' : 'text-red-400'}`}>
            {p.camOn ? <Video size={13} /> : <VideoOff size={13} />}
          </span>
          {p.role !== 'host' && (
            <button className="size-7 rounded-full flex items-center justify-center text-muted hover:bg-black/8 transition-colors">
              <MoreVertical size={13} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout
      activePage="live-classes"
      onNavigate={onNavigate}
      title="Participants"
      subtitle={`${participants.length} in session`}
      user={sidebarUser}
    >
      <div className="max-w-[560px] flex flex-col gap-5">

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search participants…"
            className="w-full h-10 pl-9 pr-4 bg-surface border border-black/12 rounded-input text-sm outline-none focus:border-primary"
          />
        </div>

        {loading ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center text-sm text-muted">Loading…</div>
        ) : participants.length === 0 ? (
          <div className="bg-surface rounded-card shadow-sm p-12 text-center text-sm text-muted">No participants found.</div>
        ) : (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">

            {raised.length > 0 && (
              <>
                <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                  <Hand size={13} className="text-amber-600" />
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Hand raised ({raised.length})</p>
                </div>
                {raised.map(p => <ParticipantRow key={p.id} p={p} />)}
              </>
            )}

            {others.length > 0 && (
              <>
                <div className="px-5 py-2.5 border-b border-black/6">
                  <p className="text-xs font-bold text-muted uppercase tracking-wider">Participants ({others.length})</p>
                </div>
                {others.map(p => <ParticipantRow key={p.id} p={p} />)}
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
