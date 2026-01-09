import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createClient } from '@supabase/supabase-js'
import { getModel, getDefaultProvider } from '@/lib/ai/providers'
import { BLUEPRINT_SYSTEM, getBlueprintPrompt, BLUEPRINT_QUIZ_SYSTEM, getBlueprintQuizPrompt } from '@/lib/ai/prompts'
import {
  validateBlueprint,
  canonicalizeBlueprint,
  formatValidationErrors,
  renderBlueprintToMarkdown,
} from '@/lib/blueprint'
import type { CourseDepth } from '@/types'

export const maxDuration = 60

// Use service role for creating catalog courses
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface GenerateRequest {
  topic: string
  depth: CourseDepth
  save?: boolean // Whether to save to course_catalog
}

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json()
    const { topic, depth, save = true } = body

    if (!topic || !depth) {
      return NextResponse.json({ error: 'Missing topic or depth' }, { status: 400 })
    }

    if (!['quick', 'solid', 'deep'].includes(depth)) {
      return NextResponse.json({ error: 'Invalid depth' }, { status: 400 })
    }

    const provider = getDefaultProvider()
    const model = getModel(provider)

    console.log(`Generating ${depth} blueprint for: ${topic}`)

    // Generate the blueprint
    const { text: rawResponse } = await generateText({
      model,
      system: BLUEPRINT_SYSTEM,
      prompt: getBlueprintPrompt(topic, depth),
      temperature: 0.7,
    })

    // Parse JSON from response
    let blueprint
    try {
      // Handle potential markdown code blocks
      let jsonText = rawResponse.trim()
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7)
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3)
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3)
      }
      jsonText = jsonText.trim()

      blueprint = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse JSON:', rawResponse.substring(0, 500))
      return NextResponse.json(
        {
          error: 'Failed to parse AI response as JSON',
          raw: rawResponse.substring(0, 1000),
        },
        { status: 500 }
      )
    }

    // Add generatedAt if missing
    if (!blueprint.generatedAt) {
      blueprint.generatedAt = new Date().toISOString()
    }

    // Validate the blueprint
    const validation = validateBlueprint(blueprint)
    if (!validation.success) {
      const errors = formatValidationErrors(validation.errors!)
      console.error('Validation failed:', errors)
      return NextResponse.json(
        {
          error: 'Blueprint validation failed',
          validationErrors: errors,
          blueprint, // Return the raw blueprint for debugging
        },
        { status: 400 }
      )
    }

    // Canonicalize
    const canonicalized = canonicalizeBlueprint(validation.data!)

    // Render to markdown for preview
    const markdown = renderBlueprintToMarkdown(canonicalized)

    // Optionally save to course_catalog
    let savedCourse = null
    if (save) {
      // Generate quiz questions
      const stepSummaries = canonicalized.steps.map(s => `${s.title}: ${s.keyIdea.definition}`)

      let quizQuestions = { questions: [] }
      try {
        const quizResult = await generateText({
          model,
          system: BLUEPRINT_QUIZ_SYSTEM,
          prompt: getBlueprintQuizPrompt(topic, stepSummaries),
        })

        let quizJson = quizResult.text.trim()
        if (quizJson.startsWith('```json')) quizJson = quizJson.slice(7)
        if (quizJson.startsWith('```')) quizJson = quizJson.slice(3)
        if (quizJson.endsWith('```')) quizJson = quizJson.slice(0, -3)
        quizQuestions = JSON.parse(quizJson.trim())
      } catch (quizError) {
        console.warn('Failed to generate quiz:', quizError)
      }

      // Create slug from topic
      const slug = topic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50)

      // Insert into course_catalog
      const { data: course, error: insertError } = await supabase
        .from('course_catalog')
        .insert({
          topic: canonicalized.topic,
          slug: `${slug}-${depth}-v2`,
          source: 'generated',
          creator_type: 'system',
          depth,
          content: canonicalized,
          quiz_questions: quizQuestions,
          description: `Learn about ${topic}`,
          category: 'general',
          difficulty: 'beginner',
          estimated_minutes: canonicalized.totalEstimatedMinutes,
          section_count: canonicalized.steps.length,
          schema_version: 2,
          is_vetted: false,
          is_featured: false,
          is_published: true,
          ai_provider: provider,
          generation_version: 2,
          trust_tier: 'unverified',
        })
        .select()
        .single()

      if (insertError) {
        console.error('Failed to save course:', insertError)
      } else {
        savedCourse = course
        console.log(`Course saved with ID: ${course.id}`)
      }
    }

    return NextResponse.json({
      success: true,
      blueprint: canonicalized,
      markdown,
      provider,
      ...(savedCourse && { courseId: savedCourse.id, slug: savedCourse.slug }),
    })
  } catch (error) {
    console.error('Blueprint generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint to test with query params
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const topic = searchParams.get('topic') || 'What is Stoicism?'
  const depth = (searchParams.get('depth') as CourseDepth) || 'solid'

  // Redirect to POST with body
  return POST(
    new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, depth }),
    })
  )
}
