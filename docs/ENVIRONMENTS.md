# Dev / Prod Environments

Learnora runs on three services that each need a separate "production" and "development"
instance: **Supabase** (database + auth + storage + edge functions), **Render** (the
`apps/api` NestJS service), and **Vercel** (the `apps/web` frontend). This doc is the
runbook for that split, and the checklist for staying safe once it exists.

The plan: the Supabase project you already have becomes the **dev** project (it already
has the real schema and is fine to keep experimenting against). A brand-new Supabase
project becomes **production** -- clean, with just the schema and the admin/super_admin
accounts carried over, not the rest of the data. Once traffic is cut over to it, the old
project's job changes from "the live database" to "the thing dev points at" -- nothing
about it needs to change for that.

## 1. Create the new production project and migrate schema + admin accounts

This uses `pg_dump`/`psql` directly against Postgres rather than pasting `schema.sql` by
hand, so the new project gets the database's *actual* current structure -- not whatever
`schema.sql` says, which can drift out of sync (that's exactly what caused the
`onboarding_admin_email` PGRST204 error earlier).

You'll need `pg_dump` and `psql` installed locally (Postgres 17 client tools, matching
current Supabase): `brew install libpq && brew link --force libpq` on macOS.

### 1a. Create the project and get both connection strings

1. Supabase dashboard -> New project. This is the one that will become production.
2. For **both** the old and new projects: Settings -> Database -> Connection string ->
   copy the **Direct connection** URI (port 5432, not the 6543 pooler -- `pg_dump`
   needs a direct session connection). You'll be prompted for each project's database
   password there too.

Keep both URIs somewhere temporary on your machine (not in a repo file, not pasted into
chat) -- each contains a database password.

### 1b. Dump and restore the schema (structure only, no rows)

```bash
pg_dump "postgresql://postgres:[OLD_DB_PASSWORD]@[OLD_HOST]:5432/postgres" \
  --schema=public --schema-only --no-owner --no-privileges \
  -f public_schema.sql

psql "postgresql://postgres:[NEW_DB_PASSWORD]@[NEW_HOST]:5432/postgres" \
  -f public_schema.sql
```

`--schema=public` deliberately excludes Supabase's own internal schemas (`auth`,
`storage`, `realtime`, etc.) -- those already exist, fully configured, in every new
project, and copying them risks version mismatches between projects created at
different times. `--no-owner --no-privileges` skips role/ownership statements, since
Supabase provisions the same roles (`anon`, `authenticated`, `service_role`, ...)
identically in every project -- there's nothing to migrate there.

Check the new project's Table Editor afterward: every table, function, and RLS policy
from `supabase/migrations/` should now be present.

### 1c. Copy the schools those admins belong to

Admin profiles reference a `school_id` -- copy just those specific school rows so the
foreign key resolves:

```bash
psql "postgresql://postgres:[OLD_DB_PASSWORD]@[OLD_HOST]:5432/postgres" -c "\copy (select s.* from public.schools s where s.id in (select school_id from public.profiles where role in ('admin','super_admin') and school_id is not null)) to 'schools_seed.csv' with csv"

psql "postgresql://postgres:[NEW_DB_PASSWORD]@[NEW_HOST]:5432/postgres" -c "\copy public.schools from 'schools_seed.csv' with csv"
```

### 1d. Migrate the admin/super_admin accounts

Don't copy `auth.users` rows directly -- Supabase manages that schema internally and its
shape isn't guaranteed to match between two independently-created projects, so hand-copying
it is fragile and unsupported. Instead, [`scripts/migrate-admin-accounts.mjs`](../scripts/migrate-admin-accounts.mjs)
uses the Auth Admin API to recreate just the admin/super_admin accounts in the new
project and carry their `profiles` row over under the new user id:

```bash
cd apps/api
SOURCE_SUPABASE_URL=https://<old-project-ref>.supabase.co \
SOURCE_SUPABASE_SERVICE_ROLE_KEY=<old-service-role-key> \
TARGET_SUPABASE_URL=https://<new-project-ref>.supabase.co \
TARGET_SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key> \
node ../../scripts/migrate-admin-accounts.mjs
```

It prints a password-reset link per migrated account -- send each admin their link so
they can set a password on the new project (their old password can't be carried over;
Supabase never exposes the raw password, only a project-specific hash).

Everyone else (students, parents, teachers) is *not* migrated -- they'll be created
fresh in the new production project going forward.

### 1e. Double-check before cutting over

- Log into the new project's dashboard -> Auth -> Users and confirm the admin accounts
  are there.
- Re-run the check from the earlier PGRST204 fix against the *new* project to confirm
  the schema matches: `select column_name from information_schema.columns where
  table_name = 'schools'`.
- Enable email confirmation on the new project's Auth settings before real users sign up
  (the old project had this disabled for testing -- don't carry that forward).

## 2. Local development

Both apps now load environment-specific files automatically, most-specific first:

- `apps/web` (Vite): `.env.development.local` -> `.env.development` -> `.env.local` ->
  `.env` when you run `npm run dev` (Vite's default mode is `development`).
- `apps/api` (Nest): `.env.development.local` -> `.env.development` -> `.env.local` ->
  `.env`, based on `NODE_ENV` (defaults to `development`).

Copy the `*.example` files and fill in your **dev** Supabase project's values --
never your production ones:

```bash
cp apps/web/.env.development.example apps/web/.env.development.local
cp apps/api/.env.development.example apps/api/.env.development.local
```

Both `.local` files are already covered by `.gitignore` and will never be committed.
There is deliberately no `.env.production.local` -- nobody should be running a local
dev server against production data. The `.env.production.example` files exist purely
as a reference for what Vercel/Render need set, documented below.

## 3. Vercel (apps/web) -- the cutover

Vercel already separates deployments into **Production** (the `main` branch) and
**Preview** (every other branch, including `dev`). Because production is *moving* to
the new Supabase project rather than starting from nothing, do this in order so dev
never goes down and the cutover is one deliberate step:

1. Project Settings -> Environment Variables. Note down the current **Production**
   values of `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` -- these are today's (soon
   to be old/dev) project's values.
2. Add those same three keys scoped to **Preview**, restricted to the `dev` branch
   specifically (Vercel lets you limit a Preview env var to selected branches). So
   `dev` now points at what production used to point at -- nothing changes for it.
3. Only once 1b-1e above are done and verified: edit the **Production**-scoped
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in place to the **new** project's
   values, and redeploy `main`. This is the actual moment production switches over.

Any other preview deploy (a random feature-branch PR) falls back to whatever Preview
default you set in step 2 -- so a stray PR preview lands on dev, never on prod.

## 4. Render (apps/api) -- the cutover

Same idea, applied to your existing `apps/api` service:

1. Open your existing Render service's Environment tab and note its current
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_JWT_SECRET` -- today's
   (soon to be dev) project's values.
2. Create a **new** Web Service (Render dashboard -> New -> Web Service -> same
   GitHub repo), branch `dev`, name `learnora-api-dev`, build command
   `npm install && npm run build -w apps/api`, start command `npm run start -w apps/api`.
   Paste in the values you just noted, with `NODE_ENV=development`. This is now your
   dev API, unchanged from what production used to be.
3. Only once 1b-1e above are done and verified: edit your **existing** service's
   `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_JWT_SECRET` in place to the
   **new** project's values and redeploy. Same service, same URL your users already
   hit -- just pointed at the new database.

A [`render.yaml`](../render.yaml) blueprint is included in the repo root as an
optional reference for what both services should look like end-state; it's not
required for the cutover above.

Once both services exist, `apps/api/src/main.ts` logs the environment and the
Supabase project host it's connected to on every boot -- check the Render logs
immediately after step 3 to confirm the switch actually took (`supabase=` should show
the new project's host).

## 5. Git workflow

- `main` -- production. Deploys to the production Render service and Vercel
  Production environment.
- `dev` -- staging. Deploys to `learnora-api-dev` on Render and the Vercel Preview
  environment (dev-scoped). This is where feature branches land first.

Flow: branch off `dev` for new work -> PR into `dev` -> verify on the dev
Supabase project via the dev Render/Vercel deployments -> PR `dev` into `main` once
verified -> that deploy is production.

## Safety checklist

- Local dev, and the `dev` branch's deployments, only ever hold credentials for the
  **dev** Supabase project. Production credentials live only in Vercel's Production
  environment vars and the `learnora-api` Render service's environment -- never in a
  file on disk.
- After any deploy, check the boot log line (`apps/api`) or dev-console line
  (`apps/web`, browser console in dev mode) that prints which Supabase project host
  it's using. A prod deploy showing a dev host, or vice versa, means an env var is
  misconfigured -- fix it before anyone uses that deployment.
- When you add a new migration file, run it on dev, sanity-check it, then run the
  same SQL on prod. Never hand-edit prod schema without also adding the migration
  file so dev (and any future environment) can catch up.
