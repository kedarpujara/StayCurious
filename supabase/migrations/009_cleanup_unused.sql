-- Migration: Cleanup unused columns and tables
-- Description: Remove unused database objects for cleanliness

-- ============================================
-- DROP UNUSED TABLES
-- ============================================

-- curiosity_logs: Legacy table from early curiosity feature, never written to
DROP TABLE IF EXISTS public.curiosity_logs;

-- badges: Badge definitions stored in constants file, not DB
DROP TABLE IF EXISTS public.user_badges;
DROP TABLE IF EXISTS public.badges;

-- titles: Title definitions stored in constants file, not DB
DROP TABLE IF EXISTS public.titles;

-- ============================================
-- DROP UNUSED COLUMNS FROM users TABLE
-- ============================================

-- preferred_intensity: Depth selection removed, courses always use 'solid'
ALTER TABLE public.users DROP COLUMN IF EXISTS preferred_intensity;

-- voice_enabled: Voice feature not implemented
ALTER TABLE public.users DROP COLUMN IF EXISTS voice_enabled;

-- elite_pricing_eligible: Feature not implemented
ALTER TABLE public.users DROP COLUMN IF EXISTS elite_pricing_eligible;
ALTER TABLE public.users DROP COLUMN IF EXISTS elite_pricing_eligible_until;

-- ============================================
-- CLEANUP courses TABLE
-- ============================================

-- Note: We're keeping intensity and time_budget for now as they're still written
-- but defaulting them. If you want to drop them, uncomment below:
-- ALTER TABLE public.courses DROP COLUMN IF EXISTS intensity;
-- ALTER TABLE public.courses DROP COLUMN IF EXISTS time_budget;

-- ============================================
-- CLEANUP NOTES
-- ============================================

-- Tables kept (still in use):
-- - users (core)
-- - courses (user course instances)
-- - course_catalog (pre-generated courses)
-- - showcase_topics (topic browser)
-- - almanac_categories (category hierarchy)
-- - backlog_items (user learning backlog)
-- - learning_progress (legacy progress tracking - used in profile)
-- - user_course_progress (new progress tracking)
-- - daily_topics, daily_courses, daily_completions (daily feature)
-- - curio_circles, curio_circle_members (social feature)
-- - curio_events, daily_checkins, monthly_snapshots (mCurio system)
-- - eli5_submissions, topic_completions (future features)
-- - course_stars (course ratings)
