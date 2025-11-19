-- ================================================
-- MIGRATION: Add Business Photos Gallery
-- Description: Allows businesses to upload multiple photos
-- Storage: Uses 'business-images' bucket, subfolder: {business_id}/gallery/
-- Date: 2025-10-16
-- ================================================

-- Create business_photos table
CREATE TABLE IF NOT EXISTS public.business_photos (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT business_photos_order_positive CHECK (display_order >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_photos_business_id
    ON public.business_photos(business_id);

CREATE INDEX IF NOT EXISTS idx_business_photos_display_order
    ON public.business_photos(business_id, display_order)
    WHERE is_active = true;

-- Add updated_at trigger
CREATE TRIGGER update_business_photos_updated_at
    BEFORE UPDATE ON public.business_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- RLS POLICIES
-- ================================================

-- Enable RLS
ALTER TABLE public.business_photos ENABLE ROW LEVEL SECURITY;

-- Anyone can view active photos
CREATE POLICY "Anyone can view active business photos"
    ON public.business_photos FOR SELECT
    TO public
    USING (is_active = true);

-- Business owners can insert their own photos
CREATE POLICY "Business owners can insert photos"
    ON public.business_photos FOR INSERT
    TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = business_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- Business owners can update their own photos
CREATE POLICY "Business owners can update photos"
    ON public.business_photos FOR UPDATE
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = business_id
            AND businesses.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = business_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- Business owners can delete their own photos
CREATE POLICY "Business owners can delete photos"
    ON public.business_photos FOR DELETE
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = business_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- ================================================
-- HELPER FUNCTION
-- ================================================

-- Function to get business photos ordered
CREATE OR REPLACE FUNCTION get_business_photos(p_business_id UUID)
RETURNS TABLE (
    id UUID,
    photo_url TEXT,
    display_order INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bp.id,
        bp.photo_url,
        bp.display_order,
        bp.created_at
    FROM business_photos bp
    WHERE bp.business_id = p_business_id
    AND bp.is_active = true
    ORDER BY bp.display_order ASC, bp.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_business_photos(UUID) TO public;

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE public.business_photos IS 'Stores additional photos for businesses (gallery)';
COMMENT ON COLUMN public.business_photos.display_order IS 'Order in which photos are displayed (0 = first)';
COMMENT ON COLUMN public.business_photos.is_active IS 'Soft delete flag';
