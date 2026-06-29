import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getModel, getDefaultProvider } from '@/lib/ai/providers'
import { INSTANT_EXPLAIN_SYSTEM, getExplainPrompt } from '@/lib/ai/prompts'
import { isRecentTopic, searchWeb, formatSearchContext } from '@/lib/search'
import type { AIProvider } from '@/types'

interface ConversationMessage {
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

    const { question, provider, history = [] } = await request.json() as {
      question: string
      provider?: AIProvider
      history?: ConversationMessage[]
    }

    if (!question || typeof question !== 'string') {
      return new Response('Question is required', { status: 400 })
    }

    // Cap conversation history to prevent runaway token consumption
    const MAX_HISTORY_TURNS = 10
    const MAX_MESSAGE_CHARS = 2000
    const safeHistory = history
      .slice(-MAX_HISTORY_TURNS)
      .filter(
        (m) =>
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string'
      )
      .map((m) => ({
        role: m.role,
        content: m.content.slice(0, MAX_MESSAGE_CHARS),
      }))

    const selectedProvider = provider || getDefaultProvider()
    const model = getModel(selectedProvider)

    // Fetch web search context for recent/current event topics
    let searchContext: string | undefined
    if (isRecentTopic(question)) {
      const searchResponse = await searchWeb(question)
      if (searchResponse) {
        searchContext = formatSearchContext(searchResponse)
      }
    }

    const userPrompt = getExplainPrompt(question, searchContext)

    // Stream the response, with optional conversation history for follow-ups
    const result = streamText({
      model,
      system: INSTANT_EXPLAIN_SYSTEM,
      messages: [
        ...safeHistory.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user' as const, content: userPrompt },
      ],
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Explain API error:', error)
    return new Response('Failed to generate explanation', { status: 500 })
  }
}
