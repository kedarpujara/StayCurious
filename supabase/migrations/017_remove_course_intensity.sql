-- Migration: Remove intensity and time_budget requirements from courses
-- Description: These fields are no longer used in the new simplified course generation

-- Drop the NOT NULL constraint and check constraint on intensity
ALTER TABLE public.courses
ALTER COLUMN intensity DROP NOT NULL;

ALTER TABLE public.courses
DROP CONSTRAINT IF EXISTS courses_intensity_check;

-- Drop the NOT NULL constraint on time_budget
ALTER TABLE public.courses
ALTER COLUMN time_budget DROP NOT NULL;

-- Also remove backlog_item_id column since it's not used
ALTER TABLE public.courses
DROP COLUMN IF EXISTS backlog_item_id;
