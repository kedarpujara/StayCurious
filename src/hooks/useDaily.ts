'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  DailyStatus,
  DailyCurioData,
  DailyQuizResult,
} from '@/types'

interface UseDailyReturn {
  status: DailyStatus | null
  daily: DailyCurioData | null
  isLoading: boolean
  startDaily: () => Promise<void>
  isStarting: boolean
  submitQuiz: (args: {
    dailyCourseId: string
    answers: number[]
  }) => Promise<DailyQuizResult | null>
  isSubmitting: boolean
  shouldShowModal: boolean
  refetch: () => void
}

export function useDaily(): UseDailyReturn {
  const queryClient = useQueryClient()

  // Fetch status (lightweight check)
  const {
    data: status,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useQuery<DailyStatus>({
    queryKey: ['daily-status'],
    queryFn: async () => {
      const res = await fetch('/api/daily/status')
      if (!res.ok) throw new Error('Failed to fetch status')
      return res.json()
    },
    staleTime: 60 * 1000, // Cache for 1 minute
  })

  // Fetch full daily curio (only when needed)
  const {
    data: daily,
    isLoading: dailyLoading,
    refetch: refetchDaily,
  } = useQuery<DailyCurioData>({
    queryKey: ['daily-curio'],
    queryFn: async () => {
      const res = await fetch('/api/daily')
      if (!res.ok) {
        if (res.status === 404) return null
        throw new Error('Failed to fetch daily')
      }
      return res.json()
    },
    enabled: status?.available === true,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Start daily mutation
  const { mutateAsync: startDailyMutation, isPending: isStarting } =
    useMutation({
      mutationFn: async () => {
        const res = await fetch('/api/daily/start', { method: 'POST' })
        if (!res.ok) throw new Error('Failed to start')
        return res.json()
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['daily-status'] })
        queryClient.invalidateQueries({ queryKey: ['daily-curio'] })
      },
    })

  // Submit quiz mutation
  const { mutateAsync: submitQuizMutation, isPending: isSubmitting } =
    useMutation({
      mutationFn: async ({
        dailyCourseId,
        answers,
      }: {
        dailyCourseId: string
        answers: number[]
      }): Promise<DailyQuizResult> => {
        const res = await fetch('/api/daily/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dailyCourseId, answers }),
        })
        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Failed to submit')
        }
        return res.json()
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['daily-status'] })
        queryClient.invalidateQueries({ queryKey: ['daily-curio'] })
        queryClient.invalidateQueries({ queryKey: ['user-karma'] })
      },
    })

  const startDaily = async () => {
    try {
      await startDailyMutation()
    } catch (error) {
      console.error('Failed to start daily:', error)
    }
  }

  const submitQuiz = async (args: {
    dailyCourseId: string
    answers: number[]
  }): Promise<DailyQuizResult | null> => {
    try {
      return await submitQuizMutation(args)
    } catch (error) {
      console.error('Failed to submit quiz:', error)
      return null
    }
  }

  const refetch = () => {
    refetchStatus()
    refetchDaily()
  }

  // Determine if modal should show
  const shouldShowModal =
    status?.available === true && status?.hasCompleted === false

  return {
    status: status ?? null,
    daily: daily ?? null,
    isLoading: statusLoading || dailyLoading,
    startDaily,
    isStarting,
    submitQuiz,
    isSubmitting,
    shouldShowModal,
    refetch,
  }
}
