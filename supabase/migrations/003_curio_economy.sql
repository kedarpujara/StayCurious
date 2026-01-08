-- Curio Economy Migration
-- Renames karma to curio, adds leaderboard support, Curio Circles, and pricing eligibility

-- ============================================
-- PART 1: RENAME KARMA TO CURIO
-- ============================================

-- Rename columns in users table
ALTER TABLE public.users RENAME COLUMN karma_points TO curio_points;

-- Rename columns in curiosity_logs table
ALTER TABLE public.curiosity_logs RENAME COLUMN karma_earned TO curio_earned;

-- Rename columns in badges table
ALTER TABLE public.badges RENAME COLUMN karma_reward TO curio_reward;

-- Rename columns in titles table
ALTER TABLE public.titles RENAME COLUMN karma_required TO curio_required;

-- ============================================
-- PART 2: ADD PRICING ELIGIBILITY
-- ============================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS elite_pricing_eligible BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS elite_pricing_eligible_until DATE;

-- ============================================
-- PART 3: CURIO CIRCLES (FRIEND GROUPS)
-- ============================================

-- Curio Circles table
CREATE TABLE IF NOT EXISTS public.curio_circles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    invite_code TEXT UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    max_members INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curio_circles_created_by ON public.curio_circles(created_by);
CREATE INDEX IF NOT EXISTS idx_curio_circles_invite_code ON public.curio_circles(invite_code);

-- Circle Memberships table
CREATE TABLE IF NOT EXISTS public.curio_circle_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    circle_id UUID NOT NULL REFERENCES public.curio_circles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(circle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_curio_circle_members_circle_id ON public.curio_circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_curio_circle_members_user_id ON public.curio_circle_members(user_id);

-- ============================================
-- PART 4: LEADERBOARD INDEXES
-- ============================================

-- Add index for monthly leaderboard queries (completed_at within month)
CREATE INDEX IF NOT EXISTS idx_learning_progress_completed_at ON public.learning_progress(completed_at);

-- Composite index for user's monthly completions
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_completed ON public.learning_progress(user_id, completed_at);

-- ============================================
-- PART 5: ROW LEVEL SECURITY FOR NEW TABLES
-- ============================================

ALTER TABLE public.curio_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curio_circle_members ENABLE ROW LEVEL SECURITY;

-- Curio Circles: Members can view circles they belong to
CREATE POLICY "Users can view circles they belong to"
    ON public.curio_circles FOR SELECT
    USING (
        id IN (
            SELECT circle_id FROM public.curio_circle_members WHERE user_id = auth.uid()
        )
    );

-- Curio Circles: Authenticated users can create circles
CREATE POLICY "Authenticated users can create circles"
    ON public.curio_circles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Curio Circles: Only owner can update/delete circle
CREATE POLICY "Circle owners can update their circles"
    ON public.curio_circles FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Circle owners can delete their circles"
    ON public.curio_circles FOR DELETE
    USING (auth.uid() = created_by);

-- Circle Members: Users can view members of circles they belong to
CREATE POLICY "Users can view members of their circles"
    ON public.curio_circle_members FOR SELECT
    USING (
        circle_id IN (
            SELECT circle_id FROM public.curio_circle_members WHERE user_id = auth.uid()
        )
    );

-- Circle Members: Authenticated users can join circles (insert themselves)
CREATE POLICY "Users can join circles"
    ON public.curio_circle_members FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Circle Members: Users can leave circles (delete themselves) or owners/admins can remove members
CREATE POLICY "Users can leave circles or admins can remove members"
    ON public.curio_circle_members FOR DELETE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.curio_circle_members
            WHERE circle_id = curio_circle_members.circle_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Circle Members: Owners and admins can update member roles
CREATE POLICY "Circle admins can update member roles"
    ON public.curio_circle_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.curio_circle_members
            WHERE circle_id = curio_circle_members.circle_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- ============================================
-- PART 6: UPDATE RPC FUNCTIONS
-- ============================================

-- Drop old function and create new one with renamed columns
DROP FUNCTION IF EXISTS public.update_user_karma(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.update_user_curio(
    p_user_id UUID,
    p_curio_amount INTEGER
)
RETURNS TABLE(new_curio INTEGER, new_title TEXT, title_upgraded BOOLEAN) AS $$
DECLARE
    v_current_curio INTEGER;
    v_current_title TEXT;
    v_new_title TEXT;
BEGIN
    -- Update curio
    UPDATE public.users
    SET curio_points = curio_points + p_curio_amount
    WHERE id = p_user_id
    RETURNING curio_points, current_title INTO v_current_curio, v_current_title;

    -- Check for title upgrade
    SELECT t.name INTO v_new_title
    FROM public.titles t
    WHERE t.curio_required <= v_current_curio
    ORDER BY t.curio_required DESC
    LIMIT 1;

    -- Update title if changed
    IF v_new_title IS NOT NULL AND v_new_title != v_current_title THEN
        UPDATE public.users SET current_title = v_new_title WHERE id = p_user_id;
        RETURN QUERY SELECT v_current_curio, v_new_title, true;
    ELSE
        RETURN QUERY SELECT v_current_curio, v_current_title, false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update submit_daily_quiz function to return curio_earned instead of karma_earned
DROP FUNCTION IF EXISTS public.submit_daily_quiz(UUID, UUID, JSONB, INTEGER);

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
    curio_earned INTEGER
) AS $$
DECLARE
    v_date DATE;
    v_unlocked BOOLEAN;
    v_current_streak INTEGER;
    v_last_completion DATE;
    v_curio INTEGER := 0;
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

    -- Base curio for completing daily
    v_curio := 5;

    -- Bonus curio if unlocked
    IF v_unlocked THEN
        v_curio := v_curio + 10;
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
        v_curio := v_curio + 2; -- Streak bonus
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
        curio_points = curio_points + v_curio
    WHERE id = p_user_id;

    RETURN QUERY SELECT true, v_unlocked, v_current_streak, v_curio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 7: HELPER FUNCTIONS FOR LEADERBOARD
-- ============================================

-- Function to generate invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's monthly curio (for leaderboard calculations)
CREATE OR REPLACE FUNCTION public.get_user_monthly_curio(
    p_user_id UUID,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_total_curio INTEGER := 0;
    v_month_start DATE;
    v_month_end DATE;
BEGIN
    v_month_start := make_date(p_year, p_month, 1);
    v_month_end := (v_month_start + INTERVAL '1 month')::DATE;

    -- Sum curio from completed courses this month
    -- Using intensity-based curio values: skim=10, solid=25, deep=60
    -- With attempt multipliers: 1st=100%, 2nd=50%, 3rd=25%, 4+=0%
    SELECT COALESCE(SUM(
        CASE
            WHEN lp.quiz_attempts = 1 THEN
                CASE c.intensity
                    WHEN 'skim' THEN 10
                    WHEN 'solid' THEN 25
                    WHEN 'deep' THEN 60
                END
            WHEN lp.quiz_attempts = 2 THEN
                CASE c.intensity
                    WHEN 'skim' THEN 5
                    WHEN 'solid' THEN 12
                    WHEN 'deep' THEN 30
                END
            WHEN lp.quiz_attempts = 3 THEN
                CASE c.intensity
                    WHEN 'skim' THEN 2
                    WHEN 'solid' THEN 6
                    WHEN 'deep' THEN 15
                END
            ELSE 0
        END
    ), 0)
    INTO v_total_curio
    FROM public.learning_progress lp
    JOIN public.courses c ON lp.course_id = c.id
    WHERE lp.user_id = p_user_id
    AND lp.completed_at >= v_month_start
    AND lp.completed_at < v_month_end
    AND lp.quiz_completed = true;

    RETURN v_total_curio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get global leaderboard for current month
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

-- Function to get user's rank and percentile
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

-- Function to get circle leaderboard
CREATE OR REPLACE FUNCTION public.get_circle_leaderboard(
    p_circle_id UUID,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE(
    rank BIGINT,
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    monthly_curio INTEGER,
    current_title TEXT,
    role TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH member_curio AS (
        SELECT
            u.id AS user_id,
            u.display_name,
            u.avatar_url,
            u.current_title,
            ccm.role,
            public.get_user_monthly_curio(u.id, p_year, p_month) AS monthly_curio
        FROM public.curio_circle_members ccm
        JOIN public.users u ON ccm.user_id = u.id
        WHERE ccm.circle_id = p_circle_id
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY mc.monthly_curio DESC, mc.display_name ASC) AS rank,
        mc.user_id,
        mc.display_name,
        mc.avatar_url,
        mc.monthly_curio,
        mc.current_title,
        mc.role
    FROM member_curio mc
    ORDER BY mc.monthly_curio DESC, mc.display_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 8: UPDATE SEED DATA (titles table)
-- This updates the existing titles to use curio_required column
-- Note: Seed data should be updated separately in seed.sql
-- ============================================

-- Update existing titles to reference the renamed column
-- (This is handled by the column rename above, no additional action needed)
