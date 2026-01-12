import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getChatModel, getDefaultProvider } from '@/lib/ai/providers'
import { COURSE_CHAT_SYSTEM, getCourseChatPrompt } from '@/lib/ai/prompts'
import { toDisplayFormat } from '@/lib/blueprint'
import type { AIProvider } from '@/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const {
      courseId,
      question,
      currentSectionId,
      conversationHistory = [],
      provider
    } = await request.json() as {
      courseId: string
      question: string
      currentSectionId?: string
      conversationHistory?: ChatMessage[]
      provider?: AIProvider
    }

    if (!courseId || !question) {
      return new Response('Course ID and question are required', { status: 400 })
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

    // Build compact context: section titles for overview + current section content only
    const sectionTitles = content.sections?.map(s => s.title).join(', ') || ''

    let sectionContext: string
    if (currentSectionId) {
      const currentSection = content.sections?.find(s => s.id === currentSectionId)
      if (currentSection) {
        sectionContext = `Course sections: ${sectionTitles}\n\n**Current Section - ${currentSection.title}:**\n${currentSection.content}`
      } else {
        // Fallback: just use first section + summary, not ALL sections
        const firstSection = content.sections[0]
        sectionContext = `Course sections: ${sectionTitles}\n\n**${firstSection.title}:**\n${firstSection.content}`
      }
    } else {
      // No section specified: use first section only (not all), plus section overview
      const firstSection = content.sections[0]
      sectionContext = `Course sections: ${sectionTitles}\n\n**${firstSection.title}:**\n${firstSection.content}`
    }

    const selectedProvider = provider || getDefaultProvider()
    const model = getChatModel(selectedProvider)

    // Stream the response
    const result = streamText({
      model,
      system: COURSE_CHAT_SYSTEM,
      prompt: getCourseChatPrompt(
        course.topic,
        sectionContext,
        conversationHistory.slice(-6), // Keep last 6 messages for context
        question
      ),
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Course chat API error:', error)
    return new Response('Failed to generate response', { status: 500 })
  }
}
