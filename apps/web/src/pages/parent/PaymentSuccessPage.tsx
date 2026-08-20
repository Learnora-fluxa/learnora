import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, Download, ArrowLeft, Share2, AlertCircle } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { parentNav } from '../../components/layout/Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { getParentPaymentContext } from '../../lib/financeApi'

type Props = { onNavigate: (page: string) => void }

function fmt(n: number) { return '₦' + n.toLocaleString('en-NG') }
function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export default function PaymentSuccessPage({ onNavigate }: Props) {
  const { session, profile } = useAuth()
  const [childName, setChildName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [amount, setAmount] = useState(0)
  const [ref, setRef] = useState('')
  const [mode, setMode] = useState<'paid' | 'pending'>('paid')
  const [actionMessage, setActionMessage] = useState('')
  const [busyAction, setBusyAction] = useState<'download' | 'share' | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const refFromQuery = params.get('reference') ?? params.get('trxref') ?? ''
    const storedRef = sessionStorage.getItem('learnora_pending_payment_ref') ?? ''
    const resolvedRef = refFromQuery || storedRef

    setAmount(Number(sessionStorage.getItem('learnora_pending_payment_amount') ?? '0'))
    setRef(resolvedRef)
    if (resolvedRef) {
      sessionStorage.setItem('learnora_pending_payment_ref', resolvedRef)
    }

    const modeFromStorage = sessionStorage.getItem('learnora_payment_mode')
    setMode(modeFromStorage === 'pending' ? 'pending' : 'paid')
    sessionStorage.removeItem('learnora_payment_mode')

    if (session) void loadNames()
  }, [session])

  async function loadNames() {
    const childId = sessionStorage.getItem('learnora_selected_child')
    if (!session) return
    const data = await getParentPaymentContext(session, childId)
    setChildName(data.childName ?? '')
    setSchoolName(data.schoolName ?? '')
    if (data.childId) {
      sessionStorage.setItem('learnora_selected_child', data.childId)
    }
  }

  const dateStr = useMemo(() => new Date().toLocaleString('en-NG', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }), [])

  const userName = profile?.full_name ?? 'Parent User'
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'P'

  const rows = mode === 'pending'
    ? [
        { label: 'Date & Time', value: dateStr },
        { label: 'Method', value: 'Bank Transfer' },
        { label: 'Student', value: childName || '—' },
        { label: 'School', value: schoolName || '—' },
        { label: 'Amount', value: fmt(amount) },
        { label: 'Status', value: 'Pending Confirmation' },
      ]
    : [
        { label: 'Date & Time', value: dateStr },
        { label: 'Method', value: 'School Fee Payment' },
        { label: 'Student', value: childName || '—' },
        { label: 'School', value: schoolName || '—' },
        { label: 'Amount Paid', value: fmt(amount) },
        { label: 'Reference', value: ref || '—' },
      ]

  const receiptText = useMemo(() => {
    const heading = mode === 'pending' ? 'Learnora Payment Submission' : 'Learnora Payment Receipt'
    const method = mode === 'pending' ? 'Bank Transfer' : 'Paystack via Learnora'
    const status = mode === 'pending' ? 'Pending Confirmation' : 'Paid'

    return [
      heading,
      '==============================',
      `Date & Time: ${dateStr}`,
      `Student: ${childName || '—'}`,
      `School: ${schoolName || '—'}`,
      `Amount: ${fmt(amount)}`,
      `Status: ${status}`,
      `Reference: ${ref || '—'}`,
      `Method: ${method}`,
    ].join('\n')
  }, [amount, childName, dateStr, mode, ref, schoolName])

  const receiptFilename = useMemo(() => {
    const safeReference = (ref || `learnora-${Date.now()}`)
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
    return `${mode === 'pending' ? 'submission' : 'receipt'}-${safeReference}.pdf`
  }, [mode, ref])

  const printableReceiptHtml = useMemo(() => {
    const statusLabel = mode === 'pending' ? 'Pending Confirmation' : 'Paid'
    const accentColor = mode === 'pending' ? '#d97706' : '#16a34a'
    const accentBackground = mode === 'pending' ? '#fff7ed' : '#f0fdf4'
    const heading = mode === 'pending' ? 'Payment Submission' : 'Payment Receipt'
    const subtitle = mode === 'pending'
      ? 'Awaiting school confirmation'
      : 'Payment received successfully'
    const rowsMarkup = rows.map(row => `
      <div class="row">
        <span class="label">${escapeHtml(row.label)}</span>
        <span class="value ${row.label === 'Status' ? 'status' : ''}">${escapeHtml(row.value)}</span>
      </div>
    `).join('')

    return `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(receiptFilename)}</title>
          <style>
            :root {
              color-scheme: light;
              --primary: #4b75ff;
              --primary-deep: #005cf7;
              --foreground: #1e1e1e;
              --muted: #5f6575;
              --border: rgba(30, 30, 30, 0.10);
              --canvas: #f4f6fb;
              --surface: #ffffff;
            }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              color: var(--foreground);
              background: linear-gradient(180deg, #eff4ff 0%, var(--canvas) 42%, #eefaf8 100%);
            }
            .page {
              min-height: 100vh;
              padding: 40px 20px;
            }
            .sheet {
              max-width: 760px;
              margin: 0 auto;
              background: var(--surface);
              border-radius: 28px;
              overflow: hidden;
              box-shadow: 0 24px 70px rgba(26, 45, 107, 0.12);
              border: 1px solid rgba(75, 117, 255, 0.08);
            }
            .hero {
              padding: 32px 32px 26px;
              background:
                radial-gradient(circle at top right, rgba(0, 204, 255, 0.24), transparent 36%),
                linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%);
              color: white;
            }
            .brand {
              display: inline-flex;
              align-items: center;
              gap: 10px;
              padding: 8px 14px;
              border-radius: 999px;
              background: rgba(255, 255, 255, 0.16);
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
            }
            .hero h1 {
              margin: 18px 0 6px;
              font-size: 32px;
              line-height: 1.05;
            }
            .hero p {
              margin: 0;
              color: rgba(255, 255, 255, 0.84);
              font-size: 15px;
            }
            .hero .amount {
              margin-top: 22px;
              font-size: 34px;
              font-weight: 800;
              letter-spacing: -0.03em;
            }
            .body {
              padding: 28px 32px 34px;
            }
            .summary {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              padding: 18px 20px;
              border-radius: 20px;
              background: ${accentBackground};
              border: 1px solid ${mode === 'pending' ? '#fed7aa' : '#bbf7d0'};
            }
            .summary .status-title {
              margin: 0 0 4px;
              font-size: 12px;
              font-weight: 700;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: ${accentColor};
            }
            .summary .status-copy {
              margin: 0;
              font-size: 14px;
              color: #4b5563;
            }
            .status-pill {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-width: 128px;
              padding: 10px 18px;
              border-radius: 999px;
              background: white;
              color: ${accentColor};
              font-size: 13px;
              font-weight: 800;
              border: 1px solid rgba(0, 0, 0, 0.05);
            }
            .card {
              margin-top: 22px;
              border: 1px solid var(--border);
              border-radius: 24px;
              overflow: hidden;
            }
            .card-head {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              align-items: center;
              padding: 18px 22px;
              border-bottom: 1px solid var(--border);
              background: rgba(75, 117, 255, 0.04);
            }
            .card-head .title {
              margin: 0;
              font-size: 16px;
              font-weight: 800;
            }
            .card-head .reference {
              font-size: 12px;
              color: var(--muted);
              font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            }
            .card-body {
              padding: 10px 22px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              padding: 16px 0;
              border-bottom: 1px solid rgba(0, 0, 0, 0.06);
            }
            .row:last-child {
              border-bottom: 0;
            }
            .label {
              color: var(--muted);
              font-size: 14px;
            }
            .value {
              color: var(--foreground);
              font-size: 14px;
              font-weight: 700;
              text-align: right;
              word-break: break-word;
            }
            .value.status {
              color: ${accentColor};
            }
            .footnote {
              margin-top: 22px;
              font-size: 12px;
              line-height: 1.6;
              color: #6b7280;
            }
            @media print {
              body {
                background: white;
              }
              .page {
                padding: 0;
              }
              .sheet {
                border-radius: 0;
                box-shadow: none;
                border: 0;
                max-width: none;
              }
            }
          </style>
        </head>
        <body>
          <main class="page">
            <section class="sheet">
              <header class="hero">
                <div class="brand">Learnora</div>
                <h1>${escapeHtml(heading)}</h1>
                <p>${escapeHtml(subtitle)}</p>
                <div class="amount">${escapeHtml(fmt(amount))}</div>
              </header>
              <div class="body">
                <section class="summary">
                  <div>
                    <p class="status-title">Status</p>
                    <p class="status-copy">${escapeHtml(mode === 'pending'
                      ? 'A school admin will confirm this payment after review.'
                      : 'This payment has been received and recorded successfully.')}</p>
                  </div>
                  <span class="status-pill">${escapeHtml(statusLabel)}</span>
                </section>

                <section class="card">
                  <div class="card-head">
                    <p class="title">${escapeHtml(mode === 'pending' ? 'Submission Details' : 'Receipt Details')}</p>
                    <span class="reference">${escapeHtml(ref || '—')}</span>
                  </div>
                  <div class="card-body">
                    ${rowsMarkup}
                  </div>
                </section>

                <p class="footnote">
                  Generated by Learnora on ${escapeHtml(dateStr)}.
                  ${escapeHtml(mode === 'pending'
                    ? 'This document confirms payment submission and awaits school approval.'
                    : 'Keep this receipt for your records.')}
                </p>
              </div>
            </section>
          </main>
        </body>
      </html>
    `
  }, [amount, dateStr, mode, receiptFilename, ref, rows])

  async function handleDownloadReceipt() {
    try {
      setBusyAction('download')
      setActionMessage('')

      const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200')
      if (!printWindow) {
        setActionMessage('Please allow pop-ups so we can open the receipt for PDF download.')
        return
      }

      printWindow.document.open()
      printWindow.document.write(printableReceiptHtml)
      printWindow.document.close()
      printWindow.focus()

      const triggerPrint = () => {
        printWindow.print()
        setActionMessage('Receipt opened in print view. Choose "Save as PDF" to download it.')
      }

      if (printWindow.document.readyState === 'complete') {
        triggerPrint()
      } else {
        printWindow.addEventListener('load', triggerPrint, { once: true })
      }
    } catch {
      setActionMessage('Could not open the receipt PDF view. Please try again.')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleShareReceipt() {
    try {
      setBusyAction('share')
      setActionMessage('')

      const shareData = {
        title: mode === 'pending' ? 'Learnora payment submission' : 'Learnora payment receipt',
        text: receiptText,
      }

      if (navigator.share) {
        await navigator.share(shareData)
        setActionMessage('Receipt shared successfully.')
        return
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(receiptText)
        setActionMessage('Receipt details copied to clipboard.')
        return
      }

      setActionMessage('Sharing is not supported on this device.')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setActionMessage('')
      } else {
        setActionMessage('Could not share the receipt. Please try again.')
      }
    } finally {
      setBusyAction(null)
    }
  }

  function renderReceiptCard() {
    return (
      <div className="bg-surface rounded-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-black/6 flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">{mode === 'pending' ? 'Submission Details' : 'Receipt'}</p>
          {mode === 'paid' && <span className="text-[10px] font-mono text-muted">{ref}</span>}
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          {rows.map(row => (
            <div key={row.label} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-muted shrink-0">{row.label}</span>
              <span className={`font-semibold text-right ${row.label === 'Status' ? 'text-amber-600' : 'text-foreground'}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderActions() {
    if (mode === 'pending') {
      return (
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
      )
    }

    return (
      <div className="flex flex-col gap-3">
        {actionMessage && (
          <p className="text-center text-xs text-muted">{actionMessage}</p>
        )}
        <button
          onClick={() => void handleDownloadReceipt()}
          disabled={busyAction !== null}
          className="h-12 w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-bold rounded-pill hover:bg-primary-deep transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download size={15} /> {busyAction === 'download' ? 'Preparing PDF…' : 'Download PDF'}
        </button>
        <button
          onClick={() => void handleShareReceipt()}
          disabled={busyAction !== null}
          className="h-12 w-full flex items-center justify-center gap-2 border border-black/15 text-foreground text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Share2 size={15} /> {busyAction === 'share' ? 'Sharing…' : 'Share Receipt'}
        </button>
        <button onClick={() => onNavigate('parent/home')}
          className="h-12 w-full text-sm font-semibold text-muted hover:text-foreground transition-colors">
          Back to Home
        </button>
      </div>
    )
  }

  function renderStatusHero() {
    if (mode === 'pending') {
      return (
        <>
          <div className="size-20 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <Clock size={36} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Transfer Submitted</h1>
          <p className="text-sm text-muted mt-1">Awaiting admin confirmation</p>
          <p className="text-2xl font-bold text-amber-600 mt-3">{fmt(amount)}</p>
        </>
      )
    }

    return (
      <>
        <div className="size-20 rounded-full bg-green-50 flex items-center justify-center mb-4">
          <CheckCircle2 size={36} className="text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Payment Successful</h1>
        <p className="text-sm text-muted mt-1">Your payment has been received and recorded.</p>
        <p className="text-2xl font-bold text-green-600 mt-3">{fmt(amount)}</p>
      </>
    )
  }

  function renderBanner() {
    if (mode !== 'pending') return null
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-card px-4 py-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">Payment Pending Confirmation</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            Your transfer has been recorded. A school admin will confirm receipt within 1–2 business days. Your fee status will update automatically once confirmed.
          </p>
        </div>
      </div>
    )
  }

  function renderMobileContent() {
    return (
      <div className="px-5 pt-6 pb-10 flex flex-col gap-5 min-h-screen">
        <button onClick={() => onNavigate('parent/fees')}
          className="flex items-center gap-1.5 text-sm text-muted w-fit">
          <ArrowLeft size={15} /> Back to fees
        </button>

        <div className="flex flex-col items-center text-center pt-4 pb-2">
          {renderStatusHero()}
        </div>

        {renderBanner()}
        {renderReceiptCard()}
        {renderActions()}
      </div>
    )
  }

  function renderDesktopContent() {
    return (
      <DashboardLayout
        activePage="parent/fees"
        onNavigate={onNavigate}
        title={mode === 'pending' ? 'Transfer Submitted' : 'Payment Successful'}
        subtitle={mode === 'pending'
          ? 'Your transfer is awaiting school confirmation.'
          : 'Your payment has been received and recorded.'}
        nav={parentNav}
        user={{ name: userName, role: 'Parent', initials: userInitials }}
        mainClassName="flex-1 overflow-y-auto p-6 xl:p-8"
      >
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1.15fr)_340px]">
          <section className="rounded-[30px] bg-white p-8 shadow-sm">
            <button onClick={() => onNavigate('parent/fees')}
              className="flex items-center gap-1.5 text-sm text-muted w-fit mb-6">
              <ArrowLeft size={15} /> Back to fees
            </button>

            <div className="flex flex-col items-center text-center pt-2 pb-2">
              {renderStatusHero()}
            </div>

            <div className="mt-8 space-y-5">
              {renderBanner()}
              {renderReceiptCard()}
              {renderActions()}
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-[30px] bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/70">Payment Snapshot</p>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Amount</span>
                  <span className="text-sm font-semibold text-foreground">{fmt(amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Reference</span>
                  <span className="text-sm font-semibold text-foreground text-right break-all">{ref || 'Pending'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Student</span>
                  <span className="text-sm font-semibold text-foreground">{childName || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">School</span>
                  <span className="text-sm font-semibold text-foreground">{schoolName || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Status</span>
                  <span className={`text-sm font-semibold ${mode === 'pending' ? 'text-amber-600' : 'text-green-600'}`}>
                    {mode === 'pending' ? 'Pending Confirmation' : 'Paid'}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <>
      <div className="lg:hidden">
        <MobileLayout activePage="parent/home" onNavigate={onNavigate} nav={parentMobileNav}>
          {renderMobileContent()}
        </MobileLayout>
      </div>

      <div className="hidden lg:block">
        {renderDesktopContent()}
      </div>
    </>
  )
}
