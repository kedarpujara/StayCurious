-- Migration: Add username to leaderboard and fix badge awarding
-- Description: Updates leaderboard function to return username, fixes badge NULL handling

-- ============================================
-- PART 1: Fix check_and_award_badges NULL handling
-- ============================================

-- Fix the badge check function to handle NULL stats properly
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
  -- Get user stats with COALESCE to handle NULLs
  SELECT
    COALESCE(questions_asked, 0),
    COALESCE(courses_completed, 0),
    COALESCE(quizzes_passed, 0),
    COALESCE(perfect_quizzes, 0),
    COALESCE(curio_points, 0),
    COALESCE(longest_daily_streak, 0)
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
  IF v_quizzes_passed >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'first_quiz')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

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

  IF v_longest_streak >= 14 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'streak_14')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_longest_streak >= 30 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'streak_30')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Curio milestone badges
  IF v_curio_points >= 100000 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'curio_100')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_curio_points >= 500000 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'curio_500')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  IF v_curio_points >= 1000000 THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, 'curio_1000')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Return all badges the user has
  RETURN QUERY
  SELECT ub.badge_id, (ub.earned_at > NOW() - INTERVAL '5 seconds') AS newly_awarded
  FROM public.user_badges ub
  WHERE ub.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 2: Backfill missing badges for existing users
-- ============================================

-- Award first_question badge to users who have asked questions but don't have the badge
INSERT INTO public.user_badges (user_id, badge_id)
SELECT u.id, 'first_question'
FROM public.users u
WHERE COALESCE(u.questions_asked, 0) >= 1
  OR EXISTS (SELECT 1 FROM public.user_questions uq WHERE uq.user_id = u.id)
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Award first_quiz badge to users who have passed quizzes but don't have the badge
INSERT INTO public.user_badges (user_id, badge_id)
SELECT u.id, 'first_quiz'
FROM public.users u
WHERE COALESCE(u.quizzes_passed, 0) >= 1
  OR EXISTS (SELECT 1 FROM public.quiz_attempts qa WHERE qa.user_id = u.id AND qa.passed = true)
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Award first_course badge to users who have completed courses but don't have the badge
INSERT INTO public.user_badges (user_id, badge_id)
SELECT u.id, 'first_course'
FROM public.users u
WHERE COALESCE(u.courses_completed, 0) >= 1
  OR EXISTS (SELECT 1 FROM public.user_course_progress ucp WHERE ucp.user_id = u.id AND ucp.status = 'completed')
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- ============================================
-- PART 3: Update leaderboard function
-- ============================================

-- Drop existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_monthly_leaderboard_v2(INTEGER, INTEGER, INTEGER);

-- Recreate with username in return type
CREATE OR REPLACE FUNCTION get_monthly_leaderboard_v2(
  p_limit INTEGER DEFAULT 100,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
)
RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  monthly_mcurio BIGINT,
  monthly_curio NUMERIC,
  quiz_passes BIGINT,
  current_title TEXT,
  is_curio_club BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  v_month := COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);

  v_start_date := make_timestamptz(v_year, v_month, 1, 0, 0, 0, 'UTC');
  v_end_date := v_start_date + INTERVAL '1 month';

  RETURN QUERY
  WITH monthly_stats AS (
    SELECT
      ce.user_id,
      SUM(ce.mcurio_delta) as total_mcurio,
      COUNT(*) FILTER (WHERE ce.event_type = 'quiz_pass') as passes
    FROM public.curio_events ce
    WHERE ce.created_at >= v_start_date
      AND ce.created_at < v_end_date
    GROUP BY ce.user_id
    HAVING SUM(ce.mcurio_delta) > 0
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY ms.total_mcurio DESC) as rank,
    u.id as user_id,
    u.username,
    u.display_name,
    u.avatar_url,
    ms.total_mcurio as monthly_mcurio,
    (ms.total_mcurio / 1000.0)::NUMERIC as monthly_curio,
    ms.passes as quiz_passes,
    u.current_title,
    u.curio_club_active as is_curio_club
  FROM monthly_stats ms
  JOIN public.users u ON u.id = ms.user_id
  ORDER BY ms.total_mcurio DESC
  LIMIT p_limit;
END;
$$;
