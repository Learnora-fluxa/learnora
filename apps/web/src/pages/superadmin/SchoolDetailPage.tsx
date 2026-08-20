import { useState, useEffect } from 'react'
import {
  Building2, Users, ArrowLeft, Mail, Globe, Phone, MapPin,
  Calendar, AlertCircle, CheckCircle2, Activity,
  BookOpen, MessageSquare, Settings, Download, Send, X,
  Shield, Power, RefreshCw, Eye, ChevronDown,
  CreditCard, BarChart2, Layers, Clock, ArrowRight,
  Tag, FileText, TriangleAlert, Trash2,
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { superAdminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  deletePlatformSchool,
  extendPlatformSchoolTrial,
  generatePlatformSchoolInvoice,
  impersonatePlatformSchoolAdmin,
  resetPlatformSchoolAdminPassword,
  suspendPlatformSchool,
  updatePlatformSchoolPlan,
  updatePlatformSchoolRate,
} from '../../lib/platformSchools'

type Props = { onNavigate: (page: string) => void }
type Tab = 'overview' | 'students' | 'finance' | 'modules' | 'actions' | 'support'

type SchoolRecord = {
  id: string
  name: string
  code: string
  email: string | null
  phone: string | null
  address: string | null
  state: string | null
  subscription_plan: string | null
  subscription_status: string | null
  created_at: string | null
}

type PlatformSchoolRecord = {
  plan: string | null
  status: string | null
  students_billed: number | null
  mrr_ngn: number | null
  onboarded_at: string | null
  custom_rate_ngn: number | null
  rate_reason: string | null
  trial_ends_at: string | null
}

type AdminProfileRecord = {
  full_name: string | null
  email: string | null
}

const school = {
  name:          'Greenfield Academy',
  domain:        'greenfield.learnora.io',
  email:         'admin@greenfield.edu.ng',
  phone:         '+234 802 345 6789',
  address:       '14 Victoria Island, Lagos',
  state:         'Lagos',
  plan:          'Growth',
  status:        'active',
  trialEnd:      null as string | null,
  studentCount:  248,
  teacherCount:  18,
  parentCount:   210,
  adminName:     'Mr Taiwo Okafor',
  adminEmail:    'taiwo@greenfield.edu.ng',
  joined:        'Sep 2024',
  lastActive:    'Jun 8, 2026',
  currentTerm:   'Second Term',
  currentYear:   '2025/2026',
  ratePerStudent: 850,
  healthScore:   91,
}

const DEFAULT_RATE = school.ratePerStudent
const fmt = (n: number) => '₦' + n.toLocaleString('en-NG')
const fmtMonthYear = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }) : '—'
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtStatus = (value: string | null) => value ? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ') : 'Unknown'

const mauData   = [72, 78, 81, 85, 88, 91]
const mauMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

const termInvoices = [
  { term: 'Second Term 2025/2026', students: 248, rate: 850, total: 248 * 850, status: 'paid',  date: 'Jan 10, 2026' },
  { term: 'First Term 2025/2026',  students: 241, rate: 850, total: 241 * 850, status: 'paid',  date: 'Sep 5, 2025'  },
  { term: 'Third Term 2024/2025',  students: 235, rate: 850, total: 235 * 850, status: 'paid',  date: 'May 4, 2025'  },
  { term: 'Second Term 2024/2025', students: 228, rate: 750, total: 228 * 750, status: 'paid',  date: 'Jan 8, 2025'  },
]

const allModules = [
  { key: 'core_lms',            name: 'Core LMS (Courses & Assignments)', enabled: true,  tier: 'all'        },
  { key: 'live_classes',        name: 'Live Classes',                     enabled: true,  tier: 'growth+'    },
  { key: 'attendance',          name: 'Attendance Management',            enabled: true,  tier: 'all'        },
  { key: 'parent_portal',       name: 'Parent Portal',                    enabled: true,  tier: 'all'        },
  { key: 'finance_management',  name: 'Finance Management',               enabled: true,  tier: 'growth+'    },
  { key: 'advanced_analytics',  name: 'Advanced Analytics',               enabled: true,  tier: 'growth+'    },
  { key: 'ai_tutor',            name: 'AI Tutor',                         enabled: false, tier: 'enterprise' },
  { key: 'custom_branding',     name: 'Custom Branding',                  enabled: false, tier: 'growth+'    },
  { key: 'gradebook',           name: 'Gradebook',                        enabled: true,  tier: 'all'        },
  { key: 'resource_library',    name: 'Resource Library',                 enabled: true,  tier: 'all'        },
  { key: 'report_builder',      name: 'Report Builder',                   enabled: false, tier: 'enterprise' },
  { key: 'api_access',          name: 'API Access',                       enabled: false, tier: 'enterprise' },
]

// ── Support tickets ──────────────────────────────────────────────────────────
type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'escalated'
type MsgSide      = 'school' | 'learnora'

type Ticket = {
  id:       number
  subject:  string
  category: string
  date:     string
  status:   TicketStatus
  priority: 'high' | 'medium' | 'low'
  messages: { from: MsgSide; text: string; time: string }[]
}

const initTickets: Ticket[] = [
  {
    id: 1,
    subject:  'Finance module showing incorrect totals',
    category: 'Bug',
    date:     'Jun 5, 2026',
    status:   'in-progress',
    priority: 'high',
    messages: [
      { from: 'school',    text: 'Hello, the finance module is showing incorrect fee totals for several students. The totals displayed do not match what was entered in the fee setup.', time: 'Jun 5, 09:12' },
      { from: 'learnora',  text: 'Thanks for reporting this. Can you share the affected student names and the discrepancy amounts? We are looking into this now.', time: 'Jun 5, 10:44' },
      { from: 'school',    text: 'Sure, attaching a list. Students in SS2A class are mostly affected — about 14 students showing ₦5,000 less than expected.', time: 'Jun 5, 11:05' },
      { from: 'learnora',  text: 'Confirmed — we identified a rounding error in the PTA levy calculation. Fix is being deployed now. Please check again in 30 minutes.', time: 'Jun 5, 14:30' },
    ],
  },
  {
    id: 2,
    subject:  'Cannot bulk-import student CSV',
    category: 'Bug',
    date:     'Jun 3, 2026',
    status:   'open',
    priority: 'medium',
    messages: [
      { from: 'school', text: 'We are trying to upload our new student list using the CSV template provided, but it keeps failing at the validation step with "invalid format" error.', time: 'Jun 3, 14:22' },
    ],
  },
  {
    id: 3,
    subject:  'Request to enable Custom Branding module',
    category: 'Request',
    date:     'May 28, 2026',
    status:   'open',
    priority: 'low',
    messages: [
      { from: 'school',   text: 'We would like the custom branding feature enabled. We have our logo and colour scheme ready and would like to roll it out before the new term.', time: 'May 28, 08:40' },
      { from: 'learnora', text: 'Custom Branding is available on your Growth plan. We have enabled the module — please check your admin settings under Appearance.', time: 'May 28, 11:15' },
    ],
  },
  {
    id: 4,
    subject:  'Bulk CSV import failing',
    category: 'Bug',
    date:     'May 20, 2026',
    status:   'resolved',
    priority: 'medium',
    messages: [
      { from: 'school',   text: 'CSV import fails every time for the teacher roster — about 40 teachers.', time: 'May 20, 09:00' },
      { from: 'learnora', text: 'Fixed — the column header for "phone" was case-sensitive. We have updated the importer to be case-insensitive. Please try again.', time: 'May 20, 15:00' },
      { from: 'school',   text: 'It works now, thank you!', time: 'May 20, 15:30' },
    ],
  },
  {
    id: 5,
    subject:  'Custom domain setup request',
    category: 'Request',
    date:     'Apr 10, 2026',
    status:   'resolved',
    priority: 'low',
    messages: [
      { from: 'school',   text: 'We want our portal to be accessible at portal.greenfield.edu.ng. Please guide us.', time: 'Apr 10, 10:00' },
      { from: 'learnora', text: 'Domain configured and SSL certificate issued. Your portal is live at portal.greenfield.edu.ng.', time: 'Apr 12, 16:00' },
    ],
  },
]

const ticketStatusStyle: Record<TicketStatus, string> = {
  'open':        'bg-blue-50 text-blue-600',
  'in-progress': 'bg-amber-50 text-amber-700',
  'resolved':    'bg-green-50 text-green-700',
  'escalated':   'bg-red-50 text-red-600',
}

const priorityStyle: Record<string, string> = {
  high:   'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  low:    'bg-canvas text-muted border border-black/10',
}

const invoiceStatusStyle: Record<string, string> = {
  paid:    'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-600',
  overdue: 'bg-red-50 text-red-600',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function Modal({ onClose, children, width = 'max-w-[480px]' }: { onClose: () => void; children: React.ReactNode; width?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative z-10 bg-white rounded-card shadow-xl w-full ${width} max-h-[90vh] overflow-y-auto`}>
        {children}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SchoolDetailPage({ onNavigate }: Props) {
  const { profile, session } = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)
  const [tab,           setTab]          = useState<Tab>('overview')
  const [moduleStates,  setModuleStates] = useState<Record<string, boolean>>(
    Object.fromEntries(allModules.map(m => [m.key, m.enabled]))
  )
  const [studentSearch, setStudentSearch] = useState('')
  const [tickets,       setTickets]      = useState<Ticket[]>([])

  // Real data from DB
  const [realSchool,  setRealSchool]  = useState<SchoolRecord | null>(null)
  const [platformSchool, setPlatformSchool] = useState<PlatformSchoolRecord | null>(null)
  const [adminProfile, setAdminProfile] = useState<AdminProfileRecord | null>(null)
  const [realCounts,  setRealCounts]  = useState<{ student: number; teacher: number; parent: number } | null>(null)
  const [dbStudents,  setDbStudents]  = useState<{ name: string; class: string; status: string; feePaid: boolean }[]>([])
  const [invoiceTotals, setInvoiceTotals] = useState<{ total: number; paid: number; outstanding: number; recentDate: string | null }>({
    total: 0,
    paid: 0,
    outstanding: 0,
    recentDate: null,
  })
  const [invoiceHistory, setInvoiceHistory] = useState<{ term: string; students: number; rate: number; total: number; status: string; date: string }[]>(termInvoices)
  const [platformBaseRate, setPlatformBaseRate] = useState(DEFAULT_RATE)
  const [dbLoading,   setDbLoading]   = useState(true)
  const [savingModuleKey, setSavingModuleKey] = useState<string | null>(null)
  const [savingAction, setSavingAction] = useState<string | null>(null)

  useEffect(() => { loadSchoolData() }, [])

  async function loadSchoolData() {
    setDbLoading(true)
    const schoolId = sessionStorage.getItem('learnora_selected_school_id')
    if (!schoolId) { setDbLoading(false); return }
    const db = supabase as unknown as { from: (table: string) => any }

    const [schRes, platformRes, profRes, invRes, flagsRes, ticketRes, configRes] = await Promise.all([
      supabase.from('schools').select('id, name, code, email, phone, address, state, subscription_plan, subscription_status, created_at').eq('id', schoolId).maybeSingle(),
      db.from('platform_schools').select('plan, status, students_billed, mrr_ngn, onboarded_at, custom_rate_ngn, rate_reason, trial_ends_at').eq('school_id', schoolId).maybeSingle(),
      supabase.from('profiles').select('id, full_name, role, email, created_at').eq('school_id', schoolId),
      supabase.from('invoices').select('amount, paid_amount, status, created_at, term_id, student_id').eq('school_id', schoolId).order('created_at', { ascending: false }),
      supabase.from('feature_flags').select('flag_name, enabled').eq('school_id', schoolId),
      supabase.from('support_tickets').select('id, subject, body, status, priority, created_at').eq('school_id', schoolId).order('created_at', { ascending: false }),
      supabase.from('platform_config').select('per_student_price').maybeSingle(),
    ])

    if (schRes.data) setRealSchool(schRes.data as SchoolRecord)
    if (platformRes.error) {
      const missingPlatformCols =
        platformRes.error.message.includes("'custom_rate_ngn' column") ||
        platformRes.error.message.includes("'rate_reason' column") ||
        platformRes.error.message.includes("'trial_ends_at' column")

      if (missingPlatformCols) {
        const fallbackPlatformRes = await db
          .from('platform_schools')
          .select('plan, status, students_billed, mrr_ngn, onboarded_at')
          .eq('school_id', schoolId)
          .maybeSingle()

        if (fallbackPlatformRes.data) {
          setPlatformSchool({
            ...(fallbackPlatformRes.data as Omit<PlatformSchoolRecord, 'custom_rate_ngn' | 'rate_reason' | 'trial_ends_at'>),
            custom_rate_ngn: null,
            rate_reason: null,
            trial_ends_at: null,
          })
        }
      }
    } else if (platformRes.data) {
      setPlatformSchool(platformRes.data as PlatformSchoolRecord)
    }
    setPlatformBaseRate((configRes.data as { per_student_price?: number | null } | null)?.per_student_price ?? DEFAULT_RATE)

    const flagRows = (flagsRes.data ?? []) as { flag_name: string; enabled: boolean | null }[]
    if (flagRows.length > 0) {
      setModuleStates((current) => {
        const next = { ...current }
        for (const module of allModules) {
          const match = flagRows.find((row) => row.flag_name === module.key)
          next[module.key] = match?.enabled ?? module.enabled
        }
        return next
      })
    }

    const profiles = (profRes.data ?? []) as { id: string; full_name: string | null; role: string; email: string | null; created_at: string | null }[]
    const students  = profiles.filter(p => p.role === 'student')
    const teachers  = profiles.filter(p => p.role === 'teacher')
    const parents   = profiles.filter(p => p.role === 'parent')
    const admins    = profiles.filter(p => p.role === 'admin')
    setRealCounts({ student: students.length, teacher: teachers.length, parent: parents.length })
    setAdminProfile(admins[0] ? { full_name: admins[0].full_name, email: admins[0].email } : null)

    const invoiceRows = (invRes.data ?? []) as { amount: number; paid_amount: number | null; status: string | null; created_at: string | null; term_id: string | null; student_id: string }[]
    const invoiceTotal = invoiceRows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
    const paidTotal = invoiceRows.reduce((sum, row) => sum + (row.paid_amount ?? 0), 0)
    setInvoiceTotals({
      total: invoiceTotal,
      paid: paidTotal,
      outstanding: Math.max(0, invoiceTotal - paidTotal),
      recentDate: invoiceRows[0]?.created_at ?? null,
    })

    if (invoiceRows.length > 0) {
      const termGroups = new Map<string, { total: number; students: Set<string>; paid: number; date: string | null }>()
      for (const row of invoiceRows) {
        const key = row.term_id ?? 'No Term'
        const existing = termGroups.get(key) ?? { total: 0, students: new Set<string>(), paid: 0, date: row.created_at ?? null }
        existing.total += row.amount ?? 0
        existing.paid += row.paid_amount ?? 0
        existing.students.add(row.student_id)
        if (!existing.date && row.created_at) existing.date = row.created_at
        termGroups.set(key, existing)
      }

      setInvoiceHistory(Array.from(termGroups.entries()).slice(0, 6).map(([term, value]) => ({
        term,
        students: value.students.size,
        rate: value.students.size > 0 ? Math.round(value.total / value.students.size) : 0,
        total: value.total,
        status: value.paid >= value.total ? 'paid' : value.paid > 0 ? 'pending' : 'overdue',
        date: fmtDate(value.date),
      })))
    } else {
      setInvoiceHistory([])
    }

    const supportRows = (ticketRes.data ?? []) as { id: string; subject: string; body: string | null; status: string | null; priority: string | null; created_at: string | null }[]
    setTickets((supportRows.length > 0 ? supportRows.map((row, index) => ({
      id: index + 1,
      subject: row.subject,
      category: 'Support',
      date: fmtDate(row.created_at),
      status: (row.status === 'resolved' || row.status === 'escalated' || row.status === 'in-progress' ? row.status : 'open') as TicketStatus,
      priority: (row.priority === 'high' || row.priority === 'low' ? row.priority : 'medium'),
      messages: [
        {
          from: 'school',
          text: row.body ?? 'No ticket description was provided.',
          time: fmtDate(row.created_at),
        },
      ],
    })) : initTickets))

    if (students.length > 0) {
      const studentIds = students.map(s => s.id)
      const [ceRes, invRes] = await Promise.all([
        supabase.from('class_enrollments').select('student_id, classes(name)').in('student_id', studentIds),
        supabase.from('invoices').select('student_id, amount, paid_amount').eq('school_id', schoolId),
      ])
      const ceRows  = (ceRes.data  ?? []) as unknown as { student_id: string; classes: { name: string } | null }[]
      const invRows = (invRes.data ?? []) as { student_id: string; amount: number; paid_amount: number }[]
      const classMap: Record<string, string> = {}
      for (const e of ceRows) { if (!classMap[e.student_id]) classMap[e.student_id] = e.classes?.name ?? '—' }
      const paidMap: Record<string, boolean> = {}
      for (const inv of invRows) { paidMap[inv.student_id] = (inv.paid_amount ?? 0) >= (inv.amount ?? 1) }
      setDbStudents(students.map(s => ({
        name:    s.full_name ?? 'Unknown',
        class:   classMap[s.id] ?? '—',
        status:  'active',
        feePaid: paidMap[s.id] ?? false,
      })))
    } else {
      setDbStudents([])
    }
    setDbLoading(false)
  }

  // ── Support tab state ──────────────────────────────────────────────────────
  type TicketFilter = 'All' | 'Open' | 'In Progress' | 'Resolved' | 'Escalated'
  const [ticketFilter, setTicketFilter]    = useState<TicketFilter>('All')
  const [activeTicket, setActiveTicket]    = useState<number | null>(null)
  const [replyText,    setReplyText]       = useState('')
  const [actionFlash,  setActionFlash]     = useState<string | null>(null)

  // ── Action modal state ─────────────────────────────────────────────────────
  const [showChangePlan,      setShowChangePlan]      = useState(false)
  const [showAdjustRate,      setShowAdjustRate]      = useState(false)
  const [showExtendTrial,     setShowExtendTrial]     = useState(false)
  const [showGenerateInvoice, setShowGenerateInvoice] = useState(false)
  const [showResetPassword,   setShowResetPassword]   = useState(false)
  const [showImpersonate,     setShowImpersonate]     = useState(false)
  const [showSuspend,         setShowSuspend]         = useState(false)
  const [showDeleteSchool,    setShowDeleteSchool]    = useState(false)

  // Modal-specific local state
  const [selectedPlan, setSelectedPlan]   = useState(school.plan)
  const [newRate,       setNewRate]       = useState(String(school.ratePerStudent))
  const [rateReason,    setRateReason]    = useState('')
  const [trialDays,     setTrialDays]     = useState('14')
  const [invTerm,       setInvTerm]       = useState('Second Term 2025/2026')
  const [invStudents,   setInvStudents]   = useState(String(school.studentCount))
  const [impersonateOk, setImpersonateOk] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [actionDone,    setActionDone]    = useState<string | null>(null)

  function flash(msg: string) {
    setActionDone(msg)
    setTimeout(() => setActionDone(null), 2500)
  }

  // ── Support helpers ────────────────────────────────────────────────────────
  const activeT   = tickets.find(t => t.id === activeTicket)
  const filterMap: Record<TicketFilter, TicketStatus | null> = {
    'All': null, 'Open': 'open', 'In Progress': 'in-progress', 'Resolved': 'resolved', 'Escalated': 'escalated',
  }
  const filteredTickets = tickets.filter(t =>
    filterMap[ticketFilter] === null || t.status === filterMap[ticketFilter]
  )

  function sendReply() {
    if (!replyText.trim() || !activeTicket) return
    setTickets(prev => prev.map(t =>
      t.id === activeTicket
        ? { ...t, messages: [...t.messages, { from: 'learnora', text: replyText.trim(), time: 'Now' }], status: 'in-progress' }
        : t
    ))
    setReplyText('')
  }

  function resolveTicket(id: number) {
    void updateTicketStatus(id, 'resolved', 'Ticket marked as resolved.')
  }

  function escalateTicket(id: number) {
    void updateTicketStatus(id, 'escalated', 'Ticket escalated to senior support.')
  }

  async function updateTicketStatus(id: number, status: TicketStatus, successMessage: string) {
    const schoolId = sessionStorage.getItem('learnora_selected_school_id')
    if (!schoolId) return

    const ticket = tickets.find((item) => item.id === id)
    if (!ticket) return

    const supportRows = (await supabase
      .from('support_tickets')
      .select('id')
      .eq('school_id', schoolId)
      .eq('subject', ticket.subject)
      .order('created_at', { ascending: false })
      .limit(1)).data as { id: string }[] | null

    const supportTicketId = supportRows?.[0]?.id
    if (supportTicketId) {
      await supabase.from('support_tickets').update({ status }).eq('id', supportTicketId)
    }

    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    setActionFlash(successMessage)
    setTimeout(() => setActionFlash(null), 2500)
  }

  async function toggleModule(moduleKey: string) {
    const schoolId = sessionStorage.getItem('learnora_selected_school_id')
    if (!schoolId) return

    const nextEnabled = !moduleStates[moduleKey]
    setSavingModuleKey(moduleKey)
    setModuleStates((current) => ({ ...current, [moduleKey]: nextEnabled }))

    const { error } = await supabase
      .from('feature_flags')
      .upsert({
        school_id: schoolId,
        flag_name: moduleKey,
        enabled: nextEnabled,
      }, { onConflict: 'school_id,flag_name' })

    if (error) {
      setModuleStates((current) => ({ ...current, [moduleKey]: !nextEnabled }))
      setActionFlash(`Failed to update ${moduleKey.replace(/_/g, ' ')}.`)
    } else {
      setActionFlash(`${moduleKey.replace(/_/g, ' ')} ${nextEnabled ? 'enabled' : 'disabled'}.`)
    }

    setSavingModuleKey(null)
    setTimeout(() => setActionFlash(null), 2500)
  }

  async function applyPlanChange() {
    const schoolId = sessionStorage.getItem('learnora_selected_school_id')
    if (!schoolId) return

    setSavingAction('change-plan')
    const normalizedPlan = selectedPlan.toLowerCase()
    try {
      await updatePlatformSchoolPlan(session, schoolId, normalizedPlan)
      setRealSchool((current) => current ? { ...current, subscription_plan: normalizedPlan } : current)
      setPlatformSchool((current) => current ? { ...current, plan: normalizedPlan } : current)
      setShowChangePlan(false)
      flash(`Plan changed to ${selectedPlan}.`)
    } catch (error) {
      setActionFlash(error instanceof Error ? error.message : 'Failed to update school plan.')
      setTimeout(() => setActionFlash(null), 2500)
    } finally {
      setSavingAction(null)
    }
  }

  async function applyCustomRate() {
    const schoolId = sessionStorage.getItem('learnora_selected_school_id')
    if (!schoolId) return

    const parsedRate = Number(newRate)
    if (!parsedRate || parsedRate <= 0 || !rateReason.trim()) return

    setSavingAction('adjust-rate')
    try {
      const response = await updatePlatformSchoolRate(session, schoolId, {
        rate: parsedRate,
        reason: rateReason.trim(),
      })
      setPlatformSchool((current) => ({
        plan: current?.plan ?? realSchool?.subscription_plan ?? school.plan,
        status: current?.status ?? realSchool?.subscription_status ?? school.status,
        students_billed: current?.students_billed ?? realCounts?.student ?? school.studentCount,
        mrr_ngn: current?.mrr_ngn ?? null,
        onboarded_at: current?.onboarded_at ?? realSchool?.created_at ?? null,
        custom_rate_ngn: response.rate,
        rate_reason: response.reason,
        trial_ends_at: current?.trial_ends_at ?? null,
      }))
      setShowAdjustRate(false)
      flash(`Custom rate set to ${fmt(parsedRate)}/student/term.`)
    } catch (error) {
      setActionFlash(error instanceof Error ? error.message : 'Failed to update school rate.')
      setTimeout(() => setActionFlash(null), 2500)
    } finally {
      setSavingAction(null)
    }
  }

  async function applyTrialExtension() {
    const schoolId = sessionStorage.getItem('learnora_selected_school_id')
    if (!schoolId) return

    setSavingAction('extend-trial')
    try {
      const response = await extendPlatformSchoolTrial(session, schoolId, Number(trialDays))
      setRealSchool((current) => current ? { ...current, subscription_status: 'trial' } : current)
      setPlatformSchool((current) => ({
        plan: current?.plan ?? realSchool?.subscription_plan ?? school.plan,
        status: 'trial',
        students_billed: current?.students_billed ?? realCounts?.student ?? school.studentCount,
        mrr_ngn: current?.mrr_ngn ?? null,
        onboarded_at: current?.onboarded_at ?? realSchool?.created_at ?? null,
        custom_rate_ngn: current?.custom_rate_ngn ?? null,
        rate_reason: current?.rate_reason ?? null,
        trial_ends_at: response.school.trialEndsAt,
      }))
      setShowExtendTrial(false)
      flash(`Trial extended by ${trialDays} days.`)
    } catch (error) {
      setActionFlash(error instanceof Error ? error.message : 'Failed to extend trial.')
      setTimeout(() => setActionFlash(null), 2500)
    } finally {
      setSavingAction(null)
    }
  }

  async function applyInvoiceGeneration() {
    const schoolId = sessionStorage.getItem('learnora_selected_school_id')
    if (!schoolId) return

    setSavingAction('generate-invoice')
    try {
      await generatePlatformSchoolInvoice(session, schoolId, {
        termLabel: invTerm,
        studentCount: Number(invStudents),
      })
      setShowGenerateInvoice(false)
      flash('Invoice generated and saved for this school.')
    } catch (error) {
      setActionFlash(error instanceof Error ? error.message : 'Failed to generate invoice.')
      setTimeout(() => setActionFlash(null), 2500)
    } finally {
      setSavingAction(null)
    }
  }

  async function applyPasswordReset() {
    const schoolId = sessionStorage.getItem('learnora_selected_school_id')
    if (!schoolId) return

    setSavingAction('reset-password')
    try {
      await resetPlatformSchoolAdminPassword(session, schoolId, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      setShowResetPassword(false)
      flash('Password reset email sent to admin.')
    } catch (error) {
      setActionFlash(error instanceof Error ? error.message : 'Failed to send password reset email.')
      setTimeout(() => setActionFlash(null), 2500)
    } finally {
      setSavingAction(null)
    }
  }

  async function applyImpersonation() {
    const schoolId = sessionStorage.getItem('learnora_selected_school_id')
    if (!schoolId) return

    setSavingAction('impersonate')
    try {
      const response = await impersonatePlatformSchoolAdmin(session, schoolId, {
        redirectTo: `${window.location.origin}/school-selector`,
      })
      setShowImpersonate(false)
      setImpersonateOk(false)
      window.location.assign(response.actionLink)
    } catch (error) {
      setActionFlash(error instanceof Error ? error.message : 'Failed to start impersonation.')
      setTimeout(() => setActionFlash(null), 2500)
    } finally {
      setSavingAction(null)
    }
  }

  async function suspendSchool() {
    const schoolId = sessionStorage.getItem('learnora_selected_school_id')
    if (!schoolId) return

    setSavingAction('suspend-school')
    try {
      await suspendPlatformSchool(session, schoolId)
      setRealSchool((current) => current ? { ...current, subscription_status: 'suspended' } : current)
      setPlatformSchool((current) => current ? { ...current, status: 'suspended' } : current)
      setShowSuspend(false)
      flash('School suspended. All logins blocked.')
    } catch (error) {
      setActionFlash(error instanceof Error ? error.message : 'Failed to suspend school.')
      setTimeout(() => setActionFlash(null), 2500)
    } finally {
      setSavingAction(null)
    }
  }

  async function applyDeleteSchool() {
    const schoolId = sessionStorage.getItem('learnora_selected_school_id')
    if (!schoolId) return

    setSavingAction('delete-school')
    try {
      await deletePlatformSchool(session, schoolId)
      sessionStorage.removeItem('learnora_selected_school_id')
      setShowDeleteSchool(false)
      setDeleteConfirm('')
      onNavigate('schools-list')
    } catch (error) {
      setActionFlash(error instanceof Error ? error.message : 'Failed to delete school.')
      setTimeout(() => setActionFlash(null), 2500)
    } finally {
      setSavingAction(null)
    }
  }

  // ── Tab definitions ────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: typeof Building2 }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart2    },
    { id: 'students', label: 'Students', icon: Users        },
    { id: 'finance',  label: 'Finance',  icon: CreditCard   },
    { id: 'modules',  label: 'Modules',  icon: Layers       },
    { id: 'actions',  label: 'Actions',  icon: Settings     },
    { id: 'support',  label: 'Support',  icon: AlertCircle  },
  ]

  const visibleStudents = dbStudents.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.class.toLowerCase().includes(studentSearch.toLowerCase())
  )

  const displayName         = realSchool?.name          ?? school.name
  const displayCode         = realSchool?.code          ?? '—'
  const displayEmail        = realSchool?.email         ?? school.email
  const displayPhone        = realSchool?.phone         ?? school.phone
  const displayAddress      = realSchool?.address       ?? school.address
  const displayState        = realSchool?.state         ?? school.state
  const displayPlan         = platformSchool?.plan ?? realSchool?.subscription_plan ?? school.plan
  const displayStatus       = platformSchool?.status ?? realSchool?.subscription_status ?? school.status
  const displayJoined       = platformSchool?.onboarded_at ?? realSchool?.created_at ?? null
  const displayAdminName    = adminProfile?.full_name   ?? school.adminName
  const displayAdminEmail   = adminProfile?.email       ?? school.adminEmail
  const displayStudentCount = realCounts?.student        ?? school.studentCount
  const displayTeacherCount = realCounts?.teacher        ?? school.teacherCount
  const displayParentCount  = realCounts?.parent         ?? school.parentCount
  const displayRate         = Number(platformSchool?.custom_rate_ngn ?? platformBaseRate)
  const displayTermBill     = displayStudentCount * displayRate
  const displayHealthScore  = displayStudentCount > 0
    ? Math.max(0, Math.min(100, Math.round(((displayTeacherCount + displayParentCount) / (displayStudentCount + displayTeacherCount + displayParentCount)) * 100 + 55)))
    : school.healthScore

  useEffect(() => {
    setSelectedPlan(fmtStatus(displayPlan))
    setInvStudents(String(displayStudentCount))
    setNewRate(String(Math.round(displayRate)))
    setRateReason(platformSchool?.rate_reason ?? '')
  }, [displayPlan, displayStudentCount, displayRate, platformSchool?.rate_reason])

  return (
    <DashboardLayout
      activePage="schools-list"
      onNavigate={onNavigate}
      title="School Dashboard"
      nav={superAdminNav}
      user={sidebarUser}
    >
      <div className="flex flex-col gap-5 max-w-[1100px]">

        <button onClick={() => onNavigate('schools-list')}
          className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors w-fit">
          <ArrowLeft size={15} /> Back to Schools
        </button>

        {/* ── Action done toast ── */}
        {actionDone && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-foreground text-white text-sm font-semibold px-5 py-3 rounded-card shadow-xl">
            <CheckCircle2 size={15} className="text-green-400" /> {actionDone}
          </div>
        )}

        {/* ── School header ── */}
        <div className="bg-surface rounded-card shadow-sm p-6">
          <div className="flex flex-wrap items-start gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 size={28} className="text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
                <div className="flex flex-wrap gap-3 text-xs text-muted mt-1.5">
                  <span className="flex items-center gap-1"><Globe size={11} />{displayCode}.learnora.app</span>
                  <span className="flex items-center gap-1"><Mail size={11} />{displayEmail}</span>
                  <span className="flex items-center gap-1"><Phone size={11} />{displayPhone}</span>
                  <span className="flex items-center gap-1"><MapPin size={11} />{displayState}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold bg-primary text-white px-3 py-1.5 rounded-full">{fmtStatus(displayPlan)}</span>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${
                displayStatus === 'active' ? 'bg-green-50 text-green-700' : displayStatus === 'trial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
              }`}>{fmtStatus(displayStatus)}</span>
              <button onClick={() => setShowSuspend(true)}
                className="flex items-center gap-1.5 h-9 px-4 border border-red-200 text-red-500 text-xs font-semibold rounded-full hover:bg-red-50 transition-colors">
                <Power size={12} /> Suspend
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-3 mt-5 pt-5 border-t border-black/6">
            {[
              { label: 'Students',     value: dbLoading ? '…' : displayStudentCount, color: 'text-primary'    },
              { label: 'Teachers',     value: dbLoading ? '…' : displayTeacherCount, color: 'text-foreground' },
              { label: 'Parents',      value: dbLoading ? '…' : displayParentCount,  color: 'text-foreground' },
              { label: 'Term Bill',    value: dbLoading ? '…' : fmt(displayTermBill),color: 'text-green-600'  },
                  { label: 'Rate/Student', value: fmt(displayRate) + '/term',   color: 'text-foreground' },
              { label: 'Health Score', value: displayHealthScore + '%',     color: displayHealthScore >= 80 ? 'text-green-600' : 'text-amber-600' },
            ].map(s => (
              <div key={s.label}>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-canvas rounded-input p-1 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon
            const badgeCount = t.id === 'support' ? tickets.filter(tk => tk.status === 'open' || tk.status === 'in-progress').length : 0
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-[6px] text-xs font-semibold whitespace-nowrap transition-colors relative ${tab === t.id ? 'bg-surface shadow text-foreground' : 'text-muted hover:text-foreground'}`}>
                <Icon size={13} />{t.label}
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{badgeCount}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* ════════════════ OVERVIEW ════════════════ */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
            <div className="flex flex-col gap-5">
              <div className="bg-surface rounded-card shadow-sm p-6">
                <h3 className="text-sm font-bold text-foreground mb-4">Monthly Active Users (2026)</h3>
                <div className="flex items-end gap-3 h-36">
                  {mauData.map((v, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                      <span className="text-[10px] font-bold text-foreground">{v}%</span>
                      <div className="w-full bg-primary rounded-t" style={{ height: `${v}%` }} />
                      <span className="text-[9px] text-muted">{mauMonths[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-surface rounded-card shadow-sm p-6">
                <h3 className="text-sm font-bold text-foreground mb-1">Current Term Billing</h3>
                <p className="text-xs text-muted mb-4">{displayPlan ? `${fmtStatus(displayPlan)} Plan` : 'Subscription billing overview'}</p>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Students enrolled',          value: `${displayStudentCount} students` },
                    { label: 'Rate per student per term',  value: fmt(displayRate)                  },
                    { label: 'Term invoice total',         value: fmt(displayTermBill)              },
                    { label: 'Invoice status',             value: invoiceTotals.outstanding === 0 ? 'Paid ✓' : 'Outstanding' },
                    { label: 'Most recent invoice',        value: fmtDate(invoiceTotals.recentDate) },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between text-sm border-b border-black/4 pb-2 last:border-0 last:pb-0">
                      <span className="text-muted">{row.label}</span>
                      <span className="font-semibold text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="bg-surface rounded-card shadow-sm p-5">
                <h3 className="text-sm font-bold text-foreground mb-4">School Information</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Admin Name',   value: displayAdminName },
                    { label: 'Admin Email',  value: displayAdminEmail },
                    { label: 'Joined',       value: fmtMonthYear(displayJoined) },
                    { label: 'School Code',  value: displayCode },
                    { label: 'Address',      value: displayAddress },
                    { label: 'Subscription', value: `${fmtStatus(displayPlan)} · ${fmtStatus(displayStatus)}` },
                  ].map(row => (
                    <div key={row.label} className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted uppercase tracking-wide">{row.label}</span>
                      <span className="text-sm font-semibold text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-surface rounded-card shadow-sm p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">Health Indicators</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Login frequency',   pct: 91,  color: 'bg-green-500' },
                    { label: 'Feature adoption',  pct: 74,  color: 'bg-primary'   },
                    { label: 'Data completeness', pct: 82,  color: 'bg-teal-500'  },
                    { label: 'Payment health',    pct: 100, color: 'bg-green-500' },
                  ].map(h => (
                    <div key={h.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted">{h.label}</span>
                        <span className="font-semibold text-foreground">{h.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-black/8 rounded-full overflow-hidden">
                        <div className={`h-full ${h.color} rounded-full`} style={{ width: `${h.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ STUDENTS ════════════════ */}
        {tab === 'students' && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/6 gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-foreground">Student Roster</h3>
                <p className="text-xs text-muted mt-0.5">{displayStudentCount} enrolled · Live roster</p>
              </div>
              <div className="flex items-center gap-2">
                <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Search student..."
                  className="h-9 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary w-44" />
                <button className="flex items-center gap-1 h-9 px-3 border border-black/15 text-xs font-semibold text-muted rounded-pill hover:border-primary hover:text-primary transition-colors">
                  <Download size={12} /> Export
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '560px' }}>
                <thead>
                  <tr className="bg-canvas/60 border-b border-black/6">
                    {['Name', 'Class', 'Status', 'School Fee'].map(h => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/4">
                  {visibleStudents.map((s, i) => (
                    <tr key={i} className="hover:bg-canvas/40 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{s.name.charAt(0)}</div>
                          <span className="font-medium text-foreground">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-muted">{s.class}</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-black/5 text-muted'}`}>{s.status}</span>
                      </td>
                      <td className="px-6 py-3.5">
                        {s.feePaid
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><CheckCircle2 size={12} /> Paid</span>
                          : <span className="flex items-center gap-1 text-xs font-semibold text-red-500"><AlertCircle size={12} /> Unpaid</span>
                        }
                      </td>
                    </tr>
                  ))}
                  {visibleStudents.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-muted">No students match.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════ FINANCE ════════════════ */}
        {tab === 'finance' && (
          <div className="flex flex-col gap-5">
            <div className="bg-blue-50 border border-blue-200 rounded-card px-5 py-4 text-sm text-blue-800 flex items-start gap-3">
              <Activity size={15} className="shrink-0 mt-0.5 text-blue-500" />
              <div>
                <p className="font-semibold">Per-Student, Per-Term Billing</p>
                <p className="mt-0.5 text-blue-700">Billed at <strong>{fmt(displayRate)} per student per term</strong>. Invoice generated at term start based on enrolled student count.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Current Term Bill',     value: fmt(displayTermBill) },
                  { label: 'Students This Term',    value: `${displayStudentCount}` },
                  { label: 'Rate per Student',      value: fmt(displayRate) + '/term' },
                  { label: 'Total Paid (All Time)', value: fmt(invoiceTotals.paid) },
                ].map(s => (
                <div key={s.label} className="bg-surface rounded-card shadow-sm p-5">
                  <p className="text-xl font-bold text-primary">{s.value}</p>
                  <p className="text-xs text-muted mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-surface rounded-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-black/6">
                <h3 className="text-sm font-bold text-foreground">Invoice History</h3>
                <button className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
                  <Download size={12} /> Export all
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: '640px' }}>
                  <thead>
                    <tr className="bg-canvas/60 border-b border-black/6">
                      {['Term', 'Students', 'Rate/Student', 'Total', 'Date', 'Status', ''].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/4">
                    {invoiceHistory.map((inv, i) => (
                      <tr key={i} className="hover:bg-canvas/40 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-foreground">{inv.term}</td>
                        <td className="px-5 py-3.5 text-muted">{inv.students}</td>
                        <td className="px-5 py-3.5 text-muted">{fmt(inv.rate)}</td>
                        <td className="px-5 py-3.5 font-bold text-foreground">{fmt(inv.total)}</td>
                        <td className="px-5 py-3.5 text-muted text-xs">{inv.date}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${invoiceStatusStyle[inv.status]}`}>{inv.status}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button className="text-xs text-primary font-semibold hover:underline">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ MODULES ════════════════ */}
        {tab === 'modules' && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-black/6">
              <h3 className="text-sm font-bold text-foreground">Feature Modules</h3>
              <p className="text-xs text-muted mt-0.5">Toggle features for this school. Changes apply immediately.</p>
            </div>
            <div className="divide-y divide-black/4">
              {allModules.map(m => (
                <div key={m.key} className="flex items-center justify-between px-6 py-4 gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{m.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      m.tier === 'all'        ? 'bg-canvas text-muted border border-black/10' :
                      m.tier === 'growth+'   ? 'bg-primary/10 text-primary' :
                      'bg-amber-50 text-amber-700'
                    }`}>{m.tier === 'all' ? 'All plans' : m.tier === 'growth+' ? 'Growth+' : 'Enterprise'}</span>
                  </div>
                  <button onClick={() => void toggleModule(m.key)}
                    disabled={savingModuleKey === m.key}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors shrink-0 ${moduleStates[m.key] ? 'bg-primary' : 'bg-black/15'} ${savingModuleKey === m.key ? 'opacity-60' : ''}`}>
                    <span className={`absolute top-0.5 left-0.5 size-5 bg-white rounded-full shadow transition-transform ${moduleStates[m.key] ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════ ACTIONS ════════════════ */}
        {tab === 'actions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                label: 'Change Plan',
                sub:   'Move this school to a different subscription tier.',
                icon:  BookOpen, danger: false,
                onBtn: () => setShowChangePlan(true),
                btn:   'Change Plan',
              },
              {
                label: 'Adjust Rate',
                sub:   'Override the per-student rate for this school (custom pricing).',
                icon:  Tag, danger: false,
                onBtn: () => setShowAdjustRate(true),
                btn:   'Set Custom Rate',
              },
              {
                label: 'Extend Trial',
                sub:   'Give this school more time on their free trial.',
                icon:  Clock, danger: false,
                onBtn: () => setShowExtendTrial(true),
                btn:   'Extend Trial',
              },
              {
                label: 'Generate Invoice',
                sub:   'Manually generate a term invoice for this school.',
                icon:  FileText, danger: false,
                onBtn: () => setShowGenerateInvoice(true),
                btn:   'Generate',
              },
              {
                label: 'Reset Admin Password',
                sub:   "Send a password-reset email to the school's admin.",
                icon:  RefreshCw, danger: false,
                onBtn: () => setShowResetPassword(true),
                btn:   'Send Reset',
              },
              {
                label: 'Impersonate Admin',
                sub:   "Log in as this school's admin for debugging (audit-logged).",
                icon:  Eye, danger: false,
                onBtn: () => setShowImpersonate(true),
                btn:   'Impersonate',
              },
              {
                label: 'Suspend School',
                sub:   'Immediately block all logins for this school.',
                icon:  Power, danger: true,
                onBtn: () => setShowSuspend(true),
                btn:   'Suspend',
              },
              {
                label: 'Delete School',
                sub:   'Permanently remove this school and all its data. Irreversible.',
                icon:  Trash2, danger: true,
                onBtn: () => setShowDeleteSchool(true),
                btn:   'Delete',
              },
            ].map(a => {
              const Icon = a.icon
              return (
                <div key={a.label} className={`bg-surface rounded-card shadow-sm p-5 border ${a.danger ? 'border-red-100' : 'border-transparent'}`}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`size-9 rounded-card flex items-center justify-center shrink-0 ${a.danger ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{a.label}</p>
                      <p className="text-xs text-muted mt-0.5">{a.sub}</p>
                    </div>
                  </div>
                  <button onClick={a.onBtn}
                    className={`h-9 px-5 text-xs font-semibold rounded-pill transition-colors ${
                      a.danger
                        ? 'border border-red-200 text-red-500 hover:bg-red-50'
                        : 'border border-primary text-primary hover:bg-primary hover:text-white'
                    }`}>
                    {a.btn}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* ════════════════ SUPPORT ════════════════ */}
        {tab === 'support' && (
          <div className="flex flex-col gap-4">

            {actionFlash && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-card px-5 py-3 text-sm text-green-700 font-semibold">
                <CheckCircle2 size={14} /> {actionFlash}
              </div>
            )}

            {/* Ticket list or thread view */}
            {activeTicket === null ? (
              <>
                {/* Filter tabs + open count */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex gap-1 bg-canvas rounded-card p-1">
                    {(['All', 'Open', 'In Progress', 'Resolved', 'Escalated'] as TicketFilter[]).map(f => (
                      <button key={f} onClick={() => setTicketFilter(f)}
                        className={`px-3 h-8 text-xs font-semibold rounded-md transition-colors ${ticketFilter === f ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted ml-auto">
                    {tickets.filter(t => t.status === 'open' || t.status === 'in-progress').length} pending · {tickets.length} total
                  </p>
                </div>

                <div className="bg-surface rounded-card shadow-sm overflow-hidden">
                  {filteredTickets.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-muted">No tickets in this category.</div>
                  ) : (
                    <div className="divide-y divide-black/4">
                      {filteredTickets.map(t => (
                        <div key={t.id}
                          className="flex items-center gap-4 px-6 py-4 hover:bg-canvas/40 transition-colors cursor-pointer"
                          onClick={() => setActiveTicket(t.id)}>
                          <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
                            t.status === 'resolved' ? 'bg-green-50' : t.status === 'escalated' ? 'bg-red-50' : 'bg-amber-50'
                          }`}>
                            <MessageSquare size={14} className={
                              t.status === 'resolved' ? 'text-green-600' : t.status === 'escalated' ? 'text-red-500' : 'text-amber-600'
                            } />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{t.subject}</p>
                            <p className="text-xs text-muted mt-0.5 flex items-center gap-2">
                              <Calendar size={10} /> {t.date}
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${priorityStyle[t.priority]}`}>{t.priority}</span>
                              <span className="bg-canvas border border-black/10 text-muted px-1.5 py-0.5 rounded text-[10px] font-bold">{t.category}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${ticketStatusStyle[t.status]}`}>
                              {t.status.replace('-', ' ')}
                            </span>
                            <span className="text-xs text-muted">{t.messages.length} msg{t.messages.length !== 1 ? 's' : ''}</span>
                            <ArrowRight size={14} className="text-muted" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : activeT ? (
              /* ── Thread view ── */
              <div className="flex flex-col gap-4">
                <button onClick={() => { setActiveTicket(null); setReplyText('') }}
                  className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors w-fit">
                  <ArrowLeft size={14} /> Back to tickets
                </button>

                {/* Ticket header */}
                <div className="bg-surface rounded-card shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="text-base font-bold text-foreground">{activeT.subject}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${ticketStatusStyle[activeT.status]}`}>
                          {activeT.status.replace('-', ' ')}
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${priorityStyle[activeT.priority]}`}>{activeT.priority} priority</span>
                        <span className="text-xs font-bold bg-canvas border border-black/10 text-muted px-2.5 py-1 rounded-full">{activeT.category}</span>
                        <span className="text-xs text-muted flex items-center gap-1"><Calendar size={10} /> {activeT.date}</span>
                      </div>
                    </div>
                    {activeT.status !== 'resolved' && (
                      <div className="flex gap-2">
                        <button onClick={() => escalateTicket(activeT.id)}
                          className="h-8 px-3 text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 rounded-pill transition-colors flex items-center gap-1">
                          <TriangleAlert size={11} /> Escalate
                        </button>
                        <button onClick={() => resolveTicket(activeT.id)}
                          className="h-8 px-3 text-xs font-semibold border border-green-200 text-green-600 hover:bg-green-50 rounded-pill transition-colors flex items-center gap-1">
                          <CheckCircle2 size={11} /> Mark Resolved
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message thread */}
                <div className="bg-surface rounded-card shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-black/6">
                    <p className="text-xs font-semibold text-muted">Message thread — {activeT.messages.length} messages</p>
                  </div>
                  <div className="flex flex-col gap-0 divide-y divide-black/4 max-h-[380px] overflow-y-auto">
                    {activeT.messages.map((msg, i) => (
                      <div key={i} className={`px-6 py-4 flex gap-3 ${msg.from === 'learnora' ? 'bg-primary/3' : ''}`}>
                        <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                          msg.from === 'learnora' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                        }`}>
                          {msg.from === 'learnora' ? 'L' : displayAdminName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-bold text-foreground">
                              {msg.from === 'learnora' ? 'Learnora Support' : displayAdminName}
                            </p>
                            <span className="text-[10px] text-muted">{msg.time}</span>
                            {msg.from === 'learnora' && (
                              <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">You</span>
                            )}
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply box */}
                  {activeT.status !== 'resolved' ? (
                    <div className="px-6 py-4 border-t border-black/8 bg-canvas/30">
                      <textarea
                        value={replyText} onChange={e => setReplyText(e.target.value)}
                        rows={3} placeholder="Type your reply..."
                        className="w-full px-4 py-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary resize-none mb-3"
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => resolveTicket(activeT.id)}
                          className="h-9 px-4 text-xs font-semibold border border-green-200 text-green-600 hover:bg-green-50 rounded-pill transition-colors">
                          Reply & Resolve
                        </button>
                        <button
                          onClick={sendReply}
                          disabled={!replyText.trim()}
                          className="flex items-center gap-2 h-9 px-5 bg-primary text-white text-xs font-semibold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-40">
                          <Send size={12} /> Send Reply
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-6 py-4 border-t border-black/8 flex items-center gap-2 text-sm text-green-600 font-semibold">
                      <CheckCircle2 size={14} /> This ticket is resolved.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ════════════════ ACTION MODALS ════════════════ */}

      {/* Change Plan */}
      {showChangePlan && (
        <Modal onClose={() => setShowChangePlan(false)}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Change Plan</h2>
              <button onClick={() => setShowChangePlan(false)} className="text-muted hover:text-foreground"><X size={18} /></button>
            </div>
            <p className="text-xs text-muted mb-4">Current plan: <strong>{fmtStatus(displayPlan)}</strong>. Select a new plan for {displayName}.</p>
            <div className="flex flex-col gap-2 mb-5">
              {[
                { id: 'Starter',    desc: '₦850–950/student/term · Core LMS, Attendance, Parent Portal'                          },
                { id: 'Growth',     desc: '₦700–800/student/term · + Live Classes, Finance, Advanced Analytics, Custom Branding' },
                { id: 'Enterprise', desc: '₦550–650/student/term · + AI Tutor, Report Builder, API Access, Dedicated Support'    },
              ].map(p => (
                <label key={p.id} className={`flex items-start gap-3 p-4 rounded-card border cursor-pointer transition-colors ${selectedPlan === p.id ? 'border-primary bg-primary/4' : 'border-black/12 hover:border-primary/40'}`}>
                  <div className={`size-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedPlan === p.id ? 'border-primary' : 'border-black/25'}`}>
                    {selectedPlan === p.id && <div className="size-2 rounded-full bg-primary" />}
                  </div>
                  <input type="radio" className="sr-only" checked={selectedPlan === p.id} onChange={() => setSelectedPlan(p.id)} />
                  <div>
                    <p className={`text-sm font-bold ${selectedPlan === p.id ? 'text-primary' : 'text-foreground'}`}>{p.id}</p>
                    <p className="text-xs text-muted mt-0.5">{p.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowChangePlan(false)} className="flex-1 h-11 border border-black/15 text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">Cancel</button>
              <button onClick={() => void applyPlanChange()}
                disabled={savingAction === 'change-plan'}
                className="flex-1 h-11 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">
                {savingAction === 'change-plan' ? 'Saving…' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Adjust Rate */}
      {showAdjustRate && (
        <Modal onClose={() => setShowAdjustRate(false)}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Set Custom Rate</h2>
              <button onClick={() => setShowAdjustRate(false)} className="text-muted hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="bg-canvas rounded-card p-4 mb-5 flex items-center gap-3">
              <div>
                <p className="text-xs text-muted">Current rate</p>
                <p className="text-xl font-bold text-foreground">{fmt(displayRate)} <span className="text-sm font-normal text-muted">/ student / term</span></p>
              </div>
              <ArrowRight size={16} className="text-muted mx-2" />
              <div>
                <p className="text-xs text-muted">New term bill estimate</p>
                <p className="text-xl font-bold text-primary">{fmt(displayStudentCount * (Number(newRate) || 0))}</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 mb-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted">New rate per student per term (₦)</label>
                <input type="number" min={0} value={newRate} onChange={e => setNewRate(e.target.value)}
                  className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted">Reason for override (internal)</label>
                <input type="text" value={rateReason} onChange={e => setRateReason(e.target.value)}
                  placeholder="e.g. NGO discount, pilot pricing, negotiated rate"
                  className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAdjustRate(false)} className="flex-1 h-11 border border-black/15 text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">Cancel</button>
              <button onClick={() => void applyCustomRate()}
                disabled={!newRate || !rateReason.trim() || savingAction === 'adjust-rate'}
                className="flex-1 h-11 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-40">
                {savingAction === 'adjust-rate' ? 'Saving…' : 'Apply Rate'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Extend Trial */}
      {showExtendTrial && (
        <Modal onClose={() => setShowExtendTrial(false)}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Extend Trial</h2>
              <button onClick={() => setShowExtendTrial(false)} className="text-muted hover:text-foreground"><X size={18} /></button>
            </div>
            <p className="text-xs text-muted mb-4">{displayName} is currently on the <strong>{fmtStatus(displayPlan)}</strong> plan. Select how many additional days to add to their trial period.</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {['7', '14', '30', '60'].map(d => (
                <button key={d} onClick={() => setTrialDays(d)}
                  className={`h-14 rounded-card border text-sm font-bold transition-colors ${trialDays === d ? 'border-primary bg-primary/4 text-primary' : 'border-black/12 text-foreground hover:border-primary/40'}`}>
                  {d} days
                </button>
              ))}
            </div>
            <div className="bg-canvas rounded-card px-4 py-3 mb-5 text-xs text-muted">
              Trial will be extended by <strong>{trialDays} days</strong> from today. Admin will receive an email notification.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowExtendTrial(false)} className="flex-1 h-11 border border-black/15 text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">Cancel</button>
              <button onClick={() => void applyTrialExtension()}
                disabled={savingAction === 'extend-trial'}
                className="flex-1 h-11 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">
                {savingAction === 'extend-trial' ? 'Saving…' : 'Extend Trial'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Generate Invoice */}
      {showGenerateInvoice && (
        <Modal onClose={() => setShowGenerateInvoice(false)}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Generate Invoice</h2>
              <button onClick={() => setShowGenerateInvoice(false)} className="text-muted hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-4 mb-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted">Term</label>
                <div className="relative">
                  <select value={invTerm} onChange={e => setInvTerm(e.target.value)}
                    className="w-full h-10 pl-3 pr-8 border border-black/15 rounded-input text-sm outline-none focus:border-primary appearance-none bg-white">
                    <option>Second Term 2025/2026</option>
                    <option>Third Term 2025/2026</option>
                    <option>First Term 2026/2027</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted">Student count</label>
                <input type="number" min={1} value={invStudents} onChange={e => setInvStudents(e.target.value)}
                  className="h-10 px-3 border border-black/15 rounded-input text-sm outline-none focus:border-primary" />
              </div>
            </div>
            <div className="bg-canvas rounded-card p-4 mb-5 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Students</span>
                <span className="font-semibold">{invStudents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Rate / student</span>
                <span className="font-semibold">{fmt(displayRate)}</span>
              </div>
              <div className="flex justify-between border-t border-black/8 pt-2 mt-1">
                <span className="font-bold text-foreground">Invoice total</span>
                <span className="font-bold text-primary">{fmt((Number(invStudents) || 0) * displayRate)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowGenerateInvoice(false)} className="flex-1 h-11 border border-black/15 text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">Cancel</button>
              <button onClick={() => void applyInvoiceGeneration()}
                disabled={savingAction === 'generate-invoice'}
                className="flex-1 h-11 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">
                {savingAction === 'generate-invoice' ? 'Generating…' : 'Generate & Send'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Password */}
      {showResetPassword && (
        <Modal onClose={() => setShowResetPassword(false)} width="max-w-[400px]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">Reset Admin Password</h2>
              <button onClick={() => setShowResetPassword(false)} className="text-muted hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="flex items-center gap-3 bg-canvas rounded-card p-4 mb-5">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{displayAdminName.charAt(0)}</div>
              <div>
                <p className="text-sm font-bold text-foreground">{displayAdminName}</p>
                <p className="text-xs text-muted">{displayAdminEmail}</p>
              </div>
            </div>
            <p className="text-sm text-muted mb-5">A password-reset link will be sent to <strong>{displayAdminEmail}</strong>. The link expires in 1 hour.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetPassword(false)} className="flex-1 h-11 border border-black/15 text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">Cancel</button>
              <button onClick={() => void applyPasswordReset()}
                disabled={savingAction === 'reset-password'}
                className="flex-1 h-11 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors">
                {savingAction === 'reset-password' ? 'Sending…' : 'Send Reset Link'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Impersonate */}
      {showImpersonate && (
        <Modal onClose={() => { setShowImpersonate(false); setImpersonateOk(false) }} width="max-w-[440px]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">Impersonate Admin</h2>
              <button onClick={() => { setShowImpersonate(false); setImpersonateOk(false) }} className="text-muted hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-card p-4 mb-4 text-sm text-amber-800 flex items-start gap-2">
              <Shield size={14} className="shrink-0 mt-0.5 text-amber-600" />
              <p>This action is <strong>fully audit-logged</strong>. You will be logged in as {displayAdminName} and every action taken will be recorded under your Learnora admin account. Use only for debugging — not for browsing school data.</p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer mb-5">
              <input type="checkbox" checked={impersonateOk} onChange={e => setImpersonateOk(e.target.checked)}
                className="mt-0.5 accent-primary" />
              <span className="text-sm text-foreground">I understand this session is audit-logged and I am authorised to impersonate this admin.</span>
            </label>
            <div className="flex gap-3">
              <button onClick={() => { setShowImpersonate(false); setImpersonateOk(false) }} className="flex-1 h-11 border border-black/15 text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">Cancel</button>
              <button
                onClick={() => void applyImpersonation()}
                disabled={!impersonateOk || savingAction === 'impersonate'}
                className="flex-1 h-11 bg-primary text-white text-sm font-semibold rounded-pill hover:bg-primary-deep transition-colors disabled:opacity-40">
                {savingAction === 'impersonate' ? 'Starting…' : 'Start Session'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Suspend */}
      {showSuspend && (
        <Modal onClose={() => setShowSuspend(false)} width="max-w-[420px]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-red-600">Suspend School?</h2>
              <button onClick={() => setShowSuspend(false)} className="text-muted hover:text-foreground"><X size={18} /></button>
            </div>
            <p className="text-sm text-muted mb-5">This will immediately block all logins for <strong>{displayName}</strong> — students, teachers, parents and admins. This action is audit-logged and reversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSuspend(false)} className="flex-1 h-11 border border-black/15 text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">Cancel</button>
              <button onClick={() => void suspendSchool()}
                disabled={savingAction === 'suspend-school'}
                className="flex-1 h-11 bg-red-500 text-white text-sm font-semibold rounded-pill hover:bg-red-600 transition-colors">
                {savingAction === 'suspend-school' ? 'Suspending…' : 'Suspend School'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete School */}
      {showDeleteSchool && (
        <Modal onClose={() => { setShowDeleteSchool(false); setDeleteConfirm('') }} width="max-w-[440px]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-red-600">Delete School</h2>
              <button onClick={() => { setShowDeleteSchool(false); setDeleteConfirm('') }} className="text-muted hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-card p-4 mb-4 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <p>This action is <strong>permanent and irreversible</strong>. All school data — students, teachers, courses, grades, reports, and payments — will be permanently deleted.</p>
            </div>
            <p className="text-sm text-foreground mb-3">Type <strong>{displayName}</strong> to confirm deletion:</p>
            <input
              type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={displayName}
              className="w-full h-10 px-3 border border-red-200 rounded-input text-sm outline-none focus:border-red-500 mb-5"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteSchool(false); setDeleteConfirm('') }} className="flex-1 h-11 border border-black/15 text-sm font-semibold rounded-pill hover:border-primary hover:text-primary transition-colors">Cancel</button>
              <button
                onClick={() => void applyDeleteSchool()}
                disabled={deleteConfirm !== displayName || savingAction === 'delete-school'}
                className="flex-1 h-11 bg-red-500 text-white text-sm font-semibold rounded-pill hover:bg-red-600 transition-colors disabled:opacity-40">
                {savingAction === 'delete-school' ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </DashboardLayout>
  )
}
