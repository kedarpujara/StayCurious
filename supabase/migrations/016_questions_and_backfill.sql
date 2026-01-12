-- Migration: Add questions table and backfill curio_events
-- Description: Store user questions and backfill leaderboard data

-- ============================================
-- PART 1: CREATE USER QUESTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  category TEXT,
  source TEXT DEFAULT 'ask_page', -- ask_page, course_chat, instant_curiosity
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_questions_user ON public.user_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_questions_created ON public.user_questions(created_at DESC);

ALTER TABLE public.user_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own questions" ON public.user_questions;
DROP POLICY IF EXISTS "Users can insert own questions" ON public.user_questions;

CREATE POLICY "Users can read own questions"
  ON public.user_questions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own questions"
  ON public.user_questions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 2: BACKFILL CURIO_EVENTS FROM EXISTING DATA
-- ============================================

-- Backfill from completed courses (5 curio per section = 5000 mCurio per section)
INSERT INTO public.curio_events (user_id, event_type, mcurio_delta, breakdown, course_id, created_at)
SELECT
  ucp.user_id,
  'course_complete',
  (ucp.total_sections * 5 * 1000)::INTEGER, -- 5 curio per section in mCurio
  jsonb_build_object('sections', ucp.total_sections, 'per_section', 5),
  ucp.course_id,
  COALESCE(ucp.completed_at, ucp.last_accessed_at, NOW())
FROM public.user_course_progress ucp
WHERE ucp.status = 'completed'
  AND ucp.total_sections > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.curio_events ce
    WHERE ce.user_id = ucp.user_id
      AND ce.course_id = ucp.course_id
      AND ce.event_type = 'course_complete'
  )
ON CONFLICT DO NOTHING;

-- Backfill from quiz_attempts (already has curio_earned)
INSERT INTO public.curio_events (user_id, event_type, mcurio_delta, breakdown, course_id, created_at)
SELECT
  qa.user_id,
  'quiz_pass',
  (qa.curio_earned * 1000)::INTEGER, -- Convert to mCurio
  jsonb_build_object(
    'difficulty', qa.difficulty,
    'score', qa.score_percent,
    'attempt', qa.attempt_number
  ),
  qa.course_id,
  qa.created_at
FROM public.quiz_attempts qa
WHERE qa.passed = true
  AND qa.curio_earned > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.curio_events ce
    WHERE ce.user_id = qa.user_id
      AND ce.course_id = qa.course_id
      AND ce.event_type = 'quiz_pass'
      AND DATE(ce.created_at) = DATE(qa.created_at)
  )
ON CONFLICT DO NOTHING;

-- Backfill from eli5_submissions
INSERT INTO public.curio_events (user_id, event_type, mcurio_delta, breakdown, course_id, created_at)
SELECT
  es.user_id,
  'eli5_pass',
  (es.mcurio_awarded)::INTEGER, -- Already in mCurio
  jsonb_build_object('concepts', es.concepts),
  es.course_id,
  es.created_at
FROM public.eli5_submissions es
WHERE es.passed = true
  AND es.mcurio_awarded > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.curio_events ce
    WHERE ce.user_id = es.user_id
      AND ce.course_id = es.course_id
      AND ce.event_type = 'eli5_pass'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 3: UPDATE USER STATS FROM ACTUAL DATA
-- ============================================

-- Update courses_completed count
UPDATE public.users u
SET courses_completed = (
  SELECT COUNT(*)
  FROM public.user_course_progress ucp
  WHERE ucp.user_id = u.id AND ucp.status = 'completed'
);

-- Update quizzes_passed count
UPDATE public.users u
SET quizzes_passed = (
  SELECT COUNT(*)
  FROM public.quiz_attempts qa
  WHERE qa.user_id = u.id AND qa.passed = true
);

-- Update perfect_quizzes count
UPDATE public.users u
SET perfect_quizzes = (
  SELECT COUNT(*)
  FROM public.quiz_attempts qa
  WHERE qa.user_id = u.id AND qa.passed = true AND qa.score_percent = 100
);

-- ============================================
-- PART 4: RECALCULATE CURIO POINTS FROM EVENTS
-- ============================================

-- Create function to recalculate curio from events
CREATE OR REPLACE FUNCTION public.recalculate_user_curio(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_mcurio BIGINT;
  v_curio INTEGER;
BEGIN
  -- Sum all curio events for this user
  SELECT COALESCE(SUM(mcurio_delta), 0)
  INTO v_total_mcurio
  FROM public.curio_events
  WHERE user_id = p_user_id;

  -- Convert mCurio to Curio (divide by 1000)
  v_curio := (v_total_mcurio / 1000)::INTEGER;

  -- Update user's curio_points
  UPDATE public.users
  SET curio_points = v_curio
  WHERE id = p_user_id;

  RETURN v_curio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalculate all users' curio (run once)
-- DO $$
-- DECLARE
--   r RECORD;
-- BEGIN
--   FOR r IN SELECT id FROM public.users LOOP
--     PERFORM public.recalculate_user_curio(r.id);
--   END LOOP;
-- END $$;
