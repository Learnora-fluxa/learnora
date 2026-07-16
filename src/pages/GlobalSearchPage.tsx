import { useState, useEffect, useCallback } from 'react'
import { Search, BookOpen, PenLine, User, X, Megaphone, GraduationCap } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { teacherNav, adminNav, superAdminNav } from '../components/layout/Sidebar'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Props = { onNavigate: (page: string) => void }

type RType = 'course' | 'assignment' | 'student' | 'teacher' | 'announcement'

type Result = { type: RType; title: string; sub: string; page: string }

const recentSearches = ['Physics', 'Assignment', 'Attendance', 'English']

const iconMap: Record<RType, { Icon: typeof BookOpen; color: string; bg: string }> = {
  course:       { Icon: BookOpen,      color: 'text-primary',      bg: 'bg-primary/10'     },
  assignment:   { Icon: PenLine,       color: 'text-amber-600',    bg: 'bg-amber-50'       },
  student:      { Icon: User,          color: 'text-accent-mint',  bg: 'bg-accent-mint/10' },
  teacher:      { Icon: GraduationCap, color: 'text-purple-600',   bg: 'bg-purple-50'      },
  announcement: { Icon: Megaphone,     color: 'text-primary-deep', bg: 'bg-primary/8'      },
}

type Category = 'All' | 'Courses' | 'Assignments' | 'People' | 'Announcements'

const categoryMap: Record<Category, RType[] | null> = {
  'All':           null,
  'Courses':       ['course'],
  'Assignments':   ['assignment'],
  'People':        ['student', 'teacher'],
  'Announcements': ['announcement'],
}

export default function GlobalSearchPage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [query,    setQuery]    = useState('')
  const [category, setCategory] = useState<Category>('All')
  const [results,  setResults]  = useState<Result[]>([])
  const [loading,  setLoading]  = useState(false)

  const schoolId = profile?.school_id ?? ''

  const runSearch = useCallback(async (q: string) => {
    if (!schoolId || q.trim().length < 2) { setResults([]); return }
    setLoading(true)

    const term = `%${q.trim()}%`
    const [coursesRes, assignRes, profRes, annRes] = await Promise.all([
      supabase.from('courses').select('id, title').ilike('title', term).eq('school_id', schoolId).limit(5),
      supabase.from('assignments').select('id, title, due_date').ilike('title', term).eq('school_id', schoolId).limit(5),
      supabase.from('profiles').select('id, full_name, role').ilike('full_name', term).eq('school_id', schoolId).limit(5),
      supabase.from('announcements').select('id, title, published_at').ilike('title', term).eq('school_id', schoolId).limit(5),
    ])

    const items: Result[] = []

    for (const c of (coursesRes.data ?? []) as { id: string; title: string }[]) {
      items.push({ type: 'course', title: c.title, sub: 'Course', page: 'course-details' })
    }
    for (const a of (assignRes.data ?? []) as { id: string; title: string; due_date: string | null }[]) {
      const due = a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'No due date'
      items.push({ type: 'assignment', title: a.title, sub: `Assignment · ${due}`, page: 'assignments' })
    }
    for (const p of (profRes.data ?? []) as { id: string; full_name: string | null; role: string | null }[]) {
      const rType = p.role === 'teacher' ? 'teacher' : 'student'
      items.push({ type: rType, title: p.full_name ?? 'Unknown', sub: `${p.role ? p.role.charAt(0).toUpperCase() + p.role.slice(1) : 'User'}`, page: 'student-profile' })
    }
    for (const n of (annRes.data ?? []) as { id: string; title: string; published_at: string | null }[]) {
      const date = n.published_at ? new Date(n.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
      items.push({ type: 'announcement', title: n.title, sub: `Announcement${date ? ` · ${date}` : ''}`, page: 'announcements' })
    }

    setResults(items)
    setLoading(false)
  }, [schoolId])

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, runSearch])

  const types = categoryMap[category]
  const filtered = types ? results.filter(r => types.includes(r.type)) : results
  const showResults = query.trim().length > 1 || category !== 'All'

  return (
    <DashboardLayout
      activePage="search"
      onNavigate={onNavigate}
      title="Search"
      subtitle="Find anything across Learnora"
      nav={
        profile?.role === 'teacher'     ? teacherNav
        : profile?.role === 'admin'       ? adminNav
        : profile?.role === 'super_admin' ? superAdminNav
        : undefined
      }
      user={sidebarUser}
    >
      <div className="max-w-[760px] flex flex-col gap-5">

        {/* Search input */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search courses, assignments, students, teachers..."
            className="w-full h-14 pl-12 pr-12 border border-black/20 rounded-card text-base text-foreground placeholder:text-muted outline-none focus:border-primary shadow-sm transition-colors"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['All', 'Courses', 'Assignments', 'People', 'Announcements'] as Category[]).map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${category === c ? 'bg-primary text-white shadow-primary' : 'bg-surface text-muted hover:text-primary border border-black/10'}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Recent (when no query and All category) */}
        {!query && category === 'All' && (
          <div className="bg-surface rounded-card shadow-sm p-5">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Recent Searches</p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map(s => (
                <button key={s} onClick={() => setQuery(s)}
                  className="flex items-center gap-2 h-8 px-3 bg-canvas rounded-full text-sm text-muted hover:text-primary hover:bg-primary/8 transition-colors">
                  <Search size={12} />{s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && <div className="text-center py-6 text-sm text-muted">Searching…</div>}

        {/* Results */}
        {!loading && showResults && filtered.length > 0 && (
          <div className="bg-surface rounded-card shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-black/6 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                {query.trim() ? ` for "${query}"` : ''}
              </p>
              {category !== 'All' && (
                <span className="text-xs text-primary font-semibold">{category}</span>
              )}
            </div>
            <div className="divide-y divide-black/4">
              {filtered.map((r, i) => {
                const { Icon, color, bg } = iconMap[r.type]
                return (
                  <button key={i} onClick={() => onNavigate(r.page)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-canvas/60 transition-colors text-left">
                    <div className={`size-9 rounded-card ${bg} flex items-center justify-center shrink-0`}>
                      <Icon size={15} className={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{r.title}</p>
                      <p className="text-xs text-muted mt-0.5">{r.sub}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-muted uppercase tracking-wider shrink-0 capitalize">{r.type}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {!loading && showResults && filtered.length === 0 && (
          <div className="text-center py-12 text-muted">
            <Search size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No results{query.trim() ? ` for "${query}"` : ''}</p>
            <p className="text-xs mt-1">Try different keywords or select a different category.</p>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
