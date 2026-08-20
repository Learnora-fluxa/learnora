import { useState } from 'react'
import { GraduationCap, BookOpen, Users, ShieldCheck, Check, Loader2 } from 'lucide-react'
import AuthHeroPanel from '../components/auth/AuthHeroPanel'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

const roles = [
  { id: 'student', label: 'Student',       desc: 'Access courses, assignments and progress.',  icon: GraduationCap },
  { id: 'teacher', label: 'Teacher',        desc: 'Manage classes and engage students.',        icon: BookOpen      },
  { id: 'parent',  label: 'Parent',         desc: "Track your child's academic progress.",      icon: Users         },
  { id: 'admin',   label: 'Administrator',  desc: 'Manage school operations seamlessly.',       icon: ShieldCheck   },
]

export default function RoleSelectionPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const pending = localStorage.getItem('learnora_pending_role') ?? ''
  const [selected, setSelected] = useState<string>(pending || '')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleContinue() {
    if (!selected || !profile) return
    setLoading(true)
    setError('')

    const updates: { role?: string; school_id?: string | null } = { role: selected }
    const schoolId = localStorage.getItem('learnora_selected_school_id')
    if (schoolId) updates.school_id = schoolId

    const { error: err } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)

    setLoading(false)
    if (err) { setError(err.message); return }

    localStorage.removeItem('learnora_pending_role')
    onNavigate('complete-profile')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      <div className="lg:w-[52%] lg:flex-shrink-0 p-3 lg:p-6">
        <AuthHeroPanel />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-0 lg:px-12">
        <div className="w-full max-w-[500px]">
          <h1 className="text-4xl font-semibold text-foreground mb-2 leading-tight">
            How Will You Use Learnora
          </h1>
          <p className="text-base font-normal text-foreground mb-4">
            Choose the role that describes you
          </p>

          <div className="h-px bg-muted/20 mb-6" />

          {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

          <div className="flex flex-col gap-3 mb-8">
            {roles.map(role => {
              const Icon   = role.icon
              const active = selected === role.id
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelected(role.id)}
                  className={`flex items-center gap-4 w-full p-4 rounded-card border-2 text-left transition-all ${
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-black/8 bg-surface hover:border-primary/40 hover:bg-canvas/50'
                  }`}
                >
                  <div className={`size-[52px] rounded-card flex items-center justify-center shrink-0 transition-colors ${active ? 'bg-primary text-white' : 'bg-canvas text-muted'}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-foreground">{role.label}</p>
                    <p className="text-sm text-muted mt-0.5">{role.desc}</p>
                  </div>
                  {active && (
                    <div className="shrink-0 size-5 rounded-full bg-primary flex items-center justify-center">
                      <Check size={11} strokeWidth={2.5} className="text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <button
            onClick={handleContinue}
            disabled={!selected || loading}
            className="w-full h-14 bg-primary text-white text-base font-bold rounded-pill border border-white hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
