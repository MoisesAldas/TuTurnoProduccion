-- =============================================
-- Setup Avatars Storage Bucket
-- =============================================
-- This script creates and configures the 'avatars' storage bucket
-- for user profile pictures with proper RLS policies.
-- =============================================

-- 1. Create the 'avatars' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (for re-run safety)
DROP POLICY IF EXISTS "Users can view their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;

-- 4. Create RLS policies for avatars bucket

-- Policy: Anyone can view avatars (public read)
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy: Users can upload their own avatars
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- NOTES:
-- =============================================
-- Bucket Structure: avatars/{user_id}/{timestamp}.{ext}
-- Public Access: Yes (for displaying avatars on profiles)
-- Security: Users can only manage files in their own folder
-- Max File Size: Configure in Supabase Dashboard (recommended: 5MB)
-- Allowed MIME Types: image/jpeg, image/png, image/webp, image/gif
-- =============================================
