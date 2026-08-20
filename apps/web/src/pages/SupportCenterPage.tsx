import { MessageSquare, AlertTriangle, BookOpen, Lightbulb, ChevronDown, Search } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav } from '../components/layout/Sidebar'
import { useState } from 'react'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

const supportCards = [
  {
    title: 'Need Assistance?',
    desc: 'Get help from the Learnora support team.',
    icon: MessageSquare,
    color: 'bg-primary/10 text-primary',
    action: 'Contact Support',
  },
  {
    title: 'Report an Issue',
    desc: 'Experiencing a technical problem? Let us know.',
    icon: AlertTriangle,
    color: 'bg-red-50 text-red-600',
    action: 'Report Now',
  },
  {
    title: 'User Guides',
    desc: 'Explore tutorials and platform documentation.',
    icon: BookOpen,
    color: 'bg-green-50 text-green-700',
    action: 'Browse Guides',
  },
  {
    title: 'Feature Requests',
    desc: 'Share suggestions and improvements.',
    icon: Lightbulb,
    color: 'bg-amber-50 text-amber-700',
    action: 'Submit Request',
  },
]

const faqs = [
  { q: 'How do I create a new assignment?',            a: 'Go to Assignments → New Assignment, fill in the details and click Create. You can set deadlines, attach files, and assign to specific classes.' },
  { q: 'How do I mark attendance for my class?',       a: 'Navigate to Attendance in the sidebar, select your class and date, then mark each student as Present, Absent, or Late.' },
  { q: 'Can I export student grades to a spreadsheet?', a: 'Yes. From the Gradebook page, click Export → Download as Excel or CSV. All scores and computed averages will be included.' },
  { q: 'How does the AI grading assistant work?',      a: 'When you open a submitted assignment, click "AI Review" to have Learnova AI analyse the submission and suggest grades based on your rubric.' },
  { q: 'How do I schedule a live class?',              a: 'Go to Live Classes → Schedule Class, pick a date and time, add the class link, and your students will be notified automatically.' },
]

export default function SupportCenterPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <DashboardLayout
      activePage="support"
      onNavigate={onNavigate}
      title="Support Center"
      subtitle="Get help, access resources, report issues, and find answers to common questions."
      nav={teacherNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-6 max-w-[1300px]">

        {/* Quick support cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {supportCards.map(card => {
            const Icon = card.icon
            return (
              <div key={card.title} className="bg-surface rounded-card shadow-sm p-5 flex flex-col gap-3">
                <div className={`size-10 rounded-card flex items-center justify-center ${card.color}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{card.title}</p>
                  <p className="text-xs text-muted mt-0.5 leading-snug">{card.desc}</p>
                </div>
                <button className="mt-auto h-9 px-4 bg-canvas border border-black/8 rounded-input text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors">
                  {card.action}
                </button>
              </div>
            )
          })}
        </div>

        {/* Search */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <h3 className="text-base font-bold text-foreground mb-4">Search Knowledge Base</h3>
          <div className="flex items-center gap-2.5 h-11 px-4 bg-canvas border border-black/8 rounded-input max-w-lg">
            <Search size={15} className="text-muted shrink-0" />
            <input
              type="search"
              placeholder="Search for help articles, guides…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
            />
          </div>
        </div>

        {/* FAQ section */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-black/6">
            <h3 className="text-base font-bold text-foreground">Frequently Asked Questions</h3>
          </div>
          <div className="divide-y divide-black/4">
            {faqs.map((faq, i) => (
              <div key={i}>
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-canvas/40 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span className="text-sm font-semibold text-foreground pr-4">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-muted shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-muted leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact footer */}
        <div className="bg-gradient-to-r from-primary to-primary-deep rounded-card p-6 text-white">
          <h3 className="text-base font-bold mb-1">Still need help?</h3>
          <p className="text-sm text-white/80 mb-4">Our support team is available Monday–Friday, 9 AM – 6 PM WAT.</p>
          <div className="flex flex-wrap gap-3">
            <button className="h-9 px-4 bg-white text-primary text-xs font-bold rounded-input hover:bg-white/90 transition-colors">
              Email Support
            </button>
            <button className="h-9 px-4 bg-white/20 text-white text-xs font-semibold rounded-input hover:bg-white/30 transition-colors border border-white/30">
              Live Chat
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
