import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, Download, ArrowLeft, Share2, AlertCircle } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

function fmt(n: number) { return '₦' + n.toLocaleString('en-NG') }

export default function PaymentSuccessPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const [childName,  setChildName]  = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [amount,     setAmount]     = useState(0)
  const [ref,        setRef]        = useState('')
  const [mode,       setMode]       = useState<'paid' | 'pending'>('paid')

  useEffect(() => {
    setAmount(Number(sessionStorage.getItem('learnora_pending_payment_amount') ?? '0'))
    setRef(sessionStorage.getItem('learnora_pending_payment_ref') ?? '')

    const m = sessionStorage.getItem('learnora_payment_mode')
    setMode(m === 'pending' ? 'pending' : 'paid')
    sessionStorage.removeItem('learnora_payment_mode')

    if (profile?.id) loadNames()
  }, [profile?.id])

  async function loadNames() {
    const childId = sessionStorage.getItem('learnora_selected_child')
    if (childId) {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', childId).maybeSingle()
      setChildName((data as { full_name: string | null } | null)?.full_name ?? '')
    }
    if (profile?.school_id) {
      const { data } = await supabase.from('schools').select('name').eq('id', profile.school_id).maybeSingle()
      setSchoolName((data as { name: string | null } | null)?.name ?? '')
    }
  }

  const dateStr = new Date().toLocaleString('en-NG', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })

  // ── Pending / awaiting admin confirmation ──────────────────────────────────
  if (mode === 'pending') {
    return (
      <MobileLayout activePage="parent/home" onNavigate={onNavigate} nav={parentMobileNav}>
        <div className="px-5 pt-6 pb-10 flex flex-col gap-5 min-h-screen">

          <button onClick={() => onNavigate('parent/fees')}
            className="flex items-center gap-1.5 text-sm text-muted w-fit">
            <ArrowLeft size={15} /> Back to fees
          </button>

          <div className="flex flex-col items-center text-center pt-4 pb-2">
            <div className="size-20 rounded-full bg-amber-50 flex items-center justify-center mb-4">
              <Clock size={36} className="text-amber-500" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Transfer Submitted</h1>
            <p className="text-sm text-muted mt-1">Awaiting admin confirmation</p>
            <p className="text-2xl font-bold text-amber-600 mt-3">{fmt(amount)}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-card px-4 py-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Payment Pending Confirmation</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Your transfer has been recorded. A school admin will confirm receipt within 1–2 business days. Your fee status will update automatically once confirmed.
              </p>
            </div>
          </div>

          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-black/6">
              <p className="text-sm font-bold text-foreground">Submission Details</p>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              {[
                { label: 'Date & Time', value: dateStr                },
                { label: 'Method',      value: 'Bank Transfer'        },
                { label: 'Student',     value: childName  || '—'      },
                { label: 'School',      value: schoolName || '—'      },
                { label: 'Amount',      value: fmt(amount)            },
                { label: 'Status',      value: 'Pending Confirmation' },
              ].map(row => (
                <div key={row.label} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-muted shrink-0">{row.label}</span>
                  <span className={`font-semibold text-right ${row.label === 'Status' ? 'text-amber-600' : 'text-foreground'}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => onNavigate('parent/fees')}
              className="h-12 w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors">
              View Fee Status
            </button>
            <button onClick={() => onNavigate('parent/home')}
              className="h-12 w-full text-sm font-semibold text-muted hover:text-foreground transition-colors">
              Back to Home
            </button>
          </div>

        </div>
      </MobileLayout>
    )
  }

  // ── Paid / Paystack success ────────────────────────────────────────────────
  return (
    <MobileLayout activePage="parent/home" onNavigate={onNavigate} nav={parentMobileNav}>
      <div className="px-5 pt-6 pb-10 flex flex-col gap-5 min-h-screen">

        <button onClick={() => onNavigate('parent/fees')}
          className="flex items-center gap-1.5 text-sm text-muted w-fit">
          <ArrowLeft size={15} /> Back to fees
        </button>

        <div className="flex flex-col items-center text-center pt-4 pb-2">
          <div className="size-20 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <CheckCircle2 size={36} className="text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Payment Successful</h1>
          <p className="text-sm text-muted mt-1">Your payment has been received and recorded.</p>
          <p className="text-2xl font-bold text-green-600 mt-3">{fmt(amount)}</p>
        </div>

        <div className="bg-surface rounded-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-black/6 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Receipt</p>
            <span className="text-[10px] font-mono text-muted">{ref}</span>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            {[
              { label: 'Date & Time', value: dateStr              },
              { label: 'Method',      value: 'School Fee Payment' },
              { label: 'Student',     value: childName  || '—'    },
              { label: 'School',      value: schoolName || '—'    },
              { label: 'Amount Paid', value: fmt(amount)          },
            ].map(row => (
              <div key={row.label} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-muted shrink-0">{row.label}</span>
                <span className="font-semibold text-foreground text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button className="h-12 w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors">
            <Download size={15} /> Download Receipt
          </button>
          <button className="h-12 w-full flex items-center justify-center gap-2 border border-black/15 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">
            <Share2 size={15} /> Share Receipt
          </button>
          <button onClick={() => onNavigate('parent/home')}
            className="h-12 w-full text-sm font-semibold text-muted hover:text-foreground transition-colors">
            Back to Home
          </button>
        </div>

      </div>
    </MobileLayout>
  )
}
