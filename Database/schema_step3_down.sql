-- Step 3 (DOWN): Drop get_appointments_list_v2 RPC

BEGIN;

DROP FUNCTION IF EXISTS public.get_appointments_list_v2(
  uuid,
  uuid[],
  uuid[],
  public.appointment_status[],
  date,
  date,
  text,
  text,
  text,
  text,
  int,
  int
);

COMMIT;
