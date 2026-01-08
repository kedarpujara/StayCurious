import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getModel, getDefaultProvider } from '@/lib/ai/providers'
import { INSTANT_EXPLAIN_SYSTEM, getExplainPrompt } from '@/lib/ai/prompts'
import type { AIProvider } from '@/types'

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { question, provider } = await request.json() as {
      question: string
      provider?: AIProvider
    }

    if (!question || typeof question !== 'string') {
      return new Response('Question is required', { status: 400 })
    }

    const selectedProvider = provider || getDefaultProvider()
    const model = getModel(selectedProvider)

    // Stream the response
    const result = streamText({
      model,
      system: INSTANT_EXPLAIN_SYSTEM,
      prompt: getExplainPrompt(question),
    })

    // Log the question for karma tracking (fire and forget)
    ;(async () => {
      try {
        await supabase
          .from('curiosity_logs')
          .insert({
            user_id: user.id,
            question,
            ai_provider: selectedProvider,
            karma_earned: 1,
          })
        await supabase.rpc('update_user_karma', {
          p_user_id: user.id,
          p_karma_amount: 1,
        })
      } catch (e) {
        console.error('Failed to log karma:', e)
      }
    })()

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Explain API error:', error)
    return new Response('Failed to generate explanation', { status: 500 })
  }
}
