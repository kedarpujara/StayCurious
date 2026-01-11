-- Migration: Remove depth column from course_catalog
-- Description: All courses now have the same structure, depth is no longer needed

-- ============================================
-- PART 1: DROP DEPENDENT VIEWS
-- ============================================

DROP VIEW IF EXISTS public.trending_courses;
DROP VIEW IF EXISTS public.almanac_courses_view;

-- ============================================
-- PART 2: DROP THE UNIQUE CONSTRAINT
-- ============================================

-- Drop the existing unique constraint on (showcase_topic_id, depth)
ALTER TABLE public.course_catalog
DROP CONSTRAINT IF EXISTS unique_almanac_course;

-- ============================================
-- PART 3: DROP THE DEPTH COLUMN
-- ============================================

ALTER TABLE public.course_catalog
DROP COLUMN IF EXISTS depth;

-- ============================================
-- PART 4: ADD NEW UNIQUE CONSTRAINT ON SLUG
-- ============================================

-- Slug should be unique across all courses
ALTER TABLE public.course_catalog
ADD CONSTRAINT unique_course_slug UNIQUE (slug);

-- ============================================
-- PART 5: RECREATE VIEWS WITHOUT DEPTH
-- ============================================

-- Recreate almanac_courses_view without depth
CREATE OR REPLACE VIEW public.almanac_courses_view AS
SELECT
    id,
    topic,
    slug,
    source,
    description,
    category,
    difficulty,
    estimated_minutes,
    section_count,
    stars_count,
    completions_count,
    is_vetted,
    is_featured,
    is_published,
    created_at
FROM public.course_catalog
WHERE source = 'almanac' AND is_published = true;

-- Recreate trending_courses view without depth
CREATE OR REPLACE VIEW public.trending_courses AS
SELECT
    id,
    topic,
    slug,
    source,
    description,
    category,
    difficulty,
    estimated_minutes,
    section_count,
    stars_count,
    completions_count,
    is_featured,
    created_at
FROM public.course_catalog
WHERE is_published = true
ORDER BY completions_count DESC, stars_count DESC
LIMIT 20;
