-- Step 2 (DOWN): Rollback RLS + RPCs for business-managed clients
-- Reverts objects created in schema_step2.sql

BEGIN;

-- 1) Drop RPCs
DROP FUNCTION IF EXISTS public.deactivate_business_client(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_business_client(UUID, UUID);
DROP FUNCTION IF EXISTS public.list_business_clients(UUID, TEXT, BOOLEAN, INT, INT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_business_client(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

-- 2) Drop policies on public.business_clients (if exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'business_clients_select' AND tablename = 'business_clients') THEN
    DROP POLICY business_clients_select ON public.business_clients;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'business_clients_insert' AND tablename = 'business_clients') THEN
    DROP POLICY business_clients_insert ON public.business_clients;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'business_clients_update' AND tablename = 'business_clients') THEN
    DROP POLICY business_clients_update ON public.business_clients;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'business_clients_delete' AND tablename = 'business_clients') THEN
    DROP POLICY business_clients_delete ON public.business_clients;
  END IF;
END$$;

-- 3) Keep RLS enabled or disable depending on preference; here we keep it as-is.
-- If you want to disable (not recommended in prod), uncomment below:
-- ALTER TABLE public.business_clients DISABLE ROW LEVEL SECURITY;

COMMIT;
