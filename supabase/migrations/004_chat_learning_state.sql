-- Chat-First Learning State Migration
-- Adds chat state tracking to learning_progress for the conversational learning UI

-- ============================================
-- PART 1: EXTEND LEARNING_PROGRESS TABLE
-- ============================================

-- Add chat_state JSONB column for storing conversation state
ALTER TABLE public.learning_progress
ADD COLUMN IF NOT EXISTS chat_state JSONB DEFAULT NULL;

-- Chat state structure:
-- {
--   "mode": "guided" | "clarification",
--   "currentSectionIndex": 0,
--   "currentStepIndex": 0,
--   "messagesCount": 5,
--   "lastStepKind": "intro" | "content" | "check" | "summary",
--   "lastUpdated": "ISO timestamp"
-- }

-- Add index for querying users with active chat sessions
CREATE INDEX IF NOT EXISTS idx_learning_progress_chat_state
ON public.learning_progress((chat_state IS NOT NULL))
WHERE chat_state IS NOT NULL;

-- ============================================
-- PART 2: UPDATE RPC FUNCTION FOR CHAT STATE
-- ============================================

-- Function to update chat state atomically
CREATE OR REPLACE FUNCTION public.update_chat_learning_state(
    p_user_id UUID,
    p_course_id UUID,
    p_chat_state JSONB
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.learning_progress
    SET
        chat_state = p_chat_state,
        last_accessed_at = NOW()
    WHERE user_id = p_user_id AND course_id = p_course_id;

    -- If no row was updated, insert one
    IF NOT FOUND THEN
        INSERT INTO public.learning_progress (
            user_id,
            course_id,
            chat_state,
            sections_completed,
            last_accessed_at
        ) VALUES (
            p_user_id,
            p_course_id,
            p_chat_state,
            '{}',
            NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 3: ADD COMMENT FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN public.learning_progress.chat_state IS 'JSONB state for chat-first learning mode: mode, step indexes, message count';
