-- Curio Seed Data
-- Badges, Titles, and Showcase Topics

-- ============================================
-- TITLES
-- ============================================
INSERT INTO public.titles (id, name, description, karma_required, tier) VALUES
('curious_newcomer', 'Curious Newcomer', 'Every expert was once a beginner. Welcome to the journey!', 0, 1),
('question_asker', 'Question Asker', 'You''re not afraid to ask. That''s the first step to wisdom.', 25, 2),
('knowledge_seeker', 'Knowledge Seeker', 'You''re building something valuable — your understanding.', 75, 3),
('dedicated_learner', 'Dedicated Learner', 'Consistency is your superpower. Keep showing up!', 150, 4),
('curious_explorer', 'Curious Explorer', 'You''ve wandered into fascinating territory.', 300, 5),
('rising_scholar', 'Rising Scholar', 'Your knowledge is growing. People are noticing!', 500, 6),
('insight_hunter', 'Insight Hunter', 'You seek understanding, not just answers.', 750, 7),
('wisdom_gatherer', 'Wisdom Gatherer', 'You''re becoming someone people learn from.', 1000, 8),
('polymath_training', 'Polymath in Training', 'Your curiosity knows no bounds. Impressive!', 1500, 9),
('knowledge_architect', 'Knowledge Architect', 'You''re building a cathedral of understanding.', 2500, 10)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- BADGES
-- ============================================

-- Curiosity badges
INSERT INTO public.badges (id, name, description, category, requirements, rarity, karma_reward) VALUES
('first_question', 'First Spark', 'Asked your first question', 'curiosity', '{"type": "questions_asked", "count": 1}', 'common', 5),
('curious_10', 'Curious Mind', 'Asked 10 questions', 'curiosity', '{"type": "questions_asked", "count": 10}', 'common', 15),
('curious_50', 'Question Machine', 'Asked 50 questions', 'curiosity', '{"type": "questions_asked", "count": 50}', 'uncommon', 50),
('curious_100', 'Insatiable Curiosity', 'Asked 100 questions', 'curiosity', '{"type": "questions_asked", "count": 100}', 'rare', 100)
ON CONFLICT (id) DO NOTHING;

-- Learning badges
INSERT INTO public.badges (id, name, description, category, requirements, rarity, karma_reward) VALUES
('first_course', 'First Steps', 'Completed your first course', 'learning', '{"type": "courses_completed", "count": 1}', 'common', 20),
('learner_5', 'Steady Learner', 'Completed 5 courses', 'learning', '{"type": "courses_completed", "count": 5}', 'uncommon', 50),
('learner_10', 'Knowledge Builder', 'Completed 10 courses', 'learning', '{"type": "courses_completed", "count": 10}', 'rare', 100),
('learner_25', 'Scholar', 'Completed 25 courses', 'learning', '{"type": "courses_completed", "count": 25}', 'epic', 250)
ON CONFLICT (id) DO NOTHING;

-- Quiz badges
INSERT INTO public.badges (id, name, description, category, requirements, rarity, karma_reward) VALUES
('perfect_quiz', 'Perfect Score', 'Got 100% on a quiz', 'learning', '{"type": "quiz_perfect_score", "count": 1}', 'uncommon', 25),
('perfect_quiz_5', 'Quiz Master', 'Got 100% on 5 quizzes', 'learning', '{"type": "quiz_perfect_score", "count": 5}', 'rare', 75)
ON CONFLICT (id) DO NOTHING;

-- Streak badges
INSERT INTO public.badges (id, name, description, category, requirements, rarity, karma_reward) VALUES
('streak_3', 'Getting Started', '3-day learning streak', 'streak', '{"type": "streak_days", "count": 3}', 'common', 10),
('streak_7', 'Week Warrior', '7-day learning streak', 'streak', '{"type": "streak_days", "count": 7}', 'uncommon', 35),
('streak_30', 'Monthly Master', '30-day learning streak', 'streak', '{"type": "streak_days", "count": 30}', 'epic', 150)
ON CONFLICT (id) DO NOTHING;

-- Milestone badges
INSERT INTO public.badges (id, name, description, category, requirements, rarity, karma_reward) VALUES
('karma_100', 'Rising Star', 'Earned 100 karma points', 'milestone', '{"type": "karma_points", "count": 100}', 'common', 0),
('karma_500', 'Knowledge Enthusiast', 'Earned 500 karma points', 'milestone', '{"type": "karma_points", "count": 500}', 'uncommon', 0),
('karma_1000', 'Wisdom Seeker', 'Earned 1000 karma points', 'milestone', '{"type": "karma_points", "count": 1000}', 'rare', 0)
ON CONFLICT (id) DO NOTHING;

-- Category mastery badges
INSERT INTO public.badges (id, name, description, category, requirements, rarity, karma_reward) VALUES
('science_master', 'Science Explorer', 'Completed 5 Science & Engineering courses', 'learning', '{"type": "category_mastery", "count": 5, "category": "science"}', 'rare', 75),
('history_master', 'History Buff', 'Completed 5 History & Civilization courses', 'learning', '{"type": "category_mastery", "count": 5, "category": "history"}', 'rare', 75),
('philosophy_master', 'Deep Thinker', 'Completed 5 Philosophy & Ethics courses', 'learning', '{"type": "category_mastery", "count": 5, "category": "philosophy"}', 'rare', 75)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SHOWCASE TOPICS (10 Curated Topics)
-- ============================================
INSERT INTO public.showcase_topics (topic, description, category, difficulty, estimated_minutes, display_order) VALUES
(
    'Why do we dream?',
    'Explore the science behind dreams, from REM cycles to theories about memory consolidation and emotional processing.',
    'mind',
    'beginner',
    15,
    1
),
(
    'How does compound interest work?',
    'Understanding the "eighth wonder of the world" and why Einstein allegedly praised it. The math that makes money grow.',
    'economics',
    'beginner',
    15,
    2
),
(
    'What is the theory of evolution?',
    'Darwin''s revolutionary idea explained simply - natural selection, adaptation, and how species change over time.',
    'science',
    'beginner',
    30,
    3
),
(
    'Why did Rome fall?',
    'The collapse of one of history''s greatest empires - was it invasion, corruption, economics, or something else?',
    'history',
    'intermediate',
    30,
    4
),
(
    'What is the trolley problem?',
    'The famous ethical dilemma that reveals how we think about morality, sacrifice, and difficult choices.',
    'philosophy',
    'beginner',
    15,
    5
),
(
    'How does the internet actually work?',
    'From packets to protocols - demystifying the technology that connects the modern world.',
    'science',
    'intermediate',
    30,
    6
),
(
    'What causes inflation?',
    'Why prices rise, what central banks do about it, and how it affects your wallet.',
    'economics',
    'intermediate',
    30,
    7
),
(
    'How do habits form in the brain?',
    'The neuroscience of habit loops - cue, routine, reward - and why breaking bad habits is so hard.',
    'mind',
    'intermediate',
    30,
    8
),
(
    'What is quantum computing?',
    'Qubits, superposition, and entanglement - the mind-bending future of computation explained accessibly.',
    'science',
    'advanced',
    45,
    9
),
(
    'Why do civilizations collapse?',
    'From the Bronze Age to the Maya - patterns in history that show how great societies fall.',
    'history',
    'advanced',
    45,
    10
)
ON CONFLICT DO NOTHING;
