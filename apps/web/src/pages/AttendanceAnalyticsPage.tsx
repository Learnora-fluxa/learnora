import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface MonthData { month: string; present: number; absent: number; late: number }
interface TermData  { t: string; rate: number }

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AttendanceAnalyticsPage({ onNavigate }: Props) {
  const { profile }  = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)

  const [monthData,  setMonthData]  = useState<MonthData[]>([])
  const [termData,   setTermData]   = useState<TermData[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => { if (profile?.id) loadData() }, [profile?.id])

  async function loadData() {
    setLoading(true)
    const studentId = profile!.id
    const schoolId  = profile!.school_id!

    const { data } = await supabase
      .from('attendance_records')
      .select('date, status')
      .eq('student_id', studentId)
      .eq('school_id', schoolId)
      .order('date')

    const rows = (data ?? []) as { date: string; status: string }[]

    const byMonth: Record<string, MonthData> = {}
    for (const r of rows) {
      if (!r.date) continue
      const d = new Date(r.date + 'T00:00:00')
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!byMonth[key]) byMonth[key] = { month: MONTH_NAMES[d.getMonth()], present: 0, absent: 0, late: 0 }
      if (r.status === 'present') byMonth[key].present++
      else if (r.status === 'absent') byMonth[key].absent++
      else if (r.status === 'late') byMonth[key].late++
    }

    const months = Object.values(byMonth)
    setMonthData(months)

    const termsMap: Record<string, { present: number; total: number }> = {}
    for (const r of rows) {
      if (!r.date) continue
      const d = new Date(r.date + 'T00:00:00')
      const m = d.getMonth()
      const y = d.getFullYear()
      let term = ''
      if (m >= 8 || m <= 10) term = `Term 1 ${y}`
      else if (m >= 0 && m <= 3) term = `Term 2 ${y}`
      else term = `Term 3 ${y}`
      if (!termsMap[term]) termsMap[term] = { present: 0, total: 0 }
      termsMap[term].total++
      if (r.status === 'present') termsMap[term].present++
    }
    setTermData(Object.entries(termsMap).map(([t, v]) => ({
      t: t.replace(/^\w+ /, '').replace(/\s/, ' '),
      rate: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
    })).slice(-4))

    setLoading(false)
  }

  const totalPresent = monthData.reduce((s, m) => s + m.present, 0)
  const totalAbsent  = monthData.reduce((s, m) => s + m.absent,  0)
  const totalLate    = monthData.reduce((s, m) => s + m.late,    0)
  const totalDays    = totalPresent + totalAbsent + totalLate
  const rate         = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0
  const maxDays      = Math.max(...monthData.map(m => m.present + m.absent + m.late), 1)

  return (
    <DashboardLayout activePage="analysis" onNavigate={onNavigate} title="Attendance Analytics" subtitle="Your attendance record across the academic year" user={sidebarUser}>
      <div className="flex flex-col gap-6 max-w-[900px]">

        {loading ? (
          <div className="text-center py-16 text-sm text-muted">Loading…</div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { label: 'Attendance Rate', value: `${rate}%`,    Icon: TrendingUp,  color: 'bg-green-50 text-green-600' },
                { label: 'Days Present',    value: totalPresent,   Icon: CheckCircle2,color: 'bg-primary/10 text-primary' },
                { label: 'Days Absent',     value: totalAbsent,    Icon: XCircle,     color: 'bg-red-50 text-red-500'    },
                { label: 'Late Arrivals',   value: totalLate,      Icon: Clock,       color: 'bg-amber-50 text-amber-600'},
              ].map(({ label, value, Icon, color }) => (
                <div key={label} className="bg-surface rounded-card shadow-sm p-5">
                  <div className={`size-10 rounded-card ${color} flex items-center justify-center mb-3`}>
                    <Icon size={18} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Monthly breakdown */}
            {monthData.length === 0 ? (
              <div className="bg-surface rounded-card shadow-sm p-12 text-center text-sm text-muted">No attendance records yet.</div>
            ) : (
              <div className="bg-surface rounded-card shadow-sm p-6">
                <h2 className="text-base font-bold text-foreground mb-5">Monthly Breakdown</h2>
                <div className="flex items-end gap-4 h-44">
                  {monthData.map(m => {
                    const pH = Math.round((m.present / maxDays) * 100)
                    const lH = Math.round((m.late    / maxDays) * 100)
                    const aH = Math.round((m.absent  / maxDays) * 100)
                    return (
                      <div key={m.month} className="flex flex-col items-center gap-2 flex-1">
                        <div className="flex flex-col items-center w-full gap-0.5">
                          {aH > 0 && <div className="w-full bg-red-400 rounded-t" style={{ height: `${aH * 1.6}px` }} />}
                          {lH > 0 && <div className="w-full bg-amber-400" style={{ height: `${lH * 1.6}px` }} />}
                          <div className="w-full bg-primary rounded-t" style={{ height: `${pH * 1.6}px` }} />
                        </div>
                        <span className="text-xs text-muted">{m.month}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-5 mt-3">
                  {[['bg-primary','Present'],['bg-amber-400','Late'],['bg-red-400','Absent']].map(([c,l]) => (
                    <div key={l} className="flex items-center gap-1.5 text-xs text-muted">
                      <span className={`size-2.5 rounded-sm ${c}`} />{l}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Term comparison */}
            {termData.length > 0 && (
              <div className="bg-surface rounded-card shadow-sm p-6">
                <h2 className="text-base font-bold text-foreground mb-5">Term-by-Term Attendance Rate</h2>
                <div className="flex flex-col gap-4">
                  {termData.map(({ t, rate: r }) => (
                    <div key={t}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium text-foreground">{t}</p>
                        <p className={`text-sm font-bold ${r >= 90 ? 'text-green-600' : r >= 80 ? 'text-primary' : 'text-amber-600'}`}>{r}%</p>
                      </div>
                      <div className="h-2.5 bg-black/8 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r >= 90 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${r}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalAbsent > 3 && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-card p-4">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700">
                  You have {totalAbsent} absences this session. Most schools require 75% minimum attendance for exams. You're currently at {rate}%.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
