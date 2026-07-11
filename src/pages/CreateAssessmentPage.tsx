import { useState, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface ClassOption   { id: string; name: string }
interface SubjectOption { id: string; name: string }

interface FormState {
  title:        string
  type:         string
  classId:      string
  subjectId:    string
  maxScore:     string
  passingScore: string
  deadline:     string
  instructions: string
}

const INITIAL_FORM: FormState = {
  title: '', type: 'Quiz', classId: '', subjectId: '',
  maxScore: '100', passingScore: '50', deadline: '', instructions: '',
}

const steps = [
  { label: 'Academic Detail',         key: 'academic'  },
  { label: 'Score Settings',          key: 'score'     },
  { label: 'Schedule and Submission', key: 'schedule'  },
] as const

function SelectInput({ label, value, onChange, disabled, children }: {
  label: string; value: string; onChange: (v: string) => void
  disabled?: boolean; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-14 px-4 pr-10 bg-surface border border-black/12 rounded-card text-sm text-foreground appearance-none outline-none focus:border-primary transition-colors disabled:opacity-50"
        >
          {children}
        </select>
        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      </div>
    </div>
  )
}

function TextInput({ label, placeholder, value, onChange, type = 'text' }: {
  label: string; placeholder: string; value: string
  onChange: (v: string) => void; type?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-14 px-4 bg-surface border border-black/12 rounded-card text-sm text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors"
      />
    </div>
  )
}

export default function CreateAssessmentPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const [step,     setStep]     = useState(0)
  const [form,     setForm]     = useState<FormState>(INITIAL_FORM)
  const [classes,  setClasses]  = useState<ClassOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => { if (profile?.id) loadOptions() }, [profile?.id])

  async function loadOptions() {
    setLoading(true)
    const { data, error: taErr } = await supabase
      .from('teacher_assignments')
      .select('class_id, subject_id, classes!class_id(name), subjects!subject_id(name)')
      .eq('teacher_id', profile!.id)

    if (taErr) { logSupabaseError('CreateAssessment/ta', taErr) }

    type TARaw = {
      class_id: string; subject_id: string
      classes: { name: string } | null; subjects: { name: string } | null
    }

    const classMap   = new Map<string, string>()
    const subjectMap = new Map<string, string>()
    for (const r of (data ?? []) as unknown as TARaw[]) {
      if (r.classes?.name)  classMap.set(r.class_id, r.classes.name)
      if (r.subjects?.name) subjectMap.set(r.subject_id, r.subjects.name)
    }

    const clsArr  = [...classMap.entries()].map(([id, name]) => ({ id, name }))
    const subjArr = [...subjectMap.entries()].map(([id, name]) => ({ id, name }))

    setClasses(clsArr)
    setSubjects(subjArr)
    setForm(prev => ({
      ...prev,
      classId:   clsArr[0]?.id  ?? '',
      subjectId: subjArr[0]?.id ?? '',
    }))
    setLoading(false)
  }

  function set(key: keyof FormState) {
    return (v: string) => setForm(prev => ({ ...prev, [key]: v }))
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!form.title.trim()) return 'Assessment title is required.'
      if (!form.classId)      return 'Please select a class.'
      if (!form.subjectId)    return 'Please select a subject.'
    }
    if (step === 2) {
      if (!form.deadline) return 'Please set a deadline.'
    }
    return null
  }

  async function handleNext() {
    const validationError = validateStep()
    if (validationError) { setError(validationError); return }
    setError(null)

    if (step < steps.length - 1) {
      setStep(s => s + 1)
      return
    }

    // Final step — submit
    setSaving(true)
    const { error: insertErr } = await supabase
      .from('assignments')
      .insert({
        school_id:    profile!.school_id!,
        teacher_id:   profile!.id,
        class_id:     form.classId   || null,
        subject_id:   form.subjectId || null,
        title:        form.title.trim(),
        instructions: form.instructions.trim() || null,
        due_date:     form.deadline || null,
        max_score:    parseInt(form.maxScore) || 100,
        is_published: true,
      })

    if (insertErr) {
      logSupabaseError('CreateAssessment/insert', insertErr)
      setError('Failed to create assessment. Please try again.')
      setSaving(false)
      return
    }

    setSaving(false)
    onNavigate('examinations')
  }

  const isLast = step === steps.length - 1

  return (
    <DashboardLayout
      activePage="examinations"
      onNavigate={onNavigate}
      title="Create Assessment"
      subtitle="Set up a new assessment for grading and performance tracking."
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex justify-center">
        <div className="w-full max-w-[1088px] bg-surface rounded-card shadow-sm p-10">

          {/* Stepper */}
          <div className="flex items-center mb-10">
            {steps.map((s, i) => {
              const done   = i < step
              const active = i === step
              return (
                <div key={s.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      done   ? 'bg-primary text-white'
                      : active ? 'bg-primary text-white ring-4 ring-primary/20'
                               : 'bg-black/10 text-muted'
                    }`}>
                      {done ? <Check size={12} strokeWidth={2.5} /> : i + 1}
                    </div>
                    <span className={`text-xs font-medium whitespace-nowrap ${active ? 'text-primary' : 'text-muted'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-px mx-3 mb-5 transition-colors ${i < step ? 'bg-primary' : 'bg-black/10'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Step heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {step === 0 ? 'Academic Detail' : step === 1 ? 'Score Settings' : 'Schedule & Submission'}
            </h2>
            <p className="text-sm text-muted mt-1">Set up a new assessment for grading and performance tracking.</p>
          </div>

          {/* Step 1 — Academic Detail */}
          {step === 0 && (
            <div className="flex flex-col gap-6">
              <TextInput label="Assessment Title" placeholder="Midterm Mathematics Examination"
                value={form.title} onChange={set('title')} />
              <div className="grid grid-cols-2 gap-5">
                <SelectInput label="Assessment Type" value={form.type} onChange={set('type')}>
                  {['Quiz', 'Exam', 'Assignment', 'Project'].map(o => <option key={o}>{o}</option>)}
                </SelectInput>
                <SelectInput label="Subject" value={form.subjectId} onChange={set('subjectId')} disabled={loading}>
                  {loading ? (
                    <option value="">Loading…</option>
                  ) : subjects.length === 0 ? (
                    <option value="">No subjects assigned</option>
                  ) : (
                    subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                  )}
                </SelectInput>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <SelectInput label="Class" value={form.classId} onChange={set('classId')} disabled={loading}>
                  {loading ? (
                    <option value="">Loading…</option>
                  ) : classes.length === 0 ? (
                    <option value="">No classes assigned</option>
                  ) : (
                    classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                  )}
                </SelectInput>
                <TextInput label="Academic Session" placeholder="2025/2026"
                  value="" onChange={() => {}} />
              </div>
            </div>
          )}

          {/* Step 2 — Score Settings */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Total Score</label>
                <p className="text-xs text-muted -mt-1">Maximum marks a student can earn</p>
                <input
                  type="number" min="1" max="1000"
                  value={form.maxScore}
                  onChange={e => set('maxScore')(e.target.value)}
                  placeholder="100"
                  className="h-14 px-4 bg-surface border border-black/12 rounded-card text-sm text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">Passing Score</label>
                  <input
                    type="number" min="0"
                    value={form.passingScore}
                    onChange={e => set('passingScore')(e.target.value)}
                    placeholder="50"
                    className="h-14 px-4 bg-surface border border-black/12 rounded-card text-sm text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors"
                  />
                </div>
                <SelectInput label="Grade Scale" value="Percentage" onChange={() => {}}>
                  {['Percentage', 'Letter Grade', 'Points', 'Pass/Fail'].map(o => <option key={o}>{o}</option>)}
                </SelectInput>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <SelectInput label="Assessment Weight" value="20%" onChange={() => {}}>
                  {['5%', '10%', '15%', '20%', '25%', '30%'].map(o => <option key={o}>{o}</option>)}
                </SelectInput>
                <SelectInput label="Attempt Limit" value="1 Attempt" onChange={() => {}}>
                  {['1 Attempt', '2 Attempts', '3 Attempts', 'Unlimited'].map(o => <option key={o}>{o}</option>)}
                </SelectInput>
              </div>
            </div>
          )}

          {/* Step 3 — Schedule and Submission */}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">Available From</label>
                  <input
                    type="datetime-local"
                    className="h-14 px-4 bg-surface border border-black/12 rounded-card text-sm text-foreground outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">Deadline <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={form.deadline}
                    onChange={e => set('deadline')(e.target.value)}
                    className="h-14 px-4 bg-surface border border-black/12 rounded-card text-sm text-foreground outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <SelectInput label="Submission Type" value="Online" onChange={() => {}}>
                  {['Online', 'In-Person', 'Both'].map(o => <option key={o}>{o}</option>)}
                </SelectInput>
                <SelectInput label="Late Submission" value="Not Allowed" onChange={() => {}}>
                  {['Not Allowed', 'With Penalty', 'Allowed'].map(o => <option key={o}>{o}</option>)}
                </SelectInput>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Instructions</label>
                <textarea
                  placeholder="Provide instructions for students…"
                  rows={4}
                  value={form.instructions}
                  onChange={e => set('instructions')(e.target.value)}
                  className="px-4 py-3 bg-surface border border-black/12 rounded-card text-sm text-foreground placeholder:text-muted outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="mt-4 text-sm text-red-600 font-medium">{error}</p>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-black/6">
            <button
              onClick={() => { setStep(s => Math.max(0, s - 1)); setError(null) }}
              disabled={step === 0}
              className="h-12 px-6 border border-black/10 text-foreground text-sm font-semibold rounded-card hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={saving}
              className="h-12 px-8 bg-primary text-white text-sm font-bold rounded-card hover:bg-primary-deep transition-colors shadow-primary disabled:opacity-60"
            >
              {saving ? 'Creating…' : isLast ? 'Create Assessment' : 'Continue'}
            </button>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
