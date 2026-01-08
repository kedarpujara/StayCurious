import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CourseContent, Quiz } from '@/types'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Get today's daily curio with topic info
    const { data: dailyCourse, error: courseError } = await supabase
      .from('daily_courses')
      .select(
        `
        id,
        content,
        quiz_questions,
        daily_topic_id,
        daily_topics (
          id,
          topic,
          description,
          category
        )
      `
      )
      .eq('date', today)
      .single()

    if (courseError || !dailyCourse) {
      return NextResponse.json(
        { error: 'No daily curio available today', available: false },
        { status: 404 }
      )
    }

    // Check user's completion status
    const { data: completion } = await supabase
      .from('daily_completions')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    // Transform the response
    const response = {
      dailyCourse: {
        id: dailyCourse.id,
        content: dailyCourse.content as CourseContent,
        quiz_questions: dailyCourse.quiz_questions as Quiz,
        daily_topic: dailyCourse.daily_topics,
      },
      completion: completion || null,
      hasCompleted: !!completion?.completed_at,
      hasStarted: !!completion,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API/Daily] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get daily curio' },
      { status: 500 }
    )
  }
}
