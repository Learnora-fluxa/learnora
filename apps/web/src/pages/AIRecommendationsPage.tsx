import { Sparkles, BookOpen, Target, Clock, ChevronRight, Lightbulb, BarChart2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'

type Props = { onNavigate: (page: string) => void }

const insights = [
  {
    type:    'gap',
    subject: 'Physics',
    label:   'Knowledge Gap Detected',
    body:    'You scored below 60% on Thermodynamics across your last 3 quizzes. Focus on heat transfer and gas laws before the end of term.',
    cta:     'Start Thermodynamics Review',
    ctaPage: 'ai-quiz',
    color:   'border-red-100 bg-red-50/40',
    iconColor: 'bg-red-50 text-red-500',
  },
  {
    type:    'strength',
    subject: 'Mathematics',
    label:   'Strong Performance',
    body:    'You\'re consistently scoring 85%+ in Algebra. Consider attempting harder challenge problems to lock in your advantage before exams.',
    cta:     'Try Advanced Problems',
    ctaPage: 'ai-quiz',
    color:   'border-green-100 bg-green-50/30',
    iconColor: 'bg-green-50 text-green-600',
  },
  {
    type:    'streak',
    subject: 'Consistency',
    label:   'Study Streak at Risk',
    body:    'You have not studied Biology or Chemistry this week. Your 14-day streak may break tonight. A 20-minute session will keep it alive.',
    cta:     'Study Now',
    ctaPage: 'ai-chat',
    color:   'border-amber-100 bg-amber-50/30',
    iconColor: 'bg-amber-50 text-amber-600',
  },
  {
    type:    'exam',
    subject: 'WAEC Prep',
    label:   'Exam Readiness Alert',
    body:    'With 6 weeks to mock exams, you\'re 73% ready in Mathematics but only 51% in Economics. Prioritise Economics for the next 2 weeks.',
    cta:     'Open Exam Prep',
    ctaPage: 'ai-exam-prep',
    color:   'border-primary/20 bg-primary/4',
    iconColor: 'bg-primary/10 text-primary',
  },
]

const todayPlan = [
  { time: '15 min', activity: 'Thermodynamics flashcards', subject: 'Physics',   icon: '🔥' },
  { time: '20 min', activity: 'Economics supply & demand quiz', subject: 'Economics', icon: '📈' },
  { time: '10 min', activity: 'Review Biology notes (Cell Division)', subject: 'Biology', icon: '🧬' },
]

const resourcePicks = [
  { title: 'Thermodynamics — Gas Laws Explained',     type: 'Flashcards', subject: 'Physics',   duration: '15 min', page: 'ai-flashcards' },
  { title: 'Economics: Demand & Supply Practice',     type: 'Quiz',       subject: 'Economics', duration: '20 min', page: 'ai-quiz'       },
  { title: 'Past WAEC Maths Questions (2018–2023)',   type: 'Past Questions', subject: 'Maths', duration: '40 min', page: 'ai-exam-prep'  },
  { title: 'Study Chat: Explain Enzyme Action',       type: 'AI Chat',    subject: 'Biology',   duration: '10 min', page: 'ai-chat'       },
]

export default function AIRecommendationsPage({ onNavigate }: Props) {
  return (
    <DashboardLayout
      activePage="ai-tutor"
      onNavigate={onNavigate}
      title="AI Recommendations"
      subtitle="Personalised insights based on your performance"
    >
      <div className="flex flex-col gap-5 max-w-[860px]">

        {/* Hero */}
        <div className="bg-gradient-to-r from-[#4b75ff] to-[#005cf7] rounded-card p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} />
            <p className="text-sm font-semibold opacity-80">AI Learning Intelligence</p>
          </div>
          <p className="text-lg font-bold mb-1">Here's what to focus on today</p>
          <p className="text-sm opacity-75">Based on your quiz scores, study patterns, and upcoming exams</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="text-center">
              <p className="text-xl font-bold">4</p>
              <p className="text-xs opacity-70">Insights</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <p className="text-xl font-bold">45 min</p>
              <p className="text-xs opacity-70">Suggested today</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <p className="text-xl font-bold">73%</p>
              <p className="text-xs opacity-70">Exam readiness</p>
            </div>
          </div>
        </div>

        {/* Insight cards */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Lightbulb size={14} className="text-primary" /> Key Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((ins, i) => (
              <div key={i} className={`rounded-card border p-5 flex flex-col gap-3 ${ins.color}`}>
                <div className="flex items-center gap-2">
                  <div className={`size-8 rounded-full flex items-center justify-center ${ins.iconColor}`}>
                    <Sparkles size={13} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{ins.label}</p>
                    <p className="text-[10px] text-muted">{ins.subject}</p>
                  </div>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{ins.body}</p>
                <button
                  onClick={() => onNavigate(ins.ctaPage)}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  {ins.cta} <ChevronRight size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Today's study plan */}
          <div className="bg-surface rounded-card shadow-sm p-5">
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Clock size={14} className="text-primary" /> Today's Suggested Plan
            </h2>
            <div className="flex flex-col gap-3">
              {todayPlan.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-canvas rounded-card">
                  <span className="text-xl">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.activity}</p>
                    <p className="text-xs text-muted">{item.subject}</p>
                  </div>
                  <span className="text-xs font-bold text-muted bg-surface px-2 py-1 rounded-full shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigate('ai-study-plan')}
              className="mt-4 w-full h-10 bg-primary text-white text-xs font-bold rounded-pill shadow-primary hover:bg-primary-deep transition-colors"
            >
              Open Full Study Plan
            </button>
          </div>

          {/* Resource picks */}
          <div className="bg-surface rounded-card shadow-sm p-5">
            <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <BookOpen size={14} className="text-primary" /> Recommended Resources
            </h2>
            <div className="flex flex-col gap-2">
              {resourcePicks.map((r, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(r.page)}
                  className="flex items-center gap-3 p-3 bg-canvas rounded-card hover:bg-primary/4 transition-colors text-left group"
                >
                  <div className="size-8 rounded-full bg-surface text-primary flex items-center justify-center shrink-0">
                    <Target size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">{r.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted bg-surface px-1.5 py-0.5 rounded-full">{r.type}</span>
                      <span className="text-[10px] text-muted">{r.duration}</span>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-muted group-hover:text-primary shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Subject readiness overview */}
        <div className="bg-surface rounded-card shadow-sm p-5">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <BarChart2 size={14} className="text-primary" /> Subject Readiness
          </h2>
          <div className="flex flex-col gap-3">
            {[
              { subject: 'Mathematics',      pct: 85, color: 'bg-primary'  },
              { subject: 'English Language', pct: 90, color: 'bg-green-500' },
              { subject: 'Physics',          pct: 62, color: 'bg-amber-500' },
              { subject: 'Chemistry',        pct: 70, color: 'bg-purple-500' },
              { subject: 'Biology',          pct: 68, color: 'bg-teal-500'  },
              { subject: 'Economics',        pct: 51, color: 'bg-red-500'   },
            ].map(s => (
              <div key={s.subject}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-foreground">{s.subject}</span>
                  <span className={`font-bold ${s.pct < 60 ? 'text-red-500' : s.pct < 75 ? 'text-amber-600' : 'text-green-600'}`}>{s.pct}%</span>
                </div>
                <div className="h-2 bg-canvas rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
