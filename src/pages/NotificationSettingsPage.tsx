import { useState, useEffect } from 'react'
import { ChevronLeft, CheckCircle2 } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav, adminNav, superAdminNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'

type Props = { onNavigate: (page: string) => void }

interface PrefRow {
  key:     string
  label:   string
  sub:     string
  default: boolean
}

const NOTIF_PREFS: PrefRow[] = [
  { key: 'assignment_reminders', label: 'Assignment Reminders',  sub: 'Notify when an assignment is due',         default: true  },
  { key: 'grade_published',      label: 'Grade Published',       sub: 'Notify when a new grade is posted',        default: true  },
  { key: 'announcements',        label: 'Announcements',         sub: 'School-wide news and updates',             default: true  },
  { key: 'class_reminders',      label: 'Class Reminders',       sub: 'Reminder before a class or exam starts',   default: true  },
  { key: 'messages',             label: 'Messages',              sub: 'New messages from teachers or classmates', default: true  },
  { key: 'attendance_alerts',    label: 'Attendance Alerts',     sub: 'Notify when marked absent or late',        default: false },
  { key: 'achievement_unlocked', label: 'Achievement Unlocked',  sub: 'Badges, streaks and milestones',           default: true  },
  { key: 'weekly_summary',       label: 'Weekly Summary',        sub: 'Weekly performance digest every Sunday',   default: false },
]

const CHANNEL_PREFS = (email: string): PrefRow[] => [
  { key: 'channel_inapp', label: 'In-app Notifications', sub: 'Shown inside the Learnora app',  default: true  },
  { key: 'channel_email', label: 'Email Notifications',  sub: `Sent to ${email}`,               default: true  },
  { key: 'channel_sms',   label: 'SMS Notifications',    sub: 'Sent to your registered phone',  default: false },
  { key: 'channel_push',  label: 'Push Notifications',   sub: 'Browser/device push notifications', default: true },
]

function ToggleRow({ label, sub, on, onChange, saving }: {
  label: string; sub: string; on: boolean; onChange: () => void; saving: boolean
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-black/4 last:border-0">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted mt-0.5">{sub}</p>
      </div>
      <button
        onClick={onChange}
        disabled={saving}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-60 ${on ? 'bg-primary' : 'bg-black/15'}`}
      >
        <span className={`absolute inset-y-[2px] w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${on ? 'left-[22px]' : 'left-[2px]'}`} />
      </button>
    </div>
  )
}

export default function NotificationSettingsPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser  = profileToSidebarUser(profile)
  const email        = profile?.email ?? 'your registered email'

  const settingsPage = profile?.role === 'teacher'     ? 'teacher-settings'
                     : profile?.role === 'super_admin'  ? 'platform-settings'
                     : 'settings'
  const settingsNav  = profile?.role === 'teacher'     ? teacherNav
                     : profile?.role === 'admin'        ? adminNav
                     : profile?.role === 'super_admin'  ? superAdminNav
                     : undefined

  const [prefs,   setPrefs]   = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  const channelRows = CHANNEL_PREFS(email)
  const allPrefDefs = [...NOTIF_PREFS, ...channelRows]

  useEffect(() => { if (profile?.id) loadPrefs() }, [profile?.id])

  async function loadPrefs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('notification_prefs')
      .eq('id', profile!.id)
      .maybeSingle()
    if (error) { logSupabaseError('NotificationSettings/load', error) }

    const saved = (data as { notification_prefs: Record<string, boolean> | null } | null)?.notification_prefs ?? {}
    const merged: Record<string, boolean> = {}
    for (const def of allPrefDefs) {
      merged[def.key] = def.key in saved ? saved[def.key] : def.default
    }
    setPrefs(merged)
    setLoading(false)
  }

  async function toggle(key: string) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ notification_prefs: next })
      .eq('id', profile!.id)
    if (error) {
      logSupabaseError('NotificationSettings/save', error)
      setPrefs(prefs) // revert on error
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    }
    setSaving(false)
  }

  return (
    <DashboardLayout
      activePage={settingsPage}
      onNavigate={onNavigate}
      title="Notification Settings"
      subtitle="Control how and when you receive alerts"
      nav={settingsNav}
      user={sidebarUser}
    >
      <div className="max-w-[640px] flex flex-col gap-6">

        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate(settingsPage)}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground w-fit"
          >
            <ChevronLeft size={16} /> Back to Settings
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
              <CheckCircle2 size={13} /> Saved
            </span>
          )}
        </div>

        {loading ? (
          <div className="bg-surface rounded-card shadow-sm p-10 text-center text-sm text-muted">Loading your preferences…</div>
        ) : (
          <>
            <div className="bg-surface rounded-card shadow-sm p-6">
              <h2 className="text-base font-bold text-foreground mb-1">Notification Types</h2>
              <p className="text-xs text-muted mb-4">Choose which events trigger a notification.</p>
              {NOTIF_PREFS.map(n => (
                <ToggleRow
                  key={n.key}
                  label={n.label}
                  sub={n.sub}
                  on={prefs[n.key] ?? n.default}
                  onChange={() => toggle(n.key)}
                  saving={saving}
                />
              ))}
            </div>

            <div className="bg-surface rounded-card shadow-sm p-6">
              <h2 className="text-base font-bold text-foreground mb-1">Delivery Channels</h2>
              <p className="text-xs text-muted mb-4">Choose how notifications are delivered to you.</p>
              {channelRows.map(c => (
                <ToggleRow
                  key={c.key}
                  label={c.label}
                  sub={c.sub}
                  on={prefs[c.key] ?? c.default}
                  onChange={() => toggle(c.key)}
                  saving={saving}
                />
              ))}
            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  )
}
