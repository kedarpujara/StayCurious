'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types'

type BacklogItem = Tables<'backlog_items'>

interface UseBacklogReturn {
  items: BacklogItem[]
  isLoading: boolean
  error: Error | null
  addItem: (topic: string, source: 'instant_curiosity' | 'manual' | 'suggested', category?: string) => Promise<BacklogItem | null>
  updateItem: (id: string, updates: Partial<BacklogItem>) => Promise<void>
  removeItem: (id: string) => Promise<void>
  isAdding: boolean
  isUpdating: boolean
}

export function useBacklog(status?: BacklogItem['status']): UseBacklogReturn {
  const queryClient = useQueryClient()
  const supabase = createClient()

  // Fetch backlog items
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['backlog', status],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      let query = supabase
        .from('backlog_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error
      return data as BacklogItem[]
    },
  })

  // Add item mutation
  const { mutateAsync: addMutation, isPending: isAdding } = useMutation({
    mutationFn: async ({
      topic,
      source,
      category,
    }: {
      topic: string
      source: 'instant_curiosity' | 'manual' | 'suggested'
      category?: string
    }) => {
      const res = await fetch('/api/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, source, category }),
      })

      if (!res.ok) {
        throw new Error('Failed to add to backlog')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog'] })
    },
  })

  // Update item mutation
  const { mutateAsync: updateMutation, isPending: isUpdating } = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<BacklogItem>
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('backlog_items')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog'] })
    },
  })

  // Remove item mutation
  const { mutateAsync: removeMutation } = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('backlog_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog'] })
    },
  })

  const addItem = useCallback(
    async (
      topic: string,
      source: 'instant_curiosity' | 'manual' | 'suggested',
      category?: string
    ) => {
      try {
        const result = await addMutation({ topic, source, category })
        return result.item
      } catch (error) {
        console.error('Failed to add to backlog:', error)
        return null
      }
    },
    [addMutation]
  )

  const updateItem = useCallback(
    async (id: string, updates: Partial<BacklogItem>) => {
      await updateMutation({ id, updates })
    },
    [updateMutation]
  )

  const removeItem = useCallback(
    async (id: string) => {
      await removeMutation(id)
    },
    [removeMutation]
  )

  return {
    items,
    isLoading,
    error: error as Error | null,
    addItem,
    updateItem,
    removeItem,
    isAdding,
    isUpdating,
  }
}
