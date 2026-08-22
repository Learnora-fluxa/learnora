ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS paystack_public_key TEXT,
  ADD COLUMN IF NOT EXISTS paystack_secret_key TEXT,
  ADD COLUMN IF NOT EXISTS paystack_webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS payment_processor_fee_bps INTEGER NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS platform_fee_bps INTEGER NOT NULL DEFAULT 300;

CREATE TABLE IF NOT EXISTS public.school_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  period_start DATE,
  period_end DATE,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  processor_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'processing', 'paid', 'failed', 'cancelled')),
  payout_reference TEXT UNIQUE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS school_settlements_school_id_idx
  ON public.school_settlements (school_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  settlement_id UUID REFERENCES public.school_settlements(id) ON DELETE SET NULL,
  invoice_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  provider TEXT NOT NULL DEFAULT 'learnora_paystack',
  external_reference TEXT UNIQUE,
  idempotency_key TEXT UNIQUE,
  currency TEXT NOT NULL DEFAULT 'NGN',
  gross_amount NUMERIC(12,2) NOT NULL,
  processor_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_school_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('initialized', 'pending', 'succeeded', 'failed', 'reversed', 'refunded')),
  payment_method TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payment_transactions_school_id_idx
  ON public.payment_transactions (school_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS payment_transactions_settlement_id_idx
  ON public.payment_transactions (settlement_id);

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_webhook_events_provider_status_idx
  ON public.payment_webhook_events (provider, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  payment_transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  settlement_id UUID REFERENCES public.school_settlements(id) ON DELETE SET NULL,
  entry_group TEXT NOT NULL,
  account_code TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_ledger_entries_school_id_idx
  ON public.payment_ledger_entries (school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payment_ledger_entries_settlement_id_idx
  ON public.payment_ledger_entries (settlement_id);

ALTER TABLE public.school_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_ledger_entries ENABLE ROW LEVEL SECURITY;
