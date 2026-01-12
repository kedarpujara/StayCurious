import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getChatModel, getDefaultProvider } from '@/lib/ai/providers'
import { LESSON_CHAT_SYSTEM, getClarificationPrompt } from '@/lib/ai/prompts'
import { toDisplayFormat, normalizeContentMarkdown } from '@/lib/blueprint'
import type { AIProvider, LessonChatAction } from '@/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

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
      userMessage,
      conversationHistory = [],
      provider,
    } = (await request.json()) as {
      courseId: string
      action: LessonChatAction
      sectionIndex: number
      userMessage?: string
      conversationHistory?: ChatMessage[]
      provider?: AIProvider
    }

    if (!courseId || !action) {
      return new Response('Course ID and action are required', { status: 400 })
    }

    // Verify user has access via user_course_progress
    const { data: progress, error: progressError } = await supabase
      .from('user_course_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('catalog_course_id', courseId)
      .single()

    if (progressError || !progress) {
      return new Response('Course not found or no access', { status: 404 })
    }

    // Fetch the course from course_catalog
    const { data: course, error: fetchError } = await supabase
      .from('course_catalog')
      .select('*')
      .eq('id', courseId)
      .single()

    if (fetchError || !course) {
      return new Response('Course not found', { status: 404 })
    }

    // Convert blueprint format to legacy format if needed
    const content = toDisplayFormat(course.content)
    const currentSection = content.sections?.[sectionIndex]

    if (!currentSection) {
      return new Response('Section not found', { status: 404 })
    }

    // For 'start' - return the first section content directly (intro is shown on course page)
    if (action === 'start') {
      const normalizedContent = normalizeContentMarkdown(currentSection.content)
      return new Response(normalizedContent, {
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // For 'next' - return stored section content directly (no AI generation)
    if (action === 'next') {
      const normalizedContent = normalizeContentMarkdown(currentSection.content)
      return new Response(normalizedContent, {
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // For 'example' - return pre-stored example if available
    if (action === 'example') {
      if (currentSection.example) {
        return new Response(currentSection.example, {
          headers: { 'Content-Type': 'text/plain' },
        })
      } else {
        // No pre-stored example, generate one (fallback for legacy content)
        const selectedProvider = provider || getDefaultProvider()
        const model = getChatModel(selectedProvider)

        const prompt = `Course Topic: ${course.topic}
Current Section: ${currentSection.title}

## Section Content:
${currentSection.content}

## Your Task
Provide a **concrete, memorable example** that illustrates the concepts in "${currentSection.title}".

Guidelines:
- Make it relatable to everyday life when possible
- Be specific - names, numbers, scenarios
- Walk through the example step by step
- Use **bold** for the key concept being demonstrated
- End with how this example connects back to the main idea

Use markdown formatting with proper paragraph breaks.`

        const result = streamText({
          model,
          system: LESSON_CHAT_SYSTEM,
          prompt,
        })

        return result.toTextStreamResponse()
      }
    }

    // For 'clarify' - use AI to answer follow-up questions
    if (action === 'clarify') {
      const selectedProvider = provider || getDefaultProvider()
      const model = getChatModel(selectedProvider)

      const prompt = getClarificationPrompt(
        course.topic,
        currentSection.title,
        currentSection.content,
        conversationHistory.slice(-6),
        userMessage || 'Can you explain this differently?'
      )

      const result = streamText({
        model,
        system: LESSON_CHAT_SYSTEM,
        prompt,
      })

      return result.toTextStreamResponse()
    }

    return new Response('Invalid action', { status: 400 })
  } catch (error) {
    console.error('Lesson chat API error:', error)
    return new Response('Failed to generate response', { status: 500 })
  }
}
