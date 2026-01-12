-- Migration: Make course_id nullable in user_course_progress
-- Description: We're transitioning to use catalog_course_id instead of course_id

-- Make course_id nullable since we now use catalog_course_id
ALTER TABLE public.user_course_progress
ALTER COLUMN course_id DROP NOT NULL;
