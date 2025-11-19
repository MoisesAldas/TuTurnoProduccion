-- ========================================
-- FUNCIONES DE NEGOCIO
-- ========================================

-- ========================================
-- FUNCIÓN: generate_invoice_number
-- Genera un número de factura único con formato INV-YYYY-NNNN
-- ========================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    current_year TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
    last_invoice_num INTEGER;
    new_invoice_num TEXT;
    lock_key BIGINT := hashtext('invoice_number_generation');
BEGIN
    -- Adquirir lock exclusivo para evitar race conditions
    PERFORM pg_advisory_xact_lock(lock_key);

    -- Obtener el último número de factura del año actual
    SELECT
        COALESCE(
            MAX(
                CAST(
                    SUBSTRING(invoice_number FROM 'INV-' || current_year || '-([0-9]+)')
                    AS INTEGER
                )
            ),
            0
        )
    INTO last_invoice_num
    FROM public.invoices
    WHERE invoice_number LIKE 'INV-' || current_year || '-%';

    -- Generar nuevo número con formato: INV-2025-0001
    new_invoice_num := 'INV-' || current_year || '-' || LPAD((last_invoice_num + 1)::TEXT, 4, '0');

    RETURN new_invoice_num;
END;
$function$;

COMMENT ON FUNCTION public.generate_invoice_number IS 'Genera número único de factura con formato INV-YYYY-NNNN (thread-safe con advisory lock)';

-- ========================================
-- FUNCIÓN: calculate_appointment_total
-- Calcula el total de una cita sumando los servicios
-- ========================================
CREATE OR REPLACE FUNCTION public.calculate_appointment_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.appointments 
    SET total_price = (
        SELECT COALESCE(SUM(price), 0) 
        FROM public.appointment_services 
        WHERE appointment_id = COALESCE(NEW.appointment_id, OLD.appointment_id)
    )
    WHERE id = COALESCE(NEW.appointment_id, OLD.appointment_id);
    RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.calculate_appointment_total IS 'Actualiza el total de una cita cuando se modifican sus servicios';

-- ========================================
-- FUNCIÓN: check_appointment_conflicts
-- Verifica conflictos de horario en las citas
-- ========================================
CREATE OR REPLACE FUNCTION public.check_appointment_conflicts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_id UUID;
BEGIN
    -- Obtener el ID de la cita actual
    -- En UPDATE: usar OLD.id para excluir la cita que estamos editando
    -- En INSERT: NULL para no excluir nada
    IF TG_OP = 'UPDATE' THEN
        v_current_id := OLD.id;
    ELSE
        v_current_id := NULL;
    END IF;

    -- Verificar conflictos para el cliente (solo si tiene client_id, no walk-ins)
    IF NEW.client_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.appointments
            WHERE client_id = NEW.client_id
            AND appointment_date = NEW.appointment_date
            AND id != COALESCE(v_current_id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND status NOT IN ('cancelled', 'no_show')
            AND (
                (start_time < NEW.end_time AND end_time > NEW.start_time)
            )
        ) THEN
            RAISE EXCEPTION 'El cliente ya tiene una cita en ese horario';
        END IF;
    END IF;

    -- Verificar conflictos para el empleado (si se especifica)
    IF NEW.employee_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.appointments
            WHERE employee_id = NEW.employee_id
            AND appointment_date = NEW.appointment_date
            AND id != COALESCE(v_current_id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND status NOT IN ('cancelled', 'no_show')
            AND (
                (start_time < NEW.end_time AND end_time > NEW.start_time)
            )
        ) THEN
            RAISE EXCEPTION 'El empleado ya tiene una cita en ese horario';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_appointment_conflicts IS 'Verifica que no haya conflictos de horario al crear o actualizar citas';

-- ========================================
-- FUNCIÓN: create_appointment_notification
-- Crea notificaciones cuando cambia el estado de una cita
-- ========================================
CREATE OR REPLACE FUNCTION public.create_appointment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Solo crear notificaciones para clientes REGISTRADOS (no walk-ins)
    IF NEW.client_id IS NOT NULL THEN
        IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
            INSERT INTO public.notifications (user_id, appointment_id, type, title, message)
            VALUES (
                NEW.client_id, NEW.id, 'appointment_confirmed', 'Cita Confirmada',
                'Tu cita ha sido confirmada para el ' || TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY') || ' a las ' || TO_CHAR(NEW.start_time, 'HH24:MI')
            );
        END IF;

        IF NEW.status = 'cancelled' AND (OLD IS NULL OR OLD.status != 'cancelled') THEN
            INSERT INTO public.notifications (user_id, appointment_id, type, title, message)
            VALUES (
                NEW.client_id, NEW.id, 'appointment_cancelled', 'Cita Cancelada',
                'Tu cita del ' || TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY') || ' a las ' || TO_CHAR(NEW.start_time, 'HH24:MI') || ' ha sido cancelada'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_appointment_notification IS 'Crea notificaciones automáticas al confirmar o cancelar citas';

-- ========================================
-- FUNCIÓN: create_appointment_reminders
-- Crea recordatorios automáticos para citas confirmadas
-- ========================================
CREATE OR REPLACE FUNCTION public.create_appointment_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_reminder_hours INTEGER;
    v_reminder_time TIMESTAMP WITH TIME ZONE;
    v_enable_reminders BOOLEAN;
    v_email_enabled BOOLEAN;
    v_sms_enabled BOOLEAN;
    v_push_enabled BOOLEAN;
BEGIN
    -- Solo crear recordatorios si la cita está confirmada y tiene cliente registrado
    IF NEW.status = 'confirmed' AND NEW.client_id IS NOT NULL AND (OLD IS NULL OR OLD.status != 'confirmed') THEN

        -- Obtener configuración de recordatorios del negocio
        SELECT
            enable_reminders,
            reminder_hours_before,
            reminder_email_enabled,
            reminder_sms_enabled,
            reminder_push_enabled
        INTO
            v_enable_reminders,
            v_reminder_hours,
            v_email_enabled,
            v_sms_enabled,
            v_push_enabled
        FROM public.businesses
        WHERE id = NEW.business_id;

        -- Si los recordatorios están habilitados
        IF v_enable_reminders THEN
            -- Calcular hora del recordatorio
            v_reminder_time := (NEW.appointment_date + NEW.start_time) - (v_reminder_hours || ' hours')::INTERVAL;

            -- Solo crear recordatorios si la fecha del recordatorio es futura
            IF v_reminder_time > NOW() THEN
                -- Email reminder
                IF v_email_enabled THEN
                    INSERT INTO public.appointment_reminders (
                        appointment_id,
                        reminder_type,
                        scheduled_for,
                        status
                    ) VALUES (
                        NEW.id,
                        'email',
                        v_reminder_time,
                        'pending'
                    )
                    ON CONFLICT (appointment_id, reminder_type, scheduled_for) DO NOTHING;
                END IF;

                -- SMS reminder
                IF v_sms_enabled THEN
                    INSERT INTO public.appointment_reminders (
                        appointment_id,
                        reminder_type,
                        scheduled_for,
                        status
                    ) VALUES (
                        NEW.id,
                        'sms',
                        v_reminder_time,
                        'pending'
                    )
                    ON CONFLICT (appointment_id, reminder_type, scheduled_for) DO NOTHING;
                END IF;

                -- Push notification reminder
                IF v_push_enabled THEN
                    INSERT INTO public.appointment_reminders (
                        appointment_id,
                        reminder_type,
                        scheduled_for,
                        status
                    ) VALUES (
                        NEW.id,
                        'push',
                        v_reminder_time,
                        'pending'
                    )
                    ON CONFLICT (appointment_id, reminder_type, scheduled_for) DO NOTHING;
                END IF;
            END IF;
        END IF;
    END IF;

    -- Si la cita se cancela, cancelar recordatorios pendientes
    IF NEW.status = 'cancelled' AND (OLD IS NULL OR OLD.status != 'cancelled') THEN
        UPDATE public.appointment_reminders
        SET status = 'cancelled'
        WHERE appointment_id = NEW.id
        AND status = 'pending';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_appointment_reminders IS 'Programa recordatorios automáticos para citas confirmadas según configuración del negocio';

-- ========================================
-- FUNCIÓN: create_invoice_on_completion
-- Crea automáticamente una factura al completar una cita
-- ========================================
CREATE OR REPLACE FUNCTION public.create_invoice_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_invoice_id UUID;
    v_invoice_number TEXT;
BEGIN
    -- Solo crear factura si la cita pasa a estado 'completed' y no existe factura
    IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        -- Verificar si ya existe una factura para esta cita
        IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE appointment_id = NEW.id) THEN
            -- Generar número de factura
            v_invoice_number := generate_invoice_number();

            -- Crear factura con el total de la cita
            INSERT INTO public.invoices (
                appointment_id,
                invoice_number,
                subtotal,
                tax,
                discount,
                total,
                status
            ) VALUES (
                NEW.id,
                v_invoice_number,
                NEW.total_price,
                0,
                0,
                NEW.total_price,
                'pending'
            )
            RETURNING id INTO v_invoice_id;

            RAISE NOTICE 'Factura % creada para cita %', v_invoice_number, NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_invoice_on_completion IS 'Genera automáticamente una factura al completar una cita';

-- ========================================
-- FUNCIÓN: update_invoice_status_on_payment
-- Actualiza el estado de la factura cuando se registra un pago
-- ========================================
CREATE OR REPLACE FUNCTION public.update_invoice_status_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_paid DECIMAL(10, 2);
    v_invoice_total DECIMAL(10, 2);
BEGIN
    -- Obtener total de la factura
    SELECT total INTO v_invoice_total
    FROM public.invoices
    WHERE id = NEW.invoice_id;

    -- Calcular total pagado
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM public.payments
    WHERE invoice_id = NEW.invoice_id;

    -- Actualizar estado de factura según el pago
    UPDATE public.invoices
    SET
        status = CASE
            WHEN v_total_paid >= v_invoice_total THEN 'paid'::invoice_status
            ELSE 'pending'::invoice_status
        END,
        updated_at = NOW()
    WHERE id = NEW.invoice_id;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_invoice_status_on_payment IS 'Marca factura como pagada cuando se registra pago completo';

-- ========================================
-- FUNCIÓN: update_business_location
-- Actualiza el punto geográfico cuando cambian lat/lon
-- ========================================
CREATE OR REPLACE FUNCTION public.update_business_location()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_business_location IS 'Sincroniza el punto geográfico con latitud y longitud';

-- ========================================
-- FUNCIÓN: update_updated_at_column
-- Actualiza automáticamente la columna updated_at
-- ========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column IS 'Actualiza automáticamente el timestamp de updated_at';

-- ========================================
-- FUNCIONES DE CONSULTA Y UTILIDAD
-- ========================================

-- Verificar si un negocio está abierto en fecha/hora específica
CREATE OR REPLACE FUNCTION public.is_business_open(
    p_business_id UUID,
    p_check_date DATE,
    p_check_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p_day_of_week INTEGER := EXTRACT(DOW FROM p_check_date);
    v_is_closed BOOLEAN;
    v_open_time TIME;
    v_close_time TIME;
    v_has_special_hours BOOLEAN := FALSE;
BEGIN
    -- 1. Primero verificar si hay horario especial para esa fecha
    SELECT
        TRUE,
        is_closed,
        open_time,
        close_time
    INTO
        v_has_special_hours,
        v_is_closed,
        v_open_time,
        v_close_time
    FROM public.business_special_hours
    WHERE business_id = p_business_id
    AND special_date = p_check_date;

    -- Si hay horario especial, usar ese
    IF v_has_special_hours THEN
        IF v_is_closed THEN
            RETURN FALSE;
        END IF;
        RETURN (v_open_time <= p_check_time AND v_close_time >= p_check_time);
    END IF;

    -- 2. Si no hay horario especial, usar horario regular
    SELECT
        is_closed,
        open_time,
        close_time
    INTO
        v_is_closed,
        v_open_time,
        v_close_time
    FROM public.business_hours
    WHERE business_id = p_business_id
    AND day_of_week = p_day_of_week;

    -- Si no hay registro o está cerrado
    IF NOT FOUND OR v_is_closed THEN
        RETURN FALSE;
    END IF;

    -- Verificar si la hora está dentro del horario
    RETURN (v_open_time <= p_check_time AND v_close_time >= p_check_time);
END;
$$;

COMMENT ON FUNCTION public.is_business_open IS 'Verifica si un negocio está abierto en una fecha y hora específica';

-- Verificar si un empleado está disponible
CREATE OR REPLACE FUNCTION public.is_employee_available(
    p_employee_id UUID,
    p_check_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p_day_of_week INTEGER := EXTRACT(DOW FROM p_check_date);
    v_schedule_exists BOOLEAN := FALSE;
    v_schedule_available BOOLEAN := FALSE;
    v_schedule_start TIME;
    v_schedule_end TIME;
    v_has_absence BOOLEAN := FALSE;
    v_has_override BOOLEAN := FALSE;
    v_override_available BOOLEAN := FALSE;
    v_override_start TIME;
    v_override_end TIME;
BEGIN
    -- 1. Verificar horario normal del empleado
    SELECT
        TRUE,
        is_available,
        start_time,
        end_time
    INTO
        v_schedule_exists,
        v_schedule_available,
        v_schedule_start,
        v_schedule_end
    FROM public.employee_schedules
    WHERE employee_id = p_employee_id
    AND day_of_week = p_day_of_week;

    -- Si no hay horario configurado para este día, no está disponible
    IF NOT v_schedule_exists OR NOT v_schedule_available THEN
        RETURN FALSE;
    END IF;

    -- 2. Verificar si hay ausencia (día completo o parcial)
    SELECT TRUE INTO v_has_absence
    FROM public.employee_absences
    WHERE employee_id = p_employee_id
    AND absence_date = p_check_date
    AND (
        is_full_day = TRUE OR
        (is_full_day = FALSE AND start_time <= p_start_time AND end_time >= p_end_time)
    );

    -- Si hay ausencia que afecta el horario solicitado, no está disponible
    IF v_has_absence THEN
        RETURN FALSE;
    END IF;

    -- 3. Verificar si hay override de horario
    SELECT
        TRUE,
        is_available,
        start_time,
        end_time
    INTO
        v_has_override,
        v_override_available,
        v_override_start,
        v_override_end
    FROM public.schedule_overrides
    WHERE employee_id = p_employee_id
    AND override_date = p_check_date;

    -- Si hay override, usar esos horarios en lugar del horario normal
    IF v_has_override THEN
        IF NOT v_override_available THEN
            RETURN FALSE;
        END IF;

        -- Verificar que el horario solicitado esté dentro del override
        RETURN (v_override_start <= p_start_time AND v_override_end >= p_end_time);
    END IF;

    -- 4. Si llegamos aquí, usar horario normal
    RETURN (v_schedule_start <= p_start_time AND v_schedule_end >= p_end_time);
END;
$$;

COMMENT ON FUNCTION public.is_employee_available IS 'Verifica disponibilidad de empleado considerando horarios, ausencias y overrides';

-- Obtener empleados disponibles para un servicio
CREATE OR REPLACE FUNCTION public.get_available_employees(
    p_business_id UUID,
    p_service_id UUID,
    p_appointment_date DATE,
    p_start_time TIME,
    p_duration_minutes INTEGER
)
RETURNS TABLE(
    employee_id UUID,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    p_end_time TIME := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;
    p_day_of_week INTEGER := EXTRACT(DOW FROM p_appointment_date);
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.avatar_url
    FROM public.employees e
    JOIN public.employee_services es ON es.employee_id = e.id
    JOIN public.employee_schedules sch ON sch.employee_id = e.id
    WHERE 
        e.business_id = p_business_id
        AND e.is_active = TRUE
        AND es.service_id = p_service_id
        AND sch.day_of_week = p_day_of_week
        AND sch.is_available = TRUE
        AND sch.start_time <= p_start_time
        AND sch.end_time >= p_end_time::TIME
        AND NOT EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.employee_id = e.id
            AND a.appointment_date = p_appointment_date
            AND a.status NOT IN ('cancelled', 'no_show')
            AND (
                (a.start_time < p_end_time::TIME AND a.end_time > p_start_time)
            )
        );
END;
$$;

COMMENT ON FUNCTION public.get_available_employees IS 'Retorna empleados disponibles para un servicio en fecha/hora específica';

-- ========================================
-- FUNCIONES DE REPORTES Y MÉTRICAS
-- ========================================

-- Reporte de ventas de negocio
CREATE OR REPLACE FUNCTION public.get_business_sales_report(
    p_business_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    total_revenue NUMERIC,
    total_appointments INTEGER,
    completed_appointments INTEGER,
    cancelled_appointments INTEGER,
    total_paid_invoices INTEGER,
    total_pending_invoices INTEGER,
    average_ticket NUMERIC,
    total_cash_payments NUMERIC,
    total_transfer_payments NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END), 0) AS total_revenue,
        COUNT(a.id)::INTEGER AS total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END)::INTEGER AS completed_appointments,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END)::INTEGER AS cancelled_appointments,
        COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::INTEGER AS total_paid_invoices,
        COUNT(CASE WHEN i.status = 'pending' THEN 1 END)::INTEGER AS total_pending_invoices,
        COALESCE(AVG(CASE WHEN i.status = 'paid' THEN i.total END), 0) AS average_ticket,
        COALESCE(
            (SELECT SUM(p.amount)
             FROM payments p
             JOIN invoices inv ON inv.id = p.invoice_id
             JOIN appointments app ON app.id = inv.appointment_id
             WHERE app.business_id = p_business_id
             AND app.appointment_date BETWEEN p_start_date AND p_end_date
             AND p.payment_method = 'cash'), 0
        ) AS total_cash_payments,
        COALESCE(
            (SELECT SUM(p.amount)
             FROM payments p
             JOIN invoices inv ON inv.id = p.invoice_id
             JOIN appointments app ON app.id = inv.appointment_id
             WHERE app.business_id = p_business_id
             AND app.appointment_date BETWEEN p_start_date AND p_end_date
             AND p.payment_method = 'transfer'), 0
        ) AS total_transfer_payments
    FROM
        appointments a
        LEFT JOIN invoices i ON i.appointment_id = a.id
    WHERE
        a.business_id = p_business_id
        AND a.appointment_date BETWEEN p_start_date AND p_end_date;
END;
$$;

COMMENT ON FUNCTION public.get_business_sales_report IS 'Genera reporte de ventas para un negocio en período específico';

-- Estadísticas de empleado
CREATE OR REPLACE FUNCTION public.get_employee_stats(
    p_employee_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    scheduled_hours NUMERIC,
    worked_appointments INTEGER,
    absence_days INTEGER,
    override_days INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date DATE := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
    v_end_date DATE := COALESCE(p_end_date, CURRENT_DATE);
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(v_start_date, v_end_date, '1 day'::interval)::date as date
    ),
    scheduled_time AS (
        SELECT
            ds.date,
            EXTRACT(DOW FROM ds.date) as dow,
            es.start_time,
            es.end_time,
            es.is_available
        FROM date_series ds
        LEFT JOIN public.employee_schedules es ON es.employee_id = p_employee_id
            AND es.day_of_week = EXTRACT(DOW FROM ds.date)
    )
    SELECT
        COALESCE(SUM(
            CASE
                WHEN st.is_available = TRUE
                AND NOT EXISTS (
                    SELECT 1 FROM public.employee_absences ea
                    WHERE ea.employee_id = p_employee_id
                    AND ea.absence_date = st.date
                )
                THEN EXTRACT(EPOCH FROM (st.end_time - st.start_time)) / 3600.0
                ELSE 0
            END
        ), 0)::DECIMAL as scheduled_hours,

        COALESCE((
            SELECT COUNT(*)::INTEGER
            FROM public.appointments a
            WHERE a.employee_id = p_employee_id
            AND a.appointment_date BETWEEN v_start_date AND v_end_date
            AND a.status IN ('completed', 'in_progress')
        ), 0) as worked_appointments,

        COALESCE((
            SELECT COUNT(*)::INTEGER
            FROM public.employee_absences ea
            WHERE ea.employee_id = p_employee_id
            AND ea.absence_date BETWEEN v_start_date AND v_end_date
        ), 0) as absence_days,

        COALESCE((
            SELECT COUNT(*)::INTEGER
            FROM public.schedule_overrides so
            WHERE so.employee_id = p_employee_id
            AND so.override_date BETWEEN v_start_date AND v_end_date
        ), 0) as override_days

    FROM scheduled_time st;
END;
$$;

COMMENT ON FUNCTION public.get_employee_stats IS 'Retorna estadísticas de trabajo de un empleado en período específico';

-- Lista de citas con filtros, paginación y conteo total
-- Uso: owner del negocio (panel de negocio). SECURITY DEFINER + guard de tenant.
CREATE OR REPLACE FUNCTION public.get_appointments_list(
  p_business_id uuid,
  p_employee_ids uuid[] DEFAULT NULL,
  p_service_ids uuid[] DEFAULT NULL,
  p_statuses public.appointment_status[] DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_search text DEFAULT NULL,                 -- busca por nombre/teléfono (cliente o walk-in)
  p_walkin_filter text DEFAULT 'any',         -- 'any' | 'only' | 'exclude'
  p_sort_by text DEFAULT 'appointment_date,start_time', -- whitelist interno
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
  client_name text,
  client_phone text,
  is_walk_in boolean,
  service_names text[],
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sort_by text;
  v_sort_dir text;
BEGIN
  -- Guard multitenant: el usuario autenticado debe ser owner del negocio
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  -- Normalizar sort_by a una de las columnas permitidas
  -- Admite combinaciones como 'appointment_date,start_time'
  v_sort_by := lower(p_sort_by);
  IF v_sort_by NOT IN ('appointment_date', 'start_time', 'status', 'total_price', 'employee_name', 'client_name', 'appointment_date,start_time') THEN
    v_sort_by := 'appointment_date,start_time';
  END IF;

  -- Normalizar sort_dir
  v_sort_dir := lower(p_sort_dir);
  IF v_sort_dir NOT IN ('asc','desc') THEN
    v_sort_dir := 'asc';
  END IF;

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
      -- preferir usuario; si es walk-in, usar campos walk_in
      COALESCE(u.first_name || ' ' || u.last_name, a.walk_in_client_name, 'Cliente') AS client_name,
      COALESCE(u.phone, a.walk_in_client_phone) AS client_phone,
      (a.client_id IS NULL) AS is_walk_in,
      -- nombres de servicios agregados
      ARRAY(
        SELECT s.name
        FROM public.appointment_services aps
        JOIN public.services s ON s.id = aps.service_id
        WHERE aps.appointment_id = a.id
      ) AS service_names
    FROM public.appointments a
    LEFT JOIN public.users u ON u.id = a.client_id
    LEFT JOIN public.employees e ON e.id = a.employee_id
    WHERE a.business_id = p_business_id
      -- filtros opcionales
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
        (p_walkin_filter = 'only' AND a.client_id IS NULL) OR
        (p_walkin_filter = 'exclude' AND a.client_id IS NOT NULL)
      )
      AND (
        p_search IS NULL OR p_search = '' OR
        -- búsqueda en nombre y teléfono, tanto de user como de walk-in
        (COALESCE(u.first_name || ' ' || u.last_name, a.walk_in_client_name, '') ILIKE '%' || p_search || '%')
        OR (COALESCE(u.phone, a.walk_in_client_phone, '') ILIKE '%' || p_search || '%')
      )
  ),
  -- Conteo total después de filtros
  counted AS (
    SELECT
      b.*,
      count(*) OVER() AS total_count
    FROM base b
  ),
  -- Ordenamiento seguro por whitelist
  ordered AS (
    SELECT * FROM counted
    ORDER BY
      CASE WHEN v_sort_by = 'appointment_date,start_time' AND v_sort_dir = 'asc'  THEN appointment_date END ASC,
      CASE WHEN v_sort_by = 'appointment_date,start_time' AND v_sort_dir = 'asc'  THEN start_time END ASC,
      CASE WHEN v_sort_by = 'appointment_date,start_time' AND v_sort_dir = 'desc' THEN appointment_date END DESC,
      CASE WHEN v_sort_by = 'appointment_date,start_time' AND v_sort_dir = 'desc' THEN start_time END DESC,

      CASE WHEN v_sort_by = 'appointment_date' AND v_sort_dir = 'asc'  THEN appointment_date END ASC,
      CASE WHEN v_sort_by = 'appointment_date' AND v_sort_dir = 'desc' THEN appointment_date END DESC,

      CASE WHEN v_sort_by = 'start_time' AND v_sort_dir = 'asc'  THEN start_time END ASC,
      CASE WHEN v_sort_by = 'start_time' AND v_sort_dir = 'desc' THEN start_time END DESC,

      CASE WHEN v_sort_by = 'status' AND v_sort_dir = 'asc'  THEN status::text END ASC,
      CASE WHEN v_sort_by = 'status' AND v_sort_dir = 'desc' THEN status::text END DESC,

      CASE WHEN v_sort_by = 'total_price' AND v_sort_dir = 'asc'  THEN total_price END ASC,
      CASE WHEN v_sort_by = 'total_price' AND v_sort_dir = 'desc' THEN total_price END DESC,

      CASE WHEN v_sort_by = 'employee_name' AND v_sort_dir = 'asc'  THEN employee_name END ASC,
      CASE WHEN v_sort_by = 'employee_name' AND v_sort_dir = 'desc' THEN employee_name END DESC,

      CASE WHEN v_sort_by = 'client_name' AND v_sort_dir = 'asc'  THEN client_name END ASC,
      CASE WHEN v_sort_by = 'client_name' AND v_sort_dir = 'desc' THEN client_name END DESC
  )
  SELECT
    id, appointment_date, start_time, end_time, status, total_price,
    employee_id, employee_name, client_id, client_name, client_phone,
    is_walk_in, service_names, total_count
  FROM ordered
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);

END;
$$;

COMMENT ON FUNCTION public.get_appointments_list IS
'Lista de citas con filtros (empleados, servicios, estados, fechas, búsqueda), ordenamiento y paginación; restringida al owner del negocio.';
-- Genera los slots disponibles para un empleado en una fecha
-- Respeta citas existentes, ausencias y horario del negocio
CREATE OR REPLACE FUNCTION public.get_available_time_slots(
  p_business_id UUID,
  p_employee_id UUID,
  p_date DATE,
  p_business_start TIME,      -- ej: '08:00'
  p_business_end TIME,        -- ej: '20:00'
  p_service_duration_minutes INT,  -- duración del servicio
  p_slot_step_minutes INT         -- tamaño del paso entre slots (ej: 15)
)
RETURNS TABLE(slot_time TIME) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_ts TIMESTAMP;
  v_end_ts   TIMESTAMP;
BEGIN
  -- Definir rango del día de trabajo
  v_start_ts := (p_date::timestamp + p_business_start);
  v_end_ts   := (p_date::timestamp + p_business_end);

  RETURN QUERY
  WITH
  -- Candidatos: series de slots por step dentro del horario del negocio
  candidates AS (
    SELECT generate_series(v_start_ts, v_end_ts, make_interval(mins => p_slot_step_minutes)) AS slot_start_ts
  ),

  -- Fin de cada slot (duración del servicio)
  candidate_slots AS (
    SELECT 
      slot_start_ts,
      slot_start_ts + make_interval(mins => p_service_duration_minutes) AS slot_end_ts
    FROM candidates
    WHERE slot_start_ts < v_end_ts -- por seguridad
  ),

  -- Citas ocupadas del empleado ese día (incluye walk-ins)
  occupied AS (
    SELECT 
      (p_date::timestamp + a.start_time) AS appt_start_ts,
      (p_date::timestamp + a.end_time)   AS appt_end_ts
    FROM public.appointments a
    WHERE a.business_id = p_business_id
      AND a.employee_id = p_employee_id
      AND a.appointment_date = p_date
      AND a.status NOT IN ('cancelled','no_show')
  ),

  -- Ausencias del empleado ese día
  absences AS (
    SELECT
      CASE 
        WHEN ea.is_full_day THEN p_date::timestamp + time '00:00'
        ELSE p_date::timestamp + COALESCE(ea.start_time, time '00:00')
      END AS abs_start_ts,
      CASE 
        WHEN ea.is_full_day THEN p_date::timestamp + time '23:59:59'
        ELSE p_date::timestamp + COALESCE(ea.end_time, time '23:59:59')
      END AS abs_end_ts
    FROM public.employee_absences ea
    WHERE ea.employee_id = p_employee_id
      AND ea.absence_date = p_date
  )

  SELECT (slot_start_ts)::time AS slot_time
  FROM candidate_slots cs
  -- Debe terminar antes o igual al fin de jornada
  WHERE cs.slot_end_ts <= v_end_ts

  -- No debe solaparse con ninguna cita ocupada
  AND NOT EXISTS (
    SELECT 1
    FROM occupied o
    WHERE cs.slot_start_ts < o.appt_end_ts
      AND cs.slot_end_ts   > o.appt_start_ts
  )

  -- No debe caer dentro de una ausencia
  AND NOT EXISTS (
    SELECT 1
    FROM absences ab
    WHERE cs.slot_start_ts < ab.abs_end_ts
      AND cs.slot_end_ts   > ab.abs_start_ts
  )

  -- Opcional: validar reglas adicionales centralizadas
  -- AND (
  --   SELECT COALESCE(
  --     (SELECT public.is_employee_available(
  --        p_employee_id,
  --        p_date,
  --        (cs.slot_start_ts)::time,
  --        (cs.slot_end_ts)::time
  --      )), true)
  -- );

  ORDER BY slot_time;
END;
$$;

COMMENT ON FUNCTION public.get_available_time_slots IS
'Devuelve los horarios disponibles para un empleado considerando citas, ausencias y horario del negocio.';

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
