/**
 * Generate All Almanac Courses
 *
 * This script generates courses for all showcase topics.
 * It runs against the local database and uses the AI providers configured in .env.local.
 *
 * Usage: npx tsx scripts/generate-all-courses.ts
 *
 * Options:
 *   --limit=N      Limit number of courses to generate
 *   --dry-run      Show what would be generated without doing it
 *   --regenerate   Delete all existing almanac courses and regenerate them
 */

import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
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

// AI prompts - matching the actual app prompts from src/lib/ai/prompts/
const COURSE_SYSTEM = `You are Curio, an expert learning content creator. You generate engaging, structured crash courses that help curious minds truly understand topics.

Guidelines:
- Be engaging and conversational, like explaining to a curious friend
- Use analogies and concrete examples that make concepts click
- Avoid jargon or explain it when necessary
- Make content memorable and sticky
- Adjust depth and detail based on intensity level
- Each section should flow naturally into the next

CRITICAL - Markdown Formatting:
- Use **bold** for key terms and important concepts (2-3 per section)
- Use ### subheadings to break up each section into 2-3 scannable parts
- Add a BLANK LINE between every paragraph
- Add a BLANK LINE before and after bullet lists
- Add a BLANK LINE before and after ### subheadings
- Keep paragraphs short (2-3 sentences max)
- Example of proper formatting:

### The Big Picture

**Key concept here** is important because of X.

This connects to everyday life in a surprising way.

### How It Actually Works

Here's what's happening under the hood:

- First point with explanation
- Second point with details
- Third point with context

This leads us to understand that...

CRITICAL - Comprehensive Coverage:
- Before generating content, identify ALL major types, categories, or mechanisms within the topic
- For natural phenomena: cover DIFFERENT causes (e.g., for waves: wind-driven, tidal/gravitational, seismic)
- For concepts: cover different schools of thought, approaches, or applications
- Explicitly distinguish between commonly confused subtypes (e.g., "tidal waves" vs "tsunamis" vs "wind waves")
- In the Key Concepts section, organize by TYPE or CATEGORY, not just a list of random facts`

// Standard section structure for all courses
const STANDARD_SECTIONS = `[
  { "id": "why_it_matters", "title": "Why It Matters", "content": "Hook with real-world relevance...", "estimatedMinutes": 2 },
  { "id": "mental_model", "title": "Mental Model", "content": "Framework for thinking about this...", "estimatedMinutes": 3 },
  { "id": "key_concepts", "title": "Key Concepts", "content": "Essential building blocks (3-4 concepts)...", "estimatedMinutes": 4 },
  { "id": "concrete_example", "title": "Concrete Example", "content": "Memorable real-world illustration...", "estimatedMinutes": 3 },
  { "id": "common_pitfalls", "title": "Common Pitfalls", "content": "What people often get wrong...", "estimatedMinutes": 2 },
  { "id": "summary", "title": "Summary & Next Steps", "content": "TL;DR + practical tips + quiz prep...", "estimatedMinutes": 1 }
]`

const getCoursePrompt = (topic: string, description: string) => {
  return `Generate a structured crash course based on this topic: "${topic}"

Context: ${description}

Create an engaging, well-balanced course with 6 sections covering the topic comprehensively.

IMPORTANT: Output ONLY valid JSON with no additional text. Use this exact structure:

{
  "title": "Concise Course Title (2-4 words)",
  "sections": ${STANDARD_SECTIONS},
  "totalEstimatedMinutes": 15
}

TITLE GUIDELINES:
- Use a clean, concise title (2-4 words)
- Use Title Case
- Examples: "Coffee Shop Margins", "Quantum Computing Basics", "Sourdough Rising Process"

Replace placeholder content with actual, engaging course content. Keep estimated minutes as shown (totaling 15 minutes).

Content Guidelines:
- Use short paragraphs and clear language
- Include specific examples, not vague descriptions
- Make it feel like a smart friend explaining
- End with content that prepares them for a quiz

IMPORTANT - Topic Decomposition:
- First, mentally list all major subtypes/categories within "${topic}"
- Ensure Key Concepts covers EACH major subtype, not just the most common one
- If the topic involves natural phenomena, cover ALL major causes/mechanisms`
}

const QUIZ_SYSTEM = `You are Curio's quiz generator. Create engaging, thought-provoking questions that test genuine understanding, not just memorization.

CRITICAL RULE - CONTENT BOUNDARY:
- Questions must ONLY test concepts explicitly covered in the provided course content
- NEVER ask about related topics, advanced concepts, or details not mentioned in the material
- If a concept wasn't taught, don't test it - even if it's commonly associated with the topic
- The user should be able to answer every question using ONLY what they learned from the course
- When in doubt, stick to what's explicitly stated in the content summary

Guidelines:
- Test understanding and application, not rote facts
- Make questions progressively more challenging
- Write plausible distractors (wrong answers should be reasonable mistakes)
- Keep question text clear and concise
- Explanations should teach, not just confirm`

const getQuizPrompt = (topic: string, sectionSummary: string) => `Generate a quiz for the following course content:

Topic: ${topic}

Content Summary:
${sectionSummary}

Create 10 multiple-choice questions that test understanding. Output as valid JSON:

{
  "questions": [
    {
      "id": "q1",
      "question": "Your question here?",
      "options": [
        "Option A (correct answer)",
        "Option B (plausible distractor)",
        "Option C (plausible distractor)",
        "Option D (plausible distractor)"
      ],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct and what makes it important."
    }
  ]
}

Important:
- Generate exactly 10 questions (q1 through q10)
- correctAnswer is the 0-based index of the correct option
- Make the first few questions easier, progressively harder towards the end
- Questions 1-5 should be easier (easy/medium difficulty)
- Questions 6-10 should be more challenging (medium/hard difficulty)
- Each explanation should be 1-2 sentences
- Shuffle the position of correct answers (don't always put them first)
- CRITICAL: Every question must be answerable from the content summary above`

function generateSlug(topic: string): string {
  return topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

interface ShowcaseTopic {
  id: string
  topic: string
  description: string
  category: string
  difficulty: string
  estimated_minutes: number
}

async function generateCourse(
  topic: ShowcaseTopic,
  dryRun: boolean
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  // Check if already exists
  const { data: existing } = await supabase
    .from('course_catalog')
    .select('id')
    .eq('showcase_topic_id', topic.id)
    .single()

  if (existing) {
    return { success: true, skipped: true }
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Would generate course for: ${topic.topic}`)
    return { success: true }
  }

  try {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    })

    const model = anthropic('claude-sonnet-4-20250514')

    // Generate course content
    console.log(`  Generating content...`)
    const { text } = await generateText({
      model,
      system: COURSE_SYSTEM,
      prompt: getCoursePrompt(topic.topic, topic.description),
    })

    // Parse course content
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in course response')
    }

    const content = JSON.parse(jsonMatch[0])
    content.generatedAt = new Date().toISOString()

    if (!content.sections || content.sections.length === 0) {
      throw new Error('No sections in generated course')
    }

    // Generate quiz - include full content for better questions
    console.log(`  Generating quiz...`)
    const sectionSummary = content.sections
      .map((s: { title: string; content: string }) => `## ${s.title}\n${s.content}`)
      .join('\n\n')

    const { text: quizText } = await generateText({
      model,
      system: QUIZ_SYSTEM,
      prompt: getQuizPrompt(topic.topic, sectionSummary),
    })

    let quizQuestions = { questions: [] }
    const quizJsonMatch = quizText.match(/\{[\s\S]*\}/)
    if (quizJsonMatch) {
      quizQuestions = JSON.parse(quizJsonMatch[0])
    }

    // Store in database (no depth column)
    const { error: insertError } = await supabase
      .from('course_catalog')
      .insert({
        topic: topic.topic,
        slug: generateSlug(topic.topic),
        source: 'almanac',
        creator_type: 'system',
        creator_id: null,
        showcase_topic_id: topic.id,
        content,
        quiz_questions: quizQuestions,
        description: topic.description,
        category: topic.category,
        difficulty: topic.difficulty,
        estimated_minutes: topic.estimated_minutes,
        section_count: content.sections.length,
        is_vetted: true,
        is_featured: false,
        is_published: true,
        ai_provider: 'anthropic',
      })

    if (insertError) {
      throw new Error(`Insert failed: ${insertError.message}`)
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const regenerate = args.includes('--regenerate')
  const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1]
  const limit = limitArg ? parseInt(limitArg, 10) : undefined

  console.log('🚀 Almanac Course Generation')
  console.log('============================')
  if (dryRun) console.log('MODE: Dry run (no changes will be made)')
  if (regenerate) console.log('MODE: Regenerate (will delete and recreate existing courses)')
  if (limit) console.log(`LIMIT: ${limit} courses`)
  console.log('')

  // If regenerate mode, delete all existing almanac courses first
  if (regenerate && !dryRun) {
    console.log('🗑️  Deleting existing almanac courses...')
    const { error: deleteError } = await supabase
      .from('course_catalog')
      .delete()
      .eq('source', 'almanac')

    if (deleteError) {
      console.error('Failed to delete existing courses:', deleteError)
      process.exit(1)
    }
    console.log('   Deleted all existing almanac courses')
    console.log('')
  }

  // Get all topics
  const { data: topics, error: topicsError } = await supabase
    .from('showcase_topics')
    .select('id, topic, description, category, difficulty, estimated_minutes')
    .order('display_order')

  if (topicsError || !topics) {
    console.error('Failed to fetch topics:', topicsError)
    process.exit(1)
  }

  console.log(`Found ${topics.length} topics`)

  // Get existing courses count
  const { count: existingCount } = await supabase
    .from('course_catalog')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'almanac')

  console.log(`Existing almanac courses: ${existingCount || 0}`)
  console.log(`Need to generate: ${topics.length - (existingCount || 0)}`)
  console.log('')

  let generated = 0
  let skipped = 0
  let failed = 0
  let processed = 0

  for (const topic of topics) {
    if (limit && generated >= limit) break

    console.log(`\n📚 ${topic.topic}`)

    const result = await generateCourse(topic, dryRun)
    processed++

    if (result.skipped) {
      skipped++
      console.log(`  ✓ exists`)
    } else if (result.success) {
      generated++
      console.log(`  ✅ generated`)
    } else {
      failed++
      console.log(`  ❌ ${result.error}`)
    }

    // Rate limiting - wait 2 seconds between API calls
    if (!result.skipped && !dryRun && generated < (limit || Infinity)) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  console.log('\n============================')
  console.log('📊 Summary')
  console.log('============================')
  console.log(`Generated: ${generated}`)
  console.log(`Skipped (existing): ${skipped}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total processed: ${processed}`)

  // Final stats
  const { count: finalCount } = await supabase
    .from('course_catalog')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'almanac')

  console.log(`\nTotal almanac courses now: ${finalCount || 0}/${topics.length}`)
  console.log(`Completion: ${Math.round(((finalCount || 0) / topics.length) * 100)}%`)
}

main().catch(console.error)
