-- ========================================
-- FIX: Conflictos de horario en drag & drop
-- Fecha: 2025-10-09
-- Problema: Al arrastrar una cita para moverla, el sistema detectaba
-- un falso conflicto consigo misma.
-- Solución: Usar OLD.id en vez de NEW.id para UPDATE operations
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

COMMENT ON FUNCTION public.check_appointment_conflicts IS 'Verifica que no haya conflictos de horario al crear o actualizar citas. Excluye correctamente la cita actual en operaciones de UPDATE.';
