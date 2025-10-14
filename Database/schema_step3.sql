-- Step 3: Appointments list (v2) including business_clients and safe ORDER BY (reversible)
-- Creates a new RPC get_appointments_list_v2, leaving the original intact.
-- Frontend can switch to this function safely. A DOWN script is provided.

BEGIN;

SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_appointments_list_v2(
  p_business_id uuid,
  p_employee_ids uuid[] DEFAULT NULL,
  p_service_ids uuid[] DEFAULT NULL,
  p_statuses public.appointment_status[] DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_walkin_filter text DEFAULT 'any',         -- 'any' | 'only' | 'exclude'
  p_sort_by text DEFAULT 'appointment_date,start_time',
  p_sort_dir text DEFAULT 'asc',              -- 'asc' | 'desc'
  p_limit int DEFAULT 25,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  appointment_date date,
  start_time time,
  end_time time,
  status public.appointment_status,
  total_price numeric,
  employee_id uuid,
  employee_name text,
  client_id uuid,
  business_client_id uuid,
  client_name text,
  client_phone text,
  is_walk_in boolean,
  service_names text[],
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed boolean;
  v_sort_by text := lower(p_sort_by);
  v_sort_dir text := lower(p_sort_dir);
BEGIN
  -- tenant guard: owner only (extend later for employees if needed)
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  ) INTO v_allowed;
  IF NOT v_allowed THEN RAISE EXCEPTION 'not_allowed'; END IF;

  IF v_sort_by NOT IN ('appointment_date', 'start_time', 'status', 'total_price', 'employee_name', 'client_name', 'appointment_date,start_time') THEN
    v_sort_by := 'appointment_date,start_time';
  END IF;
  IF v_sort_dir NOT IN ('asc','desc') THEN v_sort_dir := 'asc'; END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      a.id,
      a.appointment_date,
      a.start_time,
      a.end_time,
      a.status,
      a.total_price,
      a.employee_id,
      e.first_name || ' ' || e.last_name AS employee_name,
      a.client_id,
      a.business_client_id,
      COALESCE(u.first_name || ' ' || u.last_name,
               bc.first_name || ' ' || COALESCE(bc.last_name, ''),
               a.walk_in_client_name,
               'Cliente') AS client_name,
      COALESCE(u.phone, bc.phone, a.walk_in_client_phone) AS client_phone,
      (a.client_id IS NULL AND a.business_client_id IS NULL) AS is_walk_in,
      ARRAY(
        SELECT s.name
        FROM public.appointment_services aps
        JOIN public.services s ON s.id = aps.service_id
        WHERE aps.appointment_id = a.id
      ) AS service_names
    FROM public.appointments a
    LEFT JOIN public.users u ON u.id = a.client_id
    LEFT JOIN public.business_clients bc ON bc.id = a.business_client_id
    LEFT JOIN public.employees e ON e.id = a.employee_id
    WHERE a.business_id = p_business_id
      AND (p_employee_ids IS NULL OR a.employee_id = ANY(p_employee_ids))
      AND (
        p_service_ids IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.appointment_services aps
          WHERE aps.appointment_id = a.id
            AND aps.service_id = ANY(p_service_ids)
        )
      )
      AND (p_statuses IS NULL OR a.status = ANY(p_statuses))
      AND (p_date_from IS NULL OR a.appointment_date >= p_date_from)
      AND (p_date_to   IS NULL OR a.appointment_date <= p_date_to)
      AND (
        p_walkin_filter = 'any' OR
        (p_walkin_filter = 'only' AND a.client_id IS NULL AND a.business_client_id IS NULL) OR
        (p_walkin_filter = 'exclude' AND (a.client_id IS NOT NULL OR a.business_client_id IS NOT NULL))
      )
      AND (
        p_search IS NULL OR p_search = '' OR
        (COALESCE(u.first_name || ' ' || u.last_name, bc.first_name || ' ' || COALESCE(bc.last_name,''), a.walk_in_client_name, '') ILIKE '%' || p_search || '%') OR
        (COALESCE(u.phone, bc.phone, a.walk_in_client_phone, '') ILIKE '%' || p_search || '%')
      )
  ), counted AS (
    SELECT b.*, count(*) OVER() AS total_count FROM base b
  )
  SELECT
    c.id,
    c.appointment_date,
    c.start_time,
    c.end_time,
    c.status,
    c.total_price,
    c.employee_id,
    c.employee_name,
    c.client_id,
    c.business_client_id,
    c.client_name,
    c.client_phone,
    c.is_walk_in,
    c.service_names,
    c.total_count
  FROM counted c
  ORDER BY
    CASE WHEN v_sort_by = 'appointment_date,start_time' AND v_sort_dir = 'asc'  THEN c.appointment_date END ASC,
    CASE WHEN v_sort_by = 'appointment_date,start_time' AND v_sort_dir = 'asc'  THEN c.start_time END ASC,
    CASE WHEN v_sort_by = 'appointment_date,start_time' AND v_sort_dir = 'desc' THEN c.appointment_date END DESC,
    CASE WHEN v_sort_by = 'appointment_date,start_time' AND v_sort_dir = 'desc' THEN c.start_time END DESC,

    CASE WHEN v_sort_by = 'appointment_date' AND v_sort_dir = 'asc'  THEN c.appointment_date END ASC,
    CASE WHEN v_sort_by = 'appointment_date' AND v_sort_dir = 'desc' THEN c.appointment_date END DESC,

    CASE WHEN v_sort_by = 'start_time' AND v_sort_dir = 'asc'  THEN c.start_time END ASC,
    CASE WHEN v_sort_by = 'start_time' AND v_sort_dir = 'desc' THEN c.start_time END DESC,

    CASE WHEN v_sort_by = 'status' AND v_sort_dir = 'asc'  THEN c.status::text END ASC,
    CASE WHEN v_sort_by = 'status' AND v_sort_dir = 'desc' THEN c.status::text END DESC,

    CASE WHEN v_sort_by = 'total_price' AND v_sort_dir = 'asc'  THEN c.total_price END ASC,
    CASE WHEN v_sort_by = 'total_price' AND v_sort_dir = 'desc' THEN c.total_price END DESC,

    CASE WHEN v_sort_by = 'employee_name' AND v_sort_dir = 'asc'  THEN c.employee_name END ASC,
    CASE WHEN v_sort_by = 'employee_name' AND v_sort_dir = 'desc' THEN c.employee_name END DESC,

    CASE WHEN v_sort_by = 'client_name' AND v_sort_dir = 'asc'  THEN c.client_name END ASC,
    CASE WHEN v_sort_by = 'client_name' AND v_sort_dir = 'desc' THEN c.client_name END DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);

END;
$$;

COMMIT;
