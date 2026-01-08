-- Hierarchical Almanac Categories Migration
-- Adds support for nested category structure in the Almanac

-- ============================================
-- ALMANAC CATEGORIES TABLE
-- Supports hierarchical categories with parent-child relationships
-- ============================================

CREATE TABLE IF NOT EXISTS public.almanac_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    parent_id UUID REFERENCES public.almanac_categories(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient parent lookups
CREATE INDEX IF NOT EXISTS idx_almanac_categories_parent ON public.almanac_categories(parent_id);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_almanac_categories_slug ON public.almanac_categories(slug);

-- ============================================
-- UPDATE SHOWCASE_TOPICS TABLE
-- Add reference to subcategory
-- ============================================

ALTER TABLE public.showcase_topics
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.almanac_categories(id) ON DELETE SET NULL;

-- Index for efficient subcategory lookups
CREATE INDEX IF NOT EXISTS idx_showcase_topics_subcategory ON public.showcase_topics(subcategory_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.almanac_categories ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view categories
CREATE POLICY "Almanac categories are viewable by all authenticated users"
    ON public.almanac_categories FOR SELECT
    TO authenticated
    USING (true);

-- Allow anonymous users to view categories (for browsing before signup)
CREATE POLICY "Almanac categories are viewable by anonymous users"
    ON public.almanac_categories FOR SELECT
    TO anon
    USING (true);

-- ============================================
-- HELPER FUNCTION: Get category tree
-- Returns all categories with their children nested
-- ============================================

CREATE OR REPLACE FUNCTION public.get_almanac_category_tree()
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    description TEXT,
    icon TEXT,
    color TEXT,
    parent_id UUID,
    display_order INTEGER,
    topic_count BIGINT
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        ac.id,
        ac.name,
        ac.slug,
        ac.description,
        ac.icon,
        ac.color,
        ac.parent_id,
        ac.display_order,
        COUNT(st.id) AS topic_count
    FROM public.almanac_categories ac
    LEFT JOIN public.showcase_topics st ON st.subcategory_id = ac.id
    GROUP BY ac.id
    ORDER BY ac.parent_id NULLS FIRST, ac.display_order;
$$;

-- ============================================
-- SEED TOP-LEVEL CATEGORIES
-- These map to the existing 6 categories
-- ============================================

INSERT INTO public.almanac_categories (name, slug, description, icon, color, parent_id, display_order) VALUES
-- Top-level categories (parent_id = NULL)
('Science & Engineering', 'science', 'Explore the natural world and human innovation', '🔬', 'blue', NULL, 1),
('History & Civilization', 'history', 'Journey through time and human societies', '🏛️', 'amber', NULL, 2),
('Philosophy & Ethics', 'philosophy', 'Ponder life''s deepest questions', '🤔', 'purple', NULL, 3),
('Economics & Society', 'economics', 'Understand money, markets, and social systems', '📊', 'green', NULL, 4),
('Mind & Learning', 'mind', 'Discover how your brain works and learns', '🧠', 'pink', NULL, 5),
('Curiosity & Wonder', 'misc', 'Fascinating topics that spark wonder', '✨', 'slate', NULL, 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED SUB-CATEGORIES
-- Organized groupings within each top-level category
-- ============================================

-- Get parent IDs for sub-categories
DO $$
DECLARE
    science_id UUID;
    history_id UUID;
    philosophy_id UUID;
    economics_id UUID;
    mind_id UUID;
    misc_id UUID;
BEGIN
    SELECT id INTO science_id FROM public.almanac_categories WHERE slug = 'science';
    SELECT id INTO history_id FROM public.almanac_categories WHERE slug = 'history';
    SELECT id INTO philosophy_id FROM public.almanac_categories WHERE slug = 'philosophy';
    SELECT id INTO economics_id FROM public.almanac_categories WHERE slug = 'economics';
    SELECT id INTO mind_id FROM public.almanac_categories WHERE slug = 'mind';
    SELECT id INTO misc_id FROM public.almanac_categories WHERE slug = 'misc';

    -- Science & Engineering sub-categories
    INSERT INTO public.almanac_categories (name, slug, description, icon, color, parent_id, display_order) VALUES
    ('Physics & Space', 'physics', 'The fundamental forces and cosmic wonders', '🌌', 'blue', science_id, 1),
    ('Biology & Life', 'biology', 'How living things work and evolve', '🧬', 'green', science_id, 2),
    ('Technology & Computing', 'technology', 'The machines and systems we build', '💻', 'cyan', science_id, 3),
    ('Earth & Environment', 'earth', 'Our planet and its systems', '🌍', 'emerald', science_id, 4)
    ON CONFLICT (slug) DO NOTHING;

    -- History & Civilization sub-categories
    INSERT INTO public.almanac_categories (name, slug, description, icon, color, parent_id, display_order) VALUES
    ('Ancient World', 'ancient', 'Early civilizations and their legacies', '🏺', 'amber', history_id, 1),
    ('Medieval & Renaissance', 'medieval', 'The middle ages to rebirth of learning', '⚔️', 'orange', history_id, 2),
    ('Modern History', 'modern', 'The shaping of our current world', '🏭', 'red', history_id, 3),
    ('Civilization Studies', 'civilization', 'How societies rise and fall', '📜', 'yellow', history_id, 4)
    ON CONFLICT (slug) DO NOTHING;

    -- Philosophy & Ethics sub-categories
    INSERT INTO public.almanac_categories (name, slug, description, icon, color, parent_id, display_order) VALUES
    ('Ethics & Morality', 'ethics', 'Right and wrong, good and evil', '⚖️', 'purple', philosophy_id, 1),
    ('Existential Questions', 'existential', 'Consciousness, free will, and meaning', '🌀', 'violet', philosophy_id, 2),
    ('Classical Philosophy', 'classical-philosophy', 'Ancient wisdom and timeless ideas', '📚', 'indigo', philosophy_id, 3),
    ('Thought Experiments', 'thought-experiments', 'Puzzles that challenge our intuitions', '💭', 'fuchsia', philosophy_id, 4)
    ON CONFLICT (slug) DO NOTHING;

    -- Economics & Society sub-categories
    INSERT INTO public.almanac_categories (name, slug, description, icon, color, parent_id, display_order) VALUES
    ('Personal Finance', 'personal-finance', 'Managing your money wisely', '💰', 'green', economics_id, 1),
    ('Macroeconomics', 'macroeconomics', 'How national economies work', '🏦', 'emerald', economics_id, 2),
    ('Modern Economy', 'modern-economy', 'Today''s economic landscape', '📱', 'teal', economics_id, 3),
    ('Economic Theory', 'economic-theory', 'The ideas behind the systems', '📈', 'lime', economics_id, 4)
    ON CONFLICT (slug) DO NOTHING;

    -- Mind & Learning sub-categories
    INSERT INTO public.almanac_categories (name, slug, description, icon, color, parent_id, display_order) VALUES
    ('Brain & Memory', 'brain-memory', 'How your mind stores and retrieves', '🧠', 'pink', mind_id, 1),
    ('Emotions & Psychology', 'emotions', 'Understanding feelings and behavior', '❤️', 'rose', mind_id, 2),
    ('Performance & Growth', 'performance', 'Optimizing your potential', '🎯', 'fuchsia', mind_id, 3),
    ('Sleep & Rest', 'sleep', 'The science of restoration', '😴', 'purple', mind_id, 4)
    ON CONFLICT (slug) DO NOTHING;

    -- Curiosity / Misc sub-categories
    INSERT INTO public.almanac_categories (name, slug, description, icon, color, parent_id, display_order) VALUES
    ('Human Behavior', 'human-behavior', 'Why we do what we do', '🎭', 'slate', misc_id, 1),
    ('Senses & Perception', 'senses', 'How we experience reality', '👁️', 'gray', misc_id, 2),
    ('Communication', 'communication', 'How we share ideas', '💬', 'zinc', misc_id, 3),
    ('Big Questions', 'big-questions', 'The mysteries of existence', '🌟', 'amber', misc_id, 4),
    ('Origins & Discoveries', 'origins', 'How things came to be', '🔥', 'orange', misc_id, 5)
    ON CONFLICT (slug) DO NOTHING;
END $$;

-- ============================================
-- LINK EXISTING TOPICS TO SUB-CATEGORIES
-- Map the 96 existing topics to their new subcategories
-- ============================================

-- Physics & Space topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'physics')
WHERE topic IN (
    'How do black holes form?',
    'What is the speed of light and why does it matter?',
    'How do airplanes fly?',
    'How does GPS know where you are?',
    'What is the Big Bang theory?',
    'Why is the sky blue?'
);

-- Biology & Life topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'biology')
WHERE topic IN (
    'Why do we dream?',
    'What is the theory of evolution?',
    'How do vaccines work?',
    'What is CRISPR and gene editing?',
    'What is DNA and how does it work?'
);

-- Technology & Computing topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'technology')
WHERE topic IN (
    'How does the internet actually work?',
    'What is quantum computing?',
    'How do batteries store energy?',
    'What is artificial intelligence?',
    'How do solar panels work?'
);

-- Earth & Environment topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'earth')
WHERE topic IN (
    'How does nuclear energy work?',
    'What is the greenhouse effect?'
);

-- Ancient World topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'ancient')
WHERE topic IN (
    'Why did Rome fall?',
    'Who built the pyramids and how?',
    'How did democracy begin in Athens?',
    'What was the Silk Road?',
    'How did ancient civilizations tell time?'
);

-- Medieval & Renaissance topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'medieval')
WHERE topic IN (
    'What was the Renaissance?',
    'What was the Black Death?',
    'How did the printing press change the world?',
    'What was life like in medieval Europe?'
);

-- Modern History topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'modern')
WHERE topic IN (
    'What caused World War I?',
    'Why did the Industrial Revolution happen in Britain?',
    'What was the French Revolution really about?',
    'How did the Cold War shape the modern world?'
);

-- Civilization Studies topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'civilization')
WHERE topic IN (
    'Why do civilizations collapse?',
    'What was the Scientific Revolution?'
);

-- Ethics & Morality topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'ethics')
WHERE topic IN (
    'What is the trolley problem?',
    'What is justice?',
    'What makes something morally wrong?',
    'What is utilitarianism?'
);

-- Existential Questions topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'existential')
WHERE topic IN (
    'What is consciousness?',
    'What is existentialism?',
    'Do we have free will?',
    'What is the meaning of life?',
    'What is nihilism?'
);

-- Classical Philosophy topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'classical-philosophy')
WHERE topic IN (
    'What is Stoicism?',
    'What did Socrates teach?',
    'What is the social contract?'
);

-- Thought Experiments topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'thought-experiments')
WHERE topic IN (
    'What is the Ship of Theseus?',
    'What is the problem of evil?'
);

-- Personal Finance topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'personal-finance')
WHERE topic IN (
    'How does compound interest work?',
    'How do taxes actually work?',
    'How do stock markets work?'
);

-- Macroeconomics topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'macroeconomics')
WHERE topic IN (
    'What causes inflation?',
    'What causes recessions?',
    'What is the Federal Reserve?',
    'What is GDP and why does it matter?'
);

-- Modern Economy topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'modern-economy')
WHERE topic IN (
    'What is cryptocurrency?',
    'What is globalization?',
    'What is the gig economy?'
);

-- Economic Theory topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'economic-theory')
WHERE topic IN (
    'What is supply and demand?',
    'How do central banks control the economy?',
    'What is universal basic income?',
    'What causes wealth inequality?'
);

-- Brain & Memory topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'brain-memory')
WHERE topic IN (
    'How do habits form in the brain?',
    'How does memory work?',
    'What is cognitive bias?',
    'What is neuroplasticity?'
);

-- Emotions & Psychology topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'emotions')
WHERE topic IN (
    'What is emotional intelligence?',
    'How does stress affect the body?',
    'How do emotions affect decisions?'
);

-- Performance & Growth topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'performance')
WHERE topic IN (
    'How do we learn new skills?',
    'What is mindfulness?',
    'Why do we procrastinate?',
    'What is the growth mindset?',
    'What is decision fatigue?',
    'What is the flow state?'
);

-- Sleep & Rest topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'sleep')
WHERE topic IN (
    'How does sleep affect the brain?',
    'Why is sleep deprivation so harmful?'
);

-- Human Behavior topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'human-behavior')
WHERE topic IN (
    'Why do we laugh?',
    'Why do we yawn?',
    'Why do we get bored?',
    'Why are some things disgusting?'
);

-- Senses & Perception topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'senses')
WHERE topic IN (
    'How do optical illusions work?',
    'What is synesthesia?',
    'How does the brain process time?',
    'What is déjà vu?',
    'Why do we dream about falling?'
);

-- Communication topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'communication')
WHERE topic IN (
    'How do languages evolve?',
    'How do animals communicate?',
    'How did writing change humanity?'
);

-- Big Questions topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'big-questions')
WHERE topic IN (
    'What makes music so powerful?',
    'Why do we find things beautiful?',
    'What is the placebo effect?',
    'What is the multiverse theory?',
    'What is the Fermi paradox?'
);

-- Origins & Discoveries topics
UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'origins')
WHERE topic IN (
    'How did humans tame fire?',
    'Why are humans the only species that cooks?',
    'What is the overview effect?'
);
