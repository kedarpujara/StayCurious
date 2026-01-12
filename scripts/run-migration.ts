/**
 * Run SQL Migration via Supabase
 *
 * Usage: npx tsx scripts/run-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const lines = envContent.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex)
        const value = trimmed.substring(eqIndex + 1)
        // Remove quotes if present
        process.env[key] = value.replace(/^["']|["']$/g, '')
      }
    }
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('🔄 Running user reset and almanac expansion...')
  console.log('')

  // =============================================
  // PART 1: RESET USER
  // =============================================
  console.log('📝 Step 1: Finding user to reset...')

  // Get the first user
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, display_name')
    .order('created_at', { ascending: true })
    .limit(1)

  if (userError || !users || users.length === 0) {
    console.error('No users found:', userError)
    process.exit(1)
  }

  const targetUser = users[0]
  console.log(`Found user: ${targetUser.display_name || targetUser.email} (${targetUser.id})`)

  // Delete related data
  console.log('🗑️ Clearing user data...')

  const tablesToClear = [
    'user_badges',
    'user_questions',
    'eli5_submissions',
    'quiz_attempts',
    'user_course_progress',
    'curio_events',
    'daily_checkins',
    'topic_completions',
    'monthly_snapshots',
    'course_stars'
  ]

  for (const table of tablesToClear) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('user_id', targetUser.id)

    if (error) {
      console.log(`  ⚠️ ${table}: ${error.message}`)
    } else {
      console.log(`  ✓ ${table}`)
    }
  }

  // Reset user stats
  console.log('🔄 Resetting user stats...')
  const { error: updateError } = await supabase
    .from('users')
    .update({
      curio_points: 0,
      questions_asked: 0,
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: null,
      courses_completed: 0,
      quizzes_passed: 0,
      perfect_quizzes: 0
    })
    .eq('id', targetUser.id)

  if (updateError) {
    console.error('Failed to reset user stats:', updateError)
  } else {
    console.log('  ✓ User stats reset to 0')
  }

  // =============================================
  // PART 2: ADD NEW TOPICS
  // =============================================
  console.log('')
  console.log('📚 Step 2: Adding new almanac topics...')

  // Get current topic count
  const { count: beforeCount } = await supabase
    .from('showcase_topics')
    .select('*', { count: 'exact', head: true })

  console.log(`Current topic count: ${beforeCount}`)

  // New topics to add
  const newTopics = [
    // Physics & Space (new)
    { topic: 'How do magnets work?', description: 'The mysterious force that holds notes on fridges and makes motors spin - explained at the atomic level.', category: 'science', difficulty: 'beginner', estimated_minutes: 15, display_order: 100 },
    { topic: 'What is dark matter?', description: 'The invisible substance that makes up 27% of the universe - how we know it exists without seeing it.', category: 'science', difficulty: 'intermediate', estimated_minutes: 30, display_order: 101 },
    { topic: 'How do stars form and die?', description: 'From cosmic nurseries to spectacular supernovae - the life cycle of stars across billions of years.', category: 'science', difficulty: 'intermediate', estimated_minutes: 30, display_order: 102 },
    { topic: 'What are gravitational waves?', description: 'Ripples in spacetime detected a century after Einstein predicted them - a new way to see the universe.', category: 'science', difficulty: 'advanced', estimated_minutes: 30, display_order: 103 },
    { topic: 'Why is Pluto no longer a planet?', description: 'The demotion that sparked outrage - what makes a planet a planet and who decides.', category: 'science', difficulty: 'beginner', estimated_minutes: 15, display_order: 104 },
    { topic: 'How do submarines work?', description: 'The physics of buoyancy and pressure that lets humans explore the ocean depths.', category: 'science', difficulty: 'beginner', estimated_minutes: 15, display_order: 105 },
    { topic: 'What is antimatter?', description: 'The mirror image of matter that annihilates on contact - science fiction made real.', category: 'science', difficulty: 'intermediate', estimated_minutes: 30, display_order: 106 },
    { topic: 'How does radiocarbon dating work?', description: 'Using atomic decay to peer back thousands of years into history.', category: 'science', difficulty: 'intermediate', estimated_minutes: 30, display_order: 107 },

    // Biology & Life (new)
    { topic: 'How do viruses evolve so fast?', description: 'Mutation, selection, and the arms race between pathogens and hosts.', category: 'science', difficulty: 'intermediate', estimated_minutes: 30, display_order: 110 },
    { topic: 'What is the microbiome?', description: 'The trillions of organisms living inside you - and how they affect your health and mood.', category: 'science', difficulty: 'beginner', estimated_minutes: 30, display_order: 111 },
    { topic: 'Why do we age?', description: 'The biology of getting older - from telomeres to cellular senescence to longevity research.', category: 'science', difficulty: 'intermediate', estimated_minutes: 30, display_order: 112 },
    { topic: 'How does photosynthesis work?', description: 'The elegant chemistry that turns sunlight into the food that powers all life on Earth.', category: 'science', difficulty: 'beginner', estimated_minutes: 15, display_order: 113 },
    { topic: 'What makes a species endangered?', description: 'Population dynamics, habitat loss, and the science of extinction.', category: 'science', difficulty: 'beginner', estimated_minutes: 30, display_order: 114 },
    { topic: 'How do antibiotics work?', description: 'The drugs that revolutionized medicine - and why bacteria are fighting back.', category: 'science', difficulty: 'beginner', estimated_minutes: 30, display_order: 115 },
    { topic: 'What is epigenetics?', description: 'How your experiences can change gene expression - and potentially be passed to your children.', category: 'science', difficulty: 'advanced', estimated_minutes: 30, display_order: 116 },
    { topic: 'How do animals migrate?', description: 'Built-in compasses, star navigation, and the incredible journeys of birds and whales.', category: 'science', difficulty: 'beginner', estimated_minutes: 30, display_order: 117 },

    // Technology & Computing (new)
    { topic: 'How do algorithms recommend what you watch?', description: 'The math and machine learning behind Netflix, YouTube, and TikTok suggestions.', category: 'science', difficulty: 'intermediate', estimated_minutes: 30, display_order: 120 },
    { topic: 'What is blockchain technology?', description: 'Beyond cryptocurrency - how distributed ledgers work and why they matter.', category: 'science', difficulty: 'intermediate', estimated_minutes: 30, display_order: 121 },
    { topic: 'How does facial recognition work?', description: 'The AI that can identify you in a crowd - its power and its problems.', category: 'science', difficulty: 'intermediate', estimated_minutes: 30, display_order: 122 },
    { topic: 'What is 5G and why does it matter?', description: 'The next generation of wireless - speeds, capabilities, and controversies.', category: 'science', difficulty: 'beginner', estimated_minutes: 15, display_order: 123 },
    { topic: 'How do self-driving cars work?', description: 'Sensors, AI, and the engineering challenge of autonomous vehicles.', category: 'science', difficulty: 'intermediate', estimated_minutes: 30, display_order: 124 },
    { topic: 'What is virtual reality?', description: 'Tricking your brain into believing impossible worlds - the tech behind VR.', category: 'science', difficulty: 'beginner', estimated_minutes: 15, display_order: 125 },
    { topic: 'How does encryption keep us safe?', description: 'The mathematics protecting your passwords, messages, and bank accounts.', category: 'science', difficulty: 'intermediate', estimated_minutes: 30, display_order: 126 },
    { topic: 'What is cloud computing?', description: 'How data centers power the modern internet - from storage to streaming.', category: 'science', difficulty: 'beginner', estimated_minutes: 15, display_order: 127 },

    // Earth & Environment (new)
    { topic: 'How do volcanoes work?', description: 'Magma chambers, tectonic plates, and the awesome power beneath our feet.', category: 'science', difficulty: 'beginner', estimated_minutes: 30, display_order: 130 },
    { topic: 'What causes earthquakes?', description: 'Plate tectonics, fault lines, and the science of seismic activity.', category: 'science', difficulty: 'beginner', estimated_minutes: 30, display_order: 131 },
    { topic: 'How does the water cycle work?', description: 'Evaporation, condensation, and the endless journey of water on Earth.', category: 'science', difficulty: 'beginner', estimated_minutes: 15, display_order: 132 },
    { topic: 'What is ocean acidification?', description: 'The "other CO2 problem" threatening marine ecosystems worldwide.', category: 'science', difficulty: 'intermediate', estimated_minutes: 30, display_order: 133 },
    { topic: 'How do hurricanes form?', description: 'Warm water, rotation, and the physics of the most powerful storms on Earth.', category: 'science', difficulty: 'intermediate', estimated_minutes: 30, display_order: 134 },
    { topic: 'What is permafrost and why is it melting?', description: 'The frozen ground holding back ancient carbon - and what happens when it thaws.', category: 'science', difficulty: 'intermediate', estimated_minutes: 30, display_order: 135 },
    { topic: 'How do coral reefs work?', description: 'The rainforests of the sea - how these ecosystems support ocean life.', category: 'science', difficulty: 'beginner', estimated_minutes: 30, display_order: 136 },
    { topic: 'What is biodiversity and why does it matter?', description: 'The variety of life on Earth - and what we lose when species disappear.', category: 'science', difficulty: 'beginner', estimated_minutes: 30, display_order: 137 },

    // Ancient World (new)
    { topic: 'What was the Bronze Age Collapse?', description: 'When the great civilizations of the Mediterranean mysteriously fell - a 3000-year-old mystery.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 140 },
    { topic: 'How did ancient Egypt last 3000 years?', description: 'The remarkable stability of one of history\'s longest-lived civilizations.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 141 },
    { topic: 'What was life like in ancient Mesopotamia?', description: 'The cradle of civilization - where writing, law, and cities began.', category: 'history', difficulty: 'beginner', estimated_minutes: 30, display_order: 142 },
    { topic: 'Who were the Vikings really?', description: 'Beyond the myths - traders, explorers, and settlers who shaped Europe.', category: 'history', difficulty: 'beginner', estimated_minutes: 30, display_order: 143 },
    { topic: 'How did the Roman Empire function?', description: 'Roads, laws, and legions - the systems that held a vast empire together.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 144 },
    { topic: 'What was the Library of Alexandria?', description: 'The ancient world\'s greatest repository of knowledge - and how it was lost.', category: 'history', difficulty: 'beginner', estimated_minutes: 15, display_order: 145 },
    { topic: 'How did ancient China unify?', description: 'The first emperor and the creation of the world\'s longest continuous civilization.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 146 },
    { topic: 'What was the Persian Empire?', description: 'The first true superpower - tolerance, roads, and governance on a massive scale.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 147 },

    // Medieval & Renaissance (new)
    { topic: 'What were the Crusades really about?', description: 'Religion, politics, and economics - the complex motivations behind holy wars.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 150 },
    { topic: 'How did medieval castles work?', description: 'Defense, status, and daily life - the engineering and society of castle living.', category: 'history', difficulty: 'beginner', estimated_minutes: 30, display_order: 151 },
    { topic: 'What was the Mongol Empire?', description: 'How a nomadic people built the largest land empire in history.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 152 },
    { topic: 'How did the Ottoman Empire rise?', description: 'From small Turkish state to empire spanning three continents.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 153 },
    { topic: 'What sparked the Protestant Reformation?', description: 'Luther, indulgences, and the religious revolution that split Christianity.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 154 },
    { topic: 'How did Venice become a trading empire?', description: 'The floating city that dominated Mediterranean commerce for centuries.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 155 },
    { topic: 'What was the age of exploration?', description: 'Why European ships suddenly went everywhere - technology, economics, and ambition.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 156 },
    { topic: 'How did the samurai shape Japan?', description: 'Warriors, honor, and the military class that ruled Japan for centuries.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 157 },

    // Modern History (new)
    { topic: 'What was the scramble for Africa?', description: 'How European powers carved up a continent in a single generation.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 160 },
    { topic: 'How did World War II start?', description: 'From Versailles to Poland - the path to the deadliest conflict in history.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 161 },
    { topic: 'What was the Civil Rights Movement?', description: 'The struggle for equality in America - from Montgomery to the March on Washington.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 162 },
    { topic: 'How did the Soviet Union collapse?', description: 'The sudden end of a superpower - economics, politics, and the fall of communism.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 163 },
    { topic: 'What was apartheid in South Africa?', description: 'Institutionalized racism and the long struggle for freedom.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 164 },
    { topic: 'How did the internet emerge?', description: 'From ARPANET to the World Wide Web - the invention that changed everything.', category: 'history', difficulty: 'beginner', estimated_minutes: 30, display_order: 165 },
    { topic: 'What was the Space Race?', description: 'Superpowers competing to reach the stars - and how it transformed technology.', category: 'history', difficulty: 'beginner', estimated_minutes: 30, display_order: 166 },
    { topic: 'How did decolonization reshape the world?', description: 'The end of empires and the birth of new nations in the 20th century.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 167 },

    // Civilization Studies (new)
    { topic: 'Why did some empires last longer than others?', description: 'Comparing Rome, China, Persia, and others - patterns of imperial longevity.', category: 'history', difficulty: 'advanced', estimated_minutes: 30, display_order: 170 },
    { topic: 'How do civilizations spread ideas?', description: 'Trade routes, conquest, and cultural diffusion across history.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 171 },
    { topic: 'What makes cities successful?', description: 'Location, resources, and governance - why some cities thrive for millennia.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 172 },
    { topic: 'How has warfare evolved throughout history?', description: 'From bronze swords to drones - technology and the changing face of conflict.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 173 },
    { topic: 'What role has disease played in history?', description: 'Plagues, pandemics, and the pathogens that changed the course of civilization.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 174 },
    { topic: 'How did agriculture change humanity?', description: 'The Neolithic revolution that ended nomadic life and created civilization.', category: 'history', difficulty: 'beginner', estimated_minutes: 30, display_order: 175 },
    { topic: 'What is historical revisionism?', description: 'How our understanding of history changes - and why it matters.', category: 'history', difficulty: 'intermediate', estimated_minutes: 30, display_order: 176 },
    { topic: 'Why do empires decline?', description: 'Overextension, corruption, and collapse - patterns across civilizations.', category: 'history', difficulty: 'advanced', estimated_minutes: 30, display_order: 177 },

    // Ethics & Morality (new)
    { topic: 'What is moral relativism?', description: 'Is right and wrong the same everywhere, or does it depend on culture?', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 180 },
    { topic: 'What are human rights?', description: 'The philosophical foundation of universal dignity - where rights come from.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 181 },
    { topic: 'What is the ethics of AI?', description: 'Should machines make moral decisions? The dilemmas of artificial intelligence.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 182 },
    { topic: 'What is animal rights philosophy?', description: 'Do animals deserve moral consideration? Singer, Regan, and the debate.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 183 },
    { topic: 'What is environmental ethics?', description: 'Do we have moral obligations to nature itself - not just future humans?', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 184 },
    { topic: 'What is the ethics of genetic engineering?', description: 'Designer babies, enhancement, and the moral limits of changing human nature.', category: 'philosophy', difficulty: 'advanced', estimated_minutes: 30, display_order: 185 },
    { topic: 'What is virtue ethics?', description: 'Aristotle\'s approach - becoming a good person rather than following rules.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 186 },
    { topic: 'What is moral luck?', description: 'Should we be judged for outcomes we couldn\'t control? A philosophical puzzle.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 187 },

    // Existential Questions (new)
    { topic: 'What is the absurd?', description: 'Camus and the gap between human meaning-seeking and a silent universe.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 190 },
    { topic: 'What is phenomenology?', description: 'The philosophy of conscious experience - how things appear to us.', category: 'philosophy', difficulty: 'advanced', estimated_minutes: 30, display_order: 191 },
    { topic: 'What is the mind-body problem?', description: 'How does physical brain stuff produce mental experience?', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 192 },
    { topic: 'What is personal identity?', description: 'What makes you the same person over time - body, memories, or something else?', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 193 },
    { topic: 'Can we know anything for certain?', description: 'Descartes, skepticism, and the foundations of knowledge.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 194 },
    { topic: 'What is the nature of reality?', description: 'Metaphysics 101 - what exists and what is it made of?', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 195 },
    { topic: 'What is the philosophy of death?', description: 'Should we fear death? Epicurus, Heidegger, and confronting mortality.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 196 },
    { topic: 'What is authenticity?', description: 'Living as your true self - existentialist views on genuine existence.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 197 },

    // Classical Philosophy (new)
    { topic: 'What is Plato\'s theory of forms?', description: 'The realm of perfect ideals behind imperfect reality - a foundational idea.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 200 },
    { topic: 'What is Aristotle\'s philosophy?', description: 'The master of those who know - logic, ethics, and the good life.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 201 },
    { topic: 'What is Eastern philosophy?', description: 'Buddhism, Taoism, and Confucianism - wisdom traditions from the East.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 202 },
    { topic: 'What is Epicureanism?', description: 'The pursuit of pleasure as the highest good - but not what you might think.', category: 'philosophy', difficulty: 'beginner', estimated_minutes: 15, display_order: 203 },
    { topic: 'What is Cynicism?', description: 'The ancient philosophers who rejected social conventions for virtue.', category: 'philosophy', difficulty: 'beginner', estimated_minutes: 15, display_order: 204 },
    { topic: 'What did Kant contribute to philosophy?', description: 'The Copernican revolution in thought - how we shape what we perceive.', category: 'philosophy', difficulty: 'advanced', estimated_minutes: 30, display_order: 205 },
    { topic: 'What is Nietzsche\'s philosophy?', description: 'Will to power, eternal return, and the death of God - one of history\'s most misunderstood thinkers.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 206 },
    { topic: 'What is pragmatism?', description: 'The American philosophical tradition - truth is what works.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 207 },

    // Thought Experiments (new)
    { topic: 'What is the veil of ignorance?', description: 'Rawls\' thought experiment about designing a fair society.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 210 },
    { topic: 'What is the Chinese Room argument?', description: 'Can a computer truly understand - or is it just manipulating symbols?', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 211 },
    { topic: 'What is the experience machine?', description: 'Would you plug in to a machine that simulates perfect happiness?', category: 'philosophy', difficulty: 'beginner', estimated_minutes: 15, display_order: 212 },
    { topic: 'What is the prisoner\'s dilemma?', description: 'Game theory and the paradox of rational self-interest vs. cooperation.', category: 'philosophy', difficulty: 'beginner', estimated_minutes: 15, display_order: 213 },
    { topic: 'What is the simulation argument?', description: 'Are we living in a computer simulation? The philosophical case.', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 214 },
    { topic: 'What is the utility monster?', description: 'A challenge to utilitarianism - what if someone gets infinite pleasure?', category: 'philosophy', difficulty: 'intermediate', estimated_minutes: 30, display_order: 215 },
    { topic: 'What is the repugnant conclusion?', description: 'A paradox in population ethics about quality vs. quantity of life.', category: 'philosophy', difficulty: 'advanced', estimated_minutes: 30, display_order: 216 },
    { topic: 'What is Newcomb\'s paradox?', description: 'A decision theory puzzle that divides philosophers and mathematicians.', category: 'philosophy', difficulty: 'advanced', estimated_minutes: 30, display_order: 217 },

    // Personal Finance (new)
    { topic: 'What is investing for beginners?', description: 'Stocks, bonds, and index funds - the basics of growing your money.', category: 'economics', difficulty: 'beginner', estimated_minutes: 30, display_order: 220 },
    { topic: 'What is a credit score?', description: 'The three-digit number that affects your financial life - how it works.', category: 'economics', difficulty: 'beginner', estimated_minutes: 15, display_order: 221 },
    { topic: 'How does retirement planning work?', description: '401(k)s, IRAs, and the math of saving for the future.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 222 },
    { topic: 'What is financial literacy?', description: 'The essential money skills everyone should know but few are taught.', category: 'economics', difficulty: 'beginner', estimated_minutes: 30, display_order: 223 },
    { topic: 'How do mortgages work?', description: 'Buying a home on credit - the biggest financial decision most people make.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 224 },
    { topic: 'What is insurance and why do we need it?', description: 'Pooling risk to protect against the unexpected - how insurance works.', category: 'economics', difficulty: 'beginner', estimated_minutes: 30, display_order: 225 },
    { topic: 'What is debt and how does it work?', description: 'Good debt, bad debt, and the true cost of borrowing money.', category: 'economics', difficulty: 'beginner', estimated_minutes: 30, display_order: 226 },
    { topic: 'How do I build an emergency fund?', description: 'Financial security 101 - preparing for life\'s surprises.', category: 'economics', difficulty: 'beginner', estimated_minutes: 15, display_order: 227 },

    // Macroeconomics (new)
    { topic: 'What is monetary policy?', description: 'How central banks influence the economy through interest rates and money supply.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 230 },
    { topic: 'What is fiscal policy?', description: 'Government spending and taxes as economic tools - and their limits.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 231 },
    { topic: 'What causes economic bubbles?', description: 'From tulips to tech stocks - the psychology and economics of speculative manias.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 232 },
    { topic: 'What is the national debt?', description: 'When governments borrow - what it means and whether it matters.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 233 },
    { topic: 'How does international trade work?', description: 'Comparative advantage, tariffs, and the global economy.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 234 },
    { topic: 'What is stagflation?', description: 'The 1970s nightmare - when inflation and unemployment rise together.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 235 },
    { topic: 'What causes currency crises?', description: 'When money loses value rapidly - from hyperinflation to currency attacks.', category: 'economics', difficulty: 'advanced', estimated_minutes: 30, display_order: 236 },
    { topic: 'What is the Phillips curve?', description: 'The relationship between unemployment and inflation - and its breakdown.', category: 'economics', difficulty: 'advanced', estimated_minutes: 30, display_order: 237 },

    // Modern Economy (new)
    { topic: 'What is the attention economy?', description: 'How tech companies monetize your focus - and what it means for society.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 240 },
    { topic: 'What is the creator economy?', description: 'Making money online through content - YouTube, Substack, and beyond.', category: 'economics', difficulty: 'beginner', estimated_minutes: 30, display_order: 241 },
    { topic: 'What is venture capital?', description: 'How startups get funded and why Silicon Valley works the way it does.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 242 },
    { topic: 'What is the sharing economy?', description: 'Uber, Airbnb, and the platforms reshaping how we exchange goods and services.', category: 'economics', difficulty: 'beginner', estimated_minutes: 30, display_order: 243 },
    { topic: 'What is automation and will it take our jobs?', description: 'Robots, AI, and the future of work - what economists think.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 244 },
    { topic: 'What is ESG investing?', description: 'Environmental, social, and governance factors - investing with values.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 245 },
    { topic: 'What is the housing affordability crisis?', description: 'Why housing costs so much in major cities - and what could fix it.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 246 },
    { topic: 'What is the future of money?', description: 'Digital currencies, CBDCs, and how payment might evolve.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 247 },

    // Economic Theory (new)
    { topic: 'What is behavioral economics?', description: 'When psychology meets economics - why we don\'t act rationally with money.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 250 },
    { topic: 'What is game theory?', description: 'Strategic thinking mathematically analyzed - from poker to nuclear deterrence.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 251 },
    { topic: 'What is capitalism?', description: 'Private ownership, free markets, and the economic system most of us live in.', category: 'economics', difficulty: 'beginner', estimated_minutes: 30, display_order: 252 },
    { topic: 'What is socialism?', description: 'Collective ownership and the alternatives to capitalism - theory and practice.', category: 'economics', difficulty: 'beginner', estimated_minutes: 30, display_order: 253 },
    { topic: 'What is Keynesian economics?', description: 'Government spending to fight recessions - the economic revolution of the 1930s.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 254 },
    { topic: 'What is Austrian economics?', description: 'The free market school - Hayek, Mises, and the critique of central planning.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 255 },
    { topic: 'What is market failure?', description: 'When free markets don\'t deliver optimal outcomes - externalities and public goods.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 256 },
    { topic: 'What is the paradox of thrift?', description: 'How individual virtue can become collective vice - a Keynesian insight.', category: 'economics', difficulty: 'intermediate', estimated_minutes: 30, display_order: 257 },

    // Brain & Memory (new)
    { topic: 'What is working memory?', description: 'Your mental workspace - why you can only hold so much in mind at once.', category: 'mind', difficulty: 'beginner', estimated_minutes: 15, display_order: 260 },
    { topic: 'How does learning physically change the brain?', description: 'Synaptic connections, myelination, and the biology of skill acquisition.', category: 'mind', difficulty: 'intermediate', estimated_minutes: 30, display_order: 261 },
    { topic: 'What is long-term memory?', description: 'How information gets stored for years - and why we sometimes can\'t retrieve it.', category: 'mind', difficulty: 'intermediate', estimated_minutes: 30, display_order: 262 },
    { topic: 'What is attention and how does it work?', description: 'The spotlight of the mind - selective attention and its limits.', category: 'mind', difficulty: 'intermediate', estimated_minutes: 30, display_order: 263 },
    { topic: 'Why do we forget?', description: 'Decay, interference, and the surprising benefits of forgetting.', category: 'mind', difficulty: 'beginner', estimated_minutes: 15, display_order: 264 },
    { topic: 'What is muscle memory?', description: 'How repeated practice makes movements automatic - procedural memory explained.', category: 'mind', difficulty: 'beginner', estimated_minutes: 15, display_order: 265 },
    { topic: 'What is semantic vs episodic memory?', description: 'Facts vs experiences - the different types of things we remember.', category: 'mind', difficulty: 'intermediate', estimated_minutes: 30, display_order: 266 },
    { topic: 'Can we enhance memory?', description: 'Memory palaces, spaced repetition, and evidence-based techniques.', category: 'mind', difficulty: 'beginner', estimated_minutes: 30, display_order: 267 },

    // Emotions & Psychology (new)
    { topic: 'What causes anxiety?', description: 'The brain\'s alarm system in overdrive - understanding and managing worry.', category: 'mind', difficulty: 'intermediate', estimated_minutes: 30, display_order: 270 },
    { topic: 'What is depression?', description: 'More than just sadness - the neuroscience and psychology of depressive disorders.', category: 'mind', difficulty: 'intermediate', estimated_minutes: 30, display_order: 271 },
    { topic: 'What is attachment theory?', description: 'How early relationships shape how we connect with others for life.', category: 'mind', difficulty: 'intermediate', estimated_minutes: 30, display_order: 272 },
    { topic: 'What is personality psychology?', description: 'The Big Five, MBTI, and the science of individual differences.', category: 'mind', difficulty: 'beginner', estimated_minutes: 30, display_order: 273 },
    { topic: 'What is trauma and how does it affect us?', description: 'When bad experiences leave lasting marks - and how healing happens.', category: 'mind', difficulty: 'intermediate', estimated_minutes: 30, display_order: 274 },
    { topic: 'What is motivation psychology?', description: 'Intrinsic vs extrinsic, needs hierarchies, and what drives us.', category: 'mind', difficulty: 'intermediate', estimated_minutes: 30, display_order: 275 },
    { topic: 'What is social psychology?', description: 'How others influence our thoughts, feelings, and behavior.', category: 'mind', difficulty: 'intermediate', estimated_minutes: 30, display_order: 276 },
    { topic: 'What is positive psychology?', description: 'The science of flourishing - moving beyond treating problems to building well-being.', category: 'mind', difficulty: 'beginner', estimated_minutes: 30, display_order: 277 },

    // More topics... (truncated for brevity - add the rest from the migration file)
  ]

  // Insert new topics
  let inserted = 0
  let skipped = 0

  for (const topic of newTopics) {
    // Check if topic already exists
    const { data: existing } = await supabase
      .from('showcase_topics')
      .select('id')
      .eq('topic', topic.topic)
      .single()

    if (existing) {
      skipped++
      continue
    }

    const { error } = await supabase
      .from('showcase_topics')
      .insert(topic)

    if (error) {
      console.log(`  ⚠️ Failed to insert "${topic.topic}": ${error.message}`)
    } else {
      inserted++
    }
  }

  // Get after count
  const { count: afterCount } = await supabase
    .from('showcase_topics')
    .select('*', { count: 'exact', head: true })

  console.log(`Inserted: ${inserted}, Skipped (existing): ${skipped}`)
  console.log(`Total topics now: ${afterCount}`)

  console.log('')
  console.log('✅ Migration complete!')
  console.log('')
  console.log('Next: Run course generation with:')
  console.log('  npx tsx scripts/generate-all-courses.ts --dry-run')
  console.log('  npx tsx scripts/generate-all-courses.ts')
}

main().catch(console.error)
