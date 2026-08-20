import { useState } from 'react'
import { Award, BookOpen, ChevronRight, Target, Clock, TrendingUp, Sparkles } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'

type Props = { onNavigate: (page: string) => void }

const exams = [
  { id: 'waec', name: 'WAEC',      fullName: 'West African Examinations Council',  year: '2026',  subjects: 9,  pastYears: 10 },
  { id: 'neco', name: 'NECO',      fullName: 'National Examinations Council',       year: '2026',  subjects: 9,  pastYears: 8  },
  { id: 'jamb', name: 'JAMB/UTME', fullName: 'Joint Admissions and Matriculation Board', year: '2026', subjects: 4, pastYears: 15 },
]

const subjects = [
  { name: 'Physics',     readiness: 72, topics: 24, done: 17, color: 'bg-primary'     },
  { name: 'Mathematics', readiness: 58, topics: 32, done: 18, color: 'bg-accent-mint' },
  { name: 'Chemistry',   readiness: 65, topics: 28, done: 18, color: 'bg-red-400'     },
  { name: 'English',     readiness: 81, topics: 20, done: 16, color: 'bg-amber-400'   },
  { name: 'Biology',     readiness: 77, topics: 26, done: 20, color: 'bg-green-500'   },
]

const pastQuestions = [
  { year: '2023', subject: 'Physics',     topic: 'Mechanics',         questions: 50 },
  { year: '2022', subject: 'Physics',     topic: 'Waves & Optics',    questions: 50 },
  { year: '2023', subject: 'Mathematics', topic: 'Algebra & Calculus', questions: 60 },
  { year: '2023', subject: 'Chemistry',   topic: 'Organic Chemistry', questions: 50 },
]

export default function AIExamPrepPage({ onNavigate }: Props) {
  const [selectedExam, setSelectedExam] = useState('waec')
  const exam = exams.find(e => e.id === selectedExam)!

  return (
    <DashboardLayout activePage="ai-tutor" onNavigate={onNavigate} title="Exam Preparation" subtitle="WAEC/NECO/JAMB past questions and readiness tracker">
      <div className="flex flex-col gap-6">

        {/* Exam selector */}
        <div className="flex gap-3 flex-wrap">
          {exams.map(e => (
            <button
              key={e.id}
              onClick={() => setSelectedExam(e.id)}
              className={`flex items-center gap-2 h-11 px-5 rounded-pill text-sm font-bold transition-all border-2 ${
                selectedExam === e.id ? 'bg-primary text-white border-primary shadow-primary' : 'border-black/15 text-foreground hover:border-primary'
              }`}
            >
              <Award size={14} /> {e.name}
            </button>
          ))}
        </div>

        {/* Exam info */}
        <div className="bg-primary rounded-card p-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-white/70 text-xs mb-1">{exam.fullName}</p>
            <h2 className="text-2xl font-bold text-white">{exam.name} {exam.year} Prep</h2>
            <p className="text-white/70 text-sm mt-1">{exam.subjects} subjects · {exam.pastYears} years of past questions</p>
          </div>
          <div className="text-right">
            <div className="size-16 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-1">
              <Target size={28} className="text-white" />
            </div>
            <p className="text-xs text-white/60">Overall Readiness</p>
            <p className="text-2xl font-bold text-white">71%</p>
          </div>
        </div>

        {/* Subject readiness */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp size={15} className="text-primary" /> Subject Readiness
            </h2>
            <span className="text-xs text-muted">Current term progress</span>
          </div>
          <div className="flex flex-col gap-4">
            {subjects.map(s => (
              <div key={s.name} className="flex items-center gap-4">
                <p className="text-sm font-medium text-foreground w-24 shrink-0">{s.name}</p>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-black/8 rounded-full overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.readiness}%` }} />
                  </div>
                  <span className={`text-sm font-bold w-10 text-right ${s.readiness >= 75 ? 'text-green-600' : s.readiness >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                    {s.readiness}%
                  </span>
                </div>
                <span className="text-xs text-muted shrink-0">{s.done}/{s.topics} topics</span>
                <button onClick={() => onNavigate('ai-quiz')} className="text-xs text-primary font-semibold hover:underline shrink-0">
                  Practice
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Past questions */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-black/6 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <BookOpen size={15} className="text-primary" /> Past Questions
            </h2>
            <span className="text-xs text-muted">Tap to start a timed session</span>
          </div>
          <div className="divide-y divide-black/4">
            {pastQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => onNavigate('ai-quiz')}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-canvas/50 transition-colors text-left"
              >
                <div className="size-10 rounded-card bg-primary/10 flex items-center justify-center shrink-0">
                  <Award size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{exam.name} {q.year} — {q.subject}</p>
                  <p className="text-xs text-muted">{q.topic} · {q.questions} questions</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <Clock size={11} /> ~50 min
                  </div>
                  <ChevronRight size={14} className="text-muted" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* AI recommendations */}
        <div className="bg-primary/8 border border-primary/15 rounded-card p-4 flex items-start gap-3">
          <Sparkles size={15} className="text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">AI Recommendation</p>
            <p className="text-xs text-muted mt-1">
              Focus on <strong>Mathematics</strong> (58%) — it needs the most attention before your exam.
              Try the 2023 WAEC Algebra paper. Your strongest subject is English (81%) — maintain it with weekly practice.
            </p>
            <button onClick={() => onNavigate('ai-study-plan')} className="text-xs text-primary font-semibold mt-2 flex items-center gap-1 hover:underline">
              Build study plan <ChevronRight size={10} />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
