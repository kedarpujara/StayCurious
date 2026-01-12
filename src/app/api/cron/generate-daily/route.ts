import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModel, getDefaultProvider } from '@/lib/ai/providers'
import {
  DAILY_TOPIC_SYSTEM,
  getDailyTopicPrompt,
  COURSE_SYSTEM,
  getCoursePrompt,
  QUIZ_SYSTEM,
  getQuizPrompt,
} from '@/lib/ai/prompts'
import type { CourseContent, Quiz, DailyCategory } from '@/types'

// Create a service role client without cookies for cron jobs
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // In development, allow without secret
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const supabase = createServiceClient()
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // Check if today's topic already exists
    const { data: existingTopic } = await supabase
      .from('daily_topics')
      .select('id')
      .eq('date', today)
      .single()

    if (existingTopic) {
      return NextResponse.json({
        message: 'Daily topic already exists',
        date: today,
      })
    }

    const provider = getDefaultProvider()
    const model = getModel(provider)

    // Get recent topics to avoid repetition
    const { data: recentTopics } = await supabase
      .from('daily_topics')
      .select('topic')
      .order('date', { ascending: false })
      .limit(14)

    const recentTopicsList = recentTopics?.map((t) => t.topic) || []

    console.log('[Cron/Daily] Generating topic for:', today)

    // Step 1: Generate interesting topic
    const { text: topicText } = await generateText({
      model,
      system: DAILY_TOPIC_SYSTEM,
      prompt: getDailyTopicPrompt(recentTopicsList),
    })

    console.log('[Cron/Daily] Topic response:', topicText?.substring(0, 200))

    // Parse topic JSON
    const jsonMatch = topicText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in topic response')
    }

    const topicData = JSON.parse(jsonMatch[0]) as {
      topic: string
      description: string
      category: DailyCategory
    }

    console.log('[Cron/Daily] Generated topic:', topicData.topic)

    // Step 2: Insert topic
    const { data: topic, error: topicError } = await supabase
      .from('daily_topics')
      .insert({
        date: today,
        topic: topicData.topic,
        description: topicData.description,
        category: topicData.category,
        ai_provider: provider,
      })
      .select()
      .single()

    if (topicError) {
      throw new Error(`Failed to insert topic: ${topicError.message}`)
    }

    console.log('[Cron/Daily] Generating course...')

    // Step 3: Generate course content
    const { text: courseText } = await generateText({
      model,
      system: COURSE_SYSTEM,
      prompt: getCoursePrompt(topicData.topic),
    })

    // Parse course content
    const courseMatch = courseText.match(/\{[\s\S]*\}/)
    if (!courseMatch) {
      throw new Error('No JSON found in course response')
    }

    const content: CourseContent = JSON.parse(courseMatch[0])
    content.generatedAt = new Date().toISOString()

    // Validate course structure
    if (!content.sections || content.sections.length === 0) {
      throw new Error('Course has no sections')
    }

    console.log('[Cron/Daily] Course sections:', content.sections.length)

    // Step 4: Generate quiz
    const sectionSummary = content.sections
      .map((s) => `${s.title}: ${s.content.substring(0, 300)}...`)
      .join('\n\n')

    const { text: quizText } = await generateText({
      model,
      system: QUIZ_SYSTEM,
      prompt: getQuizPrompt(topicData.topic, sectionSummary),
    })

    // Parse quiz
    const quizMatch = quizText.match(/\{[\s\S]*\}/)
    if (!quizMatch) {
      throw new Error('No JSON found in quiz response')
    }

    const quiz: Quiz = JSON.parse(quizMatch[0])

    // Validate quiz
    if (!quiz.questions || quiz.questions.length !== 5) {
      throw new Error('Quiz does not have 5 questions')
    }

    console.log('[Cron/Daily] Quiz questions:', quiz.questions.length)

    // Step 5: Insert daily course
    const { error: courseError } = await supabase.from('daily_courses').insert({
      daily_topic_id: topic.id,
      date: today,
      content,
      quiz_questions: quiz,
      intensity: 'skim',
      time_budget: 5,
    })

    if (courseError) {
      throw new Error(`Failed to insert course: ${courseError.message}`)
    }

    console.log('[Cron/Daily] Successfully generated daily curio for:', today)

    return NextResponse.json({
      success: true,
      date: today,
      topic: topicData.topic,
      description: topicData.description,
      category: topicData.category,
      sectionsCount: content.sections.length,
      questionsCount: quiz.questions.length,
    })
  } catch (error) {
    console.error('[Cron/Daily] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate daily curio',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
