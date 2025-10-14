-- ========================================
-- HABILITAR REALTIME PARA SISTEMA DE CITAS
-- ========================================
-- Este script documenta la configuración de Supabase Realtime
-- para actualizaciones automáticas del calendario en tiempo real.
--
-- Fecha: 2025-10-08
-- Feature: Real-time calendar updates
-- ========================================

-- ========================================
-- HABILITAR REALTIME PUBLICATION
-- ========================================

-- Habilitar Realtime para la tabla appointments
-- Esto permite que los clientes se suscriban a cambios (INSERT, UPDATE, DELETE)
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- Habilitar Realtime para la tabla appointment_services
-- Necesario para reflejar cambios en los servicios de las citas
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_services;

-- ========================================
-- VERIFICACIÓN DE RLS POLICIES
-- ========================================

-- ✅ Las políticas RLS ya están configuradas correctamente:
--
-- Business Owners pueden:
-- - SELECT appointments WHERE business_id = their_business
-- - Reciben eventos SOLO de sus propias citas
--
-- Clients pueden:
-- - SELECT appointments WHERE client_id = auth.uid()
-- - Reciben eventos SOLO de sus propias citas
--
-- ⚠️ IMPORTANTE: Realtime respeta automáticamente las políticas RLS.
-- Los usuarios solo recibirán eventos de datos que pueden ver según sus políticas.

-- ========================================
-- NOTAS DE IMPLEMENTACIÓN
-- ========================================

-- 1. FILTRADO SERVER-SIDE:
--    Los hooks de React filtran por business_id en el canal:
--    channel(`appointments:business_id=eq.${businessId}`)
--
-- 2. SEGURIDAD:
--    RLS policies previenen que usuarios vean datos no autorizados.
--    Un business owner NUNCA verá citas de otro negocio.
--
-- 3. PERFORMANCE:
--    - Solo se envían cambios relevantes al cliente
--    - Payload minimal (solo campos modificados en UPDATE)
--    - Auto-cleanup cuando el cliente se desconecta
--
-- 4. TABLAS RELACIONADAS:
--    appointment_services se escucha para detectar cambios en
--    servicios asociados a las citas (multi-service appointments)

-- ========================================
-- CÓMO VERIFICAR QUE ESTÁ ACTIVO
-- ========================================

-- Opción 1: Supabase Dashboard
-- Database → Replication → Ver tablas con Realtime habilitado

-- Opción 2: SQL Query
-- SELECT tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime';
-- Debe mostrar: appointments, appointment_services

-- ========================================
-- ROLLBACK (SI ES NECESARIO)
-- ========================================

-- Para deshabilitar Realtime (NO EJECUTAR A MENOS QUE SEA NECESARIO):
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.appointments;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.appointment_services;

COMMENT ON TABLE public.appointments IS 'Citas agendadas - Realtime habilitado para actualizaciones automáticas del calendario';
COMMENT ON TABLE public.appointment_services IS 'Servicios de citas - Realtime habilitado para sincronización de multi-servicios';
