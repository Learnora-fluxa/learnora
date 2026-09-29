-- Self-serve school signup starts on a 30-day trial; school admins then pay
-- from Subscription & Billing (Paystack, or a bank transfer a super admin
-- confirms). Run after 008 and 009.

-- Columns already written by payments.service confirmSchoolSubscription but
-- never added by a migration (they only existed in the original project).
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS subscription_payment_method TEXT,
ADD COLUMN IF NOT EXISTS subscription_confirmed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS subscription_confirmed_at TIMESTAMPTZ;

-- One row per Paystack transaction, so the callback page and the webhook can
-- both try to record the same payment without double-activating.
CREATE UNIQUE INDEX IF NOT EXISTS platform_subscription_payments_paystack_reference_key
  ON public.platform_subscription_payments (reference)
  WHERE payment_method = 'paystack' AND reference IS NOT NULL;
