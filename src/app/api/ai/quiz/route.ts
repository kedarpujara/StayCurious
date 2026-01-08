import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getModel, getDefaultProvider } from '@/lib/ai/providers'
import { QUIZ_SYSTEM, getQuizPrompt } from '@/lib/ai/prompts'
import type { Quiz, CourseContent } from '@/types'

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId } = await request.json() as { courseId: string }

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Fetch the course
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Check if quiz already exists
    if (course.quiz_questions) {
      return NextResponse.json(course.quiz_questions as Quiz)
    }

    // Generate quiz based on course content
    const content = course.content as CourseContent
    const sectionSummary = content.sections
      .slice(0, -1) // Exclude "Ready for Quiz" section
      .map(s => `${s.title}: ${s.content.substring(0, 300)}...`)
      .join('\n\n')

    const model = getModel(getDefaultProvider())

    const { text } = await generateText({
      model,
      system: QUIZ_SYSTEM,
      prompt: getQuizPrompt(course.topic, sectionSummary),
    })

    // Parse the JSON response
    let quiz: Quiz
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      quiz = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse quiz:', parseError)
      return NextResponse.json(
        { error: 'Failed to generate valid quiz' },
        { status: 500 }
      )
    }

    // Save quiz to course
    const { error: updateError } = await supabase
      .from('courses')
      .update({ quiz_questions: quiz })
      .eq('id', courseId)

    if (updateError) {
      console.error('Failed to save quiz:', updateError)
    }

    return NextResponse.json(quiz)
  } catch (error) {
    console.error('Quiz generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    )
  }
}
