-- ========================================
-- CREAR TABLA DE RESEÑAS (REVIEWS)
-- ========================================
-- Fecha: 2025-10-12
-- Descripción: Sistema de reseñas y calificaciones para negocios
-- ========================================

-- ========================================
-- TABLA REVIEWS
-- ========================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    appointment_id UUID UNIQUE NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.reviews IS 'Reseñas y calificaciones de clientes para negocios';
COMMENT ON COLUMN public.reviews.rating IS 'Calificación de 1 a 5 estrellas';
COMMENT ON COLUMN public.reviews.comment IS 'Comentario opcional del cliente';
COMMENT ON COLUMN public.reviews.appointment_id IS 'Una reseña por cita completada';

-- ========================================
-- ÍNDICES PARA OPTIMIZAR CONSULTAS
-- ========================================
CREATE INDEX IF NOT EXISTS idx_reviews_business ON public.reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_appointment ON public.reviews(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

-- ========================================
-- POLÍTICA RLS (ROW LEVEL SECURITY)
-- ========================================

-- Habilitar RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Los clientes pueden VER todas las reseñas de un negocio
CREATE POLICY "Anyone can view reviews"
    ON public.reviews FOR SELECT
    TO public
    USING (true);

-- Los clientes pueden CREAR reseñas para sus propias citas completadas
CREATE POLICY "Clients can create reviews for their completed appointments"
    ON public.reviews FOR INSERT
    TO public
    WITH CHECK (
        auth.uid() = client_id
        AND EXISTS (
            SELECT 1 FROM appointments
            WHERE appointments.id = appointment_id
            AND appointments.client_id = auth.uid()
            AND appointments.status = 'completed'
        )
    );

-- Los clientes pueden ACTUALIZAR sus propias reseñas
CREATE POLICY "Clients can update their own reviews"
    ON public.reviews FOR UPDATE
    TO public
    USING (auth.uid() = client_id)
    WITH CHECK (auth.uid() = client_id);

-- Los clientes pueden ELIMINAR sus propias reseñas
CREATE POLICY "Clients can delete their own reviews"
    ON public.reviews FOR DELETE
    TO public
    USING (auth.uid() = client_id);

-- ========================================
-- FUNCIÓN: Calcular promedio de calificaciones
-- ========================================
CREATE OR REPLACE FUNCTION get_business_average_rating(p_business_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    avg_rating NUMERIC;
BEGIN
    SELECT AVG(rating)::NUMERIC(3,2)
    INTO avg_rating
    FROM public.reviews
    WHERE business_id = p_business_id;

    RETURN COALESCE(avg_rating, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_business_average_rating IS 'Calcula el promedio de calificaciones de un negocio';

-- ========================================
-- FUNCIÓN: Contar total de reseñas
-- ========================================
CREATE OR REPLACE FUNCTION get_business_review_count(p_business_id UUID)
RETURNS INTEGER AS $$
DECLARE
    review_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER
    INTO review_count
    FROM public.reviews
    WHERE business_id = p_business_id;

    RETURN COALESCE(review_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_business_review_count IS 'Cuenta el total de reseñas de un negocio';

-- ========================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ========================================
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_updated_at_trigger
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_reviews_updated_at();

-- ========================================
-- NOTA: La validación de citas completadas se hace en la RLS policy
-- No se puede usar CHECK constraint con subqueries en PostgreSQL
-- La policy "Clients can create reviews for their completed appointments"
-- ya valida que solo se puedan crear reseñas para citas completadas
-- ========================================

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================
SELECT
    'reviews' as tabla,
    COUNT(*) as registros,
    'Tabla de reseñas creada exitosamente' as mensaje
FROM public.reviews;

SELECT
    schemaname,
    tablename,
    policyname,
    cmd as "Comando"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'reviews'
ORDER BY policyname;

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================
-- ✅ Una reseña por cita completada (appointment_id es UNIQUE)
-- ✅ Calificación de 1 a 5 estrellas (rating CHECK constraint)
-- ✅ Solo clientes pueden crear reseñas de sus propias citas
-- ✅ Solo citas completadas pueden ser reseñadas (validado por RLS policy)
-- ✅ Cualquiera puede VER las reseñas (para mostrar en perfil del negocio)
-- ✅ Funciones SQL para calcular promedio y total de reseñas
