-- Fix foreign key constraints on user_course_progress
-- The course_id FK was incorrectly pointing to course_catalog instead of courses

-- Drop the incorrect foreign key constraint on course_id
ALTER TABLE public.user_course_progress
DROP CONSTRAINT IF EXISTS user_course_progress_course_id_fkey;

-- Recreate it correctly pointing to courses table
ALTER TABLE public.user_course_progress
ADD CONSTRAINT user_course_progress_course_id_fkey
FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- Ensure catalog_course_id FK is correct (pointing to course_catalog)
ALTER TABLE public.user_course_progress
DROP CONSTRAINT IF EXISTS user_course_progress_catalog_course_id_fkey;

ALTER TABLE public.user_course_progress
ADD CONSTRAINT user_course_progress_catalog_course_id_fkey
FOREIGN KEY (catalog_course_id) REFERENCES public.course_catalog(id) ON DELETE CASCADE;
