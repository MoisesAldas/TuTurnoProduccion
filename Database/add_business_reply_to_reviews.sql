-- ========================================
-- MIGRATION: Add Business Reply to Reviews
-- ========================================
-- Description: Permite a los negocios responder a reseñas de clientes

-- Agregar campos para respuesta del negocio
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS business_reply TEXT,
ADD COLUMN IF NOT EXISTS business_reply_at TIMESTAMPTZ;

-- Comentarios para documentación
COMMENT ON COLUMN public.reviews.business_reply IS 'Respuesta del negocio a la reseña del cliente';
COMMENT ON COLUMN public.reviews.business_reply_at IS 'Timestamp de cuándo el negocio respondió';

-- Crear índice para filtrar reseñas con/sin respuesta
CREATE INDEX IF NOT EXISTS idx_reviews_has_reply ON public.reviews(business_id, business_reply_at)
WHERE business_reply IS NOT NULL;

-- Actualizar RLS policy para permitir UPDATE del negocio
DROP POLICY IF EXISTS "Business owners can reply to reviews" ON public.reviews;

CREATE POLICY "Business owners can reply to reviews"
ON public.reviews
FOR UPDATE
USING (
  business_id IN (
    SELECT id FROM public.businesses
    WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses
    WHERE owner_id = auth.uid()
  )
);
