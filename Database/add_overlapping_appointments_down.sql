-- ========================================
-- ROLLBACK: Remove Overlapping Appointments Feature
-- ========================================
-- Description: Revierte los cambios de add_overlapping_appointments.sql
--              Restaura la función original y elimina la columna
-- Date: 2025-01-XX

-- ========================================
-- STEP 1: Restore original conflict check function
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
-- STEP 2: Remove column from businesses table
-- ========================================
ALTER TABLE public.businesses
DROP COLUMN IF EXISTS allow_overlapping_appointments;

-- ========================================
-- VERIFICACIÓN
-- ========================================
DO $$
BEGIN
    -- Verificar que la columna se eliminó correctamente
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses'
        AND column_name = 'allow_overlapping_appointments'
    ) THEN
        RAISE NOTICE '✅ Column allow_overlapping_appointments removed successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to remove column allow_overlapping_appointments';
    END IF;

    -- Verificar que la función se restauró
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'check_appointment_conflicts'
    ) THEN
        RAISE NOTICE '✅ Function check_appointment_conflicts restored successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to restore function check_appointment_conflicts';
    END IF;

    RAISE NOTICE '🔄 Rollback completed successfully!';
    RAISE NOTICE '📌 All changes have been reverted to original state';
END $$;
