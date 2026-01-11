-- ============================================
-- Curio Scoring System Overhaul
-- ============================================
-- Implements mCurio (micro-curio) storage, trust tiers,
-- quiz difficulty, diminishing returns, and Curio Club

-- ============================================
-- 1. Convert users.curio_points to mCurio
-- ============================================
-- 1 Curio = 1000 mCurio for fractional precision
ALTER TABLE public.users
  ALTER COLUMN curio_points SET DEFAULT 0;

-- Multiply existing points by 1000 to convert to mCurio
UPDATE public.users SET curio_points = curio_points * 1000;

-- Add Curio Club tracking fields
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS curio_club_eligible_until DATE,
  ADD COLUMN IF NOT EXISTS curio_club_active BOOLEAN DEFAULT false;

-- ============================================
-- 2. Add trust_tier and quiz_difficulty to course_catalog
-- ============================================
ALTER TABLE public.course_catalog
  ADD COLUMN IF NOT EXISTS trust_tier TEXT DEFAULT 'vetted'
    CHECK (trust_tier IN ('vetted', 'verified', 'unverified'));

ALTER TABLE public.course_catalog
  ADD COLUMN IF NOT EXISTS quiz_difficulty TEXT DEFAULT 'medium'
    CHECK (quiz_difficulty IN ('easy', 'medium', 'hard'));

-- Set existing almanac courses to vetted
UPDATE public.course_catalog
SET trust_tier = 'vetted'
WHERE source = 'almanac';

-- ============================================
-- 3. Create curio_events audit table
-- ============================================
-- Every Curio delta is logged with full breakdown
CREATE TABLE IF NOT EXISTS public.curio_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'quiz_pass', 'daily_checkin', 'eli5_bonus', 'section_completed', etc.
  mcurio_delta INTEGER NOT NULL,
  breakdown JSONB NOT NULL DEFAULT '{}', -- Full calculation breakdown
  course_id UUID REFERENCES public.course_catalog(id) ON DELETE SET NULL,
  quiz_attempt INTEGER,
  topic_key TEXT, -- For topic revisit tracking
  idempotency_key TEXT UNIQUE, -- Prevents double-awards
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.curio_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own events
CREATE POLICY "Users can view own curio events" ON public.curio_events
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert
CREATE POLICY "Service can insert curio events" ON public.curio_events
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. Create daily_checkins table
-- ============================================
-- Once per UTC day check-in for 30 Curio
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date_utc DATE NOT NULL,
  mcurio_awarded INTEGER NOT NULL,
  trigger_action TEXT NOT NULL, -- 'course_start', 'daily_complete', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date_utc)
);

-- Enable RLS
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON public.daily_checkins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert checkins" ON public.daily_checkins
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 5. Create monthly_snapshots for Curio Club
-- ============================================
CREATE TABLE IF NOT EXISTS public.monthly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  total_mcurio INTEGER NOT NULL DEFAULT 0,
  quiz_passes INTEGER NOT NULL DEFAULT 0, -- For eligibility threshold
  rank INTEGER,
  percentile NUMERIC(5,2),
  is_eligible BOOLEAN DEFAULT false, -- Met minimum threshold (5+ quiz passes)
  is_curio_club BOOLEAN DEFAULT false, -- Top 10% of eligible users
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month, user_id)
);

-- Enable RLS
ALTER TABLE public.monthly_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots" ON public.monthly_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view leaderboard snapshots" ON public.monthly_snapshots
  FOR SELECT USING (true);

CREATE POLICY "Service can manage snapshots" ON public.monthly_snapshots
  FOR ALL USING (true);

-- ============================================
-- 6. Create eli5_submissions table
-- ============================================
-- Voice explanations for bonus Curio (once per course per month)
CREATE TABLE IF NOT EXISTS public.eli5_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.course_catalog(id) ON DELETE CASCADE NOT NULL,
  concepts JSONB NOT NULL DEFAULT '[]', -- [{concept, transcript, evaluation}]
  passed BOOLEAN NOT NULL DEFAULT false,
  mcurio_awarded INTEGER DEFAULT 0,
  month_key TEXT NOT NULL, -- 'YYYY-MM' for once-per-month tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id, month_key)
);

-- Enable RLS
ALTER TABLE public.eli5_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own eli5 submissions" ON public.eli5_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own eli5 submissions" ON public.eli5_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 7. Create topic_completions tracking
-- ============================================
-- For topic revisit diminishing returns
CREATE TABLE IF NOT EXISTS public.topic_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  topic_key TEXT NOT NULL,
  month_key TEXT NOT NULL, -- 'YYYY-MM'
  completion_count INTEGER DEFAULT 1,
  last_completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic_key, month_key)
);

-- Enable RLS
ALTER TABLE public.topic_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own topic completions" ON public.topic_completions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage topic completions" ON public.topic_completions
  FOR ALL USING (true);

-- ============================================
-- 8. Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_curio_events_user ON public.curio_events(user_id);
CREATE INDEX IF NOT EXISTS idx_curio_events_created ON public.curio_events(created_at);
CREATE INDEX IF NOT EXISTS idx_curio_events_type ON public.curio_events(event_type);
CREATE INDEX IF NOT EXISTS idx_curio_events_month ON public.curio_events(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date ON public.daily_checkins(user_id, date_utc);

CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_month ON public.monthly_snapshots(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_rank ON public.monthly_snapshots(year, month, rank);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_curio_club ON public.monthly_snapshots(year, month, is_curio_club);

CREATE INDEX IF NOT EXISTS idx_topic_completions_user ON public.topic_completions(user_id, month_key);
CREATE INDEX IF NOT EXISTS idx_topic_completions_topic ON public.topic_completions(topic_key, month_key);

CREATE INDEX IF NOT EXISTS idx_course_catalog_trust ON public.course_catalog(trust_tier);
CREATE INDEX IF NOT EXISTS idx_course_catalog_difficulty ON public.course_catalog(quiz_difficulty);

-- ============================================
-- 9. Helper functions
-- ============================================

-- Get user's courses completed today (UTC)
CREATE OR REPLACE FUNCTION get_user_daily_course_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM public.curio_events
  WHERE user_id = p_user_id
    AND event_type = 'quiz_pass'
    AND DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Get user's topic completions this month
CREATE OR REPLACE FUNCTION get_topic_completion_count(
  p_user_id UUID,
  p_topic_key TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_month_key TEXT;
BEGIN
  v_month_key := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  SELECT completion_count
  INTO v_count
  FROM public.topic_completions
  WHERE user_id = p_user_id
    AND topic_key = p_topic_key
    AND month_key = v_month_key;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Award mCurio to user (idempotent)
CREATE OR REPLACE FUNCTION award_mcurio(
  p_user_id UUID,
  p_event_type TEXT,
  p_mcurio INTEGER,
  p_breakdown JSONB,
  p_idempotency_key TEXT,
  p_course_id UUID DEFAULT NULL,
  p_quiz_attempt INTEGER DEFAULT NULL,
  p_topic_key TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  new_total_mcurio INTEGER,
  already_awarded BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_id UUID;
  v_new_total INTEGER;
BEGIN
  -- Check idempotency
  SELECT id INTO v_existing_id
  FROM public.curio_events
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing_id IS NOT NULL THEN
    -- Already awarded
    SELECT curio_points INTO v_new_total FROM public.users WHERE id = p_user_id;
    RETURN QUERY SELECT true, v_new_total, true;
    RETURN;
  END IF;

  -- Insert event
  INSERT INTO public.curio_events (
    user_id, event_type, mcurio_delta, breakdown,
    course_id, quiz_attempt, topic_key, idempotency_key
  ) VALUES (
    p_user_id, p_event_type, p_mcurio, p_breakdown,
    p_course_id, p_quiz_attempt, p_topic_key, p_idempotency_key
  );

  -- Update user total
  UPDATE public.users
  SET curio_points = curio_points + p_mcurio,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING curio_points INTO v_new_total;

  RETURN QUERY SELECT true, v_new_total, false;
END;
$$;

-- Daily check-in (idempotent)
CREATE OR REPLACE FUNCTION daily_checkin(
  p_user_id UUID,
  p_trigger_action TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  mcurio_awarded INTEGER,
  already_checked_in BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date DATE;
  v_mcurio INTEGER := 30000; -- 30 Curio
  v_existing_id UUID;
BEGIN
  v_date := CURRENT_DATE;

  -- Check if already checked in today
  SELECT id INTO v_existing_id
  FROM public.daily_checkins
  WHERE user_id = p_user_id
    AND date_utc = v_date;

  IF v_existing_id IS NOT NULL THEN
    RETURN QUERY SELECT true, 0, true;
    RETURN;
  END IF;

  -- Insert check-in record
  INSERT INTO public.daily_checkins (user_id, date_utc, mcurio_awarded, trigger_action)
  VALUES (p_user_id, v_date, v_mcurio, p_trigger_action);

  -- Award Curio via the standard function
  PERFORM award_mcurio(
    p_user_id,
    'daily_checkin',
    v_mcurio,
    jsonb_build_object('type', 'daily_checkin', 'trigger', p_trigger_action),
    'checkin:' || p_user_id || ':' || v_date::TEXT,
    NULL,
    NULL,
    NULL
  );

  RETURN QUERY SELECT true, v_mcurio, false;
END;
$$;

-- Increment topic completion count
CREATE OR REPLACE FUNCTION increment_topic_completion(
  p_user_id UUID,
  p_topic_key TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_key TEXT;
  v_count INTEGER;
BEGIN
  v_month_key := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  INSERT INTO public.topic_completions (user_id, topic_key, month_key, completion_count)
  VALUES (p_user_id, p_topic_key, v_month_key, 1)
  ON CONFLICT (user_id, topic_key, month_key)
  DO UPDATE SET
    completion_count = topic_completions.completion_count + 1,
    last_completed_at = NOW()
  RETURNING completion_count INTO v_count;

  RETURN v_count;
END;
$$;

-- Get monthly leaderboard with mCurio
CREATE OR REPLACE FUNCTION get_monthly_leaderboard_v2(
  p_limit INTEGER DEFAULT 100,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
)
RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  monthly_mcurio BIGINT,
  monthly_curio NUMERIC,
  quiz_passes BIGINT,
  current_title TEXT,
  is_curio_club BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  v_month := COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);

  v_start_date := make_timestamptz(v_year, v_month, 1, 0, 0, 0, 'UTC');
  v_end_date := v_start_date + INTERVAL '1 month';

  RETURN QUERY
  WITH monthly_stats AS (
    SELECT
      ce.user_id,
      SUM(ce.mcurio_delta) as total_mcurio,
      COUNT(*) FILTER (WHERE ce.event_type = 'quiz_pass') as passes
    FROM public.curio_events ce
    WHERE ce.created_at >= v_start_date
      AND ce.created_at < v_end_date
    GROUP BY ce.user_id
    HAVING SUM(ce.mcurio_delta) > 0
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY ms.total_mcurio DESC) as rank,
    u.id as user_id,
    u.display_name,
    u.avatar_url,
    ms.total_mcurio as monthly_mcurio,
    (ms.total_mcurio / 1000.0)::NUMERIC as monthly_curio,
    ms.passes as quiz_passes,
    u.current_title,
    u.curio_club_active as is_curio_club
  FROM monthly_stats ms
  JOIN public.users u ON u.id = ms.user_id
  ORDER BY ms.total_mcurio DESC
  LIMIT p_limit;
END;
$$;

-- Get user's monthly position
CREATE OR REPLACE FUNCTION get_user_monthly_position_v2(
  p_user_id UUID,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
)
RETURNS TABLE(
  rank BIGINT,
  total_users BIGINT,
  percentile NUMERIC,
  monthly_mcurio BIGINT,
  monthly_curio NUMERIC,
  quiz_passes BIGINT,
  is_eligible BOOLEAN,
  is_curio_club BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_user_mcurio BIGINT;
  v_user_passes BIGINT;
  v_user_rank BIGINT;
  v_total_users BIGINT;
  v_min_quizzes INTEGER := 5;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  v_month := COALESCE(p_month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);

  v_start_date := make_timestamptz(v_year, v_month, 1, 0, 0, 0, 'UTC');
  v_end_date := v_start_date + INTERVAL '1 month';

  -- Get user's stats
  SELECT
    COALESCE(SUM(mcurio_delta), 0),
    COUNT(*) FILTER (WHERE event_type = 'quiz_pass')
  INTO v_user_mcurio, v_user_passes
  FROM public.curio_events
  WHERE user_id = p_user_id
    AND created_at >= v_start_date
    AND created_at < v_end_date;

  -- Get rank among all users
  WITH ranked AS (
    SELECT
      ce.user_id,
      SUM(ce.mcurio_delta) as total,
      ROW_NUMBER() OVER (ORDER BY SUM(ce.mcurio_delta) DESC) as rn
    FROM public.curio_events ce
    WHERE ce.created_at >= v_start_date
      AND ce.created_at < v_end_date
    GROUP BY ce.user_id
    HAVING SUM(ce.mcurio_delta) > 0
  )
  SELECT rn, (SELECT COUNT(*) FROM ranked)
  INTO v_user_rank, v_total_users
  FROM ranked
  WHERE user_id = p_user_id;

  -- Handle case where user has no activity
  IF v_user_rank IS NULL THEN
    v_user_rank := 0;
    v_total_users := COALESCE(v_total_users, 0);
  END IF;

  RETURN QUERY SELECT
    v_user_rank,
    v_total_users,
    CASE
      WHEN v_total_users > 0 AND v_user_rank > 0
      THEN ((1.0 - (v_user_rank::NUMERIC / v_total_users)) * 100)
      ELSE 0
    END,
    v_user_mcurio,
    (v_user_mcurio / 1000.0)::NUMERIC,
    v_user_passes,
    v_user_passes >= v_min_quizzes,
    (SELECT curio_club_active FROM public.users WHERE id = p_user_id);
END;
$$;
