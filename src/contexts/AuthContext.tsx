import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

export interface Profile {
  id: string
  school_id: string | null
  role: 'student' | 'teacher' | 'admin' | 'parent' | 'super_admin'
  full_name: string | null
  email: string | null
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  created_at: string | null
  notification_prefs: Record<string, boolean> | null
}

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,  setSession]  = useState<Session | null>(null)
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [loading,  setLoading]  = useState(true)

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data as Profile | null)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) fetchProfile(data.session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) fetchProfile(newSession.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function profileToSidebarUser(p: Profile | null) {
  if (!p) return { name: 'Loading...', role: '...', initials: '..' }
  const name = p.full_name || p.email || 'User'
  const initials = name.split(' ').filter(Boolean).map(w => w[0].toUpperCase()).join('').slice(0, 2) || 'U'
  const roleLabel = (
    { super_admin: 'Super Admin', admin: 'School Admin', teacher: 'Teacher', parent: 'Parent', student: 'Student' }
  )[p.role] ?? 'User'
  return { name, role: roleLabel, initials }
}
