import { useState } from 'react'
import { Plus, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'

type Props = { onNavigate: (page: string) => void }

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Block {
  id:       number
  subject:  string
  topic:    string
  time:     string
  duration: number
  done:     boolean
  color:    string
}

type Week = Record<string, Block[]>

const subjectColors: Record<string, string> = {
  Mathematics:      'bg-primary/10 text-primary border-primary/20',
  Physics:          'bg-amber-50 text-amber-700 border-amber-200',
  Chemistry:        'bg-red-50 text-red-600 border-red-200',
  Biology:          'bg-purple-50 text-purple-700 border-purple-200',
  English:          'bg-green-50 text-green-700 border-green-200',
  Economics:        'bg-teal-50 text-teal-700 border-teal-200',
  'AI Tutor':       'bg-canvas text-muted border-black/15',
}

const subjects = Object.keys(subjectColors)

const initialWeek: Week = {
  Mon: [
    { id: 1, subject: 'Mathematics', topic: 'Quadratic Equations',  time: '16:00', duration: 60, done: true,  color: subjectColors.Mathematics },
    { id: 2, subject: 'Physics',     topic: 'Thermodynamics',        time: '17:30', duration: 45, done: false, color: subjectColors.Physics },
  ],
  Tue: [
    { id: 3, subject: 'English',     topic: 'Essay Writing Practice', time: '15:30', duration: 50, done: false, color: subjectColors.English },
    { id: 4, subject: 'Chemistry',   topic: 'Organic Chemistry',      time: '17:00', duration: 60, done: false, color: subjectColors.Chemistry },
  ],
  Wed: [
    { id: 5, subject: 'Biology',     topic: 'Cell Division',          time: '16:00', duration: 45, done: false, color: subjectColors.Biology },
    { id: 6, subject: 'AI Tutor',    topic: 'Physics past questions',  time: '18:00', duration: 30, done: false, color: subjectColors['AI Tutor'] },
  ],
  Thu: [
    { id: 7, subject: 'Economics',   topic: 'Supply & Demand',        time: '16:00', duration: 60, done: false, color: subjectColors.Economics },
    { id: 8, subject: 'Mathematics', topic: 'Trigonometry',            time: '17:30', duration: 45, done: false, color: subjectColors.Mathematics },
  ],
  Fri: [
    { id: 9, subject: 'Chemistry',   topic: 'Titration',              time: '16:00', duration: 45, done: false, color: subjectColors.Chemistry },
  ],
  Sat: [
    { id: 10, subject: 'Physics',    topic: 'Mock Paper Revision',    time: '10:00', duration: 90, done: false, color: subjectColors.Physics },
    { id: 11, subject: 'Biology',    topic: 'Enzymes & Reactions',    time: '14:00', duration: 60, done: false, color: subjectColors.Biology },
  ],
  Sun: [],
}

export default function StudyPlannerPage({ onNavigate }: Props) {
  const [week,      setWeek]      = useState<Week>(initialWeek)
  const [activeDay, setActiveDay] = useState('Mon')
  const [adding,    setAdding]    = useState(false)
  const [form,      setForm]      = useState({ subject: 'Mathematics', topic: '', time: '16:00', duration: 60 })

  const allBlocks  = Object.values(week).flat()
  const doneBlocks = allBlocks.filter(b => b.done)
  const totalMins  = allBlocks.reduce((s, b) => s + b.duration, 0)
  const doneMins   = doneBlocks.reduce((s, b) => s + b.duration, 0)
  const pct        = totalMins > 0 ? Math.round((doneMins / totalMins) * 100) : 0

  function toggleDone(id: number) {
    setWeek(prev => {
      const updated = { ...prev }
      for (const day of Object.keys(updated)) {
        updated[day] = updated[day].map(b => b.id === id ? { ...b, done: !b.done } : b)
      }
      return updated
    })
  }

  function deleteBlock(day: string, id: number) {
    setWeek(prev => ({ ...prev, [day]: prev[day].filter(b => b.id !== id) }))
  }

  function addBlock() {
    if (!form.topic.trim()) return
    const newBlock: Block = {
      id:       Date.now(),
      subject:  form.subject,
      topic:    form.topic,
      time:     form.time,
      duration: form.duration,
      done:     false,
      color:    subjectColors[form.subject] ?? 'bg-canvas text-muted border-black/15',
    }
    setWeek(prev => ({ ...prev, [activeDay]: [...prev[activeDay], newBlock] }))
    setForm({ subject: 'Mathematics', topic: '', time: '16:00', duration: 60 })
    setAdding(false)
  }

  const dayBlocks = week[activeDay] ?? []

  return (
    <DashboardLayout
      activePage="calendar"
      onNavigate={onNavigate}
      title="Study Planner"
      subtitle="Plan and track your weekly study sessions"
    >
      <div className="flex flex-col gap-5 max-w-[860px]">

        {/* Progress */}
        <div className="bg-surface rounded-card shadow-sm p-5 flex items-center gap-5">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-bold text-foreground">Weekly Progress</span>
              <span className="text-muted">{doneMins} / {totalMins} min · {doneBlocks.length}/{allBlocks.length} sessions</span>
            </div>
            <div className="h-2.5 bg-canvas rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="text-center shrink-0">
            <p className="text-2xl font-bold text-primary">{pct}%</p>
            <p className="text-xs text-muted">complete</p>
          </div>
        </div>

        {/* Day tabs */}
        <div className="flex gap-2">
          {days.map(d => (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              className={`flex-1 flex flex-col items-center py-2 rounded-xl text-xs font-semibold transition-colors ${activeDay === d ? 'bg-primary text-white' : 'bg-surface text-muted shadow-sm hover:text-foreground'}`}
            >
              <span>{d}</span>
              {week[d].length > 0 && (
                <span className={`size-1.5 rounded-full mt-1 ${activeDay === d ? 'bg-white/60' : 'bg-primary'}`} />
              )}
            </button>
          ))}
        </div>

        {/* Day blocks */}
        <div className="flex flex-col gap-3">
          {dayBlocks.length === 0 && !adding && (
            <div className="text-center py-10 text-muted bg-surface rounded-card shadow-sm">
              <Clock size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No study sessions for {activeDay}. Add one below.</p>
            </div>
          )}
          {dayBlocks.map(block => (
            <div key={block.id} className={`flex items-center gap-4 p-4 rounded-card border ${block.color} ${block.done ? 'opacity-60' : ''}`}>
              <button onClick={() => toggleDone(block.id)} className="shrink-0">
                {block.done
                  ? <CheckCircle2 size={20} className="text-green-500" />
                  : <Circle size={20} className="text-muted" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${block.done ? 'line-through' : ''}`}>{block.topic}</p>
                <p className="text-xs opacity-70 mt-0.5">{block.subject}</p>
              </div>
              <div className="text-xs text-right shrink-0">
                <p className="font-semibold">{block.time}</p>
                <p className="opacity-70">{block.duration} min</p>
              </div>
              <button onClick={() => deleteBlock(activeDay, block.id)} className="shrink-0 opacity-40 hover:opacity-100 hover:text-red-500 transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {/* Add form */}
          {adding ? (
            <div className="bg-surface rounded-card shadow-sm p-4 flex flex-col gap-3 border-2 border-primary/20">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted mb-1 block">Subject</label>
                  <select
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full h-9 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
                  >
                    {subjects.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted mb-1 block">Time</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full h-9 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted mb-1 block">Topic</label>
                <input
                  value={form.topic}
                  onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="What will you study?"
                  className="w-full h-9 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setAdding(false)} className="h-8 px-4 text-sm text-muted hover:text-foreground">Cancel</button>
                <button onClick={addBlock} className="h-8 px-4 bg-primary text-white text-sm font-bold rounded-pill shadow-primary hover:bg-primary-deep transition-colors">Add</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center justify-center gap-2 h-11 border-2 border-dashed border-black/20 rounded-card text-sm text-muted hover:border-primary hover:text-primary transition-colors"
            >
              <Plus size={16} /> Add study session
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
