'use client'

import { cn } from '@/lib/utils/cn'
import type { UserLeaderboardPosition } from '@/types'
import { TrendingUp, Award } from 'lucide-react'

interface UserRankBadgeProps {
  position: UserLeaderboardPosition
  compact?: boolean
}

export function UserRankBadge({ position, compact = false }: UserRankBadgeProps) {
  const { rank, percentile, isTopTenPercent } = position

  if (!rank) {
    return (
      <div className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
        compact && 'px-2 py-1 text-xs'
      )}>
        <TrendingUp className={cn('w-4 h-4', compact && 'w-3 h-3')} />
        <span className="font-medium">Unranked</span>
      </div>
    )
  }

  const isElite = isTopTenPercent

  if (compact) {
    return (
      <div className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
        isElite
          ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 dark:from-yellow-900/50 dark:to-amber-900/50 dark:text-amber-300'
          : 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
      )}>
        {isElite && <Award className="w-3 h-3" />}
        #{rank}
      </div>
    )
  }

  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
      isElite
        ? 'bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 dark:from-yellow-900/30 dark:to-amber-900/30 dark:border-yellow-700'
        : 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700'
    )}>
      {isElite && <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
      <div>
        <div className={cn(
          'font-semibold',
          isElite ? 'text-amber-800 dark:text-amber-300' : 'text-primary-700 dark:text-primary-300'
        )}>
          Rank #{rank}
        </div>
        {percentile !== null && (
          <div className={cn(
            'text-xs',
            isElite ? 'text-amber-700 dark:text-amber-400' : 'text-primary-600 dark:text-primary-400'
          )}>
            Top {Math.round(100 - percentile)}%
          </div>
        )}
      </div>
    </div>
  )
}
