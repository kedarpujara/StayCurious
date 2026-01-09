'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui'
import type { AlmanacTopic } from '@/types'

interface TopicCardProps {
  topic: AlmanacTopic
  onAddToBacklog: (topic: string, category?: string) => void | Promise<void>
  compact?: boolean
}

export function TopicCard({ topic, onAddToBacklog, compact = false }: TopicCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  const handleAdd = async () => {
    setIsAdding(true)
    try {
      await onAddToBacklog(topic.topic, topic.category)
      setJustAdded(true)
    } finally {
      setIsAdding(false)
    }
  }
  const difficultyColors = {
    beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }

  return (
    <div
      className={cn(
        'rounded-xl bg-slate-50 dark:bg-slate-700/50',
        compact ? 'p-3' : 'p-4'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h4 className={cn(
            'font-medium text-slate-900 dark:text-white',
            compact ? 'text-sm' : 'text-base'
          )}>
            {topic.topic}
          </h4>
          {!compact && topic.description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
              {topic.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <Clock className="h-3 w-3" />
              {topic.estimated_minutes} min
            </span>
            <span className={cn(
              'rounded-full px-2 py-0.5 text-xs capitalize',
              difficultyColors[topic.difficulty]
            )}>
              {topic.difficulty}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          {topic.existingCourseId ? (
            <Link href={`/learn/${topic.existingCourseId}`}>
              <Button size="sm" variant="secondary">
                Continue
              </Button>
            </Link>
          ) : topic.inBacklog || justAdded ? (
            <span className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-medium px-2 py-1">
              <Check className="h-3 w-3" />
              In Backlog
            </span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleAdd}
              loading={isAdding}
              icon={!isAdding ? <Plus className="h-4 w-4" /> : undefined}
            >
              {isAdding ? 'Adding...' : 'Add to Backlog'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
