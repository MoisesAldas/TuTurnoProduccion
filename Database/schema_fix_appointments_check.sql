-- Fix legacy appointments client CHECK to support business_client_id
-- Drops old constraint (appointments_client_check) if present and ensures XOR constraint is active.

BEGIN;

-- Drop legacy check that didn't consider business_client_id
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_client_check;

-- Recreate XOR constraint safely
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_client_source_xor;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_client_source_xor
  CHECK (
    (
      (CASE WHEN client_id IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN business_client_id IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN (walk_in_client_name IS NOT NULL OR walk_in_client_phone IS NOT NULL) THEN 1 ELSE 0 END)
    ) = 1
  ) NOT VALID; -- add NOT VALID first to avoid blocking on existing inconsistent rows

COMMIT;

-- After fixing any inconsistent data, run:
-- ALTER TABLE public.appointments VALIDATE CONSTRAINT appointments_client_source_xor;

-- Helper to find violating rows before VALIDATE:
-- SELECT id, client_id, business_client_id, walk_in_client_name, walk_in_client_phone
-- FROM public.appointments
-- WHERE (
--   (CASE WHEN client_id IS NOT NULL THEN 1 ELSE 0 END) +
--   (CASE WHEN business_client_id IS NOT NULL THEN 1 ELSE 0 END) +
--   (CASE WHEN (walk_in_client_name IS NOT NULL OR walk_in_client_phone IS NOT NULL) THEN 1 ELSE 0 END)
-- ) != 1;
