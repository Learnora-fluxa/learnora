import { useState } from 'react'
import { FileText, Check, X, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'

type Props = { onNavigate: (page: string) => void }

interface Slip {
  id:          string
  title:       string
  description: string
  dueDate:     string
  status:      'pending' | 'signed' | 'declined'
  urgent:      boolean
  details:     string
}

const initialSlips: Slip[] = [
  {
    id: '1',
    title: 'Science Field Trip — Lagos Science Museum',
    description: 'Permission for SS2A to visit the Lagos Science Museum on Jun 20, 2026.',
    dueDate: 'Jun 14, 2026',
    status: 'pending',
    urgent: true,
    details: 'Date: Friday June 20, 2026\nDeparture: 8:00 AM from school gate\nReturn: 4:00 PM\nCost: ₦3,500 (already billed to your account)\nChaperones: Mr Taiwo, Mrs Okonkwo\n\nPlease sign below to give consent for your child to participate.',
  },
  {
    id: '2',
    title: 'Inter-School Debate Competition',
    description: 'Chidi has been selected to represent the school at the state debate.',
    dueDate: 'Jun 10, 2026',
    status: 'pending',
    urgent: false,
    details: 'Date: Saturday June 14, 2026\nVenue: Government Secondary School, Ikeja\nTransport: School bus provided\n\nChidi was selected based on performance in the English class debate. Please sign to authorise participation.',
  },
  {
    id: '3',
    title: 'Sports Day Photography Consent',
    description: 'Consent for Chidi\'s photo to appear in school publications.',
    dueDate: 'May 30, 2026',
    status: 'signed',
    urgent: false,
    details: 'You have consented for Chidi\'s photograph taken during Sports Day to appear in the school newsletter, website, and social media channels.',
  },
  {
    id: '4',
    title: 'After-School Computer Club',
    description: 'Weekly after-school computer club on Wednesdays 3–5PM.',
    dueDate: 'May 20, 2026',
    status: 'declined',
    urgent: false,
    details: 'You declined this permission slip. Contact the school if you change your mind.',
  },
]

const statusConfig = {
  pending:  { label: 'Pending',  color: 'bg-amber-50 text-amber-700',  icon: Clock },
  signed:   { label: 'Signed',   color: 'bg-green-50 text-green-700',  icon: Check },
  declined: { label: 'Declined', color: 'bg-red-50 text-red-600',      icon: X     },
}

export default function PermissionSlipsPage({ onNavigate }: Props) {
  const [slips,    setSlips]    = useState<Slip[]>(initialSlips)
  const [expanded, setExpanded] = useState<string | null>('1')

  function sign(id: string) {
    setSlips(prev => prev.map(s => s.id === id ? { ...s, status: 'signed' } : s))
  }

  function decline(id: string) {
    setSlips(prev => prev.map(s => s.id === id ? { ...s, status: 'declined' } : s))
  }

  const pending  = slips.filter(s => s.status === 'pending')
  const resolved = slips.filter(s => s.status !== 'pending')

  return (
    <MobileLayout activePage="parent/dashboard" onNavigate={onNavigate} nav={parentMobileNav}>
      <div className="px-4 pt-5 pb-24">
        <h1 className="text-lg font-bold text-foreground mb-1">Permission Slips</h1>
        <p className="text-sm text-muted mb-5">
          {pending.length > 0
            ? `${pending.length} slip${pending.length > 1 ? 's' : ''} awaiting your signature`
            : 'All slips reviewed'}
        </p>

        {/* Pending */}
        {pending.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Action Required</p>
            <div className="flex flex-col gap-3">
              {pending.map(slip => (
                <div key={slip.id} className={`bg-surface rounded-card shadow-sm overflow-hidden border ${slip.urgent ? 'border-amber-200' : 'border-transparent'}`}>
                  <button
                    className="w-full flex items-start gap-3 p-4 text-left"
                    onClick={() => setExpanded(prev => prev === slip.id ? null : slip.id)}
                  >
                    <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${slip.urgent ? 'bg-amber-50 text-amber-600' : 'bg-canvas text-muted'}`}>
                      <FileText size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-foreground leading-snug">{slip.title}</p>
                        {expanded === slip.id ? <ChevronUp size={15} className="text-muted shrink-0 mt-0.5" /> : <ChevronDown size={15} className="text-muted shrink-0 mt-0.5" />}
                      </div>
                      <p className="text-xs text-muted mt-0.5 leading-snug">{slip.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {slip.urgent && <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">URGENT</span>}
                        <span className="text-[10px] text-muted">Due {slip.dueDate}</span>
                      </div>
                    </div>
                  </button>

                  {expanded === slip.id && (
                    <div className="px-4 pb-4">
                      <div className="bg-canvas rounded-card p-3 text-xs text-foreground whitespace-pre-line leading-relaxed mb-4">
                        {slip.details}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => sign(slip.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 h-11 bg-primary text-white text-sm font-bold rounded-full shadow-primary"
                        >
                          <Check size={14} /> I Consent & Sign
                        </button>
                        <button
                          onClick={() => decline(slip.id)}
                          className="h-11 px-4 border border-black/20 text-muted text-sm rounded-full"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolved */}
        {resolved.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Past Slips</p>
            <div className="flex flex-col gap-2">
              {resolved.map(slip => {
                const { label, color, icon: Icon } = statusConfig[slip.status]
                return (
                  <div key={slip.id} className="bg-surface rounded-card shadow-sm flex items-center gap-3 px-4 py-3">
                    <div className="size-8 rounded-full bg-canvas text-muted flex items-center justify-center shrink-0">
                      <FileText size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{slip.title}</p>
                      <p className="text-xs text-muted">Due {slip.dueDate}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${color}`}>
                      <Icon size={10} /> {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
