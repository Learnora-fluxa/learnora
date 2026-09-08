# Dev / Prod Environments

Learnora runs on three services that each need a separate "production" and "development"
instance: **Supabase** (database + auth + storage + edge functions), **Render** (the
`apps/api` NestJS service), and **Vercel** (the `apps/web` frontend). This doc is the
runbook for setting that split up, and the checklist for staying safe once it exists.

Before this change there was only one Supabase project, and local development, Render,
and Vercel all pointed at it -- so testing locally or on a preview branch could read or
write real school data. The steps below fix that.

## 1. Supabase: create the dev project

1. First, make sure **production** is fully up to date: open the SQL Editor on your
   existing (production) Supabase project and confirm every file in
   [`supabase/migrations/`](../supabase/migrations) has been applied -- run
   `select column_name from information_schema.columns where table_name = 'schools'`
   and diff it against `supabase/schema.sql` if you're not sure. Do this first so the
   dev project you create next starts from the same schema as prod, not an older one.
2. In the Supabase dashboard, create a **new project** -- name it something like
   `learnora-dev`. Same org, a region close to you is fine (it doesn't need to match
   prod's region).
3. Open its SQL Editor and paste in the full [`supabase/schema.sql`](../supabase/schema.sql)
   to create every table, function, and policy fresh. (This file is meant to be pasted
   wholesale into a brand-new project -- see the comment at its top.)
4. Create your own super-admin user in this dev project the same way described in
   [`docs/legacy/HANDOFF.md`](legacy/HANDOFF.md): sign up normally, then in the SQL
   editor run
   ```sql
   update public.profiles set role = 'super_admin', school_id = null, full_name = 'Dev Admin'
   where email = 'you@example.com';
   ```
5. Leave email confirmation disabled on dev (fine for testing). **Double check it's
   enabled on production** -- this was flagged in the legacy notes as a pre-production
   TODO and is worth confirming now while you're setting this up.
6. From the dev project's Settings -> API, copy:
   - Project URL
   - `anon` public key
   - `service_role` key
   - JWT secret (Settings -> API -> JWT Settings)

   Keep these next to your existing prod values -- you'll paste them into local env
   files, Vercel, and Render below, and nowhere else.

From now on, any new file added to `supabase/migrations/` should be run against **dev
first**, verified, then run against **prod**. The migrations folder stays the single
source of truth for what each project's schema should look like; `schema.sql` should be
updated to match whenever you add a migration, so a brand-new project can still be
bootstrapped from one paste.

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

## 3. Vercel (apps/web)

Vercel already separates deployments into **Production** (the `main` branch) and
**Preview** (every other branch, including `dev`). Use that:

1. Project Settings -> Environment Variables.
2. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL` scoped to
   **Production only**, with your existing prod values (they're probably already
   there -- just confirm the scope).
3. Add the same three keys again, scoped to **Preview**, and under "Branch" restrict
   them to the `dev` branch specifically (Vercel lets you limit a Preview env var to
   selected branches). Use your dev Supabase project's URL/key and the dev Render
   API URL from step 4.
4. Leave `VITE_API_BASE_URL` for Preview pointing at the `learnora-api-dev` Render
   service you create below, not the production API.

Any other preview deploy (a random feature-branch PR) will fall back to whatever
Preview default you set -- point that at dev too, so a stray PR preview can never
reach prod.

## 4. Render (apps/api)

Create a second Web Service rather than touching your existing one:

1. Render dashboard -> New -> Web Service -> same GitHub repo.
2. Branch: `dev`. Name: `learnora-api-dev`.
3. Build command: `npm install && npm run build -w apps/api`
   Start command: `npm run start -w apps/api`
4. Environment variables -- set every key from `apps/api/.env.production.example`'s
   list, but with your **dev** Supabase project's values and `NODE_ENV=development`.

A [`render.yaml`](../render.yaml) blueprint is included in the repo root as an
optional, non-destructive alternative: it describes both a `learnora-api` (main) and
`learnora-api-dev` (dev) service so the whole setup is reproducible from one file. It
only creates services when you explicitly import it as a Blueprint in Render -- it
will not touch your existing manually-created service unless its name matches exactly.
Secret values are marked `sync: false`, meaning Render will prompt you to fill them in
by hand rather than storing them in the repo.

Once both services exist, `apps/api/src/main.ts` logs the environment and the
Supabase project host it's connected to on every boot -- check the Render logs after
a deploy to confirm each service is talking to the right project.

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
