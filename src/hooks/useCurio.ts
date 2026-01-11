'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLevelUp } from '@/contexts/LevelUpContext'
import type { CurioAction, CurioResult, Intensity, UserLeaderboardPosition } from '@/types'

interface AddCurioOptions {
  // For quiz_passed action
  intensity?: Intensity
  quizScore?: number
  attemptNumber?: number
  // UI options
  skipLevelUpToast?: boolean // Skip toast for quiz completion (handled by CelebrationModal)
}

interface CurioData {
  curio: number           // Display Curio (mCurio / 1000)
  mcurio: number          // Raw mCurio value
  title: string
  leaderboard: UserLeaderboardPosition | null
  curioClub?: {
    isEligible: boolean
    eligibleUntil: string | null
  }
}

interface UseCurioReturn {
  curio: number
  mcurio: number          // Raw mCurio for precise tracking
  title: string
  recentCurio: number
  leaderboardPosition: UserLeaderboardPosition | null
  curioClub: { isEligible: boolean; eligibleUntil: string | null } | null
  isLoading: boolean
  addCurio: (action: CurioAction, options?: AddCurioOptions) => Promise<CurioResult | null>
  isUpdating: boolean
  refetch: () => void
}

export function useCurio(): UseCurioReturn {
  const [recentCurio, setRecentCurio] = useState(0)
  const queryClient = useQueryClient()
  const { showLevelUp } = useLevelUp()

  // Fetch user curio data with leaderboard position
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['user-curio'],
    queryFn: async () => {
      const res = await fetch('/api/curio')
      if (!res.ok) {
        throw new Error('Failed to fetch curio')
      }
      return res.json() as Promise<CurioData>
    },
    staleTime: 60 * 1000, // 1 minute
  })

  // Add curio mutation
  const { mutateAsync: addCurioMutation, isPending: isUpdating } = useMutation({
    mutationFn: async ({ action, options }: { action: CurioAction; options?: AddCurioOptions }) => {
      const res = await fetch('/api/curio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          intensity: options?.intensity,
          quizScore: options?.quizScore,
          attemptNumber: options?.attemptNumber,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to add curio')
      }

      return res.json() as Promise<CurioResult>
    },
    onSuccess: (result) => {
      // Show recent curio gain
      setRecentCurio(result.curioEarned)

      // Clear after animation
      setTimeout(() => setRecentCurio(0), 3000)

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['user-curio'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
    },
  })

  const addCurio = useCallback(
    async (action: CurioAction, options?: AddCurioOptions) => {
      try {
        const result = await addCurioMutation({ action, options })

        // Show level-up toast if title was upgraded (unless skipped for quiz celebration)
        if (result.titleUpgraded && result.newTitle && !options?.skipLevelUpToast) {
          showLevelUp(result.newTitle)
        }

        return result
      } catch (error) {
        console.error('Failed to add curio:', error)
        return null
      }
    },
    [addCurioMutation, showLevelUp]
  )

  return {
    curio: data?.curio ?? 0,
    mcurio: data?.mcurio ?? 0,
    title: data?.title ?? 'Curious Newcomer',
    recentCurio,
    leaderboardPosition: data?.leaderboard ?? null,
    curioClub: data?.curioClub ?? null,
    isLoading,
    addCurio,
    isUpdating,
    refetch,
  }
}

// Legacy alias for backward compatibility
/** @deprecated Use useCurio instead */
export const useKarma = useCurio
