import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Trash2, Copy, ChevronDown } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface Question {
  id:          string
  question:    string
  type:        string
  points:      number
  subject:     string
  options:     unknown
  explanation: string | null
  order_index: number
  lesson_id:   string | null
}

const TYPE_LABEL: Record<string, string> = {
  mcq:       'MCQ',
  truefalse: 'True/False',
  short:     'Short Answer',
}

const diffColor: Record<string, string> = {
  MCQ:          'bg-primary/10 text-primary',
  'True/False': 'bg-green-50 text-green-700',
  'Short Answer': 'bg-amber-50 text-amber-700',
}

export default function QuestionBankPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [typeFilter,setTypeFilter]= useState('All')
  const [deleting,  setDeleting]  = useState<string | null>(null)

  useEffect(() => { if (profile?.school_id) loadQuestions() }, [profile?.school_id])

  async function loadQuestions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('id, question, type, points, options, explanation, order_index, lesson_id, lessons!lesson_id(modules(courses(subjects(name))))')
      .eq('school_id', profile!.school_id!)
      .order('created_at', { ascending: false })

    if (error) { logSupabaseError('QuestionBank/load', error); setLoading(false); return }

    type QRaw = {
      id: string; question: string; type: string; points: number
      options: unknown; explanation: string | null; order_index: number; lesson_id: string | null
      lessons: { modules: { courses: { subjects: { name: string } | null } | null } | null } | null
    }

    const rows: Question[] = ((data ?? []) as unknown as QRaw[]).map(r => ({
      id:          r.id,
      question:    r.question,
      type:        r.type,
      points:      r.points ?? 1,
      subject:     r.lessons?.modules?.courses?.subjects?.name ?? '—',
      options:     r.options,
      explanation: r.explanation,
      order_index: r.order_index ?? 0,
      lesson_id:   r.lesson_id,
    }))

    setQuestions(rows)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const { error } = await supabase.from('quiz_questions').delete().eq('id', id)
    if (error) { logSupabaseError('QuestionBank/delete', error) }
    else { setQuestions(prev => prev.filter(q => q.id !== id)) }
    setDeleting(null)
  }

  async function handleDuplicate(q: Question) {
    const { data, error } = await supabase
      .from('quiz_questions')
      .insert({
        school_id:   profile!.school_id!,
        lesson_id:   q.lesson_id,
        question:    q.question + ' (Copy)',
        type:        q.type,
        options:     q.options,
        explanation: q.explanation,
        points:      q.points,
        order_index: q.order_index,
        created_by:  profile!.id,
      })
      .select('id, question, type, points, options, explanation, order_index, lesson_id, lessons!lesson_id(modules(courses(subjects(name))))')
      .single()

    if (error) { logSupabaseError('QuestionBank/duplicate', error); return }

    type QRaw = {
      id: string; question: string; type: string; points: number
      options: unknown; explanation: string | null; order_index: number; lesson_id: string | null
      lessons: { modules: { courses: { subjects: { name: string } | null } | null } | null } | null
    }
    const r = data as unknown as QRaw
    const newQ: Question = {
      id: r.id, question: r.question, type: r.type, points: r.points ?? 1,
      subject: r.lessons?.modules?.courses?.subjects?.name ?? '—',
      options: r.options, explanation: r.explanation,
      order_index: r.order_index ?? 0, lesson_id: r.lesson_id,
    }
    setQuestions(prev => [newQ, ...prev])
  }

  const typeOptions    = ['All', 'mcq', 'truefalse', 'short']
  const filtered       = questions.filter(q =>
    (typeFilter === 'All' || q.type === typeFilter) &&
    q.question.toLowerCase().includes(search.toLowerCase())
  )

  const uniqueSubjects = new Set(questions.map(q => q.subject).filter(s => s !== '—')).size
  const totalPoints    = questions.reduce((s, q) => s + q.points, 0)

  return (
    <DashboardLayout
      activePage="question-bank"
      onNavigate={onNavigate}
      title="Question Bank"
      subtitle="Manage and reuse questions across assessments"
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[1000px] flex flex-col gap-6">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Questions', value: loading ? '—' : String(questions.length) },
            { label: 'Subjects',        value: loading ? '—' : String(uniqueSubjects)   },
            { label: 'Total Points',    value: loading ? '—' : String(totalPoints)      },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-card shadow-sm p-5">
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-sm text-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full h-10 pl-9 pr-4 border border-black/15 rounded-input text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
            />
          </div>
          <div className="relative">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="h-10 pl-4 pr-10 border border-black/15 rounded-input text-sm text-foreground bg-white outline-none focus:border-primary appearance-none"
            >
              {typeOptions.map(t => (
                <option key={t} value={t}>{t === 'All' ? 'All Types' : TYPE_LABEL[t] ?? t}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
          <button
            onClick={() => onNavigate('quiz-builder')}
            className="flex items-center gap-1.5 h-10 px-4 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary"
          >
            <Plus size={13} /> Add Question
          </button>
        </div>

        {/* Questions list */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface rounded-card shadow-sm p-5 h-20 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <Filter size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {questions.length === 0 ? 'No questions yet. Add your first question.' : 'No questions match your filters.'}
            </p>
            {questions.length === 0 && (
              <button
                onClick={() => onNavigate('quiz-builder')}
                className="mt-3 text-sm text-primary font-semibold hover:underline"
              >
                Add a question →
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(q => {
              const typeLabel = TYPE_LABEL[q.type] ?? q.type
              return (
                <div key={q.id} className="bg-surface rounded-card shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {q.subject !== '—' && (
                          <span className="text-xs font-semibold text-muted">{q.subject}</span>
                        )}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${diffColor[typeLabel] ?? 'bg-canvas text-muted'}`}>
                          {typeLabel}
                        </span>
                        <span className="text-xs text-muted">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-sm text-foreground leading-snug">{q.question}</p>
                      {q.explanation && (
                        <p className="text-xs text-muted mt-1.5 italic">{q.explanation}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleDuplicate(q)}
                        title="Duplicate"
                        className="size-8 rounded-full border border-black/10 flex items-center justify-center text-muted hover:text-primary hover:border-primary transition-colors"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        disabled={deleting === q.id}
                        title="Delete"
                        className="size-8 rounded-full border border-black/10 flex items-center justify-center text-muted hover:text-red-500 hover:border-red-300 transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
