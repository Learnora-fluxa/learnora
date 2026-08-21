import { useState } from 'react'
import { Menu, X, GraduationCap, Users, Building2 } from 'lucide-react'

type Props = { onNavigate: (page: string) => void }

const featureCards = [
  {
    Icon: GraduationCap,
    title: 'Personalized Learning',
    desc: 'Students receive resources tailored to their academic needs and learning pace.',
  },
  {
    Icon: Users,
    title: 'Parent Engagement',
    desc: 'Parents stay updated with performance reports, attendance, and school activities.',
  },
  {
    Icon: Building2,
    title: 'School Management',
    desc: 'Schools simplify administration, communication, and fee management.',
  },
]

const steps = [
  { num: '01', title: 'Create an Account',    desc: 'Sign up as a student, parent, or school.' },
  { num: '02', title: 'Connect Your School',  desc: 'Link your profile with your institution.' },
  { num: '03', title: 'Start Learning',       desc: 'Access educational resources, tests, and learning tools.' },
  { num: '04', title: 'Track Progress',       desc: 'Monitor performance and achieve academic goals.' },
]

const studentChecklist = [
  'Practice Tests',
  'WAEC & JAMB Preparation',
  'Learning Resources',
  'Revision Zone',
  'Performance Tracking',
  'AI Learning Assistant',
]

const connectedChecklist = [
  'Fee Payment Updates',
  'Attendance Monitoring',
  'Academic Reports',
  'School Notifications',
  'Progress Tracking',
]

const aiChecklist = [
  'Subject-Based Learning Support',
  'WAEC & JAMB Guidance',
  'Instant Explanations',
  'Study Recommendations',
  'Available 24/7',
]

const testimonials = [
  {
    name: 'Olive .P. Ashuma',
    role: 'Business man',
    quote: 'Learnora helped me prepare for my exams with confidence.',
  },
  {
    name: 'Toby Alderweild',
    role: 'Business man',
    quote: "'I can easily monitor my child's academic progress.",
  },
  {
    name: 'Favour Oshobugie',
    role: 'School Administrator',
    quote: 'The platform has simplified our school operations.',
  },
]

const stats = [
  { num: '10,000+',  label: 'Students Learning'   },
  { num: '500+',     label: 'Schools Connected'    },
  { num: '50,000+',  label: 'Resources Accessed'   },
  { num: '95%',      label: 'User Satisfaction'    },
]

export default function LandingPage({ onNavigate }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ─── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/6">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm leading-none">L</span>
            </div>
            <span className="text-base font-bold text-foreground">Learnora</span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm font-medium text-primary border-b-2 border-primary pb-0.5">
              Home
            </a>
            <a href="#features" className="text-sm font-medium text-muted hover:text-foreground transition-colors">
              Solutions
            </a>
            <a href="#about" className="text-sm font-medium text-muted hover:text-foreground transition-colors">
              About
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-muted hover:text-foreground"
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-black/6 px-6 py-5 flex flex-col gap-5">
            <a href="#"          className="text-sm font-medium text-primary">Home</a>
            <a href="#features"  className="text-sm font-medium text-muted" onClick={() => setMenuOpen(false)}>Solutions</a>
            <a href="#about"     className="text-sm font-medium text-muted" onClick={() => setMenuOpen(false)}>About</a>
          </div>
        )}
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-0 bg-white">
        {/* Text block — centered */}
        <div className="max-w-3xl mx-auto px-6 text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-5">
            Empowering Smarter Learning<br className="hidden sm:block" /> for Every Student
          </h1>
          <p className="text-base md:text-lg text-muted leading-relaxed mb-8">
            Learnora helps students learn better, parents stay informed, and schools
            manage educational experiences seamlessly—all in one platform.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => onNavigate('school-signup')}
              className="h-11 px-8 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors"
            >
              Get Started
            </button>
            <button className="h-11 px-8 border border-foreground/25 text-foreground text-sm font-semibold rounded-pill hover:bg-black/4 transition-colors">
              Book a Demo
            </button>
          </div>
        </div>

        {/* Dashboard preview image */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-black/8">
            <img
              src="/images/dashboard-preview.png"
              alt="Learnora dashboard"
              className="w-full block"
            />
          </div>
        </div>
      </section>

      {/* ─── Why Choose Learnora? ─────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Why Choose Learnora?</h2>
            <p className="text-base text-muted">Built to make learning simpler, smarter, and more effective.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {featureCards.map(({ Icon, title, desc }) => (
              <div key={title} className="bg-white border border-black/8 rounded-2xl p-7 text-center">
                <div className="size-14 rounded-full bg-primary mx-auto mb-5 flex items-center justify-center">
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works (process steps) ────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-base text-muted">Getting started takes only a few simple steps.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
            {steps.map(s => (
              <div key={s.num} className="text-center">
                <p className="text-[80px] md:text-[96px] font-extrabold leading-none text-gray-200 mb-3 select-none">
                  {s.num}
                </p>
                <h3 className="text-sm font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Everything Students Need to Succeed ─────────────────────────────── */}
      <section className="py-20 bg-[#4b75ff]">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-white order-2 lg:order-1">
            <h2 className="text-3xl md:text-4xl font-bold mb-5 leading-tight">
              Everything Students Need to Succeed
            </h2>
            <p className="text-base text-white/80 mb-8 leading-relaxed">
              Learn smarter with tools designed to improve understanding and academic performance.
            </p>
            <ul className="flex flex-col gap-3">
              {studentChecklist.map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-white/90">
                  <span className="font-bold text-white text-base leading-none">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center order-1 lg:order-2">
            <img
              src="/images/phone-student.png"
              alt="Student using Learnora"
              className="w-56 sm:w-72 lg:w-80 drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ─── Stay Connected to Your Child's Education ────────────────────────── */}
      <section className="py-20 bg-[#0d2060]">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-5 leading-tight">
              Stay Connected to Your Child's Education
            </h2>
            <p className="text-base text-white/80 mb-8 leading-relaxed">
              Monitor academic performance and stay informed from anywhere.
            </p>
            <ul className="flex flex-col gap-3">
              {connectedChecklist.map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-white/90">
                  <span className="font-bold text-white text-base leading-none">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            <img
              src="/images/phone-parent.png"
              alt="Parent staying connected via Learnora"
              className="w-56 sm:w-72 lg:w-80 drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ─── Helping Schools Operate Better ──────────────────────────────────── */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Helping Schools Operate Better</h2>
            <p className="text-base text-muted">Manage school operations efficiently while improving educational outcomes.</p>
          </div>

          {/* 6 cards = featureCards repeated twice — matches design exactly */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[...featureCards, ...featureCards].map(({ Icon, title, desc }, i) => (
              <div key={i} className="bg-white border border-black/8 rounded-2xl p-7 text-center">
                <div className="size-14 rounded-full bg-primary mx-auto mb-5 flex items-center justify-center">
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Meet Learnora AI ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#4b75ff]">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-white order-2 lg:order-1">
            <h2 className="text-3xl md:text-4xl font-bold mb-5 leading-tight">Meet Learnora AI</h2>
            <p className="text-base text-white/80 mb-8 leading-relaxed">
              An intelligent educational assistant designed to help students understand concepts, solve problems, and learn with confidence.
            </p>
            <ul className="flex flex-col gap-3 mb-8">
              {aiChecklist.map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-white/90">
                  <span className="font-bold text-white text-base leading-none">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <button className="h-10 px-6 border border-white text-white text-sm font-semibold rounded-pill hover:bg-white/10 transition-colors">
              Try Learnora AI
            </button>
          </div>
          <div className="flex justify-center order-1 lg:order-2">
            <img
              src="/images/ai-robot.png"
              alt="Learnora AI assistant"
              className="w-56 sm:w-72 lg:w-80 drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ─── What Our Users Say ───────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">What Our Users Say</h2>
            <p className="text-base text-muted">Here are what our users are saying</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="bg-white border border-black/8 rounded-2xl p-7 text-center">
                {/* Gray circle avatar — matches design (no photo) */}
                <div className="size-14 rounded-full bg-gray-300 mx-auto mb-5" />
                <h3 className="text-sm font-bold text-foreground mb-1">{t.name}</h3>
                <p className="text-xs text-muted mb-4">{t.role}</p>
                <p className="text-sm text-muted leading-relaxed">{t.quote}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works (stats) ─────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-base text-muted">Getting started takes only a few simple steps.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {stats.map(s => (
              <div key={s.label} className="border border-black/8 rounded-2xl py-8 px-4 flex flex-col items-center gap-4">
                <div className="size-16 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-extrabold text-center leading-tight px-1">{s.num}</span>
                </div>
                <p className="text-sm font-semibold text-foreground text-center">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Ready to Transform Learning? ────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-[#0a1428] via-[#0d2060] to-[#0a2840]">
        <div className="max-w-2xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-5">Ready to Transform Learning?</h2>
          <p className="text-base text-white/70 mb-10 leading-relaxed">
            Join students, parents, and schools already building a smarter educational future with Learnora.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => onNavigate('school-signup')}
              className="h-11 px-8 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors"
            >
              Get Started
            </button>
            <button className="h-11 px-8 border border-white/40 text-white text-sm font-semibold rounded-pill hover:bg-white/10 transition-colors">
              Schedule a Demo
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-[#06102a] py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs leading-none">L</span>
            </div>
            <span className="text-white font-bold text-base">Learnora</span>
          </div>
          <p className="text-xs text-white/35">© 2026 Learnora. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
