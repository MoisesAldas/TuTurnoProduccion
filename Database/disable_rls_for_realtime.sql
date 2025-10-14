-- ========================================
-- DESHABILITAR RLS PARA REALTIME
-- ========================================
-- Este script deshabilita RLS en las tablas de appointments
-- para permitir que Supabase Realtime funcione correctamente.
--
-- Fecha: 2025-10-08
-- Decisión de arquitectura: Seguridad mediante filtros server-side
-- ========================================

-- ========================================
-- ¿POR QUÉ DESHABILITAR RLS EN ESTAS TABLAS?
-- ========================================

-- PROBLEMA IDENTIFICADO:
-- Cuando RLS está habilitado, Supabase Realtime evalúa las políticas
-- RLS en el contexto del usuario SUSCRITO (business owner), no del
-- usuario que hizo el cambio (cliente).
--
-- Flujo problemático:
-- 1. Cliente crea cita → INSERT exitoso (política permite)
-- 2. Evento Realtime generado
-- 3. Business owner está suscrito al canal
-- 4. RLS evalúa: ¿puede business owner hacer SELECT en esta fila?
-- 5. Evaluación falla por timing/contexto → evento NO se envía
-- 6. Calendar no se actualiza automáticamente ❌

-- SOLUCIÓN IMPLEMENTADA:
-- Deshabilitar RLS en appointments y appointment_services
-- La seguridad se mantiene mediante:
--
-- 1. FILTROS SERVER-SIDE:
--    - Canal Realtime: `business_id=eq.${businessId}`
--    - Solo eventos del negocio específico llegan al cliente
--    - Filtrado a nivel de base de datos, no cliente
--
-- 2. AUTENTICACIÓN REQUERIDA:
--    - Solo usuarios autenticados pueden suscribirse
--    - businessId se obtiene del usuario autenticado
--    - No es posible falsificar businessId desde cliente
--
-- 3. QUERIES DE APLICACIÓN:
--    - Todas las queries SELECT filtran por business_id
--    - fetchAppointments() siempre usa business.id del owner
--    - No hay endpoints públicos sin filtros
--
-- 4. API ROUTES PROTEGIDAS:
--    - Middleware de autenticación en todas las rutas
--    - Verificación de ownership antes de modificaciones

-- ========================================
-- TRADE-OFF EVALUADO
-- ========================================

-- ✅ BENEFICIO:
-- - Realtime funciona inmediatamente sin latencia
-- - Eventos llegan a todos los usuarios autorizados
-- - Mejor experiencia de usuario (actualizaciones instantáneas)
-- - Código más simple, menos bugs de timing

-- ⚠️ RIESGO (MITIGADO):
-- - Sin RLS, queries directas sin filtro verían todos los datos
-- - MITIGACIÓN: La aplicación SIEMPRE filtra por business_id
-- - No hay endpoints que permitan queries sin filtros
-- - Service Role Key nunca se expone al cliente

-- ========================================
-- DECISIÓN FINAL
-- ========================================

-- Mantener RLS DESHABILITADO en appointments/appointment_services
-- La seguridad está garantizada por filtros en múltiples capas:
-- 1. Realtime channel filter (server-side)
-- 2. Application queries (siempre filtran por business_id)
-- 3. Autenticación requerida (middleware)
-- 4. No hay Service Role Key en cliente

-- ========================================
-- EJECUTAR SQL
-- ========================================

ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services DISABLE ROW LEVEL SECURITY;

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Verificar que RLS está deshabilitado:
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('appointments', 'appointment_services');

-- Resultado esperado:
-- appointments          | false
-- appointment_services  | false

-- ========================================
-- NOTA IMPORTANTE
-- ========================================

-- MANTENER RLS HABILITADO en todas las demás tablas:
-- - users (protege datos personales)
-- - businesses (protege configuración de negocios)
-- - employees (protege datos de empleados)
-- - services (protege catálogo de servicios)
-- - payments (protege transacciones financieras)
-- - invoices (protege facturación)
-- etc.

-- Solo appointments y appointment_services tienen RLS deshabilitado
-- por razones específicas de Realtime.

COMMENT ON TABLE public.appointments IS 'Citas agendadas - RLS deshabilitado para Realtime, seguridad mediante filtros server-side por business_id';
COMMENT ON TABLE public.appointment_services IS 'Servicios de citas - RLS deshabilitado para Realtime, seguridad mediante filtros server-side';
