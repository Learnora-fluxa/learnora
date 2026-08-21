import { supabase } from './supabase'

export type UserRole = 'student' | 'teacher' | 'admin' | 'parent' | 'super_admin'

const roleDestinations: Record<UserRole, string> = {
  student:     'dashboard',
  teacher:     'teacher-dashboard',
  admin:       'admin-dashboard',
  parent:      'parent/home',
  super_admin: 'super-dashboard',
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  console.log('signIn data:', data)
  if (error) throw error

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, school_id, full_name, is_active')
    .eq('id', data.user.id)
    .single()

  if (profileError) throw profileError
  if (profile && profile.is_active === false) {
    await supabase.auth.signOut()
    throw new Error('This account has been deactivated. Please contact Learnora support.')
  }

  const role = (profile?.role ?? 'student') as UserRole
  return {
    user:        data.user,
    session:     data.session,
    profile,
    destination: roleDestinations[role] ?? 'dashboard',
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export function generateSchoolCode(schoolName: string): string {
  const initials = schoolName
    .split(' ')
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .join('')
    .slice(0, 3) || 'SCH'
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${initials}-${num}`
}
