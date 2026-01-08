import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getModel, getDefaultProvider } from '@/lib/ai/providers'
import { COURSE_SYSTEM, getCoursePrompt, QUIZ_SYSTEM, getQuizPrompt } from '@/lib/ai/prompts'
import type { AIProvider, CourseContent, Quiz } from '@/types'

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { topic, intensity, timeBudget, provider, backlogItemId } = await request.json() as {
      topic: string
      intensity: 'skim' | 'solid' | 'deep'
      timeBudget: number
      provider?: AIProvider
      backlogItemId?: string
    }

    if (!topic || !intensity || !timeBudget) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const selectedProvider = provider || getDefaultProvider()
    const model = getModel(selectedProvider)

    console.log('[API/Course] Generating for:', { topic, intensity, timeBudget })

    // Generate course content
    const { text } = await generateText({
      model,
      system: COURSE_SYSTEM,
      prompt: getCoursePrompt(topic, intensity, timeBudget),
    })

    console.log('[API/Course] Raw AI response length:', text?.length)

    // Parse the JSON response
    let content: CourseContent
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('[API/Course] No JSON found in response. Raw text:', text?.substring(0, 500))
        throw new Error('No JSON found in response')
      }
      content = JSON.parse(jsonMatch[0])
      content.generatedAt = new Date().toISOString()

      console.log('[API/Course] Parsed content sections:', content.sections?.length || 0)

      // Validate that sections exist and are properly formatted
      if (!content.sections || !Array.isArray(content.sections) || content.sections.length === 0) {
        console.error('[API/Course] Invalid sections in parsed content:', JSON.stringify(content).substring(0, 500))
        return NextResponse.json(
          { error: 'Generated course has no sections. Please try again.' },
          { status: 500 }
        )
      }

      // Validate each section has required fields
      for (const section of content.sections) {
        if (!section.id || !section.title || !section.content) {
          console.error('[API/Course] Section missing required fields:', section)
          return NextResponse.json(
            { error: 'Generated course has malformed sections. Please try again.' },
            { status: 500 }
          )
        }
      }
    } catch (parseError) {
      console.error('[API/Course] Failed to parse course content:', parseError)
      console.error('[API/Course] Raw text that failed:', text?.substring(0, 1000))
      return NextResponse.json(
        { error: 'Failed to generate valid course content' },
        { status: 500 }
      )
    }

    // Generate quiz along with course content
    console.log('[API/Course] Generating quiz for topic:', topic)
    let quizQuestions: Quiz | null = null
    try {
      const sectionSummary = content.sections
        .map(s => `${s.title}: ${s.content.substring(0, 300)}...`)
        .join('\n\n')

      const { text: quizText } = await generateText({
        model,
        system: QUIZ_SYSTEM,
        prompt: getQuizPrompt(topic, sectionSummary),
      })

      const quizJsonMatch = quizText.match(/\{[\s\S]*\}/)
      if (quizJsonMatch) {
        quizQuestions = JSON.parse(quizJsonMatch[0])
        console.log('[API/Course] Quiz generated with', quizQuestions?.questions?.length || 0, 'questions')
      }
    } catch (quizError) {
      // Quiz generation is non-critical, log and continue
      console.error('[API/Course] Failed to generate quiz (non-critical):', quizError)
    }

    // Save course to database (with quiz if generated)
    const { data: course, error: insertError } = await supabase
      .from('courses')
      .insert({
        user_id: user.id,
        backlog_item_id: backlogItemId || null,
        topic,
        intensity,
        time_budget: timeBudget,
        ai_provider: selectedProvider,
        content,
        quiz_questions: quizQuestions,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to save course:', insertError)
      return NextResponse.json(
        { error: 'Failed to save course' },
        { status: 500 }
      )
    }

    // If there's a backlog item, update its status
    if (backlogItemId) {
      await supabase
        .from('backlog_items')
        .update({
          status: 'in_progress',
          course_id: course.id,
          started_at: new Date().toISOString(),
        })
        .eq('id', backlogItemId)
        .eq('user_id', user.id)
    }

    // Create initial learning progress record
    await supabase
      .from('learning_progress')
      .insert({
        user_id: user.id,
        course_id: course.id,
        current_section: content.sections[0]?.id || null,
      })

    return NextResponse.json({
      courseId: course.id,
      content,
    })
  } catch (error) {
    console.error('Course generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate course' },
      { status: 500 }
    )
  }
}
