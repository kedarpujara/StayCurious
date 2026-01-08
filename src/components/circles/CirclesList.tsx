'use client'

import { CircleCard } from './CircleCard'
import { Card } from '@/components/ui/Card'
import type { CurioCircle } from '@/types'
import { Users } from 'lucide-react'

interface CircleWithRole extends CurioCircle {
  role: 'owner' | 'admin' | 'member'
}

interface CirclesListProps {
  circles: CircleWithRole[]
  isLoading?: boolean
  emptyMessage?: string
}

export function CirclesList({
  circles,
  isLoading = false,
  emptyMessage = "You haven't joined any circles yet. Create one or join with an invite code!"
}: CirclesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} padding="md">
            <div className="animate-pulse flex items-start gap-4">
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (circles.length === 0) {
    return (
      <Card padding="lg">
        <div className="text-center py-8">
          <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">
            {emptyMessage}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {circles.map(circle => (
        <CircleCard key={circle.id} circle={circle} />
      ))}
    </div>
  )
}
