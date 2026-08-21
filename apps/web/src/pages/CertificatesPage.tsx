import { useState, useEffect } from 'react'
import { Award, Download, Eye, Star } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

interface Certificate {
  id:    string
  title: string
  issuer: string
  date:  string
  score: number
  grade: string
  color: string
  hours: number
}

const CERT_COLORS = ['#4b75ff','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899']

function scoreToGrade(s: number) {
  if (s >= 90) return 'A+'
  if (s >= 80) return 'A'
  if (s >= 75) return 'B+'
  if (s >= 70) return 'B'
  return 'C'
}

function gradeColor(g: string) {
  if (g.startsWith('A')) return 'text-green-600 bg-green-50'
  if (g.startsWith('B')) return 'text-primary bg-primary/10'
  return 'text-muted bg-canvas'
}

export default function CertificatesPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [certs,   setCerts]   = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile?.id) loadCerts() }, [profile?.id])

  async function loadCerts() {
    setLoading(true)
    const sid      = profile!.id
    const schoolId = profile!.school_id!

    // A "certificate" = a grade_summary with avg_score, joined to subjects and school name
    const [gsRes, schRes] = await Promise.all([
      supabase.from('grade_summaries')
        .select('subject_id, avg_score, subjects!subject_id(name)')
        .eq('student_id', sid)
        .eq('school_id', schoolId),
      supabase.from('schools').select('name').eq('id', schoolId).maybeSingle(),
    ])

    const gs  = (gsRes.data ?? []) as unknown as { subject_id: string; avg_score: number | null; subjects: { name: string } | null }[]
    const sch = (schRes.data as { name: string | null } | null)?.name ?? 'Your School'

    const result: Certificate[] = gs
      .filter(g => g.avg_score !== null)
      .map((g, i) => {
        const score = Math.round(g.avg_score ?? 0)
        return {
          id:     g.subject_id,
          title:  `${g.subjects?.name ?? 'Subject'} — Certificate`,
          issuer: sch,
          date:   'Current Term',
          score,
          grade:  scoreToGrade(score),
          color:  CERT_COLORS[i % CERT_COLORS.length],
          hours:  Math.round(score * 1.2),
        }
      })

    setCerts(result)
    setLoading(false)
  }

  const avgScore = certs.length > 0 ? Math.round(certs.reduce((s, c) => s + c.score, 0) / certs.length) : 0
  const totalHrs = certs.reduce((s, c) => s + c.hours, 0)

  return (
    <DashboardLayout
      activePage="profile"
      onNavigate={onNavigate}
      title="Certificates"
      subtitle="Your earned course and academic certificates"
      user={sidebarUser}
    >
      {loading ? (
        <div className="text-center py-16 text-sm text-muted">Loading certificates…</div>
      ) : certs.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <Award size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No certificates yet. Complete subjects to earn them.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Certificates Earned', value: certs.length,                   icon: Award, color: 'text-primary bg-primary/10'    },
              { label: 'Total Learning Hours', value: totalHrs,                      icon: Star,  color: 'text-amber-600 bg-amber-50'    },
              { label: 'Average Score',        value: `${scoreToGrade(avgScore)} / ${avgScore}%`, icon: Award, color: 'text-green-600 bg-green-50' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-surface rounded-card shadow-sm p-5">
                <div className={`size-9 rounded-full flex items-center justify-center mb-2 ${color}`}><Icon size={15} /></div>
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-bold text-foreground mb-3">Earned Certificates</h2>
          <div className="flex flex-col gap-3">
            {certs.map(c => (
              <div key={c.id} className="bg-surface rounded-card shadow-sm overflow-hidden flex">
                <div className="w-1.5 shrink-0" style={{ background: c.color }} />
                <div className="flex-1 flex items-center gap-4 px-5 py-4 flex-wrap">
                  <div className="size-12 rounded-full shrink-0 flex items-center justify-center" style={{ background: c.color + '18' }}>
                    <Award size={20} style={{ color: c.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{c.title}</p>
                    <p className="text-xs text-muted mt-0.5">{c.issuer} · {c.date}</p>
                    <p className="text-xs text-muted mt-0.5">{c.hours} learning hours</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${gradeColor(c.grade)}`}>
                      Grade {c.grade} · {c.score}%
                    </span>
                    <button className="flex items-center gap-1.5 h-8 px-3 border border-black/15 rounded-full text-xs text-muted hover:text-primary hover:border-primary transition-colors">
                      <Eye size={11} /> View
                    </button>
                    <button className="flex items-center gap-1.5 h-8 px-3 bg-primary/10 text-primary rounded-full text-xs font-semibold hover:bg-primary hover:text-white transition-colors">
                      <Download size={11} /> PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
