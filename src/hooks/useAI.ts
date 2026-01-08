'use client'

import { useState, useCallback } from 'react'
import type { AIProvider, CourseContent, Quiz } from '@/types'

interface UseAIExplainReturn {
  explain: (question: string, provider?: AIProvider) => Promise<void>
  response: string
  isLoading: boolean
  error: Error | null
  reset: () => void
}

export function useAIExplain(): UseAIExplainReturn {
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const explain = useCallback(async (question: string, provider?: AIProvider) => {
    setIsLoading(true)
    setError(null)
    setResponse('')

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, provider }),
      })

      if (!res.ok) {
        throw new Error('Failed to get explanation')
      }

      if (!res.body) {
        throw new Error('No response body')
      }

      // Handle streaming response
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        setResponse((prev) => prev + text)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResponse('')
    setError(null)
    setIsLoading(false)
  }, [])

  return { explain, response, isLoading, error, reset }
}

interface UseAICourseReturn {
  generateCourse: (
    topic: string,
    intensity: 'skim' | 'solid' | 'deep',
    timeBudget: number,
    provider?: AIProvider,
    backlogItemId?: string
  ) => Promise<{ courseId: string; content: CourseContent } | null>
  isLoading: boolean
  error: Error | null
}

export function useAICourse(): UseAICourseReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const generateCourse = useCallback(
    async (
      topic: string,
      intensity: 'skim' | 'solid' | 'deep',
      timeBudget: number,
      provider?: AIProvider,
      backlogItemId?: string
    ) => {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/ai/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, intensity, timeBudget, provider, backlogItemId }),
        })

        const data = await res.json()

        if (!res.ok) {
          console.error('[useAICourse] API error:', data.error || 'Unknown error')
          throw new Error(data.error || 'Failed to generate course')
        }

        return data
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        console.error('[useAICourse] Error:', error.message)
        setError(error)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return { generateCourse, isLoading, error }
}

interface UseAIQuizReturn {
  generateQuiz: (courseId: string) => Promise<Quiz | null>
  isLoading: boolean
  error: Error | null
}

export function useAIQuiz(): UseAIQuizReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const generateQuiz = useCallback(async (courseId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })

      if (!res.ok) {
        throw new Error('Failed to generate quiz')
      }

      const data = await res.json()
      return data
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { generateQuiz, isLoading, error }
}
