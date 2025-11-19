-- ========================================
-- MIGRATION: Add Overlapping Appointments Feature
-- ========================================
-- Description: Permite a los negocios desactivar la validación de conflictos
--              para casos como tintes, esperas, etc.
-- Date: 2025-01-XX
-- Rollback: add_overlapping_appointments_down.sql

-- ========================================
-- STEP 1: Add column to businesses table
-- ========================================
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS allow_overlapping_appointments BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.businesses.allow_overlapping_appointments
IS 'Si es TRUE, el negocio permite citas superpuestas (desactiva validación de conflictos)';

-- ========================================
-- STEP 2: Update conflict check function
-- ========================================
CREATE OR REPLACE FUNCTION public.check_appointment_conflicts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_id UUID;
    v_allow_overlap BOOLEAN;
BEGIN
    -- Obtener el ID de la cita actual
    IF TG_OP = 'UPDATE' THEN
        v_current_id := OLD.id;
    ELSE
        v_current_id := NULL;
    END IF;

    -- Verificar si el negocio permite overlapping
    SELECT allow_overlapping_appointments INTO v_allow_overlap
    FROM public.businesses
    WHERE id = NEW.business_id;

    -- Si el negocio permite overlapping, saltar todas las validaciones
    IF v_allow_overlap = TRUE THEN
        RETURN NEW;
    END IF;

    -- ========================================
    -- Validaciones normales (solo si overlap = FALSE)
    -- ========================================

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

    -- Verificar conflictos para el empleado
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

COMMENT ON FUNCTION public.check_appointment_conflicts IS
'Verifica conflictos de horario. Si el negocio tiene allow_overlapping_appointments=TRUE, se saltan todas las validaciones.';

-- ========================================
-- VERIFICACIÓN
-- ========================================
-- Verificar que la columna se agregó correctamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses'
        AND column_name = 'allow_overlapping_appointments'
    ) THEN
        RAISE NOTICE '✅ Column allow_overlapping_appointments added successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to add column allow_overlapping_appointments';
    END IF;
END $$;

-- Verificar que la función se actualizó
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'check_appointment_conflicts'
    ) THEN
        RAISE NOTICE '✅ Function check_appointment_conflicts updated successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to update function check_appointment_conflicts';
    END IF;

    RAISE NOTICE '🎉 Migration completed successfully!';
    RAISE NOTICE '📌 To enable overlapping for a business: UPDATE businesses SET allow_overlapping_appointments = TRUE WHERE id = <business_id>;';
END $$;
