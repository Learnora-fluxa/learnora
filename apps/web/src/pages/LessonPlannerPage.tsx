import { useState } from 'react'
import { Plus, Trash2, Save, CheckCircle2, BookOpen, ChevronDown } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

const classes   = ['SS2A', 'SS2B', 'SS1A']
const subjects  = ['Mathematics', 'Physics', 'English Language']
const resources = ['Textbook', 'Worksheet', 'Video', 'Lab equipment', 'Whiteboard', 'Past questions']

interface Objective { id: number; text: string; done: boolean }
interface Lesson {
  id:         number
  week:       string
  class:      string
  subject:    string
  topic:      string
  objectives: Objective[]
  activities: string
  resources:  string[]
  notes:      string
}

const initLessons: Lesson[] = [
  {
    id: 1, week: 'Week 1', class: 'SS2A', subject: 'Mathematics', topic: "Quadratic Equations",
    objectives: [
      { id: 1, text: 'Students can solve quadratics by factorisation', done: true  },
      { id: 2, text: 'Students understand the quadratic formula',       done: false },
      { id: 3, text: 'Students can apply completing the square',        done: false },
    ],
    activities: 'Warm-up: 5 mental maths. Introduce the quadratic formula. Group practice with worksheet. Exit ticket.',
    resources: ['Textbook', 'Worksheet'],
    notes: 'Check prior knowledge of factorisation from last term.',
  },
  {
    id: 2, week: 'Week 2', class: 'SS2A', subject: 'Mathematics', topic: "Trigonometry — Ratios",
    objectives: [
      { id: 4, text: 'Students can define sin, cos, tan',    done: false },
      { id: 5, text: 'Students use SOHCAHTOA correctly',     done: false },
    ],
    activities: 'Introduce right-angle triangle. Derive the ratios. Practice problems in pairs. Homework assigned.',
    resources: ['Textbook', 'Whiteboard'],
    notes: '',
  },
]

export default function LessonPlannerPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [lessons,  setLessons]  = useState<Lesson[]>(initLessons)
  const [expanded, setExpanded] = useState<number | null>(1)
  const [saved,    setSaved]    = useState(false)
  const [filterClass, setFilterClass] = useState('SS2A')

  function toggleObj(lessonId: number, objId: number) {
    setLessons(prev => prev.map(l => l.id !== lessonId ? l : {
      ...l,
      objectives: l.objectives.map(o => o.id === objId ? { ...o, done: !o.done } : o),
    }))
  }

  function addLesson() {
    const newL: Lesson = {
      id: Date.now(), week: `Week ${lessons.length + 1}`, class: filterClass,
      subject: 'Mathematics', topic: 'New Lesson',
      objectives: [], activities: '', resources: [], notes: '',
    }
    setLessons(prev => [...prev, newL])
    setExpanded(newL.id)
  }

  function deleteLesson(id: number) {
    setLessons(prev => prev.filter(l => l.id !== id))
  }

  const visible = lessons.filter(l => l.class === filterClass)

  return (
    <DashboardLayout
      activePage="teacher-dashboard"
      onNavigate={onNavigate}
      title="Lesson Planner"
      subtitle="Plan weekly lessons, objectives and resources"
      nav={[
        { label: 'Dashboard',  icon: BookOpen, page: 'teacher-dashboard' },
        { label: 'My Classes', icon: BookOpen, page: 'classes'           },
        { label: 'Planner',    icon: BookOpen, page: 'lesson-planner'    },
        { label: 'Settings',   icon: BookOpen, page: 'settings'          },
      ]}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-5 max-w-[840px]">

        {/* Class filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            {classes.map(c => (
              <button
                key={c}
                onClick={() => setFilterClass(c)}
                className={`h-9 px-4 rounded-full text-sm font-semibold transition-colors ${filterClass === c ? 'bg-primary text-white shadow-primary' : 'bg-surface text-muted shadow-sm'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {saved && <span className="flex items-center gap-1 text-sm text-green-600 font-semibold"><CheckCircle2 size={13} /> Saved</span>}
            <button
              onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }}
              className="flex items-center gap-2 h-9 px-4 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors"
            >
              <Save size={13} /> Save Plan
            </button>
          </div>
        </div>

        {/* Lesson cards */}
        <div className="flex flex-col gap-3">
          {visible.map(lesson => {
            const open    = expanded === lesson.id
            const doneObj = lesson.objectives.filter(o => o.done).length
            return (
              <div key={lesson.id} className="bg-surface rounded-card shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpanded(open ? null : lesson.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-canvas/50 transition-colors"
                >
                  <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <BookOpen size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{lesson.topic}</p>
                    <p className="text-xs text-muted">{lesson.week} · {lesson.subject} · {lesson.class}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {lesson.objectives.length > 0 && (
                      <span className="text-xs text-muted">{doneObj}/{lesson.objectives.length} objectives</span>
                    )}
                    <ChevronDown size={15} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {open && (
                  <div className="px-5 pb-5 flex flex-col gap-4 border-t border-black/6">

                    {/* Topic + subject */}
                    <div className="grid grid-cols-2 gap-3 pt-4">
                      <div>
                        <label className="text-xs font-semibold text-muted mb-1 block">Topic</label>
                        <input
                          value={lesson.topic}
                          onChange={e => setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, topic: e.target.value } : l))}
                          className="w-full h-9 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted mb-1 block">Subject</label>
                        <select
                          value={lesson.subject}
                          onChange={e => setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, subject: e.target.value } : l))}
                          className="w-full h-9 px-3 border border-black/20 rounded-card text-sm outline-none focus:border-primary"
                        >
                          {subjects.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Objectives */}
                    <div>
                      <p className="text-xs font-bold text-muted mb-2">Learning Objectives</p>
                      <div className="flex flex-col gap-1.5">
                        {lesson.objectives.map(obj => (
                          <label key={obj.id} className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={obj.done}
                              onChange={() => toggleObj(lesson.id, obj.id)}
                              className="accent-primary"
                            />
                            <span className={`text-sm ${obj.done ? 'line-through text-muted' : 'text-foreground'}`}>{obj.text}</span>
                          </label>
                        ))}
                        <button
                          onClick={() => setLessons(prev => prev.map(l => l.id !== lesson.id ? l : {
                            ...l, objectives: [...l.objectives, { id: Date.now(), text: 'New objective', done: false }]
                          }))}
                          className="flex items-center gap-1.5 text-xs text-primary font-semibold mt-1 hover:underline"
                        >
                          <Plus size={11} /> Add objective
                        </button>
                      </div>
                    </div>

                    {/* Activities */}
                    <div>
                      <label className="text-xs font-bold text-muted mb-1 block">Lesson Activities</label>
                      <textarea
                        value={lesson.activities}
                        onChange={e => setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, activities: e.target.value } : l))}
                        rows={3}
                        className="w-full resize-none border border-black/20 rounded-card p-3 text-sm outline-none focus:border-primary"
                      />
                    </div>

                    {/* Resources */}
                    <div>
                      <p className="text-xs font-bold text-muted mb-2">Resources Needed</p>
                      <div className="flex flex-wrap gap-2">
                        {resources.map(r => {
                          const active = lesson.resources.includes(r)
                          return (
                            <button
                              key={r}
                              onClick={() => setLessons(prev => prev.map(l => l.id !== lesson.id ? l : {
                                ...l, resources: active ? l.resources.filter(x => x !== r) : [...l.resources, r]
                              }))}
                              className={`h-7 px-3 rounded-full text-xs font-semibold transition-colors border ${active ? 'bg-primary text-white border-primary' : 'border-black/20 text-muted hover:text-foreground'}`}
                            >
                              {r}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <button
                        onClick={() => deleteLesson(lesson.id)}
                        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-semibold"
                      >
                        <Trash2 size={12} /> Delete lesson
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <button
            onClick={addLesson}
            className="flex items-center justify-center gap-2 h-11 border-2 border-dashed border-black/20 rounded-card text-sm text-muted hover:border-primary hover:text-primary transition-colors"
          >
            <Plus size={16} /> Add new lesson
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
