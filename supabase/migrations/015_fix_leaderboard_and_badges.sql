-- Migration: Fix leaderboard to use new tables and add badge tracking
-- Description: Updates leaderboard functions to use quiz_attempts and eli5_submissions

-- ============================================
-- PART 1: CREATE USER BADGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can read own badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can insert own badges" ON public.user_badges;

CREATE POLICY "Users can read own badges"
  ON public.user_badges
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badges"
  ON public.user_badges
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 2: ADD USER STATISTICS COLUMNS
-- ============================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS questions_asked INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS courses_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quizzes_passed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perfect_quizzes INTEGER DEFAULT 0;

-- ============================================
-- PART 3: UPDATE MONTHLY CURIO FUNCTION
-- ============================================

-- Drop old function
DROP FUNCTION IF EXISTS public.get_user_monthly_curio(UUID, INTEGER, INTEGER);

-- Create new function that uses quiz_attempts and eli5_submissions
CREATE OR REPLACE FUNCTION public.get_user_monthly_curio(
  p_user_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_total_curio INTEGER := 0;
  v_month_start TIMESTAMPTZ;
  v_month_end TIMESTAMPTZ;
  v_quiz_curio INTEGER := 0;
  v_eli5_curio INTEGER := 0;
  v_course_curio INTEGER := 0;
BEGIN
  v_month_start := make_date(p_year, p_month, 1)::TIMESTAMPTZ;
  v_month_end := (v_month_start + INTERVAL '1 month');

  -- Sum curio from quiz_attempts this month
  SELECT COALESCE(SUM(curio_earned), 0)
  INTO v_quiz_curio
  FROM public.quiz_attempts
  WHERE user_id = p_user_id
    AND created_at >= v_month_start
    AND created_at < v_month_end
    AND passed = true;

  -- Sum curio from eli5_submissions this month
  SELECT COALESCE(SUM(mcurio_awarded), 0)
  INTO v_eli5_curio
  FROM public.eli5_submissions
  WHERE user_id = p_user_id
    AND created_at >= v_month_start
    AND created_at < v_month_end
    AND passed = true;

  -- Sum curio from course completions this month (5 per section)
  SELECT COALESCE(SUM(ucp.total_sections * 5), 0)
  INTO v_course_curio
  FROM public.user_course_progress ucp
  WHERE ucp.user_id = p_user_id
    AND ucp.completed_at >= v_month_start
    AND ucp.completed_at < v_month_end
    AND ucp.status = 'completed';

  v_total_curio := v_quiz_curio + v_eli5_curio + v_course_curio;

  RETURN v_total_curio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 4: UPDATE LEADERBOARD FUNCTIONS
-- ============================================

-- Drop old functions
DROP FUNCTION IF EXISTS public.get_monthly_leaderboard(INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_user_leaderboard_position(UUID, INTEGER, INTEGER);

-- Recreate get_monthly_leaderboard
CREATE OR REPLACE FUNCTION public.get_monthly_leaderboard(
  p_limit INTEGER DEFAULT 100,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  monthly_curio INTEGER,
  current_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_curio AS (
    SELECT
      u.id AS user_id,
      u.display_name,
      u.avatar_url,
      u.current_title,
      public.get_user_monthly_curio(u.id, p_year, p_month) AS monthly_curio
    FROM public.users u
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY uc.monthly_curio DESC, uc.display_name ASC) AS rank,
    uc.user_id,
    uc.display_name,
    uc.avatar_url,
    uc.monthly_curio,
    uc.current_title
  FROM user_curio uc
  WHERE uc.monthly_curio > 0
  ORDER BY uc.monthly_curio DESC, uc.display_name ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate get_user_leaderboard_position
CREATE OR REPLACE FUNCTION public.get_user_leaderboard_position(
  p_user_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE(
  rank BIGINT,
  total_users BIGINT,
  percentile NUMERIC,
  monthly_curio INTEGER
) AS $$
DECLARE
  v_user_curio INTEGER;
  v_rank BIGINT;
  v_total BIGINT;
BEGIN
  -- Get user's monthly curio
  v_user_curio := public.get_user_monthly_curio(p_user_id, p_year, p_month);

  -- Count users with more curio (to determine rank)
  SELECT COUNT(*) + 1 INTO v_rank
  FROM public.users u
  WHERE public.get_user_monthly_curio(u.id, p_year, p_month) > v_user_curio;

  -- Count total active users (with any curio this month)
  SELECT COUNT(*) INTO v_total
  FROM public.users u
  WHERE public.get_user_monthly_curio(u.id, p_year, p_month) > 0;

  -- If user has no curio, they're unranked
  IF v_user_curio = 0 THEN
    RETURN QUERY SELECT NULL::BIGINT, v_total, NULL::NUMERIC, 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_rank,
    v_total,
    ROUND((1.0 - (v_rank::NUMERIC / NULLIF(v_total, 0))) * 100, 1),
    v_user_curio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 5: CREATE BADGE CHECK FUNCTION
-- ============================================

-- Function to check and award badges for a user
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS TABLE(
  badge_id TEXT,
  newly_awarded BOOLEAN
) AS $$
DECLARE
  v_questions_asked INTEGER;
  v_courses_completed INTEGER;
  v_quizzes_passed INTEGER;
  v_perfect_quizzes INTEGER;
  v_curio_points INTEGER;
  v_longest_streak INTEGER;
BEGIN
  -- Get user stats
  SELECT
    questions_asked,
    courses_completed,
    quizzes_passed,
    perfect_quizzes,
    curio_points,
    longest_daily_streak
  INTO
    v_questions_asked,
    v_courses_completed,
    v_quizzes_passed,
    v_perfect_quizzes,
    v_curio_points,
    v_longest_streak
  FROM public.users
  WHERE id = p_user_id;

  -- Check each badge and award if criteria met and not already awarded

  -- Questions asked badges
  IF v_questions_asked >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'first_question')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_questions_asked >= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'curious_10')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_questions_asked >= 50 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'curious_50')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_questions_asked >= 100 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'curious_100')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Courses completed badges
  IF v_courses_completed >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'first_course')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_courses_completed >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'learner_5')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_courses_completed >= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'learner_10')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_courses_completed >= 25 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'learner_25')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Quiz badges
  IF v_perfect_quizzes >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'perfect_quiz')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_perfect_quizzes >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'perfect_quiz_5')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Streak badges
  IF v_longest_streak >= 3 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'streak_3')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_longest_streak >= 7 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'streak_7')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_longest_streak >= 30 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'streak_30')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Curio milestone badges
  IF v_curio_points >= 100 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'curio_100')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_curio_points >= 500 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'curio_500')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_curio_points >= 1000 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'curio_1000')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Return all badges the user has
  RETURN QUERY
  SELECT ub.badge_id, (ub.awarded_at > NOW() - INTERVAL '5 seconds') AS newly_awarded
  FROM public.user_badges ub
  WHERE ub.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 6: HELPER FUNCTION TO INCREMENT STATS
-- ============================================

CREATE OR REPLACE FUNCTION public.increment_user_stat(
  p_user_id UUID,
  p_stat TEXT
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.users SET %I = COALESCE(%I, 0) + 1 WHERE id = $1',
    p_stat, p_stat
  ) USING p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
