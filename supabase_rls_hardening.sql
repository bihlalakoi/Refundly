-- Supabase security hardening for Refundly tables.
-- Run this in Supabase SQL Editor (production) after taking a backup.

-- 1) Enable RLS on exposed tables.
ALTER TABLE IF EXISTS public.users
ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.claim_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.session ENABLE ROW LEVEL SECURITY;

-- 2) Drop old policies so this script can be re-run safely.
DROP POLICY IF EXISTS users_select_self ON public.users;
DROP POLICY IF EXISTS users_update_self ON public.users;
DROP POLICY IF EXISTS claims_select_own ON public.claims;
DROP POLICY IF EXISTS claims_insert_own ON public.claims;
DROP POLICY IF EXISTS claims_update_own ON public.claims;
DROP POLICY IF EXISTS claim_history_select_own ON public.claim_history;

-- 3) Users can view/update only their own row (mapped via supabase_user_id).
CREATE POLICY users_select_self
ON public.users
FOR SELECT
TO authenticated
USING (supabase_user_id::text = auth.uid()::text);

CREATE POLICY users_update_self
ON public.users
FOR UPDATE
TO authenticated
USING (supabase_user_id::text = auth.uid()::text)
WITH CHECK (supabase_user_id::text = auth.uid()::text);

-- 4) Users can only access claims that belong to them.
CREATE POLICY claims_select_own
ON public.claims
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = claims.user_id
      AND u.supabase_user_id::text = auth.uid()::text
  )
);

CREATE POLICY claims_insert_own
ON public.claims
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = claims.user_id
      AND u.supabase_user_id::text = auth.uid()::text
  )
);

CREATE POLICY claims_update_own
ON public.claims
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = claims.user_id
      AND u.supabase_user_id::text = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = claims.user_id
      AND u.supabase_user_id::text = auth.uid()::text
  )
);

-- 5) Users can only see claim history tied to their claims.
CREATE POLICY claim_history_select_own
ON public.claim_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.claims c
    JOIN public.users u ON u.id = c.user_id
    WHERE c.id = claim_history.claim_id
      AND u.supabase_user_id::text = auth.uid()::text
  )
);

-- 6) Function hardening advisory: fix mutable search_path warning.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_updated_at_column'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.update_updated_at_column() SET search_path TO public';
  END IF;
END $$;

-- Note:
-- - This app primarily uses server-side DB access (service role/direct DB user),
--   so these policies protect PostgREST/API surface and Supabase client access.
-- - For "Leaked Password Protection", enable it from Supabase Dashboard:
--   Authentication -> Providers -> Email -> Leaked Password Protection.
