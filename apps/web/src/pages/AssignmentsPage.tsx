import { useState, useEffect } from 'react'
import { Search, ChevronDown, CheckCircle2, Clock, AlertCircle, Save, X } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }
type Status = 'Pending' | 'Completed' | 'Overdue'

interface Assignment {
  id:       string
  subject:  string
  title:    string
  deadline: string
  due_date: string | null
  marks:    number
  status:   Status
  hasDraft?: boolean
}

const statusConfig: Record<Status, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  Pending:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-700', icon: Clock        },
  Completed: { label: 'Completed', cls: 'bg-green-50 text-green-700', icon: CheckCircle2 },
  Overdue:   { label: 'Overdue',   cls: 'bg-red-50 text-red-700',     icon: AlertCircle  },
}

function fmtDeadline(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  if (d.toDateString() === now.toDateString()) return 'Today · 11:59 PM'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow · 11:59 PM'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' · 11:59 PM'
}

export default function AssignmentsPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [assignments,   setAssignments]   = useState<Assignment[]>([])
  const [loading,       setLoading]       = useState(true)
  const [activeId,      setActiveId]      = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [draftText,     setDraftText]     = useState('')
  const [draftSaved,    setDraftSaved]    = useState(false)
  const [search,        setSearch]        = useState('')
  const [flashId,       setFlashId]       = useState<string | null>(null)
  const [error,         setError]         = useState('')

  useEffect(() => { if (profile?.id) loadAssignments() }, [profile?.id])

  async function loadAssignments() {
    setLoading(true)
    const studentId = profile!.id

    const { data: ceData } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', studentId)

    const classIds = (ceData ?? []).map((e: { class_id: string }) => e.class_id)
    if (classIds.length === 0) { setLoading(false); return }

    const { data: aData } = await supabase
      .from('assignments')
      .select('id, title, due_date, max_score, subjects(name)')
      .in('class_id', classIds)
      .eq('is_published', true)
      .order('due_date', { ascending: true })

    const rawAssign = (aData ?? []) as unknown as {
      id: string; title: string; due_date: string | null
      max_score: number | null; subjects: { name: string } | null
    }[]

    const assignIds = rawAssign.map(a => a.id)
    const submittedSet = new Set<string>()
    const draftSet = new Set<string>()
    if (assignIds.length > 0) {
      const { data: sData } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, status')
        .eq('student_id', studentId)
        .in('assignment_id', assignIds)

      for (const s of (sData ?? []) as { assignment_id: string; status: string | null }[]) {
        if (s.status === 'submitted') submittedSet.add(s.assignment_id)
        if (s.status === 'draft') draftSet.add(s.assignment_id)
      }
    }

    const now = new Date()
    setAssignments(rawAssign.map(a => ({
      id:       a.id,
      subject:  a.subjects?.name ?? '—',
      title:    a.title,
      deadline: fmtDeadline(a.due_date),
      due_date: a.due_date,
      marks:    a.max_score ?? 100,
      hasDraft: draftSet.has(a.id),
      status:   submittedSet.has(a.id)
        ? 'Completed'
        : (a.due_date && new Date(a.due_date) < now ? 'Overdue' : 'Pending'),
    })))
    setLoading(false)
  }

  async function saveDraft() {
    if (!activeId) return

    const text = draftText.trim()
    if (!text) {
      setError('Write something before saving a draft.')
      return
    }

    setSubmitLoading(true)
    setError('')

    const { error: err } = await supabase
      .from('assignment_submissions')
      .upsert({
        school_id:       profile!.school_id!,
        assignment_id:   activeId,
        student_id:      profile!.id,
        submission_text: text,
        status:          'draft',
        submitted_at:    null,
      }, { onConflict: 'assignment_id,student_id' })

    setSubmitLoading(false)
    if (err) { setError(err.message); return }

    setAssignments(prev => prev.map(a => a.id === activeId ? { ...a, hasDraft: true } : a))
    setDraftSaved(true)
    setTimeout(() => setDraftSaved(false), 2000)
  }

  async function handleSubmit(id: string) {
    setSubmitLoading(true)
    setError('')

    const { error: err } = await supabase
      .from('assignment_submissions')
      .upsert({
        school_id:       profile!.school_id!,
        assignment_id:   id,
        student_id:      profile!.id,
        submission_text: draftText.trim() || null,
        status:          'submitted',
        submitted_at:    new Date().toISOString(),
      }, { onConflict: 'assignment_id,student_id' })

    setSubmitLoading(false)
    if (err) { setError(err.message); return }

    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: 'Completed' } : a))
    setFlashId(id)
    setActiveId(null)
    setDraftText('')
    setTimeout(() => setFlashId(null), 3500)
  }

  async function openSubmissionPanel(id: string) {
    setActiveId(id)
    setDraftSaved(false)
    setError('')

    const { data } = await supabase
      .from('assignment_submissions')
      .select('submission_text, status')
      .eq('assignment_id', id)
      .eq('student_id', profile!.id)
      .maybeSingle()

    const draft = data as { submission_text: string | null; status: string | null } | null
    setDraftText(draft?.status === 'draft' ? (draft.submission_text ?? '') : '')
  }

  function goToDetails(id: string) {
    sessionStorage.setItem('learnora_selected_assignment', id)
    onNavigate('assignment-details')
  }

  const pending   = assignments.filter(a => a.status === 'Pending').length
  const completed = assignments.filter(a => a.status === 'Completed').length
  const overdue   = assignments.filter(a => a.status === 'Overdue').length

  const visible = assignments.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.subject.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout
      activePage="assignments"
      onNavigate={onNavigate}
      title="Assignments"
      subtitle="Track, complete and submit assignments"
      user={sidebarUser}
    >
      <div className="flex flex-col gap-6 max-w-[1200px]">

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'Total',     value: loading ? '—' : assignments.length, color: 'text-foreground' },
            { label: 'Pending',   value: loading ? '—' : pending,            color: 'text-amber-600'  },
            { label: 'Completed', value: loading ? '—' : completed,          color: 'text-green-600'  },
            { label: 'Overdue',   value: loading ? '—' : overdue,            color: 'text-red-600'    },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-card shadow-sm p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Success flash */}
        {flashId !== null && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-card px-5 py-3.5">
            <CheckCircle2 size={18} className="text-green-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-green-800">Assignment submitted successfully!</p>
              <p className="text-xs text-green-700">Your teacher will review and grade your submission.</p>
            </div>
            <button onClick={() => setFlashId(null)} className="text-green-500 hover:text-green-700">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Filter row */}
        <div className="bg-surface rounded-card shadow-sm p-4 md:p-5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 h-10 px-4 bg-canvas border border-black/8 rounded-input flex-1 min-w-[180px] max-w-sm">
              <Search size={15} className="text-muted shrink-0" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search Assignments"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
              />
            </div>
            <button className="flex items-center gap-2 h-10 px-4 border border-black/8 bg-canvas rounded-input text-sm text-foreground hover:border-primary hover:text-primary transition-colors shrink-0">
              All Subjects <ChevronDown size={14} className="text-muted" />
            </button>
            <button className="flex items-center gap-2 h-10 px-4 border border-black/8 bg-canvas rounded-input text-sm text-foreground hover:border-primary hover:text-primary transition-colors shrink-0">
              Newest <ChevronDown size={14} className="text-muted" />
            </button>
          </div>
        </div>

        {/* Inline submit panel */}
        {activeId !== null && (() => {
          const a = assignments.find(x => x.id === activeId)
          if (!a) return null
          return (
            <div className="bg-surface rounded-card shadow-sm border-2 border-primary/20 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">{a.subject} — {a.title}</p>
                  <p className="text-xs text-muted mt-0.5">Due: {a.deadline} · {a.marks} marks</p>
                </div>
                <button onClick={() => setActiveId(null)} className="text-muted hover:text-foreground">
                  <X size={16} />
                </button>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted mb-1.5 block">Your Answer / Upload Response</label>
                <textarea
                  value={draftText}
                  onChange={e => setDraftText(e.target.value)}
                  rows={5}
                  placeholder="Type your answer or paste your response here…"
                  className="w-full resize-none border border-black/20 rounded-card p-3 text-sm outline-none focus:border-primary"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => handleSubmit(activeId)}
                  disabled={submitLoading}
                  className="h-10 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-50"
                >
                  {submitLoading ? 'Submitting…' : 'Submit Assignment'}
                </button>
                <button
                  onClick={() => void saveDraft()}
                  className="flex items-center gap-1.5 h-10 px-4 border border-black/20 rounded-pill text-sm font-semibold text-foreground hover:bg-canvas transition-colors"
                >
                  <Save size={14} /> {draftSaved ? 'Draft saved!' : 'Save Draft'}
                </button>
              </div>
            </div>
          )
        })()}

        {/* Assignments table */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[540px]">
              <thead>
                <tr className="border-b border-black/6 bg-canvas/60">
                  {['Subject', 'Assignment', 'Deadline', 'Marks', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 md:px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-muted">Loading…</td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-muted">
                    {search ? 'No assignments match your search.' : 'No assignments yet.'}
                  </td></tr>
                ) : visible.map(a => {
                  const s = statusConfig[a.status]
                  const StatusIcon = s.icon
                  const isFlashing = flashId === a.id
                  return (
                    <tr key={a.id} className={`border-b border-black/4 last:border-0 transition-colors ${isFlashing ? 'bg-green-50' : 'hover:bg-canvas/40'}`}>
                      <td className="px-4 md:px-6 py-4 font-medium text-foreground">{a.subject}</td>
                      <td className="px-4 md:px-6 py-4 text-foreground">{a.title}</td>
                      <td className="px-4 md:px-6 py-4 text-muted whitespace-nowrap">{a.deadline}</td>
                      <td className="px-4 md:px-6 py-4 text-center text-foreground">{a.marks}</td>
                      <td className="px-4 md:px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xs ${s.cls}`}>
                          <StatusIcon size={11} />{s.label}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        {a.status === 'Completed' ? (
                          <button
                            onClick={() => goToDetails(a.id)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-xs transition-colors text-primary hover:bg-primary/8"
                          >
                            View
                          </button>
                        ) : (
                          <button
                            onClick={() => void openSubmissionPanel(a.id)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-xs transition-colors ${
                              a.status === 'Overdue' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-primary text-white hover:bg-primary-deep'
                            }`}
                          >
                            {a.hasDraft ? 'Continue Draft' : 'Submit'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
