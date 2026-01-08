'use client'

import { useState } from 'react'
import { PageContainer } from '@/components/layout'
import { CirclesList, CreateCircleModal, JoinCircleModal } from '@/components/circles'
import { useCurioCircles } from '@/hooks/useCurioCircles'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Plus, UserPlus, Users, Trophy } from 'lucide-react'

export default function CirclesPage() {
  const {
    circles,
    isLoading,
    createCircle,
    joinCircle,
    isCreating,
    isJoining,
  } = useCurioCircles()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  return (
    <PageContainer title="Curio Circles">
      <div className="space-y-6">
        {/* Header Card */}
        <Card className="bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 border-primary-200 dark:border-primary-800" padding="md">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm">
              <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Compete with Friends
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Create private circles to track Curio with your study groups, classmates, or friends. Each circle has its own monthly leaderboard.
              </p>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => setShowCreateModal(true)}
            icon={<Plus className="w-4 h-4" />}
            className="flex-1"
          >
            Create Circle
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowJoinModal(true)}
            icon={<UserPlus className="w-4 h-4" />}
            className="flex-1"
          >
            Join Circle
          </Button>
        </div>

        {/* Circles List */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-slate-500" />
            <h3 className="font-medium text-slate-900 dark:text-white">
              Your Circles
            </h3>
            {!isLoading && circles.length > 0 && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                ({circles.length})
              </span>
            )}
          </div>
          <CirclesList circles={circles} isLoading={isLoading} />
        </div>
      </div>

      {/* Modals */}
      <CreateCircleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createCircle}
        isCreating={isCreating}
      />

      <JoinCircleModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={joinCircle}
        isJoining={isJoining}
      />
    </PageContainer>
  )
}
