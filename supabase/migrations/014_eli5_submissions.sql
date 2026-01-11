-- Migration: Create eli5_submissions table for ELI5 challenge tracking
-- Description: Stores user ELI5 explanations and results

-- ============================================
-- PART 1: CREATE THE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.eli5_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.course_catalog(id) ON DELETE CASCADE,
  concepts JSONB NOT NULL, -- [{term, explanation, score}]
  passed BOOLEAN NOT NULL DEFAULT false,
  mcurio_awarded INTEGER DEFAULT 0,
  month_key TEXT NOT NULL, -- 'YYYY-MM' for tracking
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one passed ELI5 per user per course (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS unique_eli5_pass
  ON public.eli5_submissions(user_id, course_id)
  WHERE passed = true;

-- ============================================
-- PART 2: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_eli5_submissions_user
  ON public.eli5_submissions(user_id);

CREATE INDEX IF NOT EXISTS idx_eli5_submissions_course
  ON public.eli5_submissions(course_id);

CREATE INDEX IF NOT EXISTS idx_eli5_submissions_user_course_passed
  ON public.eli5_submissions(user_id, course_id, passed);

-- ============================================
-- PART 3: ENABLE RLS
-- ============================================

ALTER TABLE public.eli5_submissions ENABLE ROW LEVEL SECURITY;

-- Users can read their own submissions
CREATE POLICY "Users can read own eli5_submissions"
  ON public.eli5_submissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own submissions
CREATE POLICY "Users can insert own eli5_submissions"
  ON public.eli5_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
