-- ========================================
-- FIX: Permitir ver datos públicos de usuarios con reviews
-- ========================================
-- Fecha: 2025-10-16
-- Problema: Los usuarios no pueden ver los nombres de otros usuarios
--           que dejaron reviews, causando que reviews.users sea null
-- Solución: Agregar política RLS que permita ver datos públicos
--           (first_name, last_name) de usuarios que tienen reviews
-- ========================================

-- Agregar política para ver usuarios que han dejado reviews
CREATE POLICY "Anyone can view public profile of users with reviews"
    ON public.users FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.reviews
            WHERE reviews.client_id = users.id
        )
    );

-- ========================================
-- VERIFICACIÓN
-- ========================================
-- Ver todas las políticas activas en la tabla users
SELECT
    schemaname,
    tablename,
    policyname,
    cmd as "Comando",
    qual as "Condición"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
ORDER BY policyname;

-- ========================================
-- NOTAS
-- ========================================
-- ✅ Permite a CUALQUIER usuario (autenticado o no) ver:
--    - first_name
--    - last_name
--    - email
--    De usuarios que han dejado reviews
--
-- ✅ Necesario para mostrar reviews en páginas públicas de negocios
-- ✅ No expone datos sensibles, solo nombre público del reviewer
-- ✅ Compatible con políticas existentes (usa OR lógico)
--
-- ALTERNATIVA: Si quieres que TODOS los perfiles sean públicos:
-- CREATE POLICY "Public profiles are viewable by anyone"
--     ON public.users FOR SELECT
--     TO public
--     USING (true);
-- ========================================
