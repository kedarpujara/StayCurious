import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModel } from '@/lib/ai/providers'
import { COURSE_SYSTEM, getCoursePrompt, QUIZ_SYSTEM, getQuizPrompt } from '@/lib/ai/prompts'
import type { CourseContent, Quiz, CourseDepth } from '@/types'
import { DEPTH_CONFIG } from '@/types'

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)


// Generate URL-friendly slug
function generateSlug(topic: string, depth: string): string {
  return `${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${depth}`
}

interface GenerationResult {
  topicId: string
  topic: string
  depth: CourseDepth
  success: boolean
  error?: string
}

async function generateCourseForTopic(
  topicId: string,
  topicName: string,
  topicCategory: string,
  topicDifficulty: string,
  topicDescription: string,
  depth: CourseDepth
): Promise<GenerationResult> {
  const config = DEPTH_CONFIG[depth]

  try {
    // Check if already exists in course_catalog
    const { data: existing } = await supabase
      .from('course_catalog')
      .select('id')
      .eq('showcase_topic_id', topicId)
      .eq('depth', depth)
      .single()

    if (existing) {
      return {
        topicId,
        topic: topicName,
        depth,
        success: true,
        error: 'Already exists'
      }
    }

    const model = getModel('anthropic')

    // Generate course content
    const { text } = await generateText({
      model,
      system: COURSE_SYSTEM,
      prompt: getCoursePrompt(topicName),
    })

    // Parse course content
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in course response')
    }

    const content: CourseContent = JSON.parse(jsonMatch[0])
    content.generatedAt = new Date().toISOString()

    if (!content.sections || content.sections.length === 0) {
      throw new Error('No sections in generated course')
    }

    // Generate quiz
    const sectionSummary = content.sections
      .map(s => `${s.title}: ${s.content.substring(0, 300)}...`)
      .join('\n\n')

    const { text: quizText } = await generateText({
      model,
      system: QUIZ_SYSTEM,
      prompt: getQuizPrompt(topicName, sectionSummary),
    })

    let quizQuestions: Quiz = { questions: [] }
    const quizJsonMatch = quizText.match(/\{[\s\S]*\}/)
    if (quizJsonMatch) {
      quizQuestions = JSON.parse(quizJsonMatch[0])
    }

    // Store in unified course_catalog table
    const { error: insertError } = await supabase
      .from('course_catalog')
      .insert({
        topic: topicName,
        slug: generateSlug(topicName, depth),
        source: 'almanac',
        creator_type: 'system',
        creator_id: null, // StayCurious system
        showcase_topic_id: topicId,
        depth,
        content,
        quiz_questions: quizQuestions,
        description: topicDescription,
        category: topicCategory,
        difficulty: topicDifficulty as 'beginner' | 'intermediate' | 'advanced',
        estimated_minutes: config.minutes,
        section_count: content.sections.length,
        is_vetted: true, // Almanac courses are vetted by default
        is_featured: false,
        is_published: true,
        ai_provider: 'anthropic',
      })

    if (insertError) {
      throw new Error(`Insert failed: ${insertError.message}`)
    }

    return {
      topicId,
      topic: topicName,
      depth,
      success: true
    }
  } catch (error) {
    return {
      topicId,
      topic: topicName,
      depth,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function POST(request: Request) {
  try {
    // Optional: Add API key protection for cron jobs
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      topicId,      // Optional: generate for specific topic
      depth,        // Optional: generate for specific depth
      limit = 5,    // How many topics to process per call (for rate limiting)
      skipExisting = true
    } = body as {
      topicId?: string
      depth?: CourseDepth
      limit?: number
      skipExisting?: boolean
    }

    // Get topics to process with full details
    let query = supabase
      .from('showcase_topics')
      .select('id, topic, category, difficulty, description')
      .order('display_order')

    if (topicId) {
      query = query.eq('id', topicId)
    }

    const { data: topics, error: topicsError } = await query.limit(limit * 3) // Get more to account for skips

    if (topicsError || !topics) {
      return NextResponse.json(
        { error: 'Failed to fetch topics' },
        { status: 500 }
      )
    }

    const depths: CourseDepth[] = depth ? [depth] : ['quick', 'solid', 'deep']
    const results: GenerationResult[] = []
    let processed = 0

    // Process topics
    for (const topic of topics) {
      if (processed >= limit) break

      for (const d of depths) {
        if (processed >= limit) break

        // Check if should skip
        if (skipExisting) {
          const { data: existing } = await supabase
            .from('course_catalog')
            .select('id')
            .eq('showcase_topic_id', topic.id)
            .eq('depth', d)
            .single()

          if (existing) {
            results.push({
              topicId: topic.id,
              topic: topic.topic,
              depth: d,
              success: true,
              error: 'Skipped (already exists)'
            })
            continue
          }
        }

        console.log(`[Almanac Gen] Generating ${d} course for: ${topic.topic}`)
        const result = await generateCourseForTopic(
          topic.id,
          topic.topic,
          topic.category,
          topic.difficulty,
          topic.description,
          d
        )
        results.push(result)
        processed++

        // Add delay between generations to avoid rate limits
        if (processed < limit) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }

    // Get stats from course_catalog (almanac source only)
    const { count: totalCourses } = await supabase
      .from('course_catalog')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'almanac')

    const { count: totalTopics } = await supabase
      .from('showcase_topics')
      .select('*', { count: 'exact', head: true })

    const totalPossible = (totalTopics || 0) * 3 // 3 depths per topic

    return NextResponse.json({
      processed: results.length,
      successful: results.filter(r => r.success && !r.error?.includes('Skipped')).length,
      skipped: results.filter(r => r.error?.includes('Skipped') || r.error?.includes('Already')).length,
      failed: results.filter(r => !r.success).length,
      results,
      stats: {
        totalCourses: totalCourses || 0,
        totalTopics: totalTopics || 0,
        totalPossible,
        completion: totalPossible > 0 ? Math.round(((totalCourses || 0) / totalPossible) * 100) : 0
      }
    })
  } catch (error) {
    console.error('[Almanac Gen] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate courses' },
      { status: 500 }
    )
  }
}

// GET endpoint to check generation status
export async function GET() {
  try {
    // Get almanac courses by depth from course_catalog
    const { data: courses } = await supabase
      .from('course_catalog')
      .select('depth')
      .eq('source', 'almanac')

    const { count: totalTopics } = await supabase
      .from('showcase_topics')
      .select('*', { count: 'exact', head: true })

    // Get total courses from all sources
    const { count: allCourses } = await supabase
      .from('course_catalog')
      .select('*', { count: 'exact', head: true })

    const byDepth = {
      quick: courses?.filter(c => c.depth === 'quick').length || 0,
      solid: courses?.filter(c => c.depth === 'solid').length || 0,
      deep: courses?.filter(c => c.depth === 'deep').length || 0
    }

    const totalPossible = (totalTopics || 0) * 3

    return NextResponse.json({
      totalTopics: totalTopics || 0,
      almanacCourses: courses?.length || 0,
      totalCatalogCourses: allCourses || 0,
      totalPossible,
      byDepth,
      completion: {
        quick: totalTopics ? Math.round((byDepth.quick / totalTopics) * 100) : 0,
        solid: totalTopics ? Math.round((byDepth.solid / totalTopics) * 100) : 0,
        deep: totalTopics ? Math.round((byDepth.deep / totalTopics) * 100) : 0,
        overall: totalPossible > 0 ? Math.round(((courses?.length || 0) / totalPossible) * 100) : 0
      }
    })
  } catch (error) {
    console.error('[Almanac Gen] Status error:', error)
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}
