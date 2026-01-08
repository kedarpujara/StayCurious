'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useLevelUp } from '@/contexts/LevelUpContext'
import type { KarmaAction, KarmaResult } from '@/types'

interface AddKarmaOptions {
  intensity?: string
  timeBudget?: number
  skipLevelUpToast?: boolean // Skip toast for quiz completion (handled by CelebrationModal)
}

interface UseKarmaReturn {
  karma: number
  title: string
  recentKarma: number
  isLoading: boolean
  addKarma: (action: KarmaAction, options?: AddKarmaOptions) => Promise<KarmaResult | null>
  isUpdating: boolean
}

export function useKarma(): UseKarmaReturn {
  const [recentKarma, setRecentKarma] = useState(0)
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { showLevelUp } = useLevelUp()

  // Fetch user karma data
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-karma'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('users')
        .select('karma_points, current_title')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data
    },
  })

  // Add karma mutation
  const { mutateAsync: addKarmaMutation, isPending: isUpdating } = useMutation({
    mutationFn: async ({ action, options }: { action: KarmaAction; options?: AddKarmaOptions }) => {
      const res = await fetch('/api/karma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          intensity: options?.intensity,
          timeBudget: options?.timeBudget,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to add karma')
      }

      return res.json() as Promise<KarmaResult>
    },
    onSuccess: (result) => {
      // Show recent karma gain
      setRecentKarma(result.karmaEarned)

      // Clear after animation
      setTimeout(() => setRecentKarma(0), 3000)

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['user-karma'] })
    },
  })

  const addKarma = useCallback(
    async (action: KarmaAction, options?: AddKarmaOptions) => {
      try {
        const result = await addKarmaMutation({ action, options })

        // Show level-up toast if title was upgraded (unless skipped for quiz celebration)
        if (result.titleUpgraded && result.newTitle && !options?.skipLevelUpToast) {
          showLevelUp(result.newTitle)
        }

        return result
      } catch (error) {
        console.error('Failed to add karma:', error)
        return null
      }
    },
    [addKarmaMutation, showLevelUp]
  )

  return {
    karma: userData?.karma_points ?? 0,
    title: userData?.current_title ?? 'Curious Newcomer',
    recentKarma,
    isLoading,
    addKarma,
    isUpdating,
  }
}
