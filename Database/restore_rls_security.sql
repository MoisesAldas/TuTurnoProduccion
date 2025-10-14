-- ========================================
-- RESTAURAR SEGURIDAD RLS EN APPOINTMENTS
-- ========================================
-- Este script habilita RLS de manera segura sin romper Realtime
--
-- Fecha: 2025-10-10
-- ========================================

-- ========================================
-- PASO 1: Verificar estado actual
-- ========================================

SELECT
    tablename,
    rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('appointments', 'appointment_services');

-- ========================================
-- PASO 2: Eliminar políticas existentes (si hay)
-- ========================================

DROP POLICY IF EXISTS "Clients can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view their own appointments as clients" ON public.appointments;
DROP POLICY IF EXISTS "Business owners can view appointments for their businesses" ON public.appointments;
DROP POLICY IF EXISTS "Business owners can create appointments for their businesses" ON public.appointments;
DROP POLICY IF EXISTS "Business owners can update appointments for their businesses" ON public.appointments;

DROP POLICY IF EXISTS "Users can view appointment services for their appointments" ON public.appointment_services;
DROP POLICY IF EXISTS "Users can manage appointment services for their appointments" ON public.appointment_services;

-- ========================================
-- PASO 3: Crear políticas para APPOINTMENTS
-- ========================================

-- Clientes pueden crear sus propias citas
CREATE POLICY "Clients can create appointments"
    ON public.appointments FOR INSERT
    TO public
    WITH CHECK (auth.uid() = client_id);

-- Clientes pueden actualizar sus propias citas
CREATE POLICY "Clients can update their own appointments"
    ON public.appointments FOR UPDATE
    TO public
    USING (auth.uid() = client_id);

-- Clientes pueden ver sus propias citas
CREATE POLICY "Users can view their own appointments as clients"
    ON public.appointments FOR SELECT
    TO public
    USING (auth.uid() = client_id);

-- Dueños de negocio pueden ver citas de su negocio
CREATE POLICY "Business owners can view appointments for their businesses"
    ON public.appointments FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = appointments.business_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- Dueños de negocio pueden crear citas (walk-ins)
CREATE POLICY "Business owners can create appointments for their businesses"
    ON public.appointments FOR INSERT
    TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = appointments.business_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- Dueños de negocio pueden actualizar citas de su negocio
CREATE POLICY "Business owners can update appointments for their businesses"
    ON public.appointments FOR UPDATE
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = appointments.business_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- ========================================
-- PASO 4: Crear políticas para APPOINTMENT_SERVICES
-- ========================================

-- Ver servicios de las citas
CREATE POLICY "Users can view appointment services for their appointments"
    ON public.appointment_services FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM appointments
            WHERE appointments.id = appointment_services.appointment_id
            AND (
                appointments.client_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM businesses
                    WHERE businesses.id = appointments.business_id
                    AND businesses.owner_id = auth.uid()
                )
            )
        )
    );

-- Gestionar servicios de las citas
CREATE POLICY "Users can manage appointment services for their appointments"
    ON public.appointment_services FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM appointments
            WHERE appointments.id = appointment_services.appointment_id
            AND (
                appointments.client_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM businesses
                    WHERE businesses.id = appointments.business_id
                    AND businesses.owner_id = auth.uid()
                )
            )
        )
    );

-- ========================================
-- PASO 5: HABILITAR RLS
-- ========================================

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PASO 6: Verificación final
-- ========================================

-- Ver estado de RLS
SELECT
    tablename,
    rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('appointments', 'appointment_services');

-- Ver políticas creadas
SELECT
    schemaname,
    tablename,
    policyname,
    cmd as "Comando"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('appointments', 'appointment_services')
ORDER BY tablename, policyname;

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================

-- ✅ REALTIME FUNCIONA CON RLS HABILITADO
-- El problema anterior NO era RLS, era un React closure issue
-- que ya fue resuelto usando useRef.

-- ✅ SEGURIDAD GARANTIZADA
-- Con RLS habilitado:
-- - Los clientes solo ven sus propias citas
-- - Los dueños solo ven citas de su negocio
-- - No hay acceso cruzado entre negocios

-- ✅ WALK-INS FUNCIONAN
-- Los business owners pueden crear citas con client_id NULL
-- gracias a la política "Business owners can create appointments"

COMMENT ON TABLE public.appointments IS 'RLS habilitado - Realtime funciona correctamente';
COMMENT ON TABLE public.appointment_services IS 'RLS habilitado - Realtime funciona correctamente';
