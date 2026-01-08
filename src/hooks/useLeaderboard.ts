'use client'

import { useQuery } from '@tanstack/react-query'
import type { LeaderboardEntry, UserLeaderboardPosition } from '@/types'

interface LeaderboardData {
  entries: LeaderboardEntry[]
  userPosition: UserLeaderboardPosition | null
  month: number
  year: number
}

interface UseLeaderboardOptions {
  limit?: number
  year?: number
  month?: number
}

interface UseLeaderboardReturn {
  entries: LeaderboardEntry[]
  userPosition: UserLeaderboardPosition | null
  month: number
  year: number
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useLeaderboard(options: UseLeaderboardOptions = {}): UseLeaderboardReturn {
  const { limit = 100, year, month } = options

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leaderboard', { limit, year, month }],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('limit', limit.toString())
      if (year) params.set('year', year.toString())
      if (month) params.set('month', month.toString())

      const res = await fetch(`/api/leaderboard?${params.toString()}`)
      if (!res.ok) {
        throw new Error('Failed to fetch leaderboard')
      }
      return res.json() as Promise<LeaderboardData>
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  return {
    entries: data?.entries ?? [],
    userPosition: data?.userPosition ?? null,
    month: data?.month ?? new Date().getMonth() + 1,
    year: data?.year ?? new Date().getFullYear(),
    isLoading,
    error: error as Error | null,
    refetch,
  }
}

/**
 * Hook to get just the user's leaderboard position
 * Lighter weight than full leaderboard
 */
export function useLeaderboardPosition(): {
  position: UserLeaderboardPosition | null
  isLoading: boolean
} {
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard-position'],
    queryFn: async () => {
      const res = await fetch('/api/curio')
      if (!res.ok) {
        throw new Error('Failed to fetch position')
      }
      const data = await res.json()
      return data.leaderboard as UserLeaderboardPosition | null
    },
    staleTime: 60 * 1000, // 1 minute
  })

  return {
    position: data ?? null,
    isLoading,
  }
}
