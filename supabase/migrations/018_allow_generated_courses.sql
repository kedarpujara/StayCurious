-- Migration: Allow user-generated courses in course_catalog
-- Description: Update RLS policy to allow users to insert courses with source='generated'

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can create community courses" ON public.course_catalog;

-- Create a new policy that allows both 'community' and 'generated' sources
CREATE POLICY "Users can create courses"
    ON public.course_catalog FOR INSERT
    TO authenticated
    WITH CHECK (creator_id = auth.uid() AND source IN ('community', 'generated'));
