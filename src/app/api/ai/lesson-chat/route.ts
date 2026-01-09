import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getChatModel, getDefaultProvider } from '@/lib/ai/providers'
import { LESSON_CHAT_SYSTEM, getActionPrompt } from '@/lib/ai/prompts'
import { toDisplayFormat } from '@/lib/blueprint'
import type { AIProvider, CourseContent, LessonChatAction, StepKind } from '@/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Define step sequence for each section
const STEP_SEQUENCE: StepKind[] = ['intro', 'content', 'check', 'summary']

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const {
      courseId,
      action,
      sectionIndex,
      stepIndex,
      userMessage,
      conversationHistory = [],
      provider,
    } = (await request.json()) as {
      courseId: string
      action: LessonChatAction
      sectionIndex: number
      stepIndex: number
      userMessage?: string
      conversationHistory?: ChatMessage[]
      provider?: AIProvider
    }

    if (!courseId || !action) {
      return new Response('Course ID and action are required', { status: 400 })
    }

    // Fetch the course
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !course) {
      return new Response('Course not found', { status: 404 })
    }

    // Convert blueprint format to legacy format if needed
    const content = toDisplayFormat(course.content) as CourseContent
    const currentSection = content.sections?.[sectionIndex]

    if (!currentSection) {
      return new Response('Section not found', { status: 404 })
    }

    // Determine step kind based on step index
    const stepKind = STEP_SEQUENCE[stepIndex % STEP_SEQUENCE.length]
    const totalStepsInSection = STEP_SEQUENCE.length

    const selectedProvider = provider || getDefaultProvider()
    const model = getChatModel(selectedProvider)

    // Generate the prompt based on action
    const prompt = getActionPrompt(
      action,
      course.topic,
      currentSection.title,
      currentSection.content,
      stepKind,
      stepIndex,
      totalStepsInSection,
      conversationHistory.slice(-6),
      userMessage
    )

    // Stream the response
    const result = streamText({
      model,
      system: LESSON_CHAT_SYSTEM,
      prompt,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Lesson chat API error:', error)
    return new Response('Failed to generate response', { status: 500 })
  }
}
