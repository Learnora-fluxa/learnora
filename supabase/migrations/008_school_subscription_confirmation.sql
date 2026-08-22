ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS onboarding_admin_name TEXT,
ADD COLUMN IF NOT EXISTS onboarding_admin_email TEXT,
ADD COLUMN IF NOT EXISTS onboarding_admin_phone TEXT;

CREATE TABLE IF NOT EXISTS public.platform_subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  payment_method TEXT NOT NULL,
  reference TEXT,
  paid_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'rejected', 'pending_review')),
  invitation_id UUID REFERENCES public.invitations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_subscription_payments_school_id_idx
  ON public.platform_subscription_payments (school_id);

CREATE INDEX IF NOT EXISTS platform_subscription_payments_confirmed_at_idx
  ON public.platform_subscription_payments (confirmed_at DESC);
