'use client'

import { PageContainer } from '@/components/layout'
import { Leaderboard } from '@/components/leaderboard'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { Card } from '@/components/ui/Card'
import { Award, TrendingUp, Users } from 'lucide-react'

export default function LeaderboardPage() {
  const { entries, userPosition, month, year, isLoading } = useLeaderboard({ limit: 50 })

  return (
    <PageContainer title="Leaderboard">
      <div className="space-y-6">
        {/* Stats Overview */}
        {userPosition && (
          <div className="grid grid-cols-3 gap-3">
            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {userPosition.rank ? `#${userPosition.rank}` : '-'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Your Rank
              </div>
            </Card>

            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {userPosition.monthlyCurio}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                <Award className="w-3 h-3" />
                Monthly Curio
              </div>
            </Card>

            <Card padding="sm" className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {userPosition.totalUsers}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                <Users className="w-3 h-3" />
                Learners
              </div>
            </Card>
          </div>
        )}

        {/* Top 10% Elite Status */}
        {userPosition?.isTopTenPercent && (
          <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800" padding="md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-full">
                <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="font-semibold text-yellow-800 dark:text-yellow-300">
                  Elite Learner Status
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-400">
                  You&apos;re in the top 10% of learners this month!
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Leaderboard */}
        <Leaderboard
          entries={entries}
          userPosition={userPosition}
          month={month}
          year={year}
          isLoading={isLoading}
        />
      </div>
    </PageContainer>
  )
}
