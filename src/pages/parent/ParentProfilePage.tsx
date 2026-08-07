import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Plus, Bell, FileText, MessageSquare, Calendar, User, Lock, Settings, Globe, HelpCircle, MessageCircle } from 'lucide-react'
import MobileLayout, { parentMobileNav } from '../../components/layout/MobileLayout'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { parentNav } from '../../components/layout/Sidebar'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Child { id: string; name: string; className: string; attendance: string }

const settingsList = [
  { label: 'Account Settings', sub: 'Manage your personal information', page: 'parent/account-settings', icon: User },
  { label: 'Notification Settings', sub: 'Control what alerts you receive', page: 'notif-settings', icon: Bell },
  { label: 'Appearance', sub: 'Theme and display preferences', page: 'appearance-settings', icon: Settings },
  { label: 'Language', sub: 'Choose your preferred language', page: 'parent/language', icon: Globe },
]
const securityList = [
  { label: 'Change Password', page: 'security-settings', icon: Lock },
  { label: 'Two-Factor Authentication', page: 'security-settings', icon: Lock },
  { label: 'Manage Devices', page: 'security-settings', icon: Lock },
]
const supportList = [
  { label: 'Help Centre', page: 'support', icon: HelpCircle },
  { label: 'Live Chat', page: 'support', icon: MessageCircle },
  { label: 'Send Feedback', page: 'support', icon: MessageSquare },
]
const quickActions = [
  { label: 'Updates', icon: Bell, page: 'parent/announcements', color: 'border-red-200 text-red-500' },
  { label: 'Reports', icon: FileText, page: 'parent/report-cards', color: 'border-blue-200 text-blue-500' },
  { label: 'Messages', icon: MessageSquare, page: 'parent/message-teacher', color: 'border-pink-200 text-pink-500' },
  { label: 'Calendar', icon: Calendar, page: 'parent/calendar', color: 'border-green-200 text-green-500' },
]

export default function ParentProfilePage({ onNavigate }: Props) {
  const { profile, signOut } = useAuth()
  const [children, setChildren] = useState<Child[]>([])

  useEffect(() => { if (profile?.id) loadChildren() }, [profile?.id])

  async function loadChildren() {
    if (!profile?.school_id) return

    const { data: links } = await supabase
      .from('parent_student_links')
      .select('student_id')
      .eq('parent_id', profile.id)
      .eq('school_id', profile.school_id)

    const rows = (links ?? []) as { student_id: string }[]
    const items: Child[] = await Promise.all(rows.map(async row => {
      const sid = row.student_id
      const [profRes, ceRes, arRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', sid).maybeSingle(),
        supabase.from('class_enrollments').select('class_id, classes!class_id(name)').eq('student_id', sid).limit(1).maybeSingle(),
        supabase.from('attendance_records').select('status').eq('student_id', sid).eq('school_id', profile.school_id!).limit(60),
      ])
      const prof = profRes.data as { full_name: string | null } | null
      const ce = ceRes.data as unknown as { classes: { name: string } | null } | null
      const ar = (arRes.data ?? []) as { status: string }[]
      const present = ar.filter(record => record.status === 'present').length
      const pct = ar.length > 0 ? Math.round((present / ar.length) * 100) : 0
      return { id: sid, name: prof?.full_name ?? 'Student', className: ce?.classes?.name ?? 'N/A', attendance: `${pct}%` }
    }))
    setChildren(items)
  }

  async function handleSignOut() {
    await signOut()
    onNavigate('login')
  }

  const displayName = profile?.full_name ?? 'Parent'
  const initials = displayName.split(' ').map((part: string) => part[0]).slice(0, 2).join('').toUpperCase()

  function renderProfileContent(showBackButton: boolean) {
    return (
      <div className="px-5 pt-5 pb-6 lg:px-0 lg:pt-0 lg:pb-0">
        {showBackButton && <button onClick={() => onNavigate('parent/home')} className="mb-4"><ChevronLeft size={22} /></button>}

        <h1 className="mb-1 text-2xl font-bold text-primary">Profile</h1>
        <p className="mb-5 text-xs text-muted">Manage your account, family, and settings.</p>

        <div className="mb-5 flex items-center gap-4 rounded-2xl border border-black/8 bg-white p-4 shadow-sm">
          <div className="size-16 shrink-0 rounded-full bg-primary/15 flex items-center justify-center text-xl font-bold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-foreground">{displayName}</p>
            <button className="mt-1.5 flex items-center gap-1.5 rounded-full border border-black/12 px-3 py-1 text-xs font-medium text-foreground">
              Edit Profile <Pencil size={10} />
            </button>
          </div>
          <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-white">Parent</span>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-bold text-foreground">My Children</p>
          <button className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white">
            Add <Plus size={12} />
          </button>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-3">
          {children.length === 0 ? (
            <div className="col-span-2 rounded-2xl border border-dashed border-black/10 bg-white py-6 text-center text-sm text-muted xl:col-span-3">
              No children linked yet.
            </div>
          ) : children.map(child => (
            <button
              key={child.id}
              onClick={() => { sessionStorage.setItem('learnora_selected_child', child.id); onNavigate('parent/progress') }}
              className="rounded-2xl border border-black/8 bg-white p-3 text-left shadow-sm"
            >
              <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-primary/15 text-lg">👦</div>
              <p className="text-xs font-bold text-foreground">{child.name}</p>
              <p className="text-[10px] font-semibold text-muted">{child.className}</p>
              <div className="mt-1">
                <p className="text-[9px] text-muted">Attendance</p>
                <p className="text-xs font-bold text-green-600">{child.attendance}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="mb-3 text-base font-bold text-foreground">Quick Actions</p>
        <div className="mb-6 grid grid-cols-4 gap-3">
          {quickActions.map(action => {
            const Icon = action.icon
            return (
              <button key={action.label} onClick={() => onNavigate(action.page)} className="flex flex-col items-center gap-1.5">
                <div className={`flex size-14 items-center justify-center rounded-2xl border-2 ${action.color}`}>
                  <Icon size={22} />
                </div>
                <p className="text-center text-[10px] font-medium text-foreground">{action.label}</p>
              </button>
            )
          })}
        </div>

        <p className="mb-3 text-base font-bold text-foreground">Settings</p>
        <div className="mb-5 rounded-2xl border border-black/8 bg-white shadow-sm divide-y divide-black/4">
          {settingsList.map(setting => {
            const Icon = setting.icon
            return (
              <button key={setting.label} onClick={() => onNavigate(setting.page)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas"><Icon size={15} className="text-muted" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{setting.label}</p>
                  <p className="text-[10px] text-muted">{setting.sub}</p>
                </div>
                <ChevronRight size={14} className="shrink-0 text-muted" />
              </button>
            )
          })}
        </div>

        <p className="mb-3 text-base font-bold text-foreground">Security</p>
        <div className="mb-5 rounded-2xl border border-black/8 bg-white shadow-sm divide-y divide-black/4">
          {securityList.map(setting => {
            const Icon = setting.icon
            return (
              <button key={setting.label} onClick={() => onNavigate(setting.page)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas"><Icon size={15} className="text-muted" /></div>
                <p className="flex-1 text-sm font-semibold text-foreground">{setting.label}</p>
                <ChevronRight size={14} className="shrink-0 text-muted" />
              </button>
            )
          })}
        </div>

        <p className="mb-3 text-base font-bold text-foreground">Help &amp; Support</p>
        <div className="mb-6 rounded-2xl border border-black/8 bg-white shadow-sm divide-y divide-black/4">
          {supportList.map(setting => {
            const Icon = setting.icon
            return (
              <button key={setting.label} onClick={() => onNavigate(setting.page)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas"><Icon size={15} className="text-muted" /></div>
                <p className="flex-1 text-sm font-semibold text-foreground">{setting.label}</p>
                <ChevronRight size={14} className="shrink-0 text-muted" />
              </button>
            )
          })}
        </div>

        <button onClick={handleSignOut} className="h-12 w-full rounded-full bg-primary text-sm font-bold text-white">
          Log Out
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="lg:hidden">
        <MobileLayout activePage="parent/profile" onNavigate={onNavigate} nav={parentMobileNav}>
          {renderProfileContent(true)}
        </MobileLayout>
      </div>

      <div className="hidden lg:block">
        <DashboardLayout
          activePage="parent/profile"
          onNavigate={onNavigate}
          title="Profile"
          subtitle="Manage your account, family, and settings."
          nav={parentNav}
          user={{ name: displayName, role: 'Parent', initials }}
          mainClassName="flex-1 overflow-y-auto p-6 xl:p-8"
        >
          <div className="mx-auto max-w-7xl rounded-[30px] bg-white p-8 shadow-sm">
            {renderProfileContent(false)}
          </div>
        </DashboardLayout>
      </div>
    </>
  )
}
