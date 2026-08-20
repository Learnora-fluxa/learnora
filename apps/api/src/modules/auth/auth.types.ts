export type LearnoraRole =
  | 'student'
  | 'teacher'
  | 'admin'
  | 'parent'
  | 'super_admin'

export type AuthenticatedUser = {
  id: string
  email?: string
  schoolId?: string | null
  role: LearnoraRole
}
