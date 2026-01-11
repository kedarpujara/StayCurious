-- Migration: Fresh Start
-- Description: Reset all user data and simplify schema for chat-only course flow

-- ============================================
-- TRUNCATE ALL USER DATA
-- ============================================

-- Clear course progress and user data (in dependency order)
TRUNCATE TABLE public.curio_events CASCADE;
TRUNCATE TABLE public.daily_checkins CASCADE;
TRUNCATE TABLE public.monthly_snapshots CASCADE;
TRUNCATE TABLE public.eli5_submissions CASCADE;
TRUNCATE TABLE public.topic_completions CASCADE;
TRUNCATE TABLE public.learning_progress CASCADE;
TRUNCATE TABLE public.user_course_progress CASCADE;
TRUNCATE TABLE public.course_stars CASCADE;
TRUNCATE TABLE public.daily_completions CASCADE;

-- Clear courses (user-generated instances)
TRUNCATE TABLE public.courses CASCADE;

-- Clear backlog items
TRUNCATE TABLE public.backlog_items CASCADE;

-- Clear course catalog (we'll regenerate)
TRUNCATE TABLE public.course_catalog CASCADE;

-- Reset user curio points and streaks to start fresh
UPDATE public.users SET
  curio_points = 0,
  current_title = 'Curious Newcomer',
  current_streak = 0,
  longest_streak = 0,
  last_activity_date = NULL,
  daily_curio_streak = 0,
  longest_daily_streak = 0,
  last_daily_completion_date = NULL,
  curio_club_eligible_until = NULL,
  curio_club_active = false;

-- ============================================
-- SCHEMA SIMPLIFICATIONS
-- ============================================

-- Drop learning_progress table (old progress tracking)
-- We'll use user_course_progress exclusively
DROP TABLE IF EXISTS public.learning_progress CASCADE;

-- Drop daily_topics and daily_courses (not needed for now)
DROP TABLE IF EXISTS public.daily_completions CASCADE;
DROP TABLE IF EXISTS public.daily_courses CASCADE;
DROP TABLE IF EXISTS public.daily_topics CASCADE;

-- Drop backlog_items (simplifying to direct course start)
DROP TABLE IF EXISTS public.backlog_items CASCADE;

-- Drop unused curio_circles tables for now
DROP TABLE IF EXISTS public.curio_circle_members CASCADE;
DROP TABLE IF EXISTS public.curio_circles CASCADE;

-- ============================================
-- SIMPLIFY COURSES TABLE
-- ============================================

-- Remove unused columns from courses if they exist
ALTER TABLE public.courses DROP COLUMN IF EXISTS backlog_item_id;

-- ============================================
-- ADD is_featured INDEX for course_catalog
-- ============================================

CREATE INDEX IF NOT EXISTS idx_course_catalog_featured
ON public.course_catalog(is_featured)
WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_course_catalog_published
ON public.course_catalog(is_published)
WHERE is_published = true;

-- ============================================
-- NOTES
-- ============================================

-- Remaining tables:
-- - users: User profiles and curio points
-- - courses: User course instances (copy of catalog course for a user)
-- - course_catalog: Pre-generated course templates
-- - showcase_topics: Topic browser
-- - almanac_categories: Category hierarchy
-- - user_course_progress: Track user progress through courses
-- - course_stars: Course ratings
-- - curio_events: Curio earning events
-- - daily_checkins: Daily login rewards
-- - monthly_snapshots: Monthly leaderboard data
-- - eli5_submissions: ELI5 bonus submissions
-- - topic_completions: Track topic completion for duplicate prevention
