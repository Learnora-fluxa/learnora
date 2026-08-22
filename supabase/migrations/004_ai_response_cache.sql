CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL UNIQUE,
  assistant_type TEXT NOT NULL,
  task_type TEXT NOT NULL,
  prompt_normalized TEXT NOT NULL,
  response_text TEXT NOT NULL,
  model TEXT NOT NULL,
  used_fallback BOOLEAN NOT NULL DEFAULT false,
  hit_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_response_cache_school_idx
  ON public.ai_response_cache (school_id);

CREATE INDEX IF NOT EXISTS ai_response_cache_expires_idx
  ON public.ai_response_cache (expires_at);

ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_response_cache_school_iso" ON public.ai_response_cache;
CREATE POLICY "ai_response_cache_school_iso"
ON public.ai_response_cache
FOR ALL
USING (is_super_admin() OR school_id = get_my_school_id())
WITH CHECK (is_super_admin() OR school_id = get_my_school_id());
