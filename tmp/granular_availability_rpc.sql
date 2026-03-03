-- NEW RPC: get_available_time_slots_granular
-- Purpose: Check availability per professional based on their SPECIFIC service duration.

CREATE OR REPLACE FUNCTION get_available_time_slots_granular(
  p_business_id UUID,
  p_employee_ids UUID[],
  p_durations INTEGER[],
  p_date DATE,
  p_business_start TIME,
  p_business_end TIME,
  p_slot_step_minutes INTEGER
)
RETURNS TABLE (slot_time TIME) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_ts TIMESTAMP;
  v_end_ts   TIMESTAMP;
  v_max_duration INTEGER;
BEGIN
  v_start_ts := (p_date::timestamp + p_business_start);
  v_end_ts   := (p_date::timestamp + p_business_end);
  
  -- The appointment block ends when the longest service ends
  SELECT MAX(d) INTO v_max_duration FROM unnest(p_durations) AS d;

  RETURN QUERY
  WITH
  employee_reqs AS (
    -- Parallel unnest requires PG 9.4+ (Supabase is 15-17)
    SELECT e_id, dur
    FROM unnest(p_employee_ids, p_durations) AS t(e_id, dur)
  ),
  candidates AS (
    -- Slots are generated only up to where the longest service still fits
    SELECT generate_series(
      v_start_ts, 
      v_end_ts - make_interval(mins => v_max_duration), 
      make_interval(mins => p_slot_step_minutes)
    ) AS slot_start_ts
  ),
  occupied AS (
    SELECT 
      a.appointment_date + a.start_time AS appt_start_ts,
      a.appointment_date + a.end_time   AS appt_end_ts,
      a.employee_id as main_emp_id,
      aps.employee_id as service_emp_id
    FROM public.appointments a
    LEFT JOIN public.appointment_services aps ON aps.appointment_id = a.id
    WHERE a.appointment_date = p_date
      AND a.status NOT IN ('cancelled', 'no_show')
  ),
  absences AS (
    SELECT
      ea.employee_id,
      CASE 
        WHEN ea.is_full_day THEN p_date::timestamp + time '00:00'
        ELSE p_date::timestamp + COALESCE(ea.start_time, time '00:00')
      END AS abs_start_ts,
      CASE 
        WHEN ea.is_full_day THEN p_date::timestamp + time '23:59:59'
        ELSE p_date::timestamp + COALESCE(ea.end_time, time '23:59:59')
      END AS abs_end_ts
    FROM public.employee_absences ea
    WHERE ea.absence_date = p_date
  )
  SELECT DISTINCT (c.slot_start_ts)::time AS slot_time
  FROM candidates c
  WHERE NOT EXISTS (
    -- Check if ANY required employee is busy during THEIR specific duration
    SELECT 1 
    FROM employee_reqs er
    WHERE EXISTS (
      -- Check appointments
      SELECT 1 FROM occupied o
      WHERE (o.main_emp_id = er.e_id OR o.service_emp_id = er.e_id)
        AND c.slot_start_ts < o.appt_end_ts
        AND c.slot_start_ts + make_interval(mins => er.dur) > o.appt_start_ts
    )
    OR EXISTS (
      -- Check absences
      SELECT 1 FROM absences ab
      WHERE ab.employee_id = er.e_id
        AND c.slot_start_ts < ab.abs_end_ts
        AND c.slot_start_ts + make_interval(mins => er.dur) > ab.abs_start_ts
    )
  )
  ORDER BY slot_time;
END;
$$;
