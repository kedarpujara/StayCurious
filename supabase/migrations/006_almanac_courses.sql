-- Unified Course Catalog Migration
-- Supports Almanac (curated), Community (user-created), and Generated (on-demand) courses

-- Enable pg_trgm extension for similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- COURSE CATALOG TABLE
-- Central repository for all shareable courses
-- ============================================

CREATE TABLE IF NOT EXISTS public.course_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Course identity
    topic TEXT NOT NULL,
    slug TEXT UNIQUE, -- URL-friendly identifier (e.g., "why-do-we-dream-quick")

    -- Source and authorship
    source TEXT NOT NULL CHECK (source IN ('almanac', 'community', 'generated')),
    creator_type TEXT NOT NULL DEFAULT 'system' CHECK (creator_type IN ('system', 'user')),
    creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- NULL for system/StayCurious

    -- Link to showcase topic (for Almanac courses)
    showcase_topic_id UUID REFERENCES public.showcase_topics(id) ON DELETE SET NULL,

    -- Depth/intensity level
    depth TEXT NOT NULL CHECK (depth IN ('quick', 'solid', 'deep')),

    -- Course content
    content JSONB NOT NULL,
    quiz_questions JSONB NOT NULL,

    -- Metadata
    description TEXT,
    category TEXT,
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_minutes INTEGER NOT NULL,
    section_count INTEGER NOT NULL,

    -- Social metrics
    stars_count INTEGER DEFAULT 0,
    completions_count INTEGER DEFAULT 0,
    avg_quiz_score DECIMAL(5, 2),

    -- Quality/vetting
    is_vetted BOOLEAN DEFAULT false, -- True if created by StayCurious or has enough stars
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true, -- Can be hidden/unpublished

    -- AI generation info
    ai_provider TEXT,
    generation_version INTEGER DEFAULT 1,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique topic+depth for almanac courses
    CONSTRAINT unique_almanac_course UNIQUE NULLS NOT DISTINCT (showcase_topic_id, depth)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_course_catalog_topic ON public.course_catalog(topic);
CREATE INDEX IF NOT EXISTS idx_course_catalog_source ON public.course_catalog(source);
CREATE INDEX IF NOT EXISTS idx_course_catalog_depth ON public.course_catalog(depth);
CREATE INDEX IF NOT EXISTS idx_course_catalog_category ON public.course_catalog(category);
CREATE INDEX IF NOT EXISTS idx_course_catalog_creator ON public.course_catalog(creator_id);
CREATE INDEX IF NOT EXISTS idx_course_catalog_showcase ON public.course_catalog(showcase_topic_id);
CREATE INDEX IF NOT EXISTS idx_course_catalog_stars ON public.course_catalog(stars_count DESC);
CREATE INDEX IF NOT EXISTS idx_course_catalog_completions ON public.course_catalog(completions_count DESC);
CREATE INDEX IF NOT EXISTS idx_course_catalog_featured ON public.course_catalog(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_course_catalog_vetted ON public.course_catalog(is_vetted) WHERE is_vetted = true;

-- Full-text search on topic
CREATE INDEX IF NOT EXISTS idx_course_catalog_topic_search ON public.course_catalog USING gin(to_tsvector('english', topic));

-- ============================================
-- COURSE STARS TABLE
-- Track which users have starred which courses
-- ============================================

CREATE TABLE IF NOT EXISTS public.course_stars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.course_catalog(id) ON DELETE CASCADE,
    starred_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_stars_user ON public.course_stars(user_id);
CREATE INDEX IF NOT EXISTS idx_course_stars_course ON public.course_stars(course_id);

-- ============================================
-- USER COURSE PROGRESS TABLE
-- Universal progress tracking for any course
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_course_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.course_catalog(id) ON DELETE CASCADE,

    -- Progress tracking
    sections_completed TEXT[] DEFAULT '{}',
    current_section TEXT,
    time_spent_seconds INTEGER DEFAULT 0,

    -- Quiz results
    quiz_completed BOOLEAN DEFAULT false,
    quiz_score DECIMAL(5, 2),
    quiz_attempts INTEGER DEFAULT 0,
    quiz_answers JSONB,

    -- Status
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),

    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Chat state for interactive learning
    chat_state JSONB DEFAULT NULL,

    -- One progress record per user per course
    UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_user_course_progress_user ON public.user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_progress_course ON public.user_course_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_progress_status ON public.user_course_progress(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.course_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;

-- Course catalog: everyone can view published courses
CREATE POLICY "Anyone can view published courses"
    ON public.course_catalog FOR SELECT
    TO authenticated
    USING (is_published = true);

CREATE POLICY "Anonymous can view published courses"
    ON public.course_catalog FOR SELECT
    TO anon
    USING (is_published = true);

-- Creators can view their own unpublished courses
CREATE POLICY "Creators can view own courses"
    ON public.course_catalog FOR SELECT
    TO authenticated
    USING (creator_id = auth.uid());

-- Users can create community courses
CREATE POLICY "Users can create community courses"
    ON public.course_catalog FOR INSERT
    TO authenticated
    WITH CHECK (creator_id = auth.uid() AND source = 'community');

-- Creators can update their own courses
CREATE POLICY "Creators can update own courses"
    ON public.course_catalog FOR UPDATE
    TO authenticated
    USING (creator_id = auth.uid());

-- Stars: users manage their own stars
CREATE POLICY "Users can view all stars"
    ON public.course_stars FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can add own stars"
    ON public.course_stars FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own stars"
    ON public.course_stars FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Progress: users manage their own progress
CREATE POLICY "Users can view own progress"
    ON public.user_course_progress FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress"
    ON public.user_course_progress FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own progress"
    ON public.user_course_progress FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update stars count
CREATE OR REPLACE FUNCTION public.update_course_stars_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.course_catalog
        SET stars_count = stars_count + 1,
            -- Auto-vet if stars reach threshold
            is_vetted = CASE WHEN stars_count + 1 >= 10 THEN true ELSE is_vetted END
        WHERE id = NEW.course_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.course_catalog
        SET stars_count = GREATEST(0, stars_count - 1)
        WHERE id = OLD.course_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_update_stars_count
    AFTER INSERT OR DELETE ON public.course_stars
    FOR EACH ROW
    EXECUTE FUNCTION public.update_course_stars_count();

-- Function to update completions count and avg score
CREATE OR REPLACE FUNCTION public.update_course_completion_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        UPDATE public.course_catalog
        SET
            completions_count = completions_count + 1,
            avg_quiz_score = (
                SELECT ROUND(AVG(quiz_score), 2)
                FROM public.user_course_progress
                WHERE course_id = NEW.course_id AND quiz_completed = true
            )
        WHERE id = NEW.course_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_completion_stats
    AFTER INSERT OR UPDATE ON public.user_course_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_course_completion_stats();

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: Trending courses (by recent completions and stars)
CREATE OR REPLACE VIEW public.trending_courses AS
SELECT
    cc.*,
    st.description AS topic_description,
    COALESCE(recent_completions, 0) AS recent_completions,
    COALESCE(recent_stars, 0) AS recent_stars,
    (cc.stars_count * 2 + cc.completions_count + COALESCE(recent_completions, 0) * 3 + COALESCE(recent_stars, 0) * 5) AS trending_score
FROM public.course_catalog cc
LEFT JOIN public.showcase_topics st ON cc.showcase_topic_id = st.id
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS recent_completions
    FROM public.user_course_progress ucp
    WHERE ucp.course_id = cc.id
      AND ucp.completed_at > NOW() - INTERVAL '7 days'
) rc ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS recent_stars
    FROM public.course_stars cs
    WHERE cs.course_id = cc.id
      AND cs.starred_at > NOW() - INTERVAL '7 days'
) rs ON true
WHERE cc.is_published = true
ORDER BY trending_score DESC;

-- View: Almanac courses with topic info
CREATE OR REPLACE VIEW public.almanac_courses_view AS
SELECT
    cc.id,
    cc.topic,
    cc.depth,
    cc.content,
    cc.quiz_questions,
    cc.estimated_minutes,
    cc.section_count,
    cc.stars_count,
    cc.completions_count,
    cc.avg_quiz_score,
    cc.is_vetted,
    cc.created_at,
    st.id AS showcase_topic_id,
    st.description,
    st.category,
    st.difficulty,
    st.subcategory_id,
    ac.name AS subcategory_name,
    ac.icon AS subcategory_icon
FROM public.course_catalog cc
JOIN public.showcase_topics st ON cc.showcase_topic_id = st.id
LEFT JOIN public.almanac_categories ac ON st.subcategory_id = ac.id
WHERE cc.source = 'almanac'
  AND cc.is_published = true
ORDER BY st.display_order, cc.depth;

-- ============================================
-- FUNCTION: Search courses
-- ============================================

CREATE OR REPLACE FUNCTION public.search_courses(
    p_query TEXT,
    p_category TEXT DEFAULT NULL,
    p_depth TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    topic TEXT,
    description TEXT,
    category TEXT,
    depth TEXT,
    estimated_minutes INTEGER,
    stars_count INTEGER,
    completions_count INTEGER,
    is_vetted BOOLEAN,
    source TEXT,
    rank REAL
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        cc.id,
        cc.topic,
        cc.description,
        cc.category,
        cc.depth,
        cc.estimated_minutes,
        cc.stars_count,
        cc.completions_count,
        cc.is_vetted,
        cc.source,
        ts_rank(to_tsvector('english', cc.topic), plainto_tsquery('english', p_query)) AS rank
    FROM public.course_catalog cc
    WHERE cc.is_published = true
      AND (p_query IS NULL OR to_tsvector('english', cc.topic) @@ plainto_tsquery('english', p_query))
      AND (p_category IS NULL OR cc.category = p_category)
      AND (p_depth IS NULL OR cc.depth = p_depth)
    ORDER BY
        cc.is_vetted DESC,
        rank DESC,
        cc.stars_count DESC
    LIMIT p_limit;
$$;

-- ============================================
-- FUNCTION: Find or suggest course
-- Returns existing course or suggests similar ones
-- ============================================

CREATE OR REPLACE FUNCTION public.find_or_suggest_course(
    p_topic TEXT,
    p_depth TEXT DEFAULT 'solid'
)
RETURNS TABLE (
    id UUID,
    topic TEXT,
    depth TEXT,
    match_type TEXT,
    similarity REAL
)
LANGUAGE SQL
STABLE
AS $$
    -- First try exact match
    SELECT
        cc.id,
        cc.topic,
        cc.depth,
        'exact'::TEXT AS match_type,
        1.0::REAL AS similarity
    FROM public.course_catalog cc
    WHERE cc.is_published = true
      AND LOWER(cc.topic) = LOWER(p_topic)
      AND cc.depth = p_depth

    UNION ALL

    -- Then try similar topics
    SELECT
        cc.id,
        cc.topic,
        cc.depth,
        'similar'::TEXT AS match_type,
        similarity(LOWER(cc.topic), LOWER(p_topic)) AS similarity
    FROM public.course_catalog cc
    WHERE cc.is_published = true
      AND cc.depth = p_depth
      AND cc.topic % p_topic -- Uses pg_trgm similarity
      AND LOWER(cc.topic) != LOWER(p_topic)
    ORDER BY similarity DESC
    LIMIT 5;
$$;

-- ============================================
-- DEPTH CONFIGURATION COMMENT
-- ============================================

COMMENT ON TABLE public.course_catalog IS
'Unified course catalog supporting multiple sources:
- almanac: Curated courses by StayCurious (vetted by default)
- community: User-created courses (can be vetted via stars)
- generated: On-demand AI-generated courses (not shared)

Depth levels:
- quick: ~5 min, 4 sections (overview)
- solid: ~15 min, 6 sections (balanced)
- deep: ~30 min, 8 sections (comprehensive)

Vetting:
- Almanac courses are vetted by default
- Community courses become vetted after 10+ stars';

-- ============================================
-- ALMANAC TOPIC OF THE DAY
-- Same featured topic for everyone globally
-- ============================================

CREATE TABLE IF NOT EXISTS public.almanac_daily_topic (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    showcase_topic_id UUID NOT NULL REFERENCES public.showcase_topics(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_almanac_daily_topic_date ON public.almanac_daily_topic(date DESC);

ALTER TABLE public.almanac_daily_topic ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view daily topic"
    ON public.almanac_daily_topic FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Anonymous can view daily topic"
    ON public.almanac_daily_topic FOR SELECT
    TO anon
    USING (true);

-- Function to get or create today's topic
CREATE OR REPLACE FUNCTION public.get_almanac_daily_topic()
RETURNS TABLE (
    topic_id UUID,
    topic TEXT,
    description TEXT,
    category TEXT,
    difficulty TEXT,
    date DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_topic_id UUID;
BEGIN
    -- Check if we already have a topic for today
    SELECT adt.showcase_topic_id INTO v_topic_id
    FROM public.almanac_daily_topic adt
    WHERE adt.date = v_today;

    -- If not, select a random topic and insert it
    IF v_topic_id IS NULL THEN
        -- Select a random topic, preferring ones not recently featured
        SELECT st.id INTO v_topic_id
        FROM public.showcase_topics st
        WHERE st.id NOT IN (
            SELECT adt2.showcase_topic_id
            FROM public.almanac_daily_topic adt2
            WHERE adt2.date > v_today - INTERVAL '30 days'
        )
        ORDER BY RANDOM()
        LIMIT 1;

        -- If all topics were recently featured, just pick any random one
        IF v_topic_id IS NULL THEN
            SELECT st.id INTO v_topic_id
            FROM public.showcase_topics st
            ORDER BY RANDOM()
            LIMIT 1;
        END IF;

        -- Insert the daily topic
        INSERT INTO public.almanac_daily_topic (date, showcase_topic_id)
        VALUES (v_today, v_topic_id)
        ON CONFLICT (date) DO NOTHING;
    END IF;

    -- Return the topic details
    RETURN QUERY
    SELECT
        st.id AS topic_id,
        st.topic,
        st.description,
        st.category,
        st.difficulty,
        v_today AS date
    FROM public.showcase_topics st
    WHERE st.id = v_topic_id;
END;
$$;

-- Function to get a random almanac topic
CREATE OR REPLACE FUNCTION public.get_random_almanac_topic()
RETURNS TABLE (
    topic_id UUID,
    topic TEXT,
    description TEXT,
    category TEXT,
    difficulty TEXT
)
LANGUAGE SQL
AS $$
    SELECT
        st.id AS topic_id,
        st.topic,
        st.description,
        st.category,
        st.difficulty
    FROM public.showcase_topics st
    ORDER BY RANDOM()
    LIMIT 1;
$$;
