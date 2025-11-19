-- Step 1 (DOWN): Rollback business-managed clients changes
-- Reverts the objects created in schema.sql

BEGIN;

-- 1) Drop XOR constraint if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_client_source_xor'
  ) THEN
    ALTER TABLE public.appointments
      DROP CONSTRAINT appointments_client_source_xor;
  END IF;
END
$$;

-- 2) Drop column business_client_id from appointments if exists
ALTER TABLE public.appointments
  DROP COLUMN IF EXISTS business_client_id;

-- 3) Drop indexes related to business_clients if exist
DROP INDEX IF EXISTS public.idx_business_clients_business_id;
DROP INDEX IF EXISTS public.uq_business_clients_business_phone;
DROP INDEX IF EXISTS public.uq_business_clients_business_email;
DROP INDEX IF EXISTS public.idx_business_clients_name_trgm;

-- 4) Drop table business_clients if exists
DROP TABLE IF EXISTS public.business_clients;

-- Note: We keep pg_trgm extension in place as it may be used elsewhere. If you want to remove it safely, uncomment below.
-- DROP EXTENSION IF EXISTS pg_trgm;

COMMIT;
