import { supabase } from './supabase'

const SELECTED_CHILD_KEY = 'learnora_selected_child'

function readSelectedChild() {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(SELECTED_CHILD_KEY)
}

function writeSelectedChild(childId: string | null) {
  if (typeof window === 'undefined') return
  if (childId) {
    sessionStorage.setItem(SELECTED_CHILD_KEY, childId)
    return
  }
  sessionStorage.removeItem(SELECTED_CHILD_KEY)
}

export async function resolveLinkedParentChild(parentId: string, schoolId: string, preferredChildId?: string | null) {
  const { data, error } = await supabase
    .from('parent_student_links')
    .select('student_id')
    .eq('parent_id', parentId)
    .eq('school_id', schoolId)

  if (error) throw error

  const studentIds = (data ?? []).map((row: { student_id: string }) => row.student_id)
  if (!studentIds.length) {
    writeSelectedChild(null)
    return { childId: null, studentIds }
  }

  const requestedChildId = preferredChildId ?? readSelectedChild()
  const childId = requestedChildId && studentIds.includes(requestedChildId)
    ? requestedChildId
    : studentIds[0]

  writeSelectedChild(childId)

  return { childId, studentIds }
}
