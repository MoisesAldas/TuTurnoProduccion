-- ========================================
-- VERIFICAR ESTADO DE RLS
-- ========================================
-- Este script verifica si RLS está habilitado o deshabilitado
-- en las tablas de appointments
--
-- Fecha: 2025-10-08
-- ========================================

SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('appointments', 'appointment_services')
ORDER BY tablename;

-- Resultado esperado:
-- Si RLS está HABILITADO → rls_enabled = true
-- Si RLS está DESHABILITADO → rls_enabled = false

-- ========================================
-- NOTA: Si RLS está DESHABILITADO, los eventos
-- de Realtime SÍ llegan. Si está HABILITADO,
-- necesitas políticas correctas para que funcione.
-- ========================================
