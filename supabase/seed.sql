-- Curio Seed Data
-- Badges, Titles, and Showcase Topics

-- ============================================
-- TITLES (curio_required was renamed from karma_required in migration 003)
-- ============================================
INSERT INTO public.titles (id, name, description, curio_required, tier) VALUES
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
-- BADGES (curio_reward was renamed from karma_reward in migration 003)
-- ============================================

-- Curiosity badges
INSERT INTO public.badges (id, name, description, category, requirements, rarity, curio_reward) VALUES
('first_question', 'First Spark', 'Asked your first question', 'curiosity', '{"type": "questions_asked", "count": 1}', 'common', 5),
('curious_10', 'Curious Mind', 'Asked 10 questions', 'curiosity', '{"type": "questions_asked", "count": 10}', 'common', 15),
('curious_50', 'Question Machine', 'Asked 50 questions', 'curiosity', '{"type": "questions_asked", "count": 50}', 'uncommon', 50),
('curious_100', 'Insatiable Curiosity', 'Asked 100 questions', 'curiosity', '{"type": "questions_asked", "count": 100}', 'rare', 100)
ON CONFLICT (id) DO NOTHING;

-- Learning badges
INSERT INTO public.badges (id, name, description, category, requirements, rarity, curio_reward) VALUES
('first_course', 'First Steps', 'Completed your first course', 'learning', '{"type": "courses_completed", "count": 1}', 'common', 20),
('learner_5', 'Steady Learner', 'Completed 5 courses', 'learning', '{"type": "courses_completed", "count": 5}', 'uncommon', 50),
('learner_10', 'Knowledge Builder', 'Completed 10 courses', 'learning', '{"type": "courses_completed", "count": 10}', 'rare', 100),
('learner_25', 'Scholar', 'Completed 25 courses', 'learning', '{"type": "courses_completed", "count": 25}', 'epic', 250)
ON CONFLICT (id) DO NOTHING;

-- Quiz badges
INSERT INTO public.badges (id, name, description, category, requirements, rarity, curio_reward) VALUES
('perfect_quiz', 'Perfect Score', 'Got 100% on a quiz', 'learning', '{"type": "quiz_perfect_score", "count": 1}', 'uncommon', 25),
('perfect_quiz_5', 'Quiz Master', 'Got 100% on 5 quizzes', 'learning', '{"type": "quiz_perfect_score", "count": 5}', 'rare', 75)
ON CONFLICT (id) DO NOTHING;

-- Streak badges
INSERT INTO public.badges (id, name, description, category, requirements, rarity, curio_reward) VALUES
('streak_3', 'Getting Started', '3-day learning streak', 'streak', '{"type": "streak_days", "count": 3}', 'common', 10),
('streak_7', 'Week Warrior', '7-day learning streak', 'streak', '{"type": "streak_days", "count": 7}', 'uncommon', 35),
('streak_30', 'Monthly Master', '30-day learning streak', 'streak', '{"type": "streak_days", "count": 30}', 'epic', 150)
ON CONFLICT (id) DO NOTHING;

-- Milestone badges (curio_points was renamed from karma_points)
INSERT INTO public.badges (id, name, description, category, requirements, rarity, curio_reward) VALUES
('curio_100', 'Rising Star', 'Earned 100 curio points', 'milestone', '{"type": "curio_points", "count": 100}', 'common', 0),
('curio_500', 'Knowledge Enthusiast', 'Earned 500 curio points', 'milestone', '{"type": "curio_points", "count": 500}', 'uncommon', 0),
('curio_1000', 'Wisdom Seeker', 'Earned 1000 curio points', 'milestone', '{"type": "curio_points", "count": 1000}', 'rare', 0)
ON CONFLICT (id) DO NOTHING;

-- Category mastery badges
INSERT INTO public.badges (id, name, description, category, requirements, rarity, curio_reward) VALUES
('science_master', 'Science Explorer', 'Completed 5 Science & Engineering courses', 'learning', '{"type": "category_mastery", "count": 5, "category": "science"}', 'rare', 75),
('history_master', 'History Buff', 'Completed 5 History & Civilization courses', 'learning', '{"type": "category_mastery", "count": 5, "category": "history"}', 'rare', 75),
('philosophy_master', 'Deep Thinker', 'Completed 5 Philosophy & Ethics courses', 'learning', '{"type": "category_mastery", "count": 5, "category": "philosophy"}', 'rare', 75)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SHOWCASE TOPICS (Curio Almanac)
-- A curated encyclopedia of fascinating topics
-- ============================================

-- Clear existing topics to avoid duplicates
DELETE FROM public.showcase_topics;

INSERT INTO public.showcase_topics (topic, description, category, difficulty, estimated_minutes, display_order) VALUES

-- ============================================
-- SCIENCE & ENGINEERING (science)
-- ============================================
('Why do we dream?', 'Explore the science behind dreams, from REM cycles to theories about memory consolidation and emotional processing.', 'science', 'beginner', 15, 1),
('What is the theory of evolution?', 'Darwin''s revolutionary idea explained simply - natural selection, adaptation, and how species change over time.', 'science', 'beginner', 30, 2),
('How does the internet actually work?', 'From packets to protocols - demystifying the technology that connects the modern world.', 'science', 'intermediate', 30, 3),
('What is quantum computing?', 'Qubits, superposition, and entanglement - the mind-bending future of computation explained accessibly.', 'science', 'advanced', 45, 4),
('How do vaccines work?', 'The ingenious biology of immunity - how a small injection can train your body to fight disease.', 'science', 'beginner', 15, 5),
('What is CRISPR and gene editing?', 'The revolutionary technology that lets us edit DNA like text - its promise and ethical implications.', 'science', 'intermediate', 30, 6),
('How do black holes form?', 'When stars die spectacularly - the physics of the universe''s most mysterious objects.', 'science', 'intermediate', 30, 7),
('What is the speed of light and why does it matter?', 'The cosmic speed limit that shapes our understanding of space, time, and the universe itself.', 'science', 'beginner', 15, 8),
('How does nuclear energy work?', 'Splitting atoms for power - the physics, the promise, and the perils of nuclear energy.', 'science', 'intermediate', 30, 9),
('What is the greenhouse effect?', 'The atmospheric phenomenon keeping Earth warm - and how human activity is changing it.', 'science', 'beginner', 15, 10),
('How do airplanes fly?', 'Lift, thrust, drag, and weight - the elegant physics that keeps tons of metal in the sky.', 'science', 'beginner', 15, 11),
('What is DNA and how does it work?', 'The molecule of life - how four simple letters encode everything about you.', 'science', 'beginner', 30, 12),
('How do batteries store energy?', 'From chemical reactions to electrons - the technology powering our portable world.', 'science', 'beginner', 15, 13),
('What is the Big Bang theory?', 'How did everything begin? The scientific story of the universe''s first moments.', 'science', 'intermediate', 30, 14),
('How does GPS know where you are?', 'Satellites, atomic clocks, and relativity - the physics behind your phone''s location.', 'science', 'intermediate', 30, 15),
('What is artificial intelligence?', 'From neural networks to machine learning - how computers are learning to think.', 'science', 'intermediate', 30, 16),
('Why is the sky blue?', 'The elegant physics of light scattering that paints our daytime sky.', 'science', 'beginner', 15, 17),
('How do solar panels work?', 'Capturing sunlight and turning it into electricity - the photovoltaic effect explained.', 'science', 'beginner', 15, 18),

-- ============================================
-- HISTORY & CIVILIZATION (history)
-- ============================================
('Why did Rome fall?', 'The collapse of one of history''s greatest empires - was it invasion, corruption, economics, or something else?', 'history', 'intermediate', 30, 19),
('Why do civilizations collapse?', 'From the Bronze Age to the Maya - patterns in history that show how great societies fall.', 'history', 'advanced', 45, 20),
('What caused World War I?', 'Alliances, assassinations, and ambitions - how Europe stumbled into catastrophe.', 'history', 'intermediate', 30, 21),
('Who built the pyramids and how?', 'The engineering marvel of ancient Egypt - debunking myths and exploring the real construction.', 'history', 'beginner', 30, 22),
('What was the Renaissance?', 'The rebirth of art, science, and ideas that transformed medieval Europe into the modern world.', 'history', 'beginner', 30, 23),
('How did democracy begin in Athens?', 'The radical experiment of ancient Greece - when citizens first ruled themselves.', 'history', 'intermediate', 30, 24),
('What was the Silk Road?', 'The ancient network of trade routes that connected civilizations and changed the world.', 'history', 'beginner', 30, 25),
('Why did the Industrial Revolution happen in Britain?', 'Coal, colonies, and capitalism - the perfect storm that mechanized the world.', 'history', 'intermediate', 30, 26),
('What was the Black Death?', 'The plague that killed half of Europe and reshaped medieval society forever.', 'history', 'intermediate', 30, 27),
('How did the printing press change the world?', 'Gutenberg''s invention and the information revolution that followed.', 'history', 'beginner', 15, 28),
('What was the French Revolution really about?', 'Liberty, equality, fraternity - and the terror that followed.', 'history', 'intermediate', 30, 29),
('How did the Cold War shape the modern world?', 'Superpowers, nuclear threats, and proxy wars - the 45-year standoff that defined an era.', 'history', 'intermediate', 30, 30),
('What was the Scientific Revolution?', 'When Copernicus, Galileo, and Newton changed how we understand reality.', 'history', 'intermediate', 30, 31),
('How did ancient civilizations tell time?', 'From sundials to water clocks - humanity''s quest to measure the passing hours.', 'history', 'beginner', 15, 32),
('What was life like in medieval Europe?', 'Beyond knights and castles - the daily reality of peasants, merchants, and monks.', 'history', 'beginner', 30, 33),

-- ============================================
-- PHILOSOPHY & ETHICS (philosophy)
-- ============================================
('What is the trolley problem?', 'The famous ethical dilemma that reveals how we think about morality, sacrifice, and difficult choices.', 'philosophy', 'beginner', 15, 34),
('What is consciousness?', 'The hard problem of philosophy - why does it feel like something to be you?', 'philosophy', 'advanced', 45, 35),
('What is existentialism?', 'From Sartre to Camus - the philosophy of freedom, meaning, and authentic living.', 'philosophy', 'intermediate', 30, 36),
('Do we have free will?', 'The ancient debate about choice, determinism, and whether you could have done otherwise.', 'philosophy', 'intermediate', 30, 37),
('What is justice?', 'From Plato to Rawls - how philosophers have tried to define fairness and right action.', 'philosophy', 'intermediate', 30, 38),
('What is Stoicism?', 'The ancient philosophy of resilience - controlling what you can and accepting what you can''t.', 'philosophy', 'beginner', 15, 39),
('What makes something morally wrong?', 'Consequentialism, deontology, and virtue ethics - three ways to think about right and wrong.', 'philosophy', 'intermediate', 30, 40),
('What is the meaning of life?', 'Philosophy''s biggest question - and the different answers thinkers have proposed.', 'philosophy', 'intermediate', 30, 41),
('What is the problem of evil?', 'If God is good and powerful, why does suffering exist? The theological puzzle explained.', 'philosophy', 'intermediate', 30, 42),
('What is nihilism?', 'The philosophy that nothing matters - and why it''s more nuanced than it sounds.', 'philosophy', 'intermediate', 30, 43),
('What is the social contract?', 'Hobbes, Locke, and Rousseau - why we give up freedoms to live in society.', 'philosophy', 'intermediate', 30, 44),
('What is utilitarianism?', 'The greatest good for the greatest number - a simple idea with complex implications.', 'philosophy', 'beginner', 15, 45),
('What is the Ship of Theseus?', 'If you replace every part of a ship, is it still the same ship? A puzzle about identity.', 'philosophy', 'beginner', 15, 46),
('What did Socrates teach?', 'The philosopher who claimed to know nothing - and changed Western thought forever.', 'philosophy', 'beginner', 30, 47),

-- ============================================
-- ECONOMICS & SOCIETY (economics)
-- ============================================
('How does compound interest work?', 'Understanding the "eighth wonder of the world" and why Einstein allegedly praised it.', 'economics', 'beginner', 15, 48),
('What causes inflation?', 'Why prices rise, what central banks do about it, and how it affects your wallet.', 'economics', 'intermediate', 30, 49),
('What is supply and demand?', 'The fundamental law of economics - how prices are set by buyers and sellers.', 'economics', 'beginner', 15, 50),
('How do stock markets work?', 'Buying ownership in companies - the basics of equity markets explained.', 'economics', 'beginner', 30, 51),
('What is cryptocurrency?', 'Bitcoin, blockchain, and the future of money - digital currency demystified.', 'economics', 'intermediate', 30, 52),
('What causes recessions?', 'Economic downturns explained - the cycles of boom and bust that shape our lives.', 'economics', 'intermediate', 30, 53),
('What is the Federal Reserve?', 'The mysterious central bank that controls America''s money supply.', 'economics', 'intermediate', 30, 54),
('How do taxes actually work?', 'Income, capital gains, and deductions - understanding the system that funds government.', 'economics', 'beginner', 30, 55),
('What is GDP and why does it matter?', 'Measuring a nation''s economic output - and the limitations of this metric.', 'economics', 'beginner', 15, 56),
('What is globalization?', 'How the world became interconnected - the benefits, costs, and controversies.', 'economics', 'intermediate', 30, 57),
('What is the gig economy?', 'The rise of freelance work, platforms, and the changing nature of employment.', 'economics', 'beginner', 15, 58),
('How do central banks control the economy?', 'Interest rates, money supply, and the tools of monetary policy.', 'economics', 'intermediate', 30, 59),
('What is universal basic income?', 'The idea of giving everyone free money - arguments for and against.', 'economics', 'intermediate', 30, 60),
('What causes wealth inequality?', 'Why the rich get richer - the economic and social factors driving disparity.', 'economics', 'intermediate', 30, 61),

-- ============================================
-- MIND & LEARNING (mind)
-- ============================================
('How do habits form in the brain?', 'The neuroscience of habit loops - cue, routine, reward - and why breaking bad habits is so hard.', 'mind', 'intermediate', 30, 62),
('What is emotional intelligence?', 'The ability to understand and manage emotions - in yourself and others.', 'mind', 'beginner', 15, 63),
('How does memory work?', 'From short-term to long-term - how your brain encodes, stores, and retrieves information.', 'mind', 'intermediate', 30, 64),
('What is cognitive bias?', 'The mental shortcuts that help us think fast - but sometimes lead us astray.', 'mind', 'beginner', 30, 65),
('How do we learn new skills?', 'From novice to expert - the neuroscience of skill acquisition and deliberate practice.', 'mind', 'intermediate', 30, 66),
('What is mindfulness?', 'The ancient practice meets modern science - how paying attention changes the brain.', 'mind', 'beginner', 15, 67),
('Why do we procrastinate?', 'The psychology of delay - and evidence-based strategies to overcome it.', 'mind', 'beginner', 15, 68),
('What is the growth mindset?', 'Carol Dweck''s research on how believing you can improve actually helps you improve.', 'mind', 'beginner', 15, 69),
('How does sleep affect the brain?', 'Why we need 8 hours - the neuroscience of rest, dreams, and memory consolidation.', 'mind', 'beginner', 30, 70),
('What is decision fatigue?', 'Why making choices is exhausting - and how to protect your mental energy.', 'mind', 'beginner', 15, 71),
('How do emotions affect decisions?', 'The surprising role of feelings in rational thought - what neuroscience reveals.', 'mind', 'intermediate', 30, 72),
('What is the flow state?', 'The psychology of optimal experience - when you''re fully immersed and time disappears.', 'mind', 'beginner', 15, 73),
('How does stress affect the body?', 'From cortisol to chronic illness - the physiology of stress and how to manage it.', 'mind', 'intermediate', 30, 74),
('What is neuroplasticity?', 'How the brain rewires itself - the science of learning and recovery.', 'mind', 'intermediate', 30, 75),
('Why is sleep deprivation so harmful?', 'The cascading effects of too little sleep on body, mind, and performance.', 'mind', 'beginner', 15, 76),

-- ============================================
-- CURIOSITY / MISC (misc)
-- ============================================
('Why do we laugh?', 'The surprising science and evolution of humor - what makes something funny?', 'misc', 'beginner', 15, 77),
('How do languages evolve?', 'From Proto-Indo-European to emoji - how human communication changes over time.', 'misc', 'intermediate', 30, 78),
('What makes music so powerful?', 'The psychology and neuroscience of why music moves us emotionally.', 'misc', 'beginner', 30, 79),
('Why do we find things beautiful?', 'The philosophy and science of aesthetics - from faces to landscapes to art.', 'misc', 'intermediate', 30, 80),
('How do optical illusions work?', 'When your eyes deceive your brain - the science of visual perception.', 'misc', 'beginner', 15, 81),
('What is the placebo effect?', 'How believing you''ll get better can actually make you better - and why.', 'misc', 'beginner', 15, 82),
('Why do we yawn?', 'The surprisingly mysterious behavior we all share - theories and research.', 'misc', 'beginner', 15, 83),
('How did writing change humanity?', 'The invention that enabled civilization - from cuneiform to the alphabet.', 'misc', 'intermediate', 30, 84),
('What is the multiverse theory?', 'Are there infinite versions of you? The physics of parallel universes.', 'misc', 'advanced', 45, 85),
('Why are some things disgusting?', 'The evolution of disgust - how it protects us and shapes culture.', 'misc', 'beginner', 15, 86),
('How do animals communicate?', 'From whale songs to bee dances - the rich languages of the animal kingdom.', 'misc', 'beginner', 30, 87),
('What is the Fermi paradox?', 'If the universe is so big, where is everybody? The puzzle of alien silence.', 'misc', 'intermediate', 30, 88),
('Why do we get bored?', 'The psychology of boredom - is it a bug or a feature of the human mind?', 'misc', 'beginner', 15, 89),
('How did humans tame fire?', 'The discovery that changed everything - cooking, warmth, safety, and society.', 'misc', 'beginner', 15, 90),
('What is synesthesia?', 'When senses blend - the fascinating condition of hearing colors or tasting shapes.', 'misc', 'beginner', 15, 91),
('Why do we dream about falling?', 'Common dream themes and what psychology suggests they might mean.', 'misc', 'beginner', 15, 92),
('How does the brain process time?', 'Why time flies when you''re having fun - and drags when you''re not.', 'misc', 'intermediate', 30, 93),
('What is déjà vu?', 'That eerie feeling you''ve been here before - the neuroscience behind it.', 'misc', 'beginner', 15, 94),
('Why are humans the only species that cooks?', 'The cooking hypothesis - how fire and food made us human.', 'misc', 'beginner', 30, 95),
('What is the overview effect?', 'How seeing Earth from space transforms astronauts'' perspectives on life.', 'misc', 'beginner', 15, 96)

ON CONFLICT DO NOTHING;
