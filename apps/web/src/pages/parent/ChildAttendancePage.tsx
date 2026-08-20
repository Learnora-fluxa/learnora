import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Clock, ChevronLeft, AlertCircle } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { parentNav } from '../../components/layout/Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { resolveLinkedParentChild } from '../../lib/parentStudents'

type Props = { onNavigate: (page: string) => void }
type DayStatus = 'present' | 'absent' | 'late' | 'holiday'

interface AttendanceRecord {
  date: string
  status: DayStatus
}

const statusConfig: Record<DayStatus, { Icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  present: { Icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Present' },
  absent: { Icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Absent' },
  late: { Icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Late' },
  holiday: { Icon: AlertCircle, color: 'text-muted', bg: 'bg-canvas', label: 'Holiday' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function ChildAttendancePage({ onNavigate }: Props) {
  const { profile, loading: authLoading } = useAuth()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [childName, setChildName] = useState('')
  const [className, setClassName] = useState('')
  const [loading, setLoading] = useState(true)
  const [hasLinkedChild, setHasLinkedChild] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!profile?.id || !profile.school_id) {
      setHasLinkedChild(false)
      setLoading(false)
      return
    }
    loadData()
  }, [authLoading, profile?.id, profile?.school_id])

  async function loadData() {
    if (!profile?.id || !profile.school_id) return

    setLoading(true)
    const { childId } = await resolveLinkedParentChild(profile.id, profile.school_id)

    if (!childId) {
      setHasLinkedChild(false)
      setRecords([])
      setChildName('')
      setClassName('')
      setLoading(false)
      return
    }

    setHasLinkedChild(true)

    const [childRes, ceRes, arRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', childId).maybeSingle(),
      supabase.from('class_enrollments').select('classes(name)').eq('student_id', childId).limit(1).maybeSingle(),
      supabase.from('attendance_records')
        .select('date, status')
        .eq('student_id', childId)
        .order('date', { ascending: false })
        .limit(30),
    ])

    setChildName((childRes.data as { full_name: string | null } | null)?.full_name ?? '')
    const ce = ceRes.data as { classes: { name: string } | null } | null
    setClassName(ce?.classes?.name ?? '')
    setRecords((arRes.data ?? []) as AttendanceRecord[])
    setLoading(false)
  }

  const present = records.filter(a => a.status === 'present').length
  const absent = records.filter(a => a.status === 'absent').length
  const late = records.filter(a => a.status === 'late').length
  const total = records.filter(a => a.status !== 'holiday').length
  const rate = total > 0 ? Math.round((present / total) * 100) : 0
  const userName = profile?.full_name ?? 'Parent User'
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'P'

  function renderEmptyState() {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-8 text-center text-sm text-muted shadow-sm">
        Ask the school admin to link this parent account to a student before attendance can appear here.
      </div>
    )
  }

  function renderContent(showBackButton: boolean) {
    return (
      <div className="px-5 pb-4 pt-5 lg:px-0 lg:pb-0 lg:pt-0">
        {showBackButton && (
          <button onClick={() => onNavigate('parent/home')} className="mb-4">
            <ChevronLeft size={22} />
          </button>
        )}
        <h1 className="mb-1 text-2xl font-bold text-primary">Attendance</h1>
        <p className="mb-5 text-xs text-muted">{childName}{className ? ` · ${className}` : ''}</p>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted">Loading…</div>
        ) : !hasLinkedChild ? (
          renderEmptyState()
        ) : (
          <>
            <div className="mb-6 rounded-3xl bg-primary p-5">
              <p className="mb-1 text-xs text-white/70">Attendance Rate</p>
              <p className="mb-3 text-4xl font-bold text-white">{rate}%</p>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white" style={{ width: `${rate}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xl font-bold text-white">{present}</p>
                  <p className="text-[10px] text-white/70">Present</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{absent}</p>
                  <p className="text-[10px] text-white/70">Absent</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{late}</p>
                  <p className="text-[10px] text-white/70">Late</p>
                </div>
              </div>
            </div>

            {absent > 1 && (
              <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertCircle size={14} className="shrink-0 text-amber-600" />
                <p className="text-xs text-foreground">
                  {absent} absence{absent !== 1 ? 's' : ''} this period. Contact your child&apos;s teacher if needed.
                </p>
              </div>
            )}

            {records.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No attendance records found.</p>
            ) : (
              <>
                <p className="mb-3 text-base font-bold text-foreground">Daily Records</p>
                <div className="flex flex-col gap-2">
                  {records.map((a, i) => {
                    const cfg = statusConfig[a.status] ?? statusConfig.present
                    const Icon = cfg.Icon
                    return (
                      <div key={`${a.date}-${i}`} className="flex items-center gap-3 rounded-2xl border border-black/6 bg-white px-4 py-3 shadow-sm">
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                          <Icon size={16} className={cfg.color} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{fmtDate(a.date)}</p>
                          <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="lg:hidden">
        <MobileLayout activePage="parent/home" onNavigate={onNavigate} nav={parentMobileNav}>
          {renderContent(true)}
        </MobileLayout>
      </div>

      <div className="hidden lg:block">
        <DashboardLayout
          activePage="parent/attendance"
          onNavigate={onNavigate}
          title="Attendance"
          subtitle={hasLinkedChild ? `${childName}${className ? ` · ${className}` : ''}` : 'No linked child'}
          nav={parentNav}
          user={{ name: userName, role: 'Parent', initials: userInitials }}
          mainClassName="flex-1 overflow-y-auto p-6 xl:p-8"
        >
          <div className="mx-auto max-w-6xl rounded-[30px] bg-white p-8 shadow-sm">
            {renderContent(false)}
          </div>
        </DashboardLayout>
      </div>
    </>
  )
}
