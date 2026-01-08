-- Daily Curio Feature Migration
-- Adds tables for daily topic generation, courses, and user completions

-- ============================================
-- DAILY TOPICS TABLE
-- Stores the generated topic for each day (same for all users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,
    topic TEXT NOT NULL,
    description TEXT,
    category TEXT,
    ai_provider TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_topics_date ON public.daily_topics(date);

-- ============================================
-- DAILY COURSES TABLE
-- Pre-generated 5-minute course for each day's topic
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_topic_id UUID NOT NULL REFERENCES public.daily_topics(id) ON DELETE CASCADE,
    date DATE UNIQUE NOT NULL,

    -- Course content (same structure as regular courses)
    content JSONB NOT NULL,
    quiz_questions JSONB NOT NULL,

    -- Fixed settings for daily curio
    intensity TEXT DEFAULT 'skim' CHECK (intensity = 'skim'),
    time_budget INTEGER DEFAULT 5,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_courses_date ON public.daily_courses(date);

-- ============================================
-- DAILY COMPLETIONS TABLE
-- Tracks each user's single attempt at each day's course
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    daily_course_id UUID NOT NULL REFERENCES public.daily_courses(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Quiz attempt (single attempt only)
    quiz_answers JSONB,
    quiz_score INTEGER CHECK (quiz_score >= 0 AND quiz_score <= 5),
    unlocked BOOLEAN DEFAULT false,

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Prevent multiple attempts per day
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_completions_user_id ON public.daily_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_completions_date ON public.daily_completions(date);
CREATE INDEX IF NOT EXISTS idx_daily_completions_unlocked ON public.daily_completions(unlocked);

-- ============================================
-- ADD STREAK COLUMNS TO USERS TABLE
-- ============================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS daily_curio_streak INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS longest_daily_streak INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_daily_completion_date DATE;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.daily_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_completions ENABLE ROW LEVEL SECURITY;

-- Daily topics and courses are public (read-only for all authenticated users)
CREATE POLICY "Daily topics are viewable by all authenticated users"
    ON public.daily_topics FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Daily courses are viewable by all authenticated users"
    ON public.daily_courses FOR SELECT
    TO authenticated
    USING (true);

-- Daily completions: Users can only access their own
CREATE POLICY "Users can view own daily completions"
    ON public.daily_completions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily completions"
    ON public.daily_completions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily completions"
    ON public.daily_completions FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to submit daily quiz and update streaks atomically
CREATE OR REPLACE FUNCTION public.submit_daily_quiz(
    p_user_id UUID,
    p_daily_course_id UUID,
    p_quiz_answers JSONB,
    p_quiz_score INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    unlocked BOOLEAN,
    new_streak INTEGER,
    karma_earned INTEGER
) AS $$
DECLARE
    v_date DATE;
    v_unlocked BOOLEAN;
    v_current_streak INTEGER;
    v_last_completion DATE;
    v_karma INTEGER := 0;
BEGIN
    -- Get the date for this course
    SELECT date INTO v_date FROM public.daily_courses WHERE id = p_daily_course_id;

    IF v_date IS NULL THEN
        RETURN QUERY SELECT false, false, 0, 0;
        RETURN;
    END IF;

    -- Check if already completed today
    IF EXISTS (
        SELECT 1 FROM public.daily_completions
        WHERE user_id = p_user_id AND date = v_date AND completed_at IS NOT NULL
    ) THEN
        RETURN QUERY SELECT false, false, 0, 0;
        RETURN;
    END IF;

    -- Determine if unlocked (4/5 = 80% threshold)
    v_unlocked := p_quiz_score >= 4;

    -- Base karma for completing daily
    v_karma := 5;

    -- Bonus karma if unlocked
    IF v_unlocked THEN
        v_karma := v_karma + 10;
    END IF;

    -- Insert or update completion
    INSERT INTO public.daily_completions (
        user_id, daily_course_id, date, quiz_answers, quiz_score, unlocked, completed_at
    )
    VALUES (
        p_user_id, p_daily_course_id, v_date, p_quiz_answers, p_quiz_score, v_unlocked, NOW()
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        quiz_answers = p_quiz_answers,
        quiz_score = p_quiz_score,
        unlocked = v_unlocked,
        completed_at = NOW();

    -- Get current streak info
    SELECT last_daily_completion_date, daily_curio_streak
    INTO v_last_completion, v_current_streak
    FROM public.users WHERE id = p_user_id;

    -- Calculate new streak
    IF v_last_completion IS NULL OR v_last_completion < v_date - INTERVAL '1 day' THEN
        -- Streak broken or first time
        v_current_streak := 1;
    ELSIF v_last_completion = v_date - INTERVAL '1 day' THEN
        -- Consecutive day
        v_current_streak := v_current_streak + 1;
        v_karma := v_karma + 2; -- Streak bonus
    ELSIF v_last_completion = v_date THEN
        -- Same day (already completed today, shouldn't happen due to check above)
        NULL; -- Keep streak as is
    ELSE
        -- Future date somehow, reset
        v_current_streak := 1;
    END IF;

    -- Update user
    UPDATE public.users SET
        daily_curio_streak = v_current_streak,
        longest_daily_streak = GREATEST(COALESCE(longest_daily_streak, 0), v_current_streak),
        last_daily_completion_date = v_date,
        karma_points = karma_points + v_karma
    WHERE id = p_user_id;

    RETURN QUERY SELECT true, v_unlocked, v_current_streak, v_karma;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SERVICE ROLE POLICIES FOR CRON JOB
-- Allow service role to insert daily topics and courses
-- ============================================

CREATE POLICY "Service role can insert daily topics"
    ON public.daily_topics FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can insert daily courses"
    ON public.daily_courses FOR INSERT
    TO service_role
    WITH CHECK (true);
