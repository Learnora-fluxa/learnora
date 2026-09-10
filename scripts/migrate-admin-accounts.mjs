#!/usr/bin/env node
// scripts/migrate-admin-accounts.mjs
//
// Moves admin/super_admin accounts from one Supabase project to another via
// the Auth Admin API -- NOT by copying auth.users rows directly. Supabase
// manages the `auth` schema internally and its shape can differ between
// projects created at different times, so hand-copying that table is
// fragile and unsupported. The Admin API is the stable, official way to
// create users in a project you don't otherwise have data for.
//
// What this does, per admin/super_admin profile found in the SOURCE project:
//   1. Creates the user in the TARGET project (new random internal id --
//      email stays the same, but the id will differ from the source).
//   2. Inserts a matching row into TARGET public.profiles under the new id.
//   3. Generates a password-recovery link so that person can set their own
//      password on the new project (their old password can't be carried
//      over -- Supabase never exposes the raw password, only a hash tied to
//      that project's auth internals).
//
// It assumes `public.schools` rows referenced by these profiles already
// exist in the target project (see docs/ENVIRONMENTS.md step 1b -- copy
// those first, or this will fail on the school_id foreign key).
//
// Run from apps/api so node resolves the already-installed
// @supabase/supabase-js from node_modules:
//
//   cd apps/api
//   SOURCE_SUPABASE_URL=... SOURCE_SUPABASE_SERVICE_ROLE_KEY=... \
//   TARGET_SUPABASE_URL=... TARGET_SUPABASE_SERVICE_ROLE_KEY=... \
//   node ../../scripts/migrate-admin-accounts.mjs
//
// Both *_SERVICE_ROLE_KEY values are highly sensitive -- run this from your
// own terminal, not pasted into a shared chat, and don't commit them.

import { createClient } from '@supabase/supabase-js'

const required = [
  'SOURCE_SUPABASE_URL',
  'SOURCE_SUPABASE_SERVICE_ROLE_KEY',
  'TARGET_SUPABASE_URL',
  'TARGET_SUPABASE_SERVICE_ROLE_KEY',
]
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`)
    process.exit(1)
  }
}

const source = createClient(process.env.SOURCE_SUPABASE_URL, process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY)
const target = createClient(process.env.TARGET_SUPABASE_URL, process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY)

const { data: profiles, error: readErr } = await source
  .from('profiles')
  .select('id, email, full_name, role, school_id, phone, avatar_url, is_active')
  .in('role', ['admin', 'super_admin'])

if (readErr) {
  console.error('Failed to read admin/super_admin profiles from source:', readErr.message)
  process.exit(1)
}

console.log(`Found ${profiles.length} admin/super_admin profile(s) to migrate.\n`)

for (const p of profiles) {
  if (!p.email) {
    console.warn(`Skipping profile ${p.id} -- no email on file.`)
    continue
  }

  const { data: created, error: createErr } = await target.auth.admin.createUser({
    email: p.email,
    email_confirm: true,
    user_metadata: { full_name: p.full_name },
  })

  if (createErr) {
    console.error(`[${p.email}] failed to create user in target project:`, createErr.message)
    continue
  }

  const newId = created.user.id

  const { error: profileErr } = await target.from('profiles').insert({
    id: newId,
    school_id: p.school_id,
    role: p.role,
    full_name: p.full_name,
    email: p.email,
    avatar_url: p.avatar_url,
    phone: p.phone,
    is_active: p.is_active,
  })

  if (profileErr) {
    console.error(`[${p.email}] created auth user but failed to insert profile:`, profileErr.message)
    continue
  }

  const { data: link, error: linkErr } = await target.auth.admin.generateLink({
    type: 'recovery',
    email: p.email,
  })

  if (linkErr) {
    console.error(`[${p.email}] migrated, but failed to generate a password reset link:`, linkErr.message)
  } else {
    console.log(`[${p.email}] migrated (role=${p.role}). Password reset link:\n  ${link.properties.action_link}\n`)
  }
}

console.log('Done. Send each person their reset link so they can set a password on the new project.')
