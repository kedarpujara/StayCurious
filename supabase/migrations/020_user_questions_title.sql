-- Migration: Add title and answer columns to user_questions
-- Description: Store AI-generated title and quick answer for questions

ALTER TABLE public.user_questions
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE public.user_questions
ADD COLUMN IF NOT EXISTS answer TEXT;

-- Add index for potential title searches
CREATE INDEX IF NOT EXISTS idx_user_questions_title ON public.user_questions(title);

-- Add update policy so users can update their own questions (e.g., save answers)
DROP POLICY IF EXISTS "Users can update own questions" ON public.user_questions;

CREATE POLICY "Users can update own questions"
  ON public.user_questions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
