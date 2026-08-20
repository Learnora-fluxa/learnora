import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Send, Sparkles } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { teacherNav } from '../components/layout/Sidebar'
import { supabase } from '../lib/supabase'
import {
  clearActiveAssistantSession,
  listAssistantSessions,
  setActiveAssistantSession,
  storePendingAssistantPrompt,
  storePendingAssistantScope,
  type AssistantSessionSummary,
} from '../lib/aiAssistant'

type Props = { onNavigate: (page: string) => void }
type TeacherScopeOption = { classId: string; subjectId: string; label: string }
type TeacherCourseOption = { id: string; subjectId: string; title: string }

const quickActions = [
  'Explain Topic',
  'Summarize Notes',
  'Generate Quiz',
  'Solve Question',
  'Create Flashcards',
]

export default function AITutorPage({ onNavigate }: Props) {
  const { session, profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)
  const [input, setInput] = useState('')
  const [recentChats, setRecentChats] = useState<AssistantSessionSummary[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teacherScopes, setTeacherScopes] = useState<TeacherScopeOption[]>([])
  const [selectedScopeId, setSelectedScopeId] = useState('')
  const [teacherCourses, setTeacherCourses] = useState<TeacherCourseOption[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [loadingTeacherScope, setLoadingTeacherScope] = useState(false)

  useEffect(() => {
    let active = true

    async function loadSessions() {
      if (!session) {
        if (active) {
          setRecentChats([])
          setLoadingRecent(false)
        }
        return
      }

      try {
        const sessions = await listAssistantSessions(session)
        if (active) {
          if (Array.isArray(sessions)) {
            setRecentChats(sessions)
            setError(null)
          } else {
            setRecentChats([])
            setError('Unable to load AI sessions.')
          }
        }
      } catch (err) {
        if (active) {
          setRecentChats([])
          setError(err instanceof Error ? err.message : 'Unable to load AI sessions.')
        }
      } finally {
        if (active) setLoadingRecent(false)
      }
    }

    void loadSessions()
    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    let active = true

    async function loadTeacherScope() {
      if (profile?.role !== 'teacher' || !profile.id || !profile.school_id) {
        if (active) {
          setTeacherScopes([])
          setTeacherCourses([])
          setSelectedScopeId('')
          setSelectedCourseId('')
          setLoadingTeacherScope(false)
        }
        return
      }

      setLoadingTeacherScope(true)

      try {
        const [{ data: assignmentData, error: assignmentError }, { data: courseData, error: courseError }] = await Promise.all([
          supabase
            .from('teacher_assignments')
            .select('class_id, subject_id, classes(name), subjects(name)')
            .eq('teacher_id', profile.id)
            .eq('school_id', profile.school_id),
          supabase
            .from('courses')
            .select('id, title, subject_id')
            .eq('teacher_id', profile.id)
            .eq('school_id', profile.school_id)
            .order('created_at', { ascending: false }),
        ])

        if (assignmentError) throw assignmentError
        if (courseError) throw courseError
        if (!active) return

        const scopes = ((assignmentData ?? []) as Array<{
          class_id: string
          subject_id: string
          classes: { name: string | null } | null
          subjects: { name: string | null } | null
        }>).map((row) => ({
          classId: row.class_id,
          subjectId: row.subject_id,
          label: `${row.subjects?.name ?? 'Unnamed subject'} - ${row.classes?.name ?? 'Unnamed class'}`,
        }))

        const courses = ((courseData ?? []) as Array<{
          id: string
          title: string | null
          subject_id: string | null
        }>)
          .filter((row): row is { id: string; title: string | null; subject_id: string } => !!row.subject_id)
          .map((row) => ({
            id: row.id,
            title: row.title?.trim() || 'Untitled course',
            subjectId: row.subject_id,
          }))

        setTeacherScopes(scopes)
        setTeacherCourses(courses)
        setSelectedScopeId((current) => current || scopes[0]?.subjectId || '')
        setSelectedCourseId((current) => {
          if (!current) return ''
          return courses.some((course) => course.id === current) ? current : ''
        })
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unable to load teacher scope.')
      } finally {
        if (active) setLoadingTeacherScope(false)
      }
    }

    void loadTeacherScope()
    return () => {
      active = false
    }
  }, [profile?.id, profile?.role, profile?.school_id])

  const title = useMemo(() => {
    if (profile?.role === 'teacher') return 'AI Assistant'
    return 'AI Tutor'
  }, [profile?.role])

  function handleSend() {
    const text = input.trim()
    if (!text) return

    if (profile?.role === 'teacher') {
      const scope = teacherScopes.find((item) => item.subjectId === selectedScopeId)
      storePendingAssistantScope({
        subjectId: scope?.subjectId,
        courseId: selectedCourseId || undefined,
      })
    }

    storePendingAssistantPrompt(text)
    clearActiveAssistantSession()
    setInput('')
    onNavigate('ai-chat')
  }

  function handleQuickAction(label: string) {
    setInput(`${label}: `)
  }

  function openSession(sessionId: string) {
    setActiveAssistantSession(sessionId)
    onNavigate('ai-chat')
  }

  const filteredCourses = profile?.role === 'teacher'
    ? teacherCourses.filter((course) => !selectedScopeId || course.subjectId === selectedScopeId)
    : []

  return (
    <DashboardLayout
      activePage={profile?.role === 'teacher' ? 'ai-assistant' : 'ai-tutor'}
      onNavigate={onNavigate}
      title={title}
      nav={profile?.role === 'teacher' ? teacherNav : undefined}
      user={profile?.role === 'teacher' ? sidebarUser : undefined}
    >
      <div className="flex flex-col gap-5 max-w-[1200px]">

        {/* Page header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Learnora AI</h2>
          <p className="text-sm text-muted mt-1">One intelligent assistant, shaped by your role, permissions, and school context.</p>
        </div>

        {/* Launch area */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden flex flex-col" style={{ minHeight: '420px' }}>
          <div className="flex-1 p-6 flex flex-col gap-4 min-h-[260px] max-h-[400px] overflow-y-auto">
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-8">
              <div className="size-16 rounded-full bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center">
                <Sparkles size={28} className="text-white" />
              </div>
              <p className="text-lg font-semibold text-foreground">Ask Learnora AI Anything</p>
              <p className="text-sm text-muted max-w-lg">
                It answers within your role and school scope, using approved Learnora data instead of free-form guesswork.
              </p>
            </div>

            {profile?.role === 'teacher' && (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-left">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Teaching scope</span>
                  <div className="relative">
                    <select
                      value={selectedScopeId}
                      onChange={(event) => {
                        setSelectedScopeId(event.target.value)
                        setSelectedCourseId('')
                      }}
                      disabled={loadingTeacherScope || teacherScopes.length === 0}
                      className="h-11 w-full appearance-none rounded-input border border-black/10 bg-canvas px-4 pr-10 text-sm text-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">{loadingTeacherScope ? 'Loading scope...' : 'Select subject and class'}</option>
                      {teacherScopes.map((scope) => (
                        <option key={`${scope.classId}-${scope.subjectId}`} value={scope.subjectId}>
                          {scope.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                  </div>
                </label>

                <label className="flex flex-col gap-2 text-left">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Course scope</span>
                  <div className="relative">
                    <select
                      value={selectedCourseId}
                      onChange={(event) => setSelectedCourseId(event.target.value)}
                      disabled={loadingTeacherScope || filteredCourses.length === 0}
                      className="h-11 w-full appearance-none rounded-input border border-black/10 bg-canvas px-4 pr-10 text-sm text-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">All courses in this subject</option>
                      {filteredCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Quick action chips */}
          <div className="px-6 pb-3 flex flex-wrap gap-2 border-t border-black/4 pt-4">
            {quickActions.map(label => (
              <button
                key={label}
                onClick={() => handleQuickAction(label)}
                className="px-3 py-1.5 bg-canvas border border-black/8 rounded-input text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="px-6 pb-5 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 h-11 px-4 bg-canvas border border-black/8 rounded-input">
                <input
                  type="text"
                  placeholder={profile?.role === 'teacher'
                    ? 'Ask for a quiz, lesson idea, rubric, or class insight…'
                    : 'Ask me anything about your studies…'}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
                />
              </div>
              <button
                onClick={handleSend}
                className="size-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-deep transition-colors shadow-primary shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Recent conversations */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-black/6">
            <h3 className="text-base font-bold text-foreground">Recent</h3>
          </div>
          <div className="divide-y divide-black/4">
            {loadingRecent ? (
              <div className="px-6 py-6 text-sm text-muted">Loading conversations…</div>
            ) : error ? (
              <div className="px-6 py-6 text-sm text-red-600">{error}</div>
            ) : !Array.isArray(recentChats) || recentChats.length === 0 ? (
              <div className="px-6 py-6 text-sm text-muted">No saved assistant sessions yet.</div>
            ) : recentChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => openSession(chat.id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-canvas/60 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles size={14} className="text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">
                    {chat.title || 'Untitled AI session'}
                  </span>
                </div>
                <span className="text-xs text-muted shrink-0">
                  {chat.created_at ? new Date(chat.created_at).toLocaleDateString() : 'Recent'}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
