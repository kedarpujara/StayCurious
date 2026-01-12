import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getModel, getDefaultProvider } from '@/lib/ai/providers'
import { QUIZ_SYSTEM, getQuizPrompt } from '@/lib/ai/prompts'
import { toDisplayFormat } from '@/lib/blueprint'
import type { Quiz } from '@/types'

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

    // Verify user has access via user_course_progress
    const { data: progress, error: progressError } = await supabase
      .from('user_course_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('catalog_course_id', courseId)
      .single()

    if (progressError || !progress) {
      return NextResponse.json(
        { error: 'Course not found or no access' },
        { status: 404 }
      )
    }

    // Fetch the course from course_catalog
    const { data: course, error: fetchError } = await supabase
      .from('course_catalog')
      .select('*')
      .eq('id', courseId)
      .single()

    if (fetchError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Check if quiz already exists
    if (course.quiz_questions?.questions?.length > 0) {
      return NextResponse.json(course.quiz_questions as Quiz)
    }

    // Generate quiz based on course content (convert from blueprint if needed)
    const content = toDisplayFormat(course.content)
    // Provide full section content so quiz questions are based on what was actually taught
    const sectionSummary = content.sections
      .slice(0, -1) // Exclude "Ready for Quiz" section
      .map(s => `## ${s.title}\n${s.content}`)
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

    // Save quiz to course_catalog
    const { error: updateError } = await supabase
      .from('course_catalog')
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
