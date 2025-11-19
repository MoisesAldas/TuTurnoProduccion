-- ================================================
-- FIX: Business Photos RLS Policies
-- Description: Fix RLS policies for business_photos table
-- Note: Photos are stored in 'business-images' bucket under /gallery/ subfolder
-- Date: 2025-10-16
-- ================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active business photos" ON public.business_photos;
DROP POLICY IF EXISTS "Business owners can insert photos" ON public.business_photos;
DROP POLICY IF EXISTS "Business owners can update photos" ON public.business_photos;
DROP POLICY IF EXISTS "Business owners can delete photos" ON public.business_photos;

-- ================================================
-- RLS POLICIES (FIXED)
-- ================================================

-- Anyone can view active photos
CREATE POLICY "Anyone can view active business photos"
    ON public.business_photos FOR SELECT
    TO public
    USING (is_active = true);

-- Business owners can view all their photos (including inactive)
CREATE POLICY "Business owners can view their photos"
    ON public.business_photos FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE public.businesses.id = business_photos.business_id
            AND public.businesses.owner_id = auth.uid()
        )
    );

-- Business owners can insert their own photos
CREATE POLICY "Business owners can insert photos"
    ON public.business_photos FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE public.businesses.id = business_photos.business_id
            AND public.businesses.owner_id = auth.uid()
        )
    );

-- Business owners can update their own photos
CREATE POLICY "Business owners can update photos"
    ON public.business_photos FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE public.businesses.id = business_photos.business_id
            AND public.businesses.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE public.businesses.id = business_photos.business_id
            AND public.businesses.owner_id = auth.uid()
        )
    );

-- Business owners can delete their own photos
CREATE POLICY "Business owners can delete photos"
    ON public.business_photos FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE public.businesses.id = business_photos.business_id
            AND public.businesses.owner_id = auth.uid()
        )
    );

-- Verify RLS is enabled
ALTER TABLE public.business_photos ENABLE ROW LEVEL SECURITY;

-- ================================================
-- VERIFICATION QUERIES (for testing)
-- ================================================

-- Run these queries to verify the policies are working:
--
-- 1. Check if policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'business_photos'
-- ORDER BY policyname;
--
-- 2. Test insert as business owner:
-- SELECT auth.uid(); -- Should return your user ID
-- SELECT id, owner_id FROM businesses WHERE owner_id = auth.uid(); -- Should return your business
-- INSERT INTO business_photos (business_id, photo_url, display_order) VALUES ('your-business-id', 'test-url', 0);
