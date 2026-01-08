'use client'

import { LeaderboardCard } from './LeaderboardCard'
import { UserRankBadge } from './UserRankBadge'
import { Card } from '@/components/ui/Card'
import type { LeaderboardEntry, UserLeaderboardPosition } from '@/types'
import { Trophy, Users } from 'lucide-react'

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  userPosition: UserLeaderboardPosition | null
  month?: number
  year?: number
  isLoading?: boolean
  title?: string
  emptyMessage?: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function Leaderboard({
  entries,
  userPosition,
  month,
  year,
  isLoading = false,
  title = 'Global Leaderboard',
  emptyMessage = 'No learners yet this month. Be the first!',
}: LeaderboardProps) {
  const monthName = month ? MONTH_NAMES[month - 1] : MONTH_NAMES[new Date().getMonth()]
  const displayYear = year || new Date().getFullYear()

  if (isLoading) {
    return (
      <Card padding="lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with user position */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            {title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {monthName} {displayYear}
          </p>
        </div>
        {userPosition && <UserRankBadge position={userPosition} />}
      </div>

      {/* Leaderboard entries */}
      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map(entry => (
            <LeaderboardCard key={entry.userId} entry={entry} />
          ))}
        </div>
      ) : (
        <Card padding="lg">
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              {emptyMessage}
            </p>
          </div>
        </Card>
      )}

      {/* User not in top but ranked */}
      {userPosition && userPosition.rank && !entries.find(e => e.isCurrentUser) && (
        <Card padding="sm" className="mt-4">
          <div className="text-center text-sm text-slate-600 dark:text-slate-400">
            You are ranked <span className="font-semibold">#{userPosition.rank}</span> with{' '}
            <span className="font-semibold">{userPosition.monthlyCurio} Curio</span> this month
          </div>
        </Card>
      )}
    </div>
  )
}
