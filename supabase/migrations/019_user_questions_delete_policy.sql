-- Migration: Add delete policy for user_questions
-- Description: Allow users to delete their own questions

DROP POLICY IF EXISTS "Users can delete own questions" ON public.user_questions;

CREATE POLICY "Users can delete own questions"
  ON public.user_questions
  FOR DELETE
  USING (auth.uid() = user_id);
