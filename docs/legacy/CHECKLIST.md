# Learnora — Supabase Wiring Checklist

Every screen wired to Supabase MUST pass all items in this checklist before it's considered done.
No exceptions. A UI success message is not enough — the data must survive a hard refresh.

---

## The Checklist

### 1. Awaited calls
- [ ] Every Supabase call is `await`-ed inside an `async` function
- [ ] No floating promises (no `.then()` without error handling, no unawaited inserts)

### 2. Errors surfaced to the user
- [ ] Every query destructures `{ data, error }`
- [ ] If `error` is truthy, it is shown in the UI (red banner, inline message, or toast)
- [ ] The user is never silently left on a broken state

### 3. Loading states
- [ ] A loading indicator (`Loading…`, spinner, disabled button) is shown while queries run
- [ ] Buttons that trigger writes are `disabled` while `loading === true` to prevent double-submit

### 4. RLS verified
- [ ] The query works when logged in as the target role (not as service_role/admin)
- [ ] The query returns 0 rows (not an error) for a user who shouldn't see the data
- [ ] If a new RLS policy is needed, it's added to `supabase/schema.sql` as a comment-annotated block

### 5. Round-trip confirmed
- [ ] After a write (INSERT/UPDATE), navigate away and come back — the data appears without a hard refresh
- [ ] OR: after the write, re-fetch and update local state so the UI reflects the new data immediately
- [ ] Do NOT rely on optimistic state alone — confirm the DB has the row

### 6. Empty state handled
- [ ] When the query returns 0 rows, a clear empty state is shown (not a blank screen or broken layout)
- [ ] Empty state should guide the user to the next action where applicable

### 7. Type safety
- [ ] Response data is typed with a local interface (not `any`)
- [ ] Supabase nested join arrays use `as unknown as T[]` cast where needed (Supabase infers arrays, TypeScript expects single objects)

### 8. No hardcoded mock data left
- [ ] Remove any hardcoded arrays (e.g. `const students = [{ name: 'Olive'... }]`) that the Supabase data replaces
- [ ] Remove any placeholder strings tied to fake data (e.g. `'Olive Johnson'`, `'Daniel Johnson'`, `'90%'` stats)
- [ ] Replace `'—'` placeholders with real computed values where the data now exists

---

## Quick reference: common patterns

### Fetch on mount
```tsx
const [data,    setData]    = useState<Row[]>([])
const [loading, setLoading] = useState(true)
const [error,   setError]   = useState<string | null>(null)

useEffect(() => {
  async function load() {
    const { data: rows, error: err } = await supabase
      .from('table')
      .select('...')
      .eq('school_id', profile?.school_id)
    if (err) { setError(err.message); setLoading(false); return }
    setData(rows ?? [])
    setLoading(false)
  }
  if (profile?.school_id) load()
}, [profile?.school_id])
```

### Write with re-fetch
```tsx
const [saving, setSaving] = useState(false)

async function handleSubmit() {
  setSaving(true)
  const { error } = await supabase.from('table').insert({ ... })
  if (error) { setError(error.message); setSaving(false); return }
  await load()   // re-fetch to confirm persistence
  setSaving(false)
}
```

### RLS policy template (add to schema.sql)
```sql
-- TABLE: table_name
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "table_school_read" ON public.table_name
  FOR SELECT USING (school_id = get_my_school_id() OR is_super_admin());

CREATE POLICY "table_school_write" ON public.table_name
  FOR INSERT WITH CHECK (school_id = get_my_school_id());

CREATE POLICY "table_school_update" ON public.table_name
  FOR UPDATE USING (school_id = get_my_school_id());
```

---

## Definition of "done" for a wired screen

A screen is ✅ done when:
1. All checklist items above are checked
2. Tested while logged in as the correct role on the live Vercel deployment
3. Hard-refreshed — data persists
4. Tested with an empty state — no crash or blank screen
5. MOCK_AUDIT.md updated from ❌ to ✅ for that screen
