'use client'

import { cn } from '@/lib/utils/cn'
import Image from 'next/image'
import type { LeaderboardEntry } from '@/types'

interface LeaderboardCardProps {
  entry: LeaderboardEntry
  showRank?: boolean
}

function getRankEmoji(rank: number): string | null {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

function getRankStyle(rank: number): string {
  if (rank === 1) return 'bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-300 dark:from-yellow-900/30 dark:to-amber-900/30 dark:border-yellow-700'
  if (rank === 2) return 'bg-gradient-to-r from-slate-100 to-slate-200 border-slate-300 dark:from-slate-700/50 dark:to-slate-600/50 dark:border-slate-600'
  if (rank === 3) return 'bg-gradient-to-r from-orange-100 to-amber-100 border-orange-300 dark:from-orange-900/30 dark:to-amber-900/30 dark:border-orange-700'
  return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
}

export function LeaderboardCard({ entry, showRank = true }: LeaderboardCardProps) {
  const rankEmoji = getRankEmoji(entry.rank)
  // Prefer username over displayName for privacy
  const displayText = entry.username ? `@${entry.username}` : (entry.displayName || 'Anonymous')
  const avatarInitial = entry.username?.[0]?.toUpperCase() || entry.displayName?.[0]?.toUpperCase() || 'U'

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-all',
        getRankStyle(entry.rank),
        entry.isCurrentUser && 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-900'
      )}
    >
      {/* Rank */}
      {showRank && (
        <div className="flex-shrink-0 w-8 text-center">
          {rankEmoji ? (
            <span className="text-xl">{rankEmoji}</span>
          ) : (
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {entry.rank}
            </span>
          )}
        </div>
      )}

      {/* Avatar */}
      <div className="flex-shrink-0">
        {entry.avatarUrl ? (
          <Image
            src={entry.avatarUrl}
            alt={displayText}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {avatarInitial}
            </span>
          </div>
        )}
      </div>

      {/* Name & Title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-medium truncate',
            entry.isCurrentUser ? 'text-primary-700 dark:text-primary-300' : 'text-slate-900 dark:text-white'
          )}>
            {displayText}
          </span>
          {entry.isCurrentUser && (
            <span className="text-xs px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full">
              You
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {entry.currentTitle}
        </div>
      </div>

      {/* Curio */}
      <div className="flex-shrink-0 text-right">
        <div className="font-semibold text-slate-900 dark:text-white">
          {entry.monthlyCurio}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Curio
        </div>
      </div>
    </div>
  )
}
