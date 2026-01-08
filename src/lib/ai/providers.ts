import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { AIProvider } from '@/types'

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export function getModel(provider: AIProvider = 'anthropic') {
  if (provider === 'openai') {
    return openai('gpt-4o')
  }
  return anthropic('claude-sonnet-4-20250514')
}

// Faster model for chat - optimized for quick, short responses
export function getChatModel(provider: AIProvider = 'anthropic') {
  if (provider === 'openai') {
    return openai('gpt-4o-mini')
  }
  return anthropic('claude-3-5-haiku-20241022')
}

export function getDefaultProvider(): AIProvider {
  // Check which API keys are available
  if (process.env.ANTHROPIC_API_KEY) {
    return 'anthropic'
  }
  if (process.env.OPENAI_API_KEY) {
    return 'openai'
  }
  throw new Error('No AI provider configured')
}
