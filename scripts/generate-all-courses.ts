/**
 * Generate All Almanac Courses
 *
 * This script generates courses for all showcase topics.
 * It runs against the local database and uses the AI providers configured in .env.local.
 *
 * Usage: npx tsx scripts/generate-all-courses.ts
 *
 * Options:
 *   --limit=N     Limit number of courses to generate
 *   --dry-run     Show what would be generated without doing it
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

// AI prompts
const COURSE_SYSTEM = `You are an expert educator creating engaging, accessible course content.
Generate educational content that is:
- Clear and well-structured with 6-8 sections
- Engaging with real-world examples and analogies
- Appropriate for the topic's complexity
- Free of unnecessary jargon
- Around 15-20 minutes of reading time

Return JSON with this structure:
{
  "title": "string",
  "sections": [
    {
      "id": "section-1",
      "title": "Section Title",
      "content": "Detailed section content with examples... (2-3 paragraphs)"
    }
  ]
}`

const QUIZ_SYSTEM = `You are creating quiz questions to test understanding of educational content.
Generate questions that test real comprehension, not just memorization.

Return JSON with this structure:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Why the answer is correct"
    }
  ]
}`

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
      prompt: `Create a comprehensive course about: "${topic.topic}"

Context: ${topic.description}
Category: ${topic.category}
Difficulty: ${topic.difficulty}
Target duration: ${topic.estimated_minutes} minutes

Generate 6-8 sections with engaging, accessible content that explains the topic thoroughly.`,
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

    // Generate quiz
    console.log(`  Generating quiz...`)
    const sectionSummary = content.sections
      .map((s: { title: string; content: string }) => `${s.title}: ${s.content.substring(0, 300)}...`)
      .join('\n\n')

    const { text: quizText } = await generateText({
      model,
      system: QUIZ_SYSTEM,
      prompt: `Create 5 quiz questions testing understanding of this course about "${topic.topic}":

${sectionSummary}

Make questions that test comprehension, not just memorization.`,
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
  const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1]
  const limit = limitArg ? parseInt(limitArg, 10) : undefined

  console.log('🚀 Almanac Course Generation')
  console.log('============================')
  if (dryRun) console.log('MODE: Dry run (no changes will be made)')
  if (limit) console.log(`LIMIT: ${limit} courses`)
  console.log('')

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
