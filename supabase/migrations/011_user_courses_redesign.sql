-- Migration: User Courses Redesign
-- Description: Scalable schema for tracking saved courses, progress, and quiz attempts

-- ============================================
-- PART 1: ENHANCE USER_COURSE_PROGRESS TABLE
-- ============================================

-- Add 'saved' to status enum and add new tracking columns
ALTER TABLE public.user_course_progress
DROP CONSTRAINT IF EXISTS user_course_progress_status_check;

ALTER TABLE public.user_course_progress
ADD CONSTRAINT user_course_progress_status_check
CHECK (status IN ('saved', 'in_progress', 'completed'));

-- Add reference to catalog course (for saved courses that haven't started yet)
ALTER TABLE public.user_course_progress
ADD COLUMN IF NOT EXISTS catalog_course_id UUID REFERENCES public.course_catalog(id) ON DELETE CASCADE;

-- Add integer section index for cleaner tracking
ALTER TABLE public.user_course_progress
ADD COLUMN IF NOT EXISTS current_section_index INTEGER DEFAULT 0;

-- Add total sections (snapshot at start for any length course)
ALTER TABLE public.user_course_progress
ADD COLUMN IF NOT EXISTS total_sections INTEGER DEFAULT 0;

-- Add curio earned tracking for sections
ALTER TABLE public.user_course_progress
ADD COLUMN IF NOT EXISTS curio_earned_sections INTEGER DEFAULT 0;

-- Add saved_at timestamp for backlog
ALTER TABLE public.user_course_progress
ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for catalog course lookups
CREATE INDEX IF NOT EXISTS idx_user_course_progress_catalog
ON public.user_course_progress(catalog_course_id);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_user_course_progress_status
ON public.user_course_progress(status);

-- Create unique constraint on user + catalog course
-- (one progress record per user per catalog course)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_catalog_course'
    ) THEN
        ALTER TABLE public.user_course_progress
        ADD CONSTRAINT unique_user_catalog_course
        UNIQUE (user_id, catalog_course_id);
    END IF;
END $$;

-- ============================================
-- PART 2: CREATE QUIZ_ATTEMPTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    catalog_course_id UUID REFERENCES public.course_catalog(id) ON DELETE CASCADE,

    -- Quiz configuration
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    questions_total INTEGER NOT NULL,

    -- Results
    questions_correct INTEGER NOT NULL,
    score_percent INTEGER NOT NULL, -- 0-100
    passed BOOLEAN NOT NULL,

    -- Curio awarded
    curio_earned INTEGER DEFAULT 0,

    -- Answers for review (optional)
    answers JSONB,

    -- Metadata
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quiz_attempts
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user
ON public.quiz_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course
ON public.quiz_attempts(course_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_catalog
ON public.quiz_attempts(catalog_course_id);

-- ============================================
-- PART 3: ROW LEVEL SECURITY FOR QUIZ_ATTEMPTS
-- ============================================

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz attempts"
    ON public.quiz_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz attempts"
    ON public.quiz_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 4: HELPER FUNCTION TO GET OR CREATE PROGRESS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_or_create_course_progress(
    p_user_id UUID,
    p_catalog_course_id UUID,
    p_total_sections INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_progress_id UUID;
BEGIN
    -- Try to find existing progress
    SELECT id INTO v_progress_id
    FROM public.user_course_progress
    WHERE user_id = p_user_id AND catalog_course_id = p_catalog_course_id;

    -- If not found, create new
    IF v_progress_id IS NULL THEN
        INSERT INTO public.user_course_progress (
            user_id,
            catalog_course_id,
            total_sections,
            status,
            current_section_index,
            sections_completed
        ) VALUES (
            p_user_id,
            p_catalog_course_id,
            p_total_sections,
            'saved',
            0,
            '{}'
        )
        RETURNING id INTO v_progress_id;
    END IF;

    RETURN v_progress_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 5: FUNCTION TO SAVE COURSE TO BACKLOG
-- ============================================

CREATE OR REPLACE FUNCTION public.save_course_to_backlog(
    p_user_id UUID,
    p_catalog_course_id UUID,
    p_total_sections INTEGER
)
RETURNS UUID AS $$
DECLARE
    v_progress_id UUID;
BEGIN
    -- Check if already exists
    SELECT id INTO v_progress_id
    FROM public.user_course_progress
    WHERE user_id = p_user_id AND catalog_course_id = p_catalog_course_id;

    IF v_progress_id IS NOT NULL THEN
        -- Already saved/started, return existing
        RETURN v_progress_id;
    END IF;

    -- Create new saved course
    INSERT INTO public.user_course_progress (
        user_id,
        catalog_course_id,
        total_sections,
        status,
        current_section_index,
        sections_completed,
        saved_at
    ) VALUES (
        p_user_id,
        p_catalog_course_id,
        p_total_sections,
        'saved',
        0,
        '{}',
        NOW()
    )
    RETURNING id INTO v_progress_id;

    RETURN v_progress_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 6: FUNCTION TO START COURSE
-- ============================================

CREATE OR REPLACE FUNCTION public.start_course(
    p_user_id UUID,
    p_catalog_course_id UUID,
    p_course_id UUID,
    p_total_sections INTEGER
)
RETURNS UUID AS $$
DECLARE
    v_progress_id UUID;
BEGIN
    -- Try to update existing saved course
    UPDATE public.user_course_progress
    SET
        course_id = p_course_id,
        status = 'in_progress',
        total_sections = p_total_sections,
        started_at = NOW(),
        last_accessed_at = NOW()
    WHERE user_id = p_user_id AND catalog_course_id = p_catalog_course_id
    RETURNING id INTO v_progress_id;

    -- If not found, create new
    IF v_progress_id IS NULL THEN
        INSERT INTO public.user_course_progress (
            user_id,
            catalog_course_id,
            course_id,
            total_sections,
            status,
            current_section_index,
            sections_completed,
            started_at
        ) VALUES (
            p_user_id,
            p_catalog_course_id,
            p_course_id,
            p_total_sections,
            'in_progress',
            0,
            '{}',
            NOW()
        )
        RETURNING id INTO v_progress_id;
    END IF;

    RETURN v_progress_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 7: FUNCTION TO UPDATE SECTION PROGRESS
-- ============================================

CREATE OR REPLACE FUNCTION public.complete_section(
    p_user_id UUID,
    p_course_id UUID,
    p_section_index INTEGER,
    p_curio_earned INTEGER DEFAULT 5
)
RETURNS TABLE(
    new_section_index INTEGER,
    total_curio_earned INTEGER,
    is_course_complete BOOLEAN
) AS $$
DECLARE
    v_total_sections INTEGER;
    v_sections_completed TEXT[];
    v_new_curio INTEGER;
BEGIN
    -- Get current progress
    SELECT total_sections, sections_completed, curio_earned_sections
    INTO v_total_sections, v_sections_completed, v_new_curio
    FROM public.user_course_progress
    WHERE user_id = p_user_id AND course_id = p_course_id;

    -- Add section to completed list if not already there
    IF NOT (p_section_index::TEXT = ANY(v_sections_completed)) THEN
        v_sections_completed := array_append(v_sections_completed, p_section_index::TEXT);
        v_new_curio := COALESCE(v_new_curio, 0) + p_curio_earned;
    END IF;

    -- Update progress
    UPDATE public.user_course_progress
    SET
        sections_completed = v_sections_completed,
        current_section_index = p_section_index + 1,
        curio_earned_sections = v_new_curio,
        last_accessed_at = NOW(),
        -- Mark complete if all sections done
        status = CASE
            WHEN array_length(v_sections_completed, 1) >= v_total_sections THEN 'completed'
            ELSE status
        END,
        completed_at = CASE
            WHEN array_length(v_sections_completed, 1) >= v_total_sections THEN NOW()
            ELSE completed_at
        END
    WHERE user_id = p_user_id AND course_id = p_course_id;

    RETURN QUERY SELECT
        p_section_index + 1,
        v_new_curio,
        array_length(v_sections_completed, 1) >= v_total_sections;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 8: FUNCTION TO RECORD QUIZ ATTEMPT
-- ============================================

CREATE OR REPLACE FUNCTION public.record_quiz_attempt(
    p_user_id UUID,
    p_course_id UUID,
    p_catalog_course_id UUID,
    p_difficulty TEXT,
    p_questions_total INTEGER,
    p_questions_correct INTEGER,
    p_curio_earned INTEGER,
    p_answers JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_attempt_id UUID;
    v_attempt_number INTEGER;
    v_score_percent INTEGER;
    v_passed BOOLEAN;
BEGIN
    -- Calculate score
    v_score_percent := ROUND((p_questions_correct::NUMERIC / p_questions_total) * 100);
    v_passed := v_score_percent >= 80;

    -- Get attempt number
    SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt_number
    FROM public.quiz_attempts
    WHERE user_id = p_user_id
    AND (course_id = p_course_id OR catalog_course_id = p_catalog_course_id)
    AND difficulty = p_difficulty;

    -- Insert attempt
    INSERT INTO public.quiz_attempts (
        user_id,
        course_id,
        catalog_course_id,
        difficulty,
        questions_total,
        questions_correct,
        score_percent,
        passed,
        curio_earned,
        answers,
        attempt_number
    ) VALUES (
        p_user_id,
        p_course_id,
        p_catalog_course_id,
        p_difficulty,
        p_questions_total,
        p_questions_correct,
        v_score_percent,
        v_passed,
        CASE WHEN v_passed THEN p_curio_earned ELSE 0 END,
        p_answers,
        v_attempt_number
    )
    RETURNING id INTO v_attempt_id;

    -- Update course progress quiz fields if passed
    IF v_passed THEN
        UPDATE public.user_course_progress
        SET
            quiz_completed = true,
            quiz_score = v_score_percent,
            quiz_attempts = v_attempt_number
        WHERE user_id = p_user_id AND course_id = p_course_id;
    END IF;

    RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
