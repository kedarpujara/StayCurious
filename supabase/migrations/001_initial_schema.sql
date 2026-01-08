-- Curio Database Schema
-- Initial migration for the voice-first learning app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,

    -- Gamification
    karma_points INTEGER DEFAULT 0,
    current_title TEXT DEFAULT 'Curious Newcomer',
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,

    -- Preferences
    preferred_ai_provider TEXT DEFAULT 'anthropic' CHECK (preferred_ai_provider IN ('openai', 'anthropic')),
    preferred_intensity TEXT DEFAULT 'solid' CHECK (preferred_intensity IN ('skim', 'solid', 'deep')),
    voice_enabled BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CURIOSITY LOGS TABLE (for karma tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.curiosity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    question TEXT NOT NULL,
    question_category TEXT,
    ai_provider TEXT NOT NULL,
    response_length INTEGER,

    -- Karma
    karma_earned INTEGER DEFAULT 1,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curiosity_logs_user_id ON public.curiosity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_curiosity_logs_created_at ON public.curiosity_logs(created_at);

-- ============================================
-- BACKLOG ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.backlog_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    topic TEXT NOT NULL,
    description TEXT,
    category TEXT,
    source TEXT CHECK (source IN ('instant_curiosity', 'manual', 'suggested')),

    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'archived')),
    priority INTEGER DEFAULT 0,

    -- If started, link to course
    course_id UUID,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_backlog_items_user_id ON public.backlog_items(user_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON public.backlog_items(status);

-- ============================================
-- COURSES TABLE (Generated crash courses)
-- ============================================
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    backlog_item_id UUID REFERENCES public.backlog_items(id) ON DELETE SET NULL,

    topic TEXT NOT NULL,

    -- Course configuration
    intensity TEXT NOT NULL CHECK (intensity IN ('skim', 'solid', 'deep')),
    time_budget INTEGER NOT NULL, -- in minutes (5, 15, 30, 45)
    ai_provider TEXT NOT NULL,

    -- Generated content (stored as JSONB)
    content JSONB NOT NULL,

    -- Quiz (stored separately for easier querying)
    quiz_questions JSONB,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_user_id ON public.courses(user_id);

-- ============================================
-- LEARNING PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.learning_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,

    -- Section progress
    sections_completed TEXT[] DEFAULT '{}',
    current_section TEXT,

    -- Time tracking
    time_spent_seconds INTEGER DEFAULT 0,

    -- Quiz results
    quiz_completed BOOLEAN DEFAULT false,
    quiz_score DECIMAL(5, 2),
    quiz_attempts INTEGER DEFAULT 0,

    -- Status
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),

    -- Metadata
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id ON public.learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_status ON public.learning_progress(status);

-- ============================================
-- BADGES TABLE (Badge definitions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.badges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    category TEXT CHECK (category IN ('curiosity', 'learning', 'streak', 'milestone')),

    -- Requirements (stored as JSONB for flexibility)
    requirements JSONB NOT NULL,

    -- Display
    rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    karma_reward INTEGER DEFAULT 0
);

-- ============================================
-- USER BADGES TABLE (Earned badges)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,

    earned_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);

-- ============================================
-- TITLES TABLE (Title progression)
-- ============================================
CREATE TABLE IF NOT EXISTS public.titles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,

    -- Requirements
    karma_required INTEGER NOT NULL,

    -- Display order
    tier INTEGER NOT NULL
);

-- ============================================
-- SHOWCASE TOPICS TABLE (Curated learning topics)
-- ============================================
CREATE TABLE IF NOT EXISTS public.showcase_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_minutes INTEGER NOT NULL,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curiosity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Users: Can only read/update own data
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Curiosity logs: Users can only access their own
CREATE POLICY "Users can view own curiosity logs"
    ON public.curiosity_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own curiosity logs"
    ON public.curiosity_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Backlog items: Users can only access their own
CREATE POLICY "Users can view own backlog items"
    ON public.backlog_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backlog items"
    ON public.backlog_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own backlog items"
    ON public.backlog_items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own backlog items"
    ON public.backlog_items FOR DELETE
    USING (auth.uid() = user_id);

-- Courses: Users can only access their own
CREATE POLICY "Users can view own courses"
    ON public.courses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own courses"
    ON public.courses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own courses"
    ON public.courses FOR UPDATE
    USING (auth.uid() = user_id);

-- Learning progress: Users can only access their own
CREATE POLICY "Users can view own learning progress"
    ON public.learning_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning progress"
    ON public.learning_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning progress"
    ON public.learning_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- User badges: Users can only view their own
CREATE POLICY "Users can view own badges"
    ON public.user_badges FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badges"
    ON public.user_badges FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Badges and titles are public (read-only for all authenticated users)
CREATE POLICY "Badges are viewable by all authenticated users"
    ON public.badges FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Titles are viewable by all authenticated users"
    ON public.titles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Showcase topics are viewable by all authenticated users"
    ON public.showcase_topics FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to backlog_items table
DROP TRIGGER IF EXISTS update_backlog_items_updated_at ON public.backlog_items;
CREATE TRIGGER update_backlog_items_updated_at
    BEFORE UPDATE ON public.backlog_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to update karma and check for new titles
CREATE OR REPLACE FUNCTION public.update_user_karma(
    p_user_id UUID,
    p_karma_amount INTEGER
)
RETURNS TABLE(new_karma INTEGER, new_title TEXT, title_upgraded BOOLEAN) AS $$
DECLARE
    v_current_karma INTEGER;
    v_current_title TEXT;
    v_new_title TEXT;
BEGIN
    -- Update karma
    UPDATE public.users
    SET karma_points = karma_points + p_karma_amount
    WHERE id = p_user_id
    RETURNING karma_points, current_title INTO v_current_karma, v_current_title;

    -- Check for title upgrade
    SELECT t.name INTO v_new_title
    FROM public.titles t
    WHERE t.karma_required <= v_current_karma
    ORDER BY t.karma_required DESC
    LIMIT 1;

    -- Update title if changed
    IF v_new_title IS NOT NULL AND v_new_title != v_current_title THEN
        UPDATE public.users SET current_title = v_new_title WHERE id = p_user_id;
        RETURN QUERY SELECT v_current_karma, v_new_title, true;
    ELSE
        RETURN QUERY SELECT v_current_karma, v_current_title, false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
