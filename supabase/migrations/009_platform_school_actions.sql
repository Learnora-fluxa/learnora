ALTER TABLE public.platform_schools
ADD COLUMN IF NOT EXISTS custom_rate_ngn NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS rate_reason TEXT,
ADD COLUMN IF NOT EXISTS rate_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rate_updated_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_extended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_extended_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

CREATE TABLE IF NOT EXISTS public.platform_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  term_label TEXT NOT NULL,
  student_count INTEGER NOT NULL CHECK (student_count > 0),
  rate_per_student_ngn NUMERIC(12,2) NOT NULL CHECK (rate_per_student_ngn > 0),
  total_amount_ngn NUMERIC(12,2) NOT NULL CHECK (total_amount_ngn >= 0),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'generated'
    CHECK (status IN ('generated', 'sent', 'paid', 'void')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_invoices_school_id_idx
  ON public.platform_invoices (school_id);

CREATE INDEX IF NOT EXISTS platform_invoices_generated_at_idx
  ON public.platform_invoices (generated_at DESC);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system'
    CHECK (type IN ('create', 'update', 'delete', 'system', 'login')),
  module TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_school_id_idx
  ON public.audit_logs (school_id);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON public.audit_logs (created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_superadmin_all" ON public.audit_logs;
CREATE POLICY "audit_logs_superadmin_all"
ON public.audit_logs
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "audit_logs_school_read" ON public.audit_logs;
CREATE POLICY "audit_logs_school_read"
ON public.audit_logs
FOR SELECT
USING (is_super_admin() OR school_id = get_my_school_id());

ALTER TABLE public.platform_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_invoices_superadmin_all" ON public.platform_invoices;
CREATE POLICY "platform_invoices_superadmin_all"
ON public.platform_invoices
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());
