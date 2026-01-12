-- Reset User Profile and Expand Almanac
-- This migration:
-- 1. Resets user progress data (curio, badges, courses, questions)
-- 2. Expands the almanac with 150+ new fascinating topics

-- ============================================
-- PART 1: RESET USER PROFILE
-- Clears all progress for the first user (owner account)
-- ============================================

DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get the first user (typically the owner)
    SELECT id INTO target_user_id FROM public.users ORDER BY created_at ASC LIMIT 1;

    IF target_user_id IS NOT NULL THEN
        RAISE NOTICE 'Resetting user: %', target_user_id;

        -- Delete user badges
        DELETE FROM public.user_badges WHERE user_id = target_user_id;

        -- Delete user questions
        DELETE FROM public.user_questions WHERE user_id = target_user_id;

        -- Delete ELI5 submissions
        DELETE FROM public.eli5_submissions WHERE user_id = target_user_id;

        -- Delete quiz attempts
        DELETE FROM public.quiz_attempts WHERE user_id = target_user_id;

        -- Delete course progress
        DELETE FROM public.user_course_progress WHERE user_id = target_user_id;

        -- Delete curio events (audit trail)
        DELETE FROM public.curio_events WHERE user_id = target_user_id;

        -- Delete daily checkins
        DELETE FROM public.daily_checkins WHERE user_id = target_user_id;

        -- Delete topic completions
        DELETE FROM public.topic_completions WHERE user_id = target_user_id;

        -- Delete monthly snapshots
        DELETE FROM public.monthly_snapshots WHERE user_id = target_user_id;

        -- Delete course stars
        DELETE FROM public.course_stars WHERE user_id = target_user_id;

        -- Reset user curio to 0
        UPDATE public.users
        SET
            curio_points = 0,
            questions_asked = 0,
            current_streak = 0,
            longest_streak = 0,
            last_activity_date = NULL,
            courses_completed = 0,
            quizzes_passed = 0,
            perfect_quizzes = 0
        WHERE id = target_user_id;

        RAISE NOTICE 'User reset complete!';
    ELSE
        RAISE NOTICE 'No users found to reset';
    END IF;
END $$;

-- ============================================
-- PART 2: EXPAND ALMANAC WITH NEW TOPICS
-- Adding 150+ new fascinating topics across all categories
-- ============================================

-- Note: We're using INSERT with ON CONFLICT to avoid duplicates
-- Topics are organized by subcategory for proper linking

INSERT INTO public.showcase_topics (topic, description, category, difficulty, estimated_minutes, display_order) VALUES

-- ============================================
-- SCIENCE & ENGINEERING - NEW TOPICS
-- ============================================

-- Physics & Space (new)
('How do magnets work?', 'The mysterious force that holds notes on fridges and makes motors spin - explained at the atomic level.', 'science', 'beginner', 15, 100),
('What is dark matter?', 'The invisible substance that makes up 27% of the universe - how we know it exists without seeing it.', 'science', 'intermediate', 30, 101),
('How do stars form and die?', 'From cosmic nurseries to spectacular supernovae - the life cycle of stars across billions of years.', 'science', 'intermediate', 30, 102),
('What are gravitational waves?', 'Ripples in spacetime detected a century after Einstein predicted them - a new way to see the universe.', 'science', 'advanced', 30, 103),
('Why is Pluto no longer a planet?', 'The demotion that sparked outrage - what makes a planet a planet and who decides.', 'science', 'beginner', 15, 104),
('How do submarines work?', 'The physics of buoyancy and pressure that lets humans explore the ocean depths.', 'science', 'beginner', 15, 105),
('What is antimatter?', 'The mirror image of matter that annihilates on contact - science fiction made real.', 'science', 'intermediate', 30, 106),
('How does radiocarbon dating work?', 'Using atomic decay to peer back thousands of years into history.', 'science', 'intermediate', 30, 107),

-- Biology & Life (new)
('How do viruses evolve so fast?', 'Mutation, selection, and the arms race between pathogens and hosts.', 'science', 'intermediate', 30, 110),
('What is the microbiome?', 'The trillions of organisms living inside you - and how they affect your health and mood.', 'science', 'beginner', 30, 111),
('Why do we age?', 'The biology of getting older - from telomeres to cellular senescence to longevity research.', 'science', 'intermediate', 30, 112),
('How does photosynthesis work?', 'The elegant chemistry that turns sunlight into the food that powers all life on Earth.', 'science', 'beginner', 15, 113),
('What makes a species endangered?', 'Population dynamics, habitat loss, and the science of extinction.', 'science', 'beginner', 30, 114),
('How do antibiotics work?', 'The drugs that revolutionized medicine - and why bacteria are fighting back.', 'science', 'beginner', 30, 115),
('What is epigenetics?', 'How your experiences can change gene expression - and potentially be passed to your children.', 'science', 'advanced', 30, 116),
('How do animals migrate?', 'Built-in compasses, star navigation, and the incredible journeys of birds and whales.', 'science', 'beginner', 30, 117),

-- Technology & Computing (new)
('How do algorithms recommend what you watch?', 'The math and machine learning behind Netflix, YouTube, and TikTok suggestions.', 'science', 'intermediate', 30, 120),
('What is blockchain technology?', 'Beyond cryptocurrency - how distributed ledgers work and why they matter.', 'science', 'intermediate', 30, 121),
('How does facial recognition work?', 'The AI that can identify you in a crowd - its power and its problems.', 'science', 'intermediate', 30, 122),
('What is 5G and why does it matter?', 'The next generation of wireless - speeds, capabilities, and controversies.', 'science', 'beginner', 15, 123),
('How do self-driving cars work?', 'Sensors, AI, and the engineering challenge of autonomous vehicles.', 'science', 'intermediate', 30, 124),
('What is virtual reality?', 'Tricking your brain into believing impossible worlds - the tech behind VR.', 'science', 'beginner', 15, 125),
('How does encryption keep us safe?', 'The mathematics protecting your passwords, messages, and bank accounts.', 'science', 'intermediate', 30, 126),
('What is cloud computing?', 'How data centers power the modern internet - from storage to streaming.', 'science', 'beginner', 15, 127),

-- Earth & Environment (new)
('How do volcanoes work?', 'Magma chambers, tectonic plates, and the awesome power beneath our feet.', 'science', 'beginner', 30, 130),
('What causes earthquakes?', 'Plate tectonics, fault lines, and the science of seismic activity.', 'science', 'beginner', 30, 131),
('How does the water cycle work?', 'Evaporation, condensation, and the endless journey of water on Earth.', 'science', 'beginner', 15, 132),
('What is ocean acidification?', 'The "other CO2 problem" threatening marine ecosystems worldwide.', 'science', 'intermediate', 30, 133),
('How do hurricanes form?', 'Warm water, rotation, and the physics of the most powerful storms on Earth.', 'science', 'intermediate', 30, 134),
('What is permafrost and why is it melting?', 'The frozen ground holding back ancient carbon - and what happens when it thaws.', 'science', 'intermediate', 30, 135),
('How do coral reefs work?', 'The rainforests of the sea - how these ecosystems support ocean life.', 'science', 'beginner', 30, 136),
('What is biodiversity and why does it matter?', 'The variety of life on Earth - and what we lose when species disappear.', 'science', 'beginner', 30, 137),

-- ============================================
-- HISTORY & CIVILIZATION - NEW TOPICS
-- ============================================

-- Ancient World (new)
('What was the Bronze Age Collapse?', 'When the great civilizations of the Mediterranean mysteriously fell - a 3000-year-old mystery.', 'history', 'intermediate', 30, 140),
('How did ancient Egypt last 3000 years?', 'The remarkable stability of one of history''s longest-lived civilizations.', 'history', 'intermediate', 30, 141),
('What was life like in ancient Mesopotamia?', 'The cradle of civilization - where writing, law, and cities began.', 'history', 'beginner', 30, 142),
('Who were the Vikings really?', 'Beyond the myths - traders, explorers, and settlers who shaped Europe.', 'history', 'beginner', 30, 143),
('How did the Roman Empire function?', 'Roads, laws, and legions - the systems that held a vast empire together.', 'history', 'intermediate', 30, 144),
('What was the Library of Alexandria?', 'The ancient world''s greatest repository of knowledge - and how it was lost.', 'history', 'beginner', 15, 145),
('How did ancient China unify?', 'The first emperor and the creation of the world''s longest continuous civilization.', 'history', 'intermediate', 30, 146),
('What was the Persian Empire?', 'The first true superpower - tolerance, roads, and governance on a massive scale.', 'history', 'intermediate', 30, 147),

-- Medieval & Renaissance (new)
('What were the Crusades really about?', 'Religion, politics, and economics - the complex motivations behind holy wars.', 'history', 'intermediate', 30, 150),
('How did medieval castles work?', 'Defense, status, and daily life - the engineering and society of castle living.', 'history', 'beginner', 30, 151),
('What was the Mongol Empire?', 'How a nomadic people built the largest land empire in history.', 'history', 'intermediate', 30, 152),
('How did the Ottoman Empire rise?', 'From small Turkish state to empire spanning three continents.', 'history', 'intermediate', 30, 153),
('What sparked the Protestant Reformation?', 'Luther, indulgences, and the religious revolution that split Christianity.', 'history', 'intermediate', 30, 154),
('How did Venice become a trading empire?', 'The floating city that dominated Mediterranean commerce for centuries.', 'history', 'intermediate', 30, 155),
('What was the age of exploration?', 'Why European ships suddenly went everywhere - technology, economics, and ambition.', 'history', 'intermediate', 30, 156),
('How did the samurai shape Japan?', 'Warriors, honor, and the military class that ruled Japan for centuries.', 'history', 'intermediate', 30, 157),

-- Modern History (new)
('What was the scramble for Africa?', 'How European powers carved up a continent in a single generation.', 'history', 'intermediate', 30, 160),
('How did World War II start?', 'From Versailles to Poland - the path to the deadliest conflict in history.', 'history', 'intermediate', 30, 161),
('What was the Civil Rights Movement?', 'The struggle for equality in America - from Montgomery to the March on Washington.', 'history', 'intermediate', 30, 162),
('How did the Soviet Union collapse?', 'The sudden end of a superpower - economics, politics, and the fall of communism.', 'history', 'intermediate', 30, 163),
('What was apartheid in South Africa?', 'Institutionalized racism and the long struggle for freedom.', 'history', 'intermediate', 30, 164),
('How did the internet emerge?', 'From ARPANET to the World Wide Web - the invention that changed everything.', 'history', 'beginner', 30, 165),
('What was the Space Race?', 'Superpowers competing to reach the stars - and how it transformed technology.', 'history', 'beginner', 30, 166),
('How did decolonization reshape the world?', 'The end of empires and the birth of new nations in the 20th century.', 'history', 'intermediate', 30, 167),

-- Civilization Studies (new)
('Why did some empires last longer than others?', 'Comparing Rome, China, Persia, and others - patterns of imperial longevity.', 'history', 'advanced', 30, 170),
('How do civilizations spread ideas?', 'Trade routes, conquest, and cultural diffusion across history.', 'history', 'intermediate', 30, 171),
('What makes cities successful?', 'Location, resources, and governance - why some cities thrive for millennia.', 'history', 'intermediate', 30, 172),
('How has warfare evolved throughout history?', 'From bronze swords to drones - technology and the changing face of conflict.', 'history', 'intermediate', 30, 173),
('What role has disease played in history?', 'Plagues, pandemics, and the pathogens that changed the course of civilization.', 'history', 'intermediate', 30, 174),
('How did agriculture change humanity?', 'The Neolithic revolution that ended nomadic life and created civilization.', 'history', 'beginner', 30, 175),
('What is historical revisionism?', 'How our understanding of history changes - and why it matters.', 'history', 'intermediate', 30, 176),
('Why do empires decline?', 'Overextension, corruption, and collapse - patterns across civilizations.', 'history', 'advanced', 30, 177),

-- ============================================
-- PHILOSOPHY & ETHICS - NEW TOPICS
-- ============================================

-- Ethics & Morality (new)
('What is moral relativism?', 'Is right and wrong the same everywhere, or does it depend on culture?', 'philosophy', 'intermediate', 30, 180),
('What are human rights?', 'The philosophical foundation of universal dignity - where rights come from.', 'philosophy', 'intermediate', 30, 181),
('What is the ethics of AI?', 'Should machines make moral decisions? The dilemmas of artificial intelligence.', 'philosophy', 'intermediate', 30, 182),
('What is animal rights philosophy?', 'Do animals deserve moral consideration? Singer, Regan, and the debate.', 'philosophy', 'intermediate', 30, 183),
('What is environmental ethics?', 'Do we have moral obligations to nature itself - not just future humans?', 'philosophy', 'intermediate', 30, 184),
('What is the ethics of genetic engineering?', 'Designer babies, enhancement, and the moral limits of changing human nature.', 'philosophy', 'advanced', 30, 185),
('What is virtue ethics?', 'Aristotle''s approach - becoming a good person rather than following rules.', 'philosophy', 'intermediate', 30, 186),
('What is moral luck?', 'Should we be judged for outcomes we couldn''t control? A philosophical puzzle.', 'philosophy', 'intermediate', 30, 187),

-- Existential Questions (new)
('What is the absurd?', 'Camus and the gap between human meaning-seeking and a silent universe.', 'philosophy', 'intermediate', 30, 190),
('What is phenomenology?', 'The philosophy of conscious experience - how things appear to us.', 'philosophy', 'advanced', 30, 191),
('What is the mind-body problem?', 'How does physical brain stuff produce mental experience?', 'philosophy', 'intermediate', 30, 192),
('What is personal identity?', 'What makes you the same person over time - body, memories, or something else?', 'philosophy', 'intermediate', 30, 193),
('Can we know anything for certain?', 'Descartes, skepticism, and the foundations of knowledge.', 'philosophy', 'intermediate', 30, 194),
('What is the nature of reality?', 'Metaphysics 101 - what exists and what is it made of?', 'philosophy', 'intermediate', 30, 195),
('What is the philosophy of death?', 'Should we fear death? Epicurus, Heidegger, and confronting mortality.', 'philosophy', 'intermediate', 30, 196),
('What is authenticity?', 'Living as your true self - existentialist views on genuine existence.', 'philosophy', 'intermediate', 30, 197),

-- Classical Philosophy (new)
('What is Plato''s theory of forms?', 'The realm of perfect ideals behind imperfect reality - a foundational idea.', 'philosophy', 'intermediate', 30, 200),
('What is Aristotle''s philosophy?', 'The master of those who know - logic, ethics, and the good life.', 'philosophy', 'intermediate', 30, 201),
('What is Eastern philosophy?', 'Buddhism, Taoism, and Confucianism - wisdom traditions from the East.', 'philosophy', 'intermediate', 30, 202),
('What is Epicureanism?', 'The pursuit of pleasure as the highest good - but not what you might think.', 'philosophy', 'beginner', 15, 203),
('What is Cynicism?', 'The ancient philosophers who rejected social conventions for virtue.', 'philosophy', 'beginner', 15, 204),
('What did Kant contribute to philosophy?', 'The Copernican revolution in thought - how we shape what we perceive.', 'philosophy', 'advanced', 30, 205),
('What is Nietzsche''s philosophy?', 'Will to power, eternal return, and the death of God - one of history''s most misunderstood thinkers.', 'philosophy', 'intermediate', 30, 206),
('What is pragmatism?', 'The American philosophical tradition - truth is what works.', 'philosophy', 'intermediate', 30, 207),

-- Thought Experiments (new)
('What is the veil of ignorance?', 'Rawls'' thought experiment about designing a fair society.', 'philosophy', 'intermediate', 30, 210),
('What is the Chinese Room argument?', 'Can a computer truly understand - or is it just manipulating symbols?', 'philosophy', 'intermediate', 30, 211),
('What is the experience machine?', 'Would you plug in to a machine that simulates perfect happiness?', 'philosophy', 'beginner', 15, 212),
('What is the prisoner''s dilemma?', 'Game theory and the paradox of rational self-interest vs. cooperation.', 'philosophy', 'beginner', 15, 213),
('What is the simulation argument?', 'Are we living in a computer simulation? The philosophical case.', 'philosophy', 'intermediate', 30, 214),
('What is the utility monster?', 'A challenge to utilitarianism - what if someone gets infinite pleasure?', 'philosophy', 'intermediate', 30, 215),
('What is the repugnant conclusion?', 'A paradox in population ethics about quality vs. quantity of life.', 'philosophy', 'advanced', 30, 216),
('What is Newcomb''s paradox?', 'A decision theory puzzle that divides philosophers and mathematicians.', 'philosophy', 'advanced', 30, 217),

-- ============================================
-- ECONOMICS & SOCIETY - NEW TOPICS
-- ============================================

-- Personal Finance (new)
('What is investing for beginners?', 'Stocks, bonds, and index funds - the basics of growing your money.', 'economics', 'beginner', 30, 220),
('What is a credit score?', 'The three-digit number that affects your financial life - how it works.', 'economics', 'beginner', 15, 221),
('How does retirement planning work?', '401(k)s, IRAs, and the math of saving for the future.', 'economics', 'intermediate', 30, 222),
('What is financial literacy?', 'The essential money skills everyone should know but few are taught.', 'economics', 'beginner', 30, 223),
('How do mortgages work?', 'Buying a home on credit - the biggest financial decision most people make.', 'economics', 'intermediate', 30, 224),
('What is insurance and why do we need it?', 'Pooling risk to protect against the unexpected - how insurance works.', 'economics', 'beginner', 30, 225),
('What is debt and how does it work?', 'Good debt, bad debt, and the true cost of borrowing money.', 'economics', 'beginner', 30, 226),
('How do I build an emergency fund?', 'Financial security 101 - preparing for life''s surprises.', 'economics', 'beginner', 15, 227),

-- Macroeconomics (new)
('What is monetary policy?', 'How central banks influence the economy through interest rates and money supply.', 'economics', 'intermediate', 30, 230),
('What is fiscal policy?', 'Government spending and taxes as economic tools - and their limits.', 'economics', 'intermediate', 30, 231),
('What causes economic bubbles?', 'From tulips to tech stocks - the psychology and economics of speculative manias.', 'economics', 'intermediate', 30, 232),
('What is the national debt?', 'When governments borrow - what it means and whether it matters.', 'economics', 'intermediate', 30, 233),
('How does international trade work?', 'Comparative advantage, tariffs, and the global economy.', 'economics', 'intermediate', 30, 234),
('What is stagflation?', 'The 1970s nightmare - when inflation and unemployment rise together.', 'economics', 'intermediate', 30, 235),
('What causes currency crises?', 'When money loses value rapidly - from hyperinflation to currency attacks.', 'economics', 'advanced', 30, 236),
('What is the Phillips curve?', 'The relationship between unemployment and inflation - and its breakdown.', 'economics', 'advanced', 30, 237),

-- Modern Economy (new)
('What is the attention economy?', 'How tech companies monetize your focus - and what it means for society.', 'economics', 'intermediate', 30, 240),
('What is the creator economy?', 'Making money online through content - YouTube, Substack, and beyond.', 'economics', 'beginner', 30, 241),
('What is venture capital?', 'How startups get funded and why Silicon Valley works the way it does.', 'economics', 'intermediate', 30, 242),
('What is the sharing economy?', 'Uber, Airbnb, and the platforms reshaping how we exchange goods and services.', 'economics', 'beginner', 30, 243),
('What is automation and will it take our jobs?', 'Robots, AI, and the future of work - what economists think.', 'economics', 'intermediate', 30, 244),
('What is ESG investing?', 'Environmental, social, and governance factors - investing with values.', 'economics', 'intermediate', 30, 245),
('What is the housing affordability crisis?', 'Why housing costs so much in major cities - and what could fix it.', 'economics', 'intermediate', 30, 246),
('What is the future of money?', 'Digital currencies, CBDCs, and how payment might evolve.', 'economics', 'intermediate', 30, 247),

-- Economic Theory (new)
('What is behavioral economics?', 'When psychology meets economics - why we don''t act rationally with money.', 'economics', 'intermediate', 30, 250),
('What is game theory?', 'Strategic thinking mathematically analyzed - from poker to nuclear deterrence.', 'economics', 'intermediate', 30, 251),
('What is capitalism?', 'Private ownership, free markets, and the economic system most of us live in.', 'economics', 'beginner', 30, 252),
('What is socialism?', 'Collective ownership and the alternatives to capitalism - theory and practice.', 'economics', 'beginner', 30, 253),
('What is Keynesian economics?', 'Government spending to fight recessions - the economic revolution of the 1930s.', 'economics', 'intermediate', 30, 254),
('What is Austrian economics?', 'The free market school - Hayek, Mises, and the critique of central planning.', 'economics', 'intermediate', 30, 255),
('What is market failure?', 'When free markets don''t deliver optimal outcomes - externalities and public goods.', 'economics', 'intermediate', 30, 256),
('What is the paradox of thrift?', 'How individual virtue can become collective vice - a Keynesian insight.', 'economics', 'intermediate', 30, 257),

-- ============================================
-- MIND & LEARNING - NEW TOPICS
-- ============================================

-- Brain & Memory (new)
('What is working memory?', 'Your mental workspace - why you can only hold so much in mind at once.', 'mind', 'beginner', 15, 260),
('How does learning physically change the brain?', 'Synaptic connections, myelination, and the biology of skill acquisition.', 'mind', 'intermediate', 30, 261),
('What is long-term memory?', 'How information gets stored for years - and why we sometimes can''t retrieve it.', 'mind', 'intermediate', 30, 262),
('What is attention and how does it work?', 'The spotlight of the mind - selective attention and its limits.', 'mind', 'intermediate', 30, 263),
('Why do we forget?', 'Decay, interference, and the surprising benefits of forgetting.', 'mind', 'beginner', 15, 264),
('What is muscle memory?', 'How repeated practice makes movements automatic - procedural memory explained.', 'mind', 'beginner', 15, 265),
('What is semantic vs episodic memory?', 'Facts vs experiences - the different types of things we remember.', 'mind', 'intermediate', 30, 266),
('Can we enhance memory?', 'Memory palaces, spaced repetition, and evidence-based techniques.', 'mind', 'beginner', 30, 267),

-- Emotions & Psychology (new)
('What causes anxiety?', 'The brain''s alarm system in overdrive - understanding and managing worry.', 'mind', 'intermediate', 30, 270),
('What is depression?', 'More than just sadness - the neuroscience and psychology of depressive disorders.', 'mind', 'intermediate', 30, 271),
('What is attachment theory?', 'How early relationships shape how we connect with others for life.', 'mind', 'intermediate', 30, 272),
('What is personality psychology?', 'The Big Five, MBTI, and the science of individual differences.', 'mind', 'beginner', 30, 273),
('What is trauma and how does it affect us?', 'When bad experiences leave lasting marks - and how healing happens.', 'mind', 'intermediate', 30, 274),
('What is motivation psychology?', 'Intrinsic vs extrinsic, needs hierarchies, and what drives us.', 'mind', 'intermediate', 30, 275),
('What is social psychology?', 'How others influence our thoughts, feelings, and behavior.', 'mind', 'intermediate', 30, 276),
('What is positive psychology?', 'The science of flourishing - moving beyond treating problems to building well-being.', 'mind', 'beginner', 30, 277),

-- Performance & Growth (new)
('What is deliberate practice?', 'The kind of practice that actually makes you better - Ericsson''s research.', 'mind', 'intermediate', 30, 280),
('What is mental toughness?', 'Grit, resilience, and the psychology of perseverance.', 'mind', 'beginner', 30, 281),
('What is imposter syndrome?', 'Feeling like a fraud despite evidence of success - why it happens and how to cope.', 'mind', 'beginner', 15, 282),
('What is creativity and can it be learned?', 'The cognitive science of generating novel ideas - and how to have more.', 'mind', 'intermediate', 30, 283),
('What is focus in the age of distraction?', 'Attention, deep work, and strategies for concentration.', 'mind', 'beginner', 30, 284),
('What is the spacing effect?', 'Why distributed practice beats cramming - the most robust finding in learning science.', 'mind', 'beginner', 15, 285),
('What is transfer of learning?', 'Why skills learned in one context sometimes don''t apply elsewhere.', 'mind', 'intermediate', 30, 286),
('What makes experts expert?', 'Chunking, pattern recognition, and the nature of expertise.', 'mind', 'intermediate', 30, 287),

-- Sleep & Rest (new)
('What are sleep stages?', 'REM, deep sleep, and the cycles your brain goes through each night.', 'mind', 'beginner', 15, 290),
('Why do we need dreams?', 'Theories of dream function - from memory consolidation to emotional processing.', 'mind', 'intermediate', 30, 291),
('What is circadian rhythm?', 'Your body''s internal clock - and what happens when it''s disrupted.', 'mind', 'beginner', 30, 292),
('How does caffeine affect sleep?', 'The world''s most popular drug - how it works and when to stop drinking it.', 'mind', 'beginner', 15, 293),
('What is sleep hygiene?', 'Evidence-based practices for better sleep - beyond the obvious advice.', 'mind', 'beginner', 15, 294),
('What are sleep disorders?', 'Insomnia, sleep apnea, and narcolepsy - when sleep goes wrong.', 'mind', 'intermediate', 30, 295),
('How does screen time affect sleep?', 'Blue light, stimulation, and the impact of devices on rest.', 'mind', 'beginner', 15, 296),
('What is the relationship between sleep and weight?', 'How sleep affects hormones, appetite, and metabolism.', 'mind', 'intermediate', 30, 297),

-- ============================================
-- CURIOSITY & WONDER - NEW TOPICS
-- ============================================

-- Human Behavior (new)
('Why do humans gossip?', 'The evolutionary purpose of talking about others - it''s not all bad.', 'misc', 'beginner', 15, 300),
('Why do we blush?', 'The unique human signal of embarrassment - what it communicates.', 'misc', 'beginner', 15, 301),
('Why do humans dance?', 'The universal behavior that appears in every culture - its origins and functions.', 'misc', 'beginner', 30, 302),
('Why do we cry?', 'Emotional tears are unique to humans - the psychology behind them.', 'misc', 'beginner', 15, 303),
('What is the psychology of revenge?', 'The urge to get even - when it helps and when it hurts.', 'misc', 'intermediate', 30, 304),
('Why do we feel embarrassed?', 'The social emotion that makes us want to disappear - its purpose.', 'misc', 'beginner', 15, 305),
('What is herd mentality?', 'Why we follow the crowd - the psychology of conformity.', 'misc', 'beginner', 30, 306),
('Why do humans form tribes?', 'In-groups, out-groups, and the tribal nature of human psychology.', 'misc', 'intermediate', 30, 307),

-- Senses & Perception (new)
('How does smell trigger memories?', 'The powerful connection between scent and memory - Proust was onto something.', 'misc', 'beginner', 15, 310),
('What is color blindness?', 'Seeing the world differently - how color vision works and varies.', 'misc', 'beginner', 15, 311),
('How does taste work?', 'Sweet, salty, sour, bitter, umami - the science of flavor perception.', 'misc', 'beginner', 15, 312),
('What is phantom limb sensation?', 'Feeling a limb that isn''t there - what it reveals about the brain.', 'misc', 'intermediate', 30, 313),
('Why do some people have absolute pitch?', 'The rare ability to identify any note - is it learned or innate?', 'misc', 'intermediate', 30, 314),
('What is proprioception?', 'The hidden sense that lets you know where your body is in space.', 'misc', 'beginner', 15, 315),
('How do we perceive motion?', 'Why we see movement - and why sometimes we''re fooled.', 'misc', 'intermediate', 30, 316),
('What is the rubber hand illusion?', 'A simple trick that reveals how the brain constructs body ownership.', 'misc', 'beginner', 15, 317),

-- Communication (new)
('How did human language evolve?', 'The origin of the trait that makes humans unique - theories and evidence.', 'misc', 'intermediate', 30, 320),
('What is body language?', 'Nonverbal communication - what we say without words.', 'misc', 'beginner', 30, 321),
('Why do humans tell stories?', 'Narrative as a fundamental human activity - its purpose and power.', 'misc', 'beginner', 30, 322),
('What is the Sapir-Whorf hypothesis?', 'Does the language we speak shape how we think?', 'misc', 'intermediate', 30, 323),
('How do pidgins and creoles form?', 'When languages meet and merge - linguistic creativity in action.', 'misc', 'intermediate', 30, 324),
('What is sign language?', 'Full natural languages expressed in space - their structure and diversity.', 'misc', 'beginner', 30, 325),
('Why do we have different accents?', 'How speech patterns develop and what they signal about identity.', 'misc', 'beginner', 15, 326),
('What is the future of communication?', 'From emoji to brain-computer interfaces - how we''ll connect next.', 'misc', 'intermediate', 30, 327),

-- Big Questions (new)
('Is mathematics discovered or invented?', 'The philosophical puzzle of whether math exists independently of minds.', 'misc', 'intermediate', 30, 330),
('What is the nature of time?', 'Physics, philosophy, and the arrow of time - why does it flow forward?', 'misc', 'advanced', 30, 331),
('Are we alone in the universe?', 'The Drake equation, astrobiology, and the search for extraterrestrial life.', 'misc', 'intermediate', 30, 332),
('What is the hard problem of consciousness?', 'Why explaining the brain might not explain experience.', 'misc', 'advanced', 30, 333),
('Could the universe have come from nothing?', 'Physicists and philosophers on the ultimate origin question.', 'misc', 'advanced', 30, 334),
('What is infinity?', 'The concept that baffles and delights - from Zeno to Cantor to cosmology.', 'misc', 'intermediate', 30, 335),
('Why is there something rather than nothing?', 'The most fundamental question - and whether it even makes sense.', 'misc', 'advanced', 30, 336),
('What is chaos theory?', 'The butterfly effect and the science of unpredictable systems.', 'misc', 'intermediate', 30, 337),

-- Origins & Discoveries (new)
('How was fire discovered?', 'The spark that changed everything - evidence from archaeology.', 'misc', 'beginner', 15, 340),
('How was America discovered - by whom and when?', 'Indigenous peoples, Vikings, and Columbus - the complex history.', 'misc', 'intermediate', 30, 341),
('How was penicillin discovered?', 'The accidental discovery that revolutionized medicine.', 'misc', 'beginner', 15, 342),
('How was the structure of DNA discovered?', 'Watson, Crick, Franklin, and the race to understand life''s code.', 'misc', 'intermediate', 30, 343),
('How was electricity discovered?', 'From lightning to power grids - the journey to harnessing nature''s force.', 'misc', 'intermediate', 30, 344),
('How were the laws of physics discovered?', 'Newton, Einstein, and the scientific revolution in understanding nature.', 'misc', 'intermediate', 30, 345),
('How was the internet invented?', 'From military networks to the world wide web - the unlikely origins.', 'misc', 'beginner', 30, 346),
('What is the history of zero?', 'The number that changed everything - its invention and spread.', 'misc', 'beginner', 30, 347)

ON CONFLICT DO NOTHING;

-- ============================================
-- LINK NEW TOPICS TO SUBCATEGORIES
-- ============================================

DO $$
BEGIN
    -- Physics & Space (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'physics')
    WHERE topic IN (
        'How do magnets work?',
        'What is dark matter?',
        'How do stars form and die?',
        'What are gravitational waves?',
        'Why is Pluto no longer a planet?',
        'How do submarines work?',
        'What is antimatter?',
        'How does radiocarbon dating work?'
    ) AND subcategory_id IS NULL;

    -- Biology & Life (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'biology')
    WHERE topic IN (
        'How do viruses evolve so fast?',
        'What is the microbiome?',
        'Why do we age?',
        'How does photosynthesis work?',
        'What makes a species endangered?',
        'How do antibiotics work?',
        'What is epigenetics?',
        'How do animals migrate?'
    ) AND subcategory_id IS NULL;

    -- Technology & Computing (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'technology')
    WHERE topic IN (
        'How do algorithms recommend what you watch?',
        'What is blockchain technology?',
        'How does facial recognition work?',
        'What is 5G and why does it matter?',
        'How do self-driving cars work?',
        'What is virtual reality?',
        'How does encryption keep us safe?',
        'What is cloud computing?'
    ) AND subcategory_id IS NULL;

    -- Earth & Environment (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'earth')
    WHERE topic IN (
        'How do volcanoes work?',
        'What causes earthquakes?',
        'How does the water cycle work?',
        'What is ocean acidification?',
        'How do hurricanes form?',
        'What is permafrost and why is it melting?',
        'How do coral reefs work?',
        'What is biodiversity and why does it matter?'
    ) AND subcategory_id IS NULL;

    -- Ancient World (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'ancient')
    WHERE topic IN (
        'What was the Bronze Age Collapse?',
        'How did ancient Egypt last 3000 years?',
        'What was life like in ancient Mesopotamia?',
        'Who were the Vikings really?',
        'How did the Roman Empire function?',
        'What was the Library of Alexandria?',
        'How did ancient China unify?',
        'What was the Persian Empire?'
    ) AND subcategory_id IS NULL;

    -- Medieval & Renaissance (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'medieval')
    WHERE topic IN (
        'What were the Crusades really about?',
        'How did medieval castles work?',
        'What was the Mongol Empire?',
        'How did the Ottoman Empire rise?',
        'What sparked the Protestant Reformation?',
        'How did Venice become a trading empire?',
        'What was the age of exploration?',
        'How did the samurai shape Japan?'
    ) AND subcategory_id IS NULL;

    -- Modern History (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'modern')
    WHERE topic IN (
        'What was the scramble for Africa?',
        'How did World War II start?',
        'What was the Civil Rights Movement?',
        'How did the Soviet Union collapse?',
        'What was apartheid in South Africa?',
        'How did the internet emerge?',
        'What was the Space Race?',
        'How did decolonization reshape the world?'
    ) AND subcategory_id IS NULL;

    -- Civilization Studies (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'civilization')
    WHERE topic IN (
        'Why did some empires last longer than others?',
        'How do civilizations spread ideas?',
        'What makes cities successful?',
        'How has warfare evolved throughout history?',
        'What role has disease played in history?',
        'How did agriculture change humanity?',
        'What is historical revisionism?',
        'Why do empires decline?'
    ) AND subcategory_id IS NULL;

    -- Ethics & Morality (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'ethics')
    WHERE topic IN (
        'What is moral relativism?',
        'What are human rights?',
        'What is the ethics of AI?',
        'What is animal rights philosophy?',
        'What is environmental ethics?',
        'What is the ethics of genetic engineering?',
        'What is virtue ethics?',
        'What is moral luck?'
    ) AND subcategory_id IS NULL;

    -- Existential Questions (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'existential')
    WHERE topic IN (
        'What is the absurd?',
        'What is phenomenology?',
        'What is the mind-body problem?',
        'What is personal identity?',
        'Can we know anything for certain?',
        'What is the nature of reality?',
        'What is the philosophy of death?',
        'What is authenticity?'
    ) AND subcategory_id IS NULL;

    -- Classical Philosophy (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'classical-philosophy')
    WHERE topic IN (
        'What is Plato''s theory of forms?',
        'What is Aristotle''s philosophy?',
        'What is Eastern philosophy?',
        'What is Epicureanism?',
        'What is Cynicism?',
        'What did Kant contribute to philosophy?',
        'What is Nietzsche''s philosophy?',
        'What is pragmatism?'
    ) AND subcategory_id IS NULL;

    -- Thought Experiments (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'thought-experiments')
    WHERE topic IN (
        'What is the veil of ignorance?',
        'What is the Chinese Room argument?',
        'What is the experience machine?',
        'What is the prisoner''s dilemma?',
        'What is the simulation argument?',
        'What is the utility monster?',
        'What is the repugnant conclusion?',
        'What is Newcomb''s paradox?'
    ) AND subcategory_id IS NULL;

    -- Personal Finance (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'personal-finance')
    WHERE topic IN (
        'What is investing for beginners?',
        'What is a credit score?',
        'How does retirement planning work?',
        'What is financial literacy?',
        'How do mortgages work?',
        'What is insurance and why do we need it?',
        'What is debt and how does it work?',
        'How do I build an emergency fund?'
    ) AND subcategory_id IS NULL;

    -- Macroeconomics (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'macroeconomics')
    WHERE topic IN (
        'What is monetary policy?',
        'What is fiscal policy?',
        'What causes economic bubbles?',
        'What is the national debt?',
        'How does international trade work?',
        'What is stagflation?',
        'What causes currency crises?',
        'What is the Phillips curve?'
    ) AND subcategory_id IS NULL;

    -- Modern Economy (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'modern-economy')
    WHERE topic IN (
        'What is the attention economy?',
        'What is the creator economy?',
        'What is venture capital?',
        'What is the sharing economy?',
        'What is automation and will it take our jobs?',
        'What is ESG investing?',
        'What is the housing affordability crisis?',
        'What is the future of money?'
    ) AND subcategory_id IS NULL;

    -- Economic Theory (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'economic-theory')
    WHERE topic IN (
        'What is behavioral economics?',
        'What is game theory?',
        'What is capitalism?',
        'What is socialism?',
        'What is Keynesian economics?',
        'What is Austrian economics?',
        'What is market failure?',
        'What is the paradox of thrift?'
    ) AND subcategory_id IS NULL;

    -- Brain & Memory (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'brain-memory')
    WHERE topic IN (
        'What is working memory?',
        'How does learning physically change the brain?',
        'What is long-term memory?',
        'What is attention and how does it work?',
        'Why do we forget?',
        'What is muscle memory?',
        'What is semantic vs episodic memory?',
        'Can we enhance memory?'
    ) AND subcategory_id IS NULL;

    -- Emotions & Psychology (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'emotions')
    WHERE topic IN (
        'What causes anxiety?',
        'What is depression?',
        'What is attachment theory?',
        'What is personality psychology?',
        'What is trauma and how does it affect us?',
        'What is motivation psychology?',
        'What is social psychology?',
        'What is positive psychology?'
    ) AND subcategory_id IS NULL;

    -- Performance & Growth (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'performance')
    WHERE topic IN (
        'What is deliberate practice?',
        'What is mental toughness?',
        'What is imposter syndrome?',
        'What is creativity and can it be learned?',
        'What is focus in the age of distraction?',
        'What is the spacing effect?',
        'What is transfer of learning?',
        'What makes experts expert?'
    ) AND subcategory_id IS NULL;

    -- Sleep & Rest (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'sleep')
    WHERE topic IN (
        'What are sleep stages?',
        'Why do we need dreams?',
        'What is circadian rhythm?',
        'How does caffeine affect sleep?',
        'What is sleep hygiene?',
        'What are sleep disorders?',
        'How does screen time affect sleep?',
        'What is the relationship between sleep and weight?'
    ) AND subcategory_id IS NULL;

    -- Human Behavior (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'human-behavior')
    WHERE topic IN (
        'Why do humans gossip?',
        'Why do we blush?',
        'Why do humans dance?',
        'Why do we cry?',
        'What is the psychology of revenge?',
        'Why do we feel embarrassed?',
        'What is herd mentality?',
        'Why do humans form tribes?'
    ) AND subcategory_id IS NULL;

    -- Senses & Perception (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'senses')
    WHERE topic IN (
        'How does smell trigger memories?',
        'What is color blindness?',
        'How does taste work?',
        'What is phantom limb sensation?',
        'Why do some people have absolute pitch?',
        'What is proprioception?',
        'How do we perceive motion?',
        'What is the rubber hand illusion?'
    ) AND subcategory_id IS NULL;

    -- Communication (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'communication')
    WHERE topic IN (
        'How did human language evolve?',
        'What is body language?',
        'Why do humans tell stories?',
        'What is the Sapir-Whorf hypothesis?',
        'How do pidgins and creoles form?',
        'What is sign language?',
        'Why do we have different accents?',
        'What is the future of communication?'
    ) AND subcategory_id IS NULL;

    -- Big Questions (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'big-questions')
    WHERE topic IN (
        'Is mathematics discovered or invented?',
        'What is the nature of time?',
        'Are we alone in the universe?',
        'What is the hard problem of consciousness?',
        'Could the universe have come from nothing?',
        'What is infinity?',
        'Why is there something rather than nothing?',
        'What is chaos theory?'
    ) AND subcategory_id IS NULL;

    -- Origins & Discoveries (new topics)
    UPDATE public.showcase_topics SET subcategory_id = (SELECT id FROM public.almanac_categories WHERE slug = 'origins')
    WHERE topic IN (
        'How was fire discovered?',
        'How was America discovered - by whom and when?',
        'How was penicillin discovered?',
        'How was the structure of DNA discovered?',
        'How was electricity discovered?',
        'How were the laws of physics discovered?',
        'How was the internet invented?',
        'What is the history of zero?'
    ) AND subcategory_id IS NULL;
END $$;

-- Show final counts
DO $$
DECLARE
    topic_count INTEGER;
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO topic_count FROM public.showcase_topics;
    SELECT COUNT(*) INTO category_count FROM public.almanac_categories;
    RAISE NOTICE 'Almanac now has % topics across % categories', topic_count, category_count;
END $$;
