# Learnora — SQL Migrations Tracker
_Paste each block into the Supabase SQL Editor. Tick the box when done._
_Safe to re-run: every statement uses `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`._

---

## ✅ 1 — Base schema (initial deploy)
The full `supabase/schema.sql` was deployed at project start. All core tables exist.

---

## ✅ 2 — Option C tables (timetable, quiz, badges)
_Confirmed run by user._

```sql
-- Timetable entries
CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id),
  day        TEXT NOT NULL,
  period     INT NOT NULL,
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  room       TEXT,
  UNIQUE(class_id, day, period)
);
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school_members_read_tt" ON timetable_entries
  FOR SELECT USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "admin_teacher_write_tt" ON timetable_entries
  FOR ALL USING (school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('admin','teacher','super_admin')
  ))
  WITH CHECK (school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('admin','teacher','super_admin')
  ));

-- Quiz questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   UUID REFERENCES lessons(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  type        TEXT DEFAULT 'mcq' CHECK (type IN ('mcq','truefalse','short')),
  options     JSONB,
  explanation TEXT,
  points      INT DEFAULT 1,
  order_index INT DEFAULT 0,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school_read_qq" ON quiz_questions
  FOR SELECT USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "teacher_write_qq" ON quiz_questions
  FOR ALL USING (school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin','super_admin')
  ))
  WITH CHECK (school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin','super_admin')
  ));

-- Quiz attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id    UUID REFERENCES lessons(id),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  answers      JSONB,
  score        INT,
  max_score    INT,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_quiz_attempts" ON quiz_attempts
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "teacher_read_qa" ON quiz_attempts
  FOR SELECT USING (school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin')
  ));

-- Badge claims
CREATE TABLE IF NOT EXISTS public.badge_claims (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  reward_id  TEXT NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, reward_id)
);
ALTER TABLE badge_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_claims" ON badge_claims
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
```

---

## ✅ 3 — Batch B tables (feature flags, support tickets, platform settings)
_Confirmed run by user._

```sql
-- Feature flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID REFERENCES schools(id) ON DELETE CASCADE,
  flag_key   TEXT NOT NULL,
  enabled    BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, flag_key)
);
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_feature_flags" ON feature_flags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID REFERENCES schools(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL,
  body       TEXT,
  status     TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority   TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_support_tickets" ON support_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
CREATE POLICY "school_own_tickets" ON support_tickets
  FOR SELECT USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "school_create_tickets" ON support_tickets
  FOR INSERT WITH CHECK (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));

-- Platform settings (key-value)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_platform_settings" ON platform_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
```

---

## ✅ 4 — Batch D — notification_prefs column
_Confirmed run by user._

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB
  DEFAULT '{"email":true,"push":true,"sms":false,"announcements":true,"grades":true,
            "attendance":true,"assignments":true,"payments":true}'::jsonb;
```

---

## ✅ 5 — Batch I — teacher_resources table
_Confirmed run by user ("The table has been created")._

```sql
CREATE TABLE IF NOT EXISTS public.teacher_resources (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id   UUID REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  title      TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('pdf','video','link','doc')),
  file_url   TEXT,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE teacher_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher_own_resources" ON teacher_resources
  FOR ALL
  USING  (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "admin_manage_resources" ON teacher_resources
  FOR ALL
  USING  (school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')
  ))
  WITH CHECK (school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')
  ));
```

---

## ✅ 6 — platform_config table (Plans & Pricing)
_Confirmed run by user._

```sql
CREATE TABLE IF NOT EXISTS public.platform_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  per_student_price INTEGER NOT NULL DEFAULT 850,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by        UUID REFERENCES public.profiles(id)
);

-- Seed one row if none exists
INSERT INTO public.platform_config (per_student_price)
SELECT 850
WHERE NOT EXISTS (SELECT 1 FROM public.platform_config);

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (admins need the price for billing display)
CREATE POLICY "platform_config_read" ON public.platform_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only super_admin can write
CREATE POLICY "platform_config_write" ON public.platform_config
  FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
```

---

## ✅ 7 — email_templates table
_Confirmed run by user._

```sql
CREATE TABLE IF NOT EXISTS public.email_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'General',
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_superadmin" ON public.email_templates
  FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

INSERT INTO public.email_templates (key, name, category, subject, body) VALUES
  ('welcome_student', 'Welcome — Student', 'Onboarding',
   'Welcome to Learnora, {{first_name}}!',
   'Hi {{first_name}},' || chr(10) || chr(10) ||
   'Welcome to Learnora! Your account has been set up at {{school_name}}.' || chr(10) || chr(10) ||
   'You can log in at: {{login_url}}' || chr(10) ||
   'Your temporary password is: {{temp_password}}' || chr(10) || chr(10) ||
   'We''re excited to have you on board.' || chr(10) || chr(10) || 'The Learnora Team'),
  ('welcome_teacher', 'Welcome — Teacher', 'Onboarding',
   'Your Learnora teacher account is ready',
   'Dear {{first_name}},' || chr(10) || chr(10) ||
   'Your Learnora teacher account at {{school_name}} has been created.' || chr(10) || chr(10) ||
   'Login: {{login_url}}' || chr(10) || 'Password: {{temp_password}}' || chr(10) || chr(10) ||
   'You can begin creating courses and managing classes immediately.' || chr(10) || chr(10) ||
   'Kind regards,' || chr(10) || 'The Learnora Team'),
  ('password_reset', 'Password Reset', 'Auth',
   'Reset your Learnora password',
   'Hi {{first_name}},' || chr(10) || chr(10) ||
   'We received a request to reset your Learnora password.' || chr(10) || chr(10) ||
   'Click the link below (expires in 1 hour):' || chr(10) || '{{reset_url}}' || chr(10) || chr(10) ||
   'If you did not request this, please ignore this email.' || chr(10) || chr(10) ||
   'Learnora Security Team'),
  ('invoice_issued', 'Invoice Issued', 'Finance',
   'Your invoice #{{invoice_number}} from {{school_name}}',
   'Dear {{parent_name}},' || chr(10) || chr(10) ||
   'A new invoice of {{amount}} has been issued for {{student_name}}.' || chr(10) || chr(10) ||
   'Due date: {{due_date}}' || chr(10) || 'Pay now: {{payment_url}}' || chr(10) || chr(10) ||
   'For any queries, contact your school admin.' || chr(10) || chr(10) || 'Learnora'),
  ('assignment_reminder', 'Assignment Due Reminder', 'Notifications',
   '{{assignment_name}} is due in 24 hours',
   'Hi {{first_name}},' || chr(10) || chr(10) ||
   'This is a reminder that your assignment "{{assignment_name}}" for {{subject}} is due on {{due_date}}.' || chr(10) || chr(10) ||
   'Submit here: {{submission_url}}' || chr(10) || chr(10) || 'Good luck!' || chr(10) || 'Learnora'),
  ('subscription_renewal', 'Subscription Renewal', 'Finance',
   'Your Learnora subscription renews in 7 days',
   'Hi {{admin_name}},' || chr(10) || chr(10) ||
   'Your {{plan_name}} subscription for {{school_name}} renews on {{renewal_date}}.' || chr(10) || chr(10) ||
   'Amount: {{amount}}' || chr(10) || 'Update payment details: {{billing_url}}' || chr(10) || chr(10) ||
   'Thank you,' || chr(10) || 'Learnora Billing')
ON CONFLICT (key) DO NOTHING;
```

---

## ✅ 8 — Paystack: invoices.paystack_reference column
_Confirmed run by user._

```sql
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS paystack_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_paystack_ref
  ON public.invoices(paystack_reference);
```

**After running this:** also set the webhook secret in Supabase:
```
npx supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxxxx
npx supabase functions deploy paystack-webhook
```
Then register `https://njriewvlsufzvxgfpzkg.supabase.co/functions/v1/paystack-webhook` in your Paystack dashboard.

---

## ✅ 9 — teacher-resources Storage bucket
_Confirmed created by user._

- **Bucket name:** `teacher-resources`
- **Public:** No (private)

---

## ✅ 10 — Offline payments schema
_Confirmed run by user._

```sql
-- Expand invoice status to include pending_offline
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('unpaid','paid','partial','waived','pending_offline'));

-- Track how fees were paid and who confirmed
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_method  TEXT DEFAULT 'paystack',
  ADD COLUMN IF NOT EXISTS confirmed_by    UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS confirmed_at    TIMESTAMPTZ;

-- Track subscription payment method + confirmation
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS subscription_payment_method TEXT DEFAULT 'paystack',
  ADD COLUMN IF NOT EXISTS subscription_confirmed_by   UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS subscription_confirmed_at   TIMESTAMPTZ;

-- School bank account details (for parent offline fee payments)
ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS bank_name           TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name   TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT;

-- Learnora bank account details (for subscription offline payments)
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS bank_name           TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name   TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
```

---

## 11 — Daily.co room name column
_Run this in Supabase SQL Editor before testing live classes._

```sql
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS daily_room_name TEXT;
```

> `daily_room_url` already existed in the base schema. This adds the room name (needed server-side to mint meeting tokens).

---

## Summary

| # | Migration | Status |
|---|-----------|--------|
| 1 | Base schema (`schema.sql`) | ✅ Done |
| 2 | Option C tables (timetable, quiz, badges) | ✅ Done |
| 3 | Batch B tables (feature_flags, support_tickets, platform_settings) | ✅ Done |
| 4 | `profiles.notification_prefs` column | ✅ Done |
| 5 | `teacher_resources` table | ✅ Done |
| 6 | `platform_config` table + seed | ✅ Done |
| 7 | `email_templates` table + seed | ✅ Done |
| 8 | `invoices.paystack_reference` column | ✅ Done |
| 9 | `teacher-resources` Storage bucket | ✅ Done |
| 10 | Offline payments schema (invoices, schools, school_settings, platform_config) | ✅ Done |
| 11 | `live_sessions.daily_room_name` column | ✅ Done |
