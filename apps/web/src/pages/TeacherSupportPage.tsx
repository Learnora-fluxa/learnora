import { useState } from 'react'
import { MessageSquare, HelpCircle, FileText, ChevronRight, Send, CheckCircle2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

type Tab = 'faq' | 'contact' | 'messages'

const faqs = [
  { q: 'How do I submit resources for the library?',              a: 'Go to Resources in the sidebar, click "Upload Material", fill in the details and submit. Materials go to admin for approval before students can see them.' },
  { q: 'How do I take attendance?',                              a: 'Navigate to Attendance from the sidebar. Select the class and date, then mark each student as Present, Absent, or Late.' },
  { q: 'How do I enter student grades?',                         a: 'Open the Gradebook from the sidebar. Select the class and subject, then enter scores per category (Assignment, CA Test 1, CA Test 2, Mid-Term, Exam).' },
  { q: 'Can I create classes or assign subjects to myself?',     a: 'No. Classes and subject assignments are managed by the school admin. Contact your admin if a class or subject needs to be updated.' },
  { q: 'How do I message a student or parent?',                  a: 'Use the Messages page. You can filter contacts by Students or Parents and start a conversation from there.' },
  { q: 'How do I start a live class?',                           a: 'Go to Live Classes in the sidebar. Scheduled sessions appear there — click "Start" to begin when it\'s time.' },
]

const adminMessages = [
  { id: 1, from: 'Admin Okafor', initials: 'AO', body: 'Please submit your end-of-term report by June 30th.', time: '2h ago', unread: true  },
  { id: 2, from: 'Admin Okafor', initials: 'AO', body: 'Your resource "Introduction to Calculus" has been approved.', time: 'Yesterday', unread: false },
]

export default function TeacherSupportPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [tab,     setTab]     = useState<Tab>('faq')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [subject, setSubject] = useState('')
  const [body,    setBody]    = useState('')
  const [sent,    setSent]    = useState(false)
  const [msgText, setMsgText] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
    setSubject(''); setBody('')
  }

  const tabs: { id: Tab; label: string; icon: typeof MessageSquare }[] = [
    { id: 'faq',      label: 'FAQs',          icon: HelpCircle     },
    { id: 'messages', label: 'Admin Messages', icon: MessageSquare  },
    { id: 'contact',  label: 'Contact Support',icon: FileText       },
  ]

  return (
    <DashboardLayout
      activePage="teacher-support"
      onNavigate={onNavigate}
      title="Support Centre"
      subtitle="Help, FAQs and communication with admin"
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="max-w-[820px] flex flex-col gap-6">

        {/* Tabs */}
        <div className="flex gap-1 bg-canvas rounded-input p-1 w-fit">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm font-semibold transition-colors ${tab === t.id ? 'bg-surface shadow text-foreground' : 'text-muted hover:text-foreground'}`}
              >
                <Icon size={14} />
                {t.label}
                {t.id === 'messages' && adminMessages.some(m => m.unread) && (
                  <span className="size-2 rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </div>

        {/* FAQ */}
        {tab === 'faq' && (
          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-surface rounded-card shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-canvas/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-foreground">{faq.q}</span>
                  <ChevronRight size={15} className={`text-muted shrink-0 transition-transform ${openFaq === i ? 'rotate-90' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-muted leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Admin Messages */}
        {tab === 'messages' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">Direct messages between you and school admin.</p>
            <div className="flex flex-col gap-3">
              {adminMessages.map(m => (
                <div key={m.id} className={`bg-surface rounded-card shadow-sm p-5 border-l-4 ${m.unread ? 'border-primary' : 'border-transparent'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="size-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{m.initials}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{m.from}</p>
                      <p className="text-xs text-muted">{m.time}</p>
                    </div>
                    {m.unread && <span className="ml-auto text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">New</span>}
                  </div>
                  <p className="text-sm text-muted">{m.body}</p>
                </div>
              ))}
            </div>

            {/* Compose reply */}
            <div className="bg-surface rounded-card shadow-sm p-5">
              <p className="text-sm font-semibold text-foreground mb-3">Message Admin</p>
              <div className="flex gap-2">
                <input
                  value={msgText} onChange={e => setMsgText(e.target.value)}
                  placeholder="Type a message to admin..."
                  className="flex-1 h-10 px-4 border border-black/15 rounded-input text-sm outline-none focus:border-primary"
                  onKeyDown={e => { if (e.key === 'Enter' && msgText.trim()) { setMsgText('') } }}
                />
                <button
                  onClick={() => setMsgText('')}
                  disabled={!msgText.trim()}
                  className="size-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-deep transition-colors disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contact Support */}
        {tab === 'contact' && (
          <div className="bg-surface rounded-card shadow-sm p-6">
            {sent ? (
              <div className="text-center py-8">
                <div className="size-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={24} className="text-green-600" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">Request Submitted</h3>
                <p className="text-sm text-muted mb-6">A support team member will respond within 1 business day.</p>
                <button
                  onClick={() => setSent(false)}
                  className="h-10 px-5 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors"
                >
                  Submit Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <h3 className="text-base font-bold text-foreground">Contact Learnora Support</h3>
                  <p className="text-sm text-muted mt-1">For technical issues, billing, or platform-level questions.</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Subject <span className="text-red-500">*</span></label>
                  <input
                    required value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder="Briefly describe your issue"
                    className="h-11 px-4 border border-black/20 rounded-input text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Message <span className="text-red-500">*</span></label>
                  <textarea
                    required rows={5} value={body} onChange={e => setBody(e.target.value)}
                    placeholder="Describe your issue in detail..."
                    className="px-4 py-3 border border-black/20 rounded-input text-sm outline-none focus:border-primary resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setSubject(''); setBody('') }}
                    className="h-11 px-5 border border-black/15 text-sm font-semibold text-foreground rounded-pill hover:border-primary hover:text-primary transition-colors">
                    Clear
                  </button>
                  <button type="submit"
                    className="flex-1 h-11 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary flex items-center justify-center gap-2">
                    <Send size={14} /> Send Request
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
