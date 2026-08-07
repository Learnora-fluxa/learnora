-- ============================================================
-- Learnora LMS — Full Database Schema
-- Paste this entire file into the Supabase SQL Editor and Run
-- ============================================================

-- ─── SCHOOLS (no dependencies) ────────────────────────────────
CREATE TABLE public.schools (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  code                TEXT UNIQUE NOT NULL,
  logo_url            TEXT,
  subscription_plan   TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  student_count       INTEGER DEFAULT 0,
  address             TEXT,
  state               TEXT,
  phone               TEXT,
  email               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROFILES (depends on schools) ───────────────────────────
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id   UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  role        TEXT NOT NULL DEFAULT 'student'
                CHECK (role IN ('student','teacher','admin','parent','super_admin')),
  full_name   TEXT,
  email       TEXT,
  avatar_url  TEXT,
  phone       TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── HELPER FUNCTIONS (profiles must exist first) ─────────────
CREATE OR REPLACE FUNCTION public.get_my_school_id()
RETURNS UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT COALESCE((SELECT role = 'super_admin' FROM public.profiles WHERE id = auth.uid()), FALSE)
$$;

-- ─── AUTO-CREATE PROFILE TRIGGER ──────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── RLS: SCHOOLS ─────────────────────────────────────────────
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schools_read"   ON public.schools FOR SELECT USING (is_super_admin() OR id = get_my_school_id());
CREATE POLICY "schools_insert" ON public.schools FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "schools_update" ON public.schools FOR UPDATE USING (is_super_admin() OR id = get_my_school_id());

-- ─── RLS: PROFILES ────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read"       ON public.profiles FOR SELECT USING (is_super_admin() OR school_id = get_my_school_id() OR id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_update_super_admin" ON public.profiles FOR UPDATE USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ─── PARENT-STUDENT LINKS ─────────────────────────────────────
CREATE TABLE public.parent_student_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id),
  parent_id   UUID NOT NULL REFERENCES public.profiles(id),
  student_id  UUID NOT NULL REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parent_id, student_id)
);

-- ─── TERMS ────────────────────────────────────────────────────
CREATE TABLE public.terms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id),
  name        TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_current  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SUBJECTS ─────────────────────────────────────────────────
CREATE TABLE public.subjects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES public.schools(id),
  name       TEXT NOT NULL,
  code       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CLASSES ──────────────────────────────────────────────────
CREATE TABLE public.classes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES public.schools(id),
  term_id    UUID REFERENCES public.terms(id),
  name       TEXT NOT NULL,
  level      TEXT,
  arm        TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CLASS SUBJECTS ───────────────────────────────────────────
CREATE TABLE public.class_subjects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES public.schools(id),
  class_id   UUID NOT NULL REFERENCES public.classes(id),
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  UNIQUE (class_id, subject_id)
);

-- ─── CLASS ENROLLMENTS ────────────────────────────────────────
CREATE TABLE public.class_enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id),
  student_id  UUID NOT NULL REFERENCES public.profiles(id),
  class_id    UUID NOT NULL REFERENCES public.classes(id),
  term_id     UUID REFERENCES public.terms(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, class_id, term_id)
);

-- ─── TEACHER ASSIGNMENTS ──────────────────────────────────────
CREATE TABLE public.teacher_assignments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES public.schools(id),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id),
  class_id   UUID NOT NULL REFERENCES public.classes(id),
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  term_id    UUID REFERENCES public.terms(id),
  UNIQUE (teacher_id, class_id, subject_id, term_id)
);

-- ─── COURSES ──────────────────────────────────────────────────
CREATE TABLE public.courses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES public.schools(id),
  class_id     UUID REFERENCES public.classes(id),
  subject_id   UUID REFERENCES public.subjects(id),
  teacher_id   UUID REFERENCES public.profiles(id),
  term_id      UUID REFERENCES public.terms(id),
  title        TEXT NOT NULL,
  description  TEXT,
  cover_url    TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MODULES ──────────────────────────────────────────────────
CREATE TABLE public.modules (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  title     TEXT NOT NULL,
  position  INTEGER DEFAULT 0
);

-- ─── LESSONS ──────────────────────────────────────────────────
CREATE TABLE public.lessons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id        UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  course_id        UUID NOT NULL REFERENCES public.courses(id),
  school_id        UUID NOT NULL REFERENCES public.schools(id),
  title            TEXT NOT NULL,
  type             TEXT DEFAULT 'video' CHECK (type IN ('video','pdf','text','quiz')),
  content_url      TEXT,
  duration_minutes INTEGER,
  position         INTEGER DEFAULT 0,
  is_published     BOOLEAN DEFAULT FALSE
);

-- ─── LESSON PROGRESS ──────────────────────────────────────────
CREATE TABLE public.lesson_progress (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id             UUID NOT NULL REFERENCES public.schools(id),
  student_id            UUID NOT NULL REFERENCES public.profiles(id),
  lesson_id             UUID NOT NULL REFERENCES public.lessons(id),
  completed             BOOLEAN DEFAULT FALSE,
  completed_at          TIMESTAMPTZ,
  last_position_seconds INTEGER DEFAULT 0,
  UNIQUE (student_id, lesson_id)
);

-- ─── COURSE RESOURCES ─────────────────────────────────────────
CREATE TABLE public.course_resources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES public.courses(id),
  school_id   UUID NOT NULL REFERENCES public.schools(id),
  name        TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_type   TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ASSIGNMENTS ──────────────────────────────────────────────
CREATE TABLE public.assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES public.schools(id),
  class_id       UUID REFERENCES public.classes(id),
  subject_id     UUID REFERENCES public.subjects(id),
  teacher_id     UUID REFERENCES public.profiles(id),
  term_id        UUID REFERENCES public.terms(id),
  title          TEXT NOT NULL,
  instructions   TEXT,
  due_date       TIMESTAMPTZ,
  max_score      INTEGER DEFAULT 100,
  attachment_url TEXT,
  is_published   BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ASSIGNMENT SUBMISSIONS ───────────────────────────────────
CREATE TABLE public.assignment_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES public.schools(id),
  assignment_id   UUID NOT NULL REFERENCES public.assignments(id),
  student_id      UUID NOT NULL REFERENCES public.profiles(id),
  submission_url  TEXT,
  submission_text TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  status          TEXT DEFAULT 'submitted'
                  CHECK (status IN ('pending','submitted','graded','late')),
  UNIQUE (assignment_id, student_id)
);

-- ─── GRADES ───────────────────────────────────────────────────
CREATE TABLE public.grades (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES public.schools(id),
  submission_id UUID NOT NULL REFERENCES public.assignment_submissions(id),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id),
  student_id    UUID NOT NULL REFERENCES public.profiles(id),
  teacher_id    UUID REFERENCES public.profiles(id),
  score         NUMERIC(5,2),
  max_score     INTEGER DEFAULT 100,
  feedback      TEXT,
  graded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ATTENDANCE ───────────────────────────────────────────────
CREATE TABLE public.attendance_records (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES public.schools(id),
  class_id   UUID NOT NULL REFERENCES public.classes(id),
  subject_id UUID REFERENCES public.subjects(id),
  teacher_id UUID REFERENCES public.profiles(id),
  term_id    UUID REFERENCES public.terms(id),
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  date       DATE NOT NULL,
  status     TEXT DEFAULT 'present' CHECK (status IN ('present','absent','late')),
  marked_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, class_id, date)
);

-- ─── LIVE SESSIONS ────────────────────────────────────────────
CREATE TABLE public.live_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES public.schools(id),
  class_id         UUID REFERENCES public.classes(id),
  subject_id       UUID REFERENCES public.subjects(id),
  teacher_id       UUID REFERENCES public.profiles(id),
  term_id          UUID REFERENCES public.terms(id),
  topic            TEXT NOT NULL,
  scheduled_at     TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  daily_room_url   TEXT,
  status           TEXT DEFAULT 'upcoming'
                   CHECK (status IN ('upcoming','live','ended')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SESSION RECORDINGS ───────────────────────────────────────
CREATE TABLE public.session_recordings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES public.schools(id),
  session_id       UUID NOT NULL REFERENCES public.live_sessions(id),
  recording_url    TEXT,
  duration_seconds INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LIVE ATTENDANCE ──────────────────────────────────────────
CREATE TABLE public.live_attendance (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES public.schools(id),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id),
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  left_at    TIMESTAMPTZ
);

-- ─── CONVERSATIONS ────────────────────────────────────────────
CREATE TABLE public.conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES public.schools(id),
  type       TEXT DEFAULT 'direct' CHECK (type IN ('direct','group')),
  name       TEXT,
  class_id   UUID REFERENCES public.classes(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CONVERSATION MEMBERS ─────────────────────────────────────
CREATE TABLE public.conversation_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  school_id       UUID NOT NULL REFERENCES public.schools(id),
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (conversation_id, user_id)
);

-- ─── MESSAGES ─────────────────────────────────────────────────
CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES public.schools(id),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id),
  body            TEXT,
  attachment_url  TEXT,
  sent_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FEE STRUCTURES ───────────────────────────────────────────
CREATE TABLE public.fee_structures (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES public.schools(id),
  term_id      UUID REFERENCES public.terms(id),
  class_id     UUID REFERENCES public.classes(id),
  name         TEXT NOT NULL,
  amount       NUMERIC(12,2) NOT NULL,
  due_date     DATE,
  is_mandatory BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INVOICES ─────────────────────────────────────────────────
CREATE TABLE public.invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES public.schools(id),
  student_id       UUID NOT NULL REFERENCES public.profiles(id),
  term_id          UUID REFERENCES public.terms(id),
  fee_structure_id UUID REFERENCES public.fee_structures(id),
  amount           NUMERIC(12,2) NOT NULL,
  status           TEXT DEFAULT 'unpaid'
                   CHECK (status IN ('unpaid','paid','partial','waived')),
  due_date         DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PAYMENTS ─────────────────────────────────────────────────
CREATE TABLE public.payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id          UUID NOT NULL REFERENCES public.schools(id),
  invoice_id         UUID NOT NULL REFERENCES public.invoices(id),
  student_id         UUID NOT NULL REFERENCES public.profiles(id),
  amount             NUMERIC(12,2) NOT NULL,
  currency           TEXT DEFAULT 'NGN',
  paystack_reference TEXT UNIQUE,
  paystack_status    TEXT,
  paid_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── GRADE SUMMARIES ──────────────────────────────────────────
CREATE TABLE public.grade_summaries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID NOT NULL REFERENCES public.schools(id),
  student_id        UUID NOT NULL REFERENCES public.profiles(id),
  subject_id        UUID REFERENCES public.subjects(id),
  term_id           UUID REFERENCES public.terms(id),
  average_score     NUMERIC(5,2),
  total_assignments INTEGER DEFAULT 0,
  grade_letter      TEXT,
  position_in_class INTEGER,
  UNIQUE (student_id, subject_id, term_id)
);

-- ─── REPORT CARDS ─────────────────────────────────────────────
CREATE TABLE public.report_cards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES public.schools(id),
  student_id   UUID NOT NULL REFERENCES public.profiles(id),
  term_id      UUID REFERENCES public.terms(id),
  status       TEXT DEFAULT 'draft' CHECK (status IN ('draft','published')),
  pdf_url      TEXT,
  published_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, term_id)
);

-- ─── CALENDAR EVENTS ──────────────────────────────────────────
CREATE TABLE public.calendar_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id),
  title       TEXT NOT NULL,
  description TEXT,
  start_date  DATE NOT NULL,
  end_date    DATE,
  type        TEXT DEFAULT 'activity'
              CHECK (type IN ('exam','holiday','activity','deadline')),
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID REFERENCES public.schools(id),
  user_id    UUID NOT NULL REFERENCES public.profiles(id),
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT DEFAULT 'general',
  read       BOOLEAN DEFAULT FALSE,
  link       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ANNOUNCEMENTS ────────────────────────────────────────────
CREATE TABLE public.announcements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES public.schools(id),
  author_id    UUID REFERENCES public.profiles(id),
  title        TEXT NOT NULL,
  body         TEXT,
  target_roles TEXT[] DEFAULT ARRAY['student','teacher','parent'],
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AI SESSIONS ──────────────────────────────────────────────
CREATE TABLE public.ai_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID NOT NULL REFERENCES public.schools(id),
  student_id UUID NOT NULL REFERENCES public.profiles(id),
  title      TEXT,
  subject    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AI MESSAGES ──────────────────────────────────────────────
CREATE TABLE public.ai_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_sessions(id) ON DELETE CASCADE,
  school_id  UUID NOT NULL REFERENCES public.schools(id),
  role       TEXT DEFAULT 'user' CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PLATFORM SCHOOLS (Super Admin view) ──────────────────────
CREATE TABLE public.platform_schools (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID UNIQUE REFERENCES public.schools(id),
  plan            TEXT DEFAULT 'free',
  mrr_ngn         NUMERIC(12,2) DEFAULT 0,
  students_billed INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'active',
  onboarded_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_schools_superadmin" ON public.platform_schools
  FOR ALL USING (is_super_admin());

-- ─── FEATURE FLAGS ────────────────────────────────────────────
CREATE TABLE public.feature_flags (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id),
  flag_name TEXT NOT NULL,
  enabled   BOOLEAN DEFAULT FALSE,
  UNIQUE (school_id, flag_name)
);

-- ─── SUPPORT TICKETS ──────────────────────────────────────────
CREATE TABLE public.support_tickets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID REFERENCES public.schools(id),
  subject    TEXT NOT NULL,
  body       TEXT,
  status     TEXT DEFAULT 'open'
             CHECK (status IN ('open','in_progress','resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────
CREATE INDEX ON public.profiles (school_id);
CREATE INDEX ON public.profiles (role);
CREATE INDEX ON public.classes (school_id);
CREATE INDEX ON public.class_enrollments (student_id);
CREATE INDEX ON public.class_enrollments (class_id);
CREATE INDEX ON public.teacher_assignments (teacher_id);
CREATE INDEX ON public.assignments (class_id);
CREATE INDEX ON public.assignment_submissions (assignment_id);
CREATE INDEX ON public.assignment_submissions (student_id);
CREATE INDEX ON public.attendance_records (student_id, date);
CREATE INDEX ON public.attendance_records (class_id, date);
CREATE INDEX ON public.messages (conversation_id, sent_at);
CREATE INDEX ON public.notifications (user_id, read);
CREATE INDEX ON public.invoices (student_id, status);
CREATE INDEX ON public.grade_summaries (student_id, term_id);

-- ─── SCHOOL-ISOLATION RLS (all remaining tables) ──────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'parent_student_links','terms','subjects','classes','class_subjects',
    'class_enrollments','teacher_assignments','courses','modules','lessons',
    'lesson_progress','course_resources','assignments','assignment_submissions',
    'grades','attendance_records','live_sessions','session_recordings',
    'live_attendance','conversations','conversation_members','messages',
    'fee_structures','invoices','payments','grade_summaries','report_cards',
    'calendar_events','notifications','announcements',
    'ai_sessions','ai_messages','feature_flags','support_tickets'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      $f$CREATE POLICY "%s_school_iso" ON public.%I FOR ALL
         USING (is_super_admin() OR school_id = get_my_school_id())$f$,
      t, t
    );
  END LOOP;
END;
$$;
