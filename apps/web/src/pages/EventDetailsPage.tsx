import { ChevronLeft, Calendar, Clock, MapPin, Users, Bell } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'

type Props = { onNavigate: (page: string) => void }

export default function EventDetailsPage({ onNavigate }: Props) {
  return (
    <DashboardLayout
      activePage="calendar"
      onNavigate={onNavigate}
      title="Event Details"
      subtitle="Academic Calendar"
    >
      <div className="max-w-[720px] flex flex-col gap-6">

        <button onClick={() => onNavigate('calendar')} className="flex items-center gap-2 text-sm text-muted hover:text-foreground w-fit">
          <ChevronLeft size={16} /> Back to Calendar
        </button>

        {/* Event card */}
        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          {/* Color bar */}
          <div className="h-2 bg-primary" />
          <div className="p-8">

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">Examination</span>
                <h1 className="text-2xl font-bold text-foreground mt-3">Second Term Mathematics Examination</h1>
              </div>
              <button className="flex items-center gap-1.5 h-9 px-3 border border-black/15 rounded-full text-xs font-semibold text-muted hover:text-primary hover:border-primary transition-colors shrink-0">
                <Bell size={12} /> Remind me
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[
                { icon: Calendar,  label: 'Date',     value: 'Monday, June 15, 2026' },
                { icon: Clock,     label: 'Time',     value: '9:00 AM – 11:00 AM (2 hours)' },
                { icon: MapPin,    label: 'Venue',    value: 'Main Examination Hall' },
                { icon: Users,     label: 'Audience', value: 'SS1A · SS1B · SS2A' },
              ].map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-start gap-3 bg-canvas/60 rounded-card p-4">
                    <Icon size={16} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{item.value}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mb-8">
              <h2 className="text-base font-bold text-foreground mb-3">Description</h2>
              <p className="text-sm text-muted leading-relaxed">
                The second-term Mathematics examination will cover topics from Modules 1–3: Introduction, Algebra, and Geometry.
                Students are advised to review their notes and past assignments. No electronic devices are permitted in the examination hall.
                Students must be seated by 8:45 AM.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-base font-bold text-foreground mb-3">Topics Covered</h2>
              <ul className="list-disc list-inside flex flex-col gap-2 text-sm text-foreground">
                {['Linear Equations & Inequalities', 'Simultaneous Equations', 'Quadratic Equations', 'Coordinate Geometry', 'Trigonometry Basics'].map(t => (
                  <li key={t} className="text-muted">{t}</li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button onClick={() => onNavigate('assignments')} className="h-11 px-5 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors shadow-primary">
                View Related Assignments
              </button>
              <button onClick={() => onNavigate('messages')} className="h-11 px-5 border border-black/20 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
                Ask Teacher
              </button>
            </div>

          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
