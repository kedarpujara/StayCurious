-- Migration: Fix badge function column name mismatch
-- Description: The check_and_award_badges function referenced 'earned_at' but the column is 'awarded_at'
-- This was preventing badges from being awarded properly

-- Fix the badge check function to use correct column name
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
  -- FIX: Changed 'earned_at' to 'awarded_at' to match actual column name
  RETURN QUERY
  SELECT ub.badge_id, (ub.awarded_at > NOW() - INTERVAL '5 seconds') AS newly_awarded
  FROM public.user_badges ub
  WHERE ub.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Backfill badges for existing users who should have them
-- ============================================

-- Award first_question badge to users who have asked questions but don't have the badge
INSERT INTO public.user_badges (user_id, badge_id)
SELECT u.id, 'first_question'
FROM public.users u
WHERE COALESCE(u.questions_asked, 0) >= 1
  AND NOT EXISTS (
    SELECT 1 FROM public.user_badges ub
    WHERE ub.user_id = u.id AND ub.badge_id = 'first_question'
  )
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Award curious_10 badge
INSERT INTO public.user_badges (user_id, badge_id)
SELECT u.id, 'curious_10'
FROM public.users u
WHERE COALESCE(u.questions_asked, 0) >= 10
  AND NOT EXISTS (
    SELECT 1 FROM public.user_badges ub
    WHERE ub.user_id = u.id AND ub.badge_id = 'curious_10'
  )
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Award first_course badge
INSERT INTO public.user_badges (user_id, badge_id)
SELECT u.id, 'first_course'
FROM public.users u
WHERE COALESCE(u.courses_completed, 0) >= 1
  AND NOT EXISTS (
    SELECT 1 FROM public.user_badges ub
    WHERE ub.user_id = u.id AND ub.badge_id = 'first_course'
  )
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Award learner_5 badge
INSERT INTO public.user_badges (user_id, badge_id)
SELECT u.id, 'learner_5'
FROM public.users u
WHERE COALESCE(u.courses_completed, 0) >= 5
  AND NOT EXISTS (
    SELECT 1 FROM public.user_badges ub
    WHERE ub.user_id = u.id AND ub.badge_id = 'learner_5'
  )
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Award first_quiz badge
INSERT INTO public.user_badges (user_id, badge_id)
SELECT u.id, 'first_quiz'
FROM public.users u
WHERE COALESCE(u.quizzes_passed, 0) >= 1
  AND NOT EXISTS (
    SELECT 1 FROM public.user_badges ub
    WHERE ub.user_id = u.id AND ub.badge_id = 'first_quiz'
  )
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Award perfect_quiz badge
INSERT INTO public.user_badges (user_id, badge_id)
SELECT u.id, 'perfect_quiz'
FROM public.users u
WHERE COALESCE(u.perfect_quizzes, 0) >= 1
  AND NOT EXISTS (
    SELECT 1 FROM public.user_badges ub
    WHERE ub.user_id = u.id AND ub.badge_id = 'perfect_quiz'
  )
ON CONFLICT (user_id, badge_id) DO NOTHING;
