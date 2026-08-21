import { useState, useEffect } from 'react'
import { Shield, Check, X, Save, CheckCircle2 } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminNav } from '../../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }
type Role  = 'admin' | 'teacher' | 'student' | 'parent'

const roles: { id: Role; label: string; color: string }[] = [
  { id: 'admin',   label: 'School Admin', color: 'bg-red-50 text-red-600'     },
  { id: 'teacher', label: 'Teacher',      color: 'bg-primary/10 text-primary'  },
  { id: 'student', label: 'Student',      color: 'bg-green-50 text-green-600'  },
  { id: 'parent',  label: 'Parent',       color: 'bg-amber-50 text-amber-600'  },
]

const permissions: { category: string; items: { key: string; label: string }[] }[] = [
  { category: 'Students', items: [
    { key: 'view_students',   label: 'View students'          },
    { key: 'invite_students', label: 'Invite students'        },
    { key: 'edit_students',   label: 'Edit student profiles'  },
    { key: 'delete_students', label: 'Delete student accounts'},
  ]},
  { category: 'Courses', items: [
    { key: 'view_courses',    label: 'View courses'       },
    { key: 'create_courses',  label: 'Create/edit courses'},
    { key: 'delete_courses',  label: 'Delete courses'     },
    { key: 'enroll_students', label: 'Enroll students'    },
  ]},
  { category: 'Assignments', items: [
    { key: 'view_assignments',   label: 'View assignments'   },
    { key: 'create_assignments', label: 'Create assignments' },
    { key: 'grade_assignments',  label: 'Grade submissions'  },
    { key: 'submit_assignments', label: 'Submit assignments' },
  ]},
  { category: 'Finance', items: [
    { key: 'view_finance',    label: 'View financial data'  },
    { key: 'create_invoices', label: 'Create invoices'      },
    { key: 'process_payments',label: 'Process payments'     },
    { key: 'view_reports',    label: 'View finance reports' },
  ]},
  { category: 'Settings', items: [
    { key: 'manage_settings', label: 'Manage school settings'   },
    { key: 'view_audit_logs', label: 'View audit logs'          },
    { key: 'manage_roles',    label: 'Manage roles & permissions'},
    { key: 'manage_billing',  label: 'Manage subscription'      },
  ]},
]

type Matrix = Record<Role, Record<string, boolean>>

const defaultMatrix: Matrix = {
  admin:   { view_students:true,invite_students:true,edit_students:true,delete_students:true,view_courses:true,create_courses:true,delete_courses:true,enroll_students:true,view_assignments:true,create_assignments:true,grade_assignments:true,submit_assignments:false,view_finance:true,create_invoices:true,process_payments:true,view_reports:true,manage_settings:true,view_audit_logs:true,manage_roles:true,manage_billing:true },
  teacher: { view_students:true,invite_students:false,edit_students:false,delete_students:false,view_courses:true,create_courses:true,delete_courses:false,enroll_students:true,view_assignments:true,create_assignments:true,grade_assignments:true,submit_assignments:false,view_finance:false,create_invoices:false,process_payments:false,view_reports:false,manage_settings:false,view_audit_logs:false,manage_roles:false,manage_billing:false },
  student: { view_students:false,invite_students:false,edit_students:false,delete_students:false,view_courses:true,create_courses:false,delete_courses:false,enroll_students:false,view_assignments:true,create_assignments:false,grade_assignments:false,submit_assignments:true,view_finance:false,create_invoices:false,process_payments:false,view_reports:false,manage_settings:false,view_audit_logs:false,manage_roles:false,manage_billing:false },
  parent:  { view_students:true,invite_students:false,edit_students:false,delete_students:false,view_courses:true,create_courses:false,delete_courses:false,enroll_students:false,view_assignments:true,create_assignments:false,grade_assignments:false,submit_assignments:false,view_finance:true,create_invoices:false,process_payments:true,view_reports:false,manage_settings:false,view_audit_logs:false,manage_roles:false,manage_billing:false },
}

function storageKey(schoolId: string) {
  return `learnora_role_permissions_${schoolId}`
}

export default function RolesPermissionsPage({ onNavigate: _onNavigate }: Props) {
  const { profile } = useAuth()
  const [matrix, setMatrix] = useState<Matrix>(defaultMatrix)
  const [role,   setRole]   = useState<Role>('teacher')
  const [saved,  setSaved]  = useState(false)

  useEffect(() => {
    if (!profile?.school_id) return
    try {
      const raw = localStorage.getItem(storageKey(profile.school_id))
      if (raw) setMatrix(JSON.parse(raw))
    } catch { /* ignore parse errors */ }
  }, [profile?.school_id])

  function toggle(key: string) {
    setMatrix(prev => ({ ...prev, [role]: { ...prev[role], [key]: !prev[role][key] } }))
  }

  function handleSave() {
    if (profile?.school_id) {
      try {
        localStorage.setItem(storageKey(profile.school_id), JSON.stringify(matrix))
      } catch { /* storage quota exceeded */ }
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <DashboardLayout
      activePage="settings"
      onNavigate={_onNavigate}
      title="Roles & Permissions"
      subtitle="Control what each role can access and do"
      nav={adminNav}
      user={profileToSidebarUser(profile)}
    >
      <div className="flex flex-col gap-5 max-w-[820px]">

        {/* Info note */}
        <div className="bg-primary/5 border border-primary/15 rounded-card px-5 py-3.5 text-sm text-muted">
          This reference shows what each role is allowed to do. Actual system access is enforced by database security policies — changes here document your intended configuration for your team.
        </div>

        {/* Role selector */}
        <div className="flex gap-3 flex-wrap">
          {roles.map(r => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`flex items-center gap-2 h-10 px-5 rounded-pill text-sm font-semibold border-2 transition-all ${role === r.id ? 'border-primary bg-primary text-white shadow-primary' : 'border-black/12 text-foreground hover:border-primary'}`}
            >
              <Shield size={13} /> {r.label}
            </button>
          ))}
        </div>

        {/* Permission matrix */}
        <div className="flex flex-col gap-4">
          {permissions.map(({ category, items }) => (
            <div key={category} className="bg-surface rounded-card shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-black/6 bg-canvas">
                <p className="text-sm font-bold text-foreground">{category}</p>
              </div>
              <div className="divide-y divide-black/4">
                {items.map(({ key, label }) => {
                  const enabled = matrix[role][key]
                  return (
                    <div key={key} className="flex items-center justify-between px-5 py-3.5">
                      <p className="text-sm text-foreground">{label}</p>
                      <button
                        onClick={() => toggle(key)}
                        className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors ${enabled ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                      >
                        {enabled ? <Check size={12} /> : <X size={12} />}
                        {enabled ? 'Allowed' : 'Denied'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 h-11 px-6 bg-primary text-white text-sm font-semibold rounded-pill shadow-primary hover:bg-primary-deep transition-colors"
          >
            <Save size={15} /> Save Configuration
          </button>
          {saved && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
              <CheckCircle2 size={16} /> Saved!
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
