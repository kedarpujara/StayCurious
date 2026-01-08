'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { LeaderboardCard } from '@/components/leaderboard'
import { useCurioCircle, useCurioCircles } from '@/hooks/useCurioCircles'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  Users,
  Trophy,
  Copy,
  Check,
  LogOut,
  Trash2,
  Crown,
  Shield,
  Calendar,
} from 'lucide-react'
import type { LeaderboardEntry } from '@/types'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function CircleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.circleId as string

  const { circle, userRole, leaderboard, isLoading } = useCurioCircle(circleId)
  const { leaveCircle, isLeaving } = useCurioCircles()

  const [copied, setCopied] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const handleCopyInviteCode = async () => {
    if (circle?.inviteCode) {
      await navigator.clipboard.writeText(circle.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLeave = async () => {
    const success = await leaveCircle(circleId)
    if (success) {
      router.push('/circles')
    }
  }

  const currentMonth = MONTH_NAMES[new Date().getMonth()]
  const currentYear = new Date().getFullYear()

  // Convert circle leaderboard entries to LeaderboardEntry format
  const leaderboardEntries: LeaderboardEntry[] = leaderboard.map(entry => ({
    rank: entry.rank,
    userId: entry.userId,
    displayName: entry.displayName,
    avatarUrl: entry.avatarUrl,
    monthlyCurio: entry.monthlyCurio,
    currentTitle: entry.currentTitle,
    isCurrentUser: entry.isCurrentUser,
  }))

  if (isLoading) {
    return (
      <PageContainer title="Circle" showBack>
        <div className="space-y-4">
          <Card padding="lg">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
            </div>
          </Card>
          <Card padding="lg">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              ))}
            </div>
          </Card>
        </div>
      </PageContainer>
    )
  }

  if (!circle) {
    return (
      <PageContainer title="Circle Not Found" showBack>
        <Card padding="lg">
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              This circle doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Button
              variant="secondary"
              onClick={() => router.push('/circles')}
              className="mt-4"
            >
              Back to Circles
            </Button>
          </div>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer title={circle.name} showBack>
      <div className="space-y-6">
        {/* Circle Info Card */}
        <Card padding="md">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-full">
                  <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    {circle.name}
                  </h2>
                  <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    {userRole === 'owner' && <Crown className="w-3 h-3 text-yellow-500" />}
                    {userRole === 'admin' && <Shield className="w-3 h-3 text-blue-500" />}
                    <span className="capitalize">{userRole}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {circle.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {circle.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {circle.memberCount} / {circle.maxMembers} members
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Created {new Date(circle.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Invite Code */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                Invite Code
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg font-semibold text-slate-900 dark:text-white tracking-widest">
                  {circle.inviteCode}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyInviteCode}
                  icon={copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            {/* Leave/Delete Button */}
            <Button
              variant="ghost"
              onClick={() => setShowLeaveConfirm(true)}
              icon={userRole === 'owner' ? <Trash2 className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
              className="w-full text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {userRole === 'owner' ? 'Delete Circle' : 'Leave Circle'}
            </Button>
          </div>
        </Card>

        {/* Leaderboard */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Circle Leaderboard
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {currentMonth} {currentYear}
              </p>
            </div>
          </div>

          {leaderboardEntries.length > 0 ? (
            <div className="space-y-2">
              {leaderboardEntries.map(entry => (
                <LeaderboardCard key={entry.userId} entry={entry} />
              ))}
            </div>
          ) : (
            <Card padding="lg">
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500 dark:text-slate-400">
                  No activity this month yet. Start learning to climb the leaderboard!
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLeaveConfirm(false)}
          />
          <Card className="relative w-full max-w-sm z-10" padding="lg">
            <div className="text-center">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-fit mx-auto mb-4">
                {userRole === 'owner' ? (
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                ) : (
                  <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {userRole === 'owner' ? 'Delete Circle?' : 'Leave Circle?'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                {userRole === 'owner'
                  ? 'This will permanently delete the circle and remove all members. This action cannot be undone.'
                  : 'You can always rejoin with the invite code later.'}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleLeave}
                  loading={isLeaving}
                  className="flex-1"
                >
                  {userRole === 'owner' ? 'Delete' : 'Leave'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  )
}
