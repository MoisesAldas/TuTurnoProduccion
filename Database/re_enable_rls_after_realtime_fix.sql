-- ========================================
-- RE-HABILITAR RLS DESPUÉS DE FIX DE REALTIME
-- ========================================
-- Este script re-habilita RLS que fue deshabilitado temporalmente
-- durante el debugging del sistema Realtime.
--
-- Fecha: 2025-10-08
-- Fix: React closure issue en callbacks de Realtime
-- ========================================

-- ========================================
-- RE-HABILITAR RLS
-- ========================================

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Verificar que RLS está habilitado:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('appointments', 'appointment_services');

-- Ambas tablas deben mostrar rowsecurity = true

-- ========================================
-- NOTAS
-- ========================================

-- PROBLEMA IDENTIFICADO:
-- El issue NO era RLS - era un React closure problem.
-- Los callbacks de useRealtimeAppointments capturaban valores
-- "viejos" de selectedDate, selectedEmployees, viewType.
--
-- SOLUCIÓN:
-- Usar useRef para mantener referencias actualizadas:
-- - selectedDateRef.current
-- - viewTypeRef.current
-- - selectedEmployeesRef.current
--
-- RESULTADO:
-- Ahora los filtros usan valores actualizados en tiempo real.
-- RLS puede permanecer habilitado sin afectar funcionalidad.

COMMENT ON TABLE public.appointments IS 'Citas agendadas - RLS habilitado con Realtime funcionando correctamente';
COMMENT ON TABLE public.appointment_services IS 'Servicios de citas - RLS habilitado con Realtime funcionando correctamente';
