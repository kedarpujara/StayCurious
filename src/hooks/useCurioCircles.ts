'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CurioCircle, CircleLeaderboardEntry } from '@/types'

interface CircleWithRole extends CurioCircle {
  role: 'owner' | 'admin' | 'member'
}

interface UseCurioCirclesReturn {
  circles: CircleWithRole[]
  isLoading: boolean
  error: Error | null
  createCircle: (name: string, description?: string) => Promise<CurioCircle | null>
  joinCircle: (inviteCode: string) => Promise<{ circle: CurioCircle; message: string } | null>
  leaveCircle: (circleId: string) => Promise<boolean>
  isCreating: boolean
  isJoining: boolean
  isLeaving: boolean
  refetch: () => void
}

export function useCurioCircles(): UseCurioCirclesReturn {
  const queryClient = useQueryClient()

  // Fetch user's circles
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['curio-circles'],
    queryFn: async () => {
      const res = await fetch('/api/circles')
      if (!res.ok) {
        throw new Error('Failed to fetch circles')
      }
      const data = await res.json()
      return data.circles as CircleWithRole[]
    },
    staleTime: 60 * 1000, // 1 minute
  })

  // Create circle mutation
  const { mutateAsync: createMutation, isPending: isCreating } = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const res = await fetch('/api/circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create circle')
      }

      const data = await res.json()
      return data.circle as CurioCircle
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curio-circles'] })
    },
  })

  // Join circle mutation
  const { mutateAsync: joinMutation, isPending: isJoining } = useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await fetch('/api/circles/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to join circle')
      }

      return res.json() as Promise<{ circle: CurioCircle; message: string }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curio-circles'] })
    },
  })

  // Leave/delete circle mutation
  const { mutateAsync: leaveMutation, isPending: isLeaving } = useMutation({
    mutationFn: async (circleId: string) => {
      const res = await fetch(`/api/circles/${circleId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to leave circle')
      }

      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curio-circles'] })
    },
  })

  const createCircle = async (name: string, description?: string) => {
    try {
      return await createMutation({ name, description })
    } catch (error) {
      console.error('Create circle error:', error)
      return null
    }
  }

  const joinCircle = async (inviteCode: string) => {
    try {
      return await joinMutation(inviteCode)
    } catch (error) {
      console.error('Join circle error:', error)
      return null
    }
  }

  const leaveCircle = async (circleId: string) => {
    try {
      return await leaveMutation(circleId)
    } catch (error) {
      console.error('Leave circle error:', error)
      return false
    }
  }

  return {
    circles: data ?? [],
    isLoading,
    error: error as Error | null,
    createCircle,
    joinCircle,
    leaveCircle,
    isCreating,
    isJoining,
    isLeaving,
    refetch,
  }
}

/**
 * Hook for a single circle's details and leaderboard
 */
export function useCurioCircle(circleId: string): {
  circle: CurioCircle | null
  userRole: 'owner' | 'admin' | 'member' | null
  leaderboard: CircleLeaderboardEntry[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
} {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['curio-circle', circleId],
    queryFn: async () => {
      const res = await fetch(`/api/circles/${circleId}`)
      if (!res.ok) {
        throw new Error('Failed to fetch circle')
      }
      return res.json() as Promise<{
        circle: CurioCircle
        userRole: 'owner' | 'admin' | 'member'
        leaderboard: CircleLeaderboardEntry[]
      }>
    },
    enabled: !!circleId,
    staleTime: 60 * 1000, // 1 minute
  })

  return {
    circle: data?.circle ?? null,
    userRole: data?.userRole ?? null,
    leaderboard: data?.leaderboard ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  }
}
