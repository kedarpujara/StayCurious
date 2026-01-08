'use client'

import { cn } from '@/lib/utils/cn'
import { Card } from '@/components/ui/Card'
import type { CurioCircle } from '@/types'
import { Users, Crown, Shield, User, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface CircleCardProps {
  circle: CurioCircle & { role: 'owner' | 'admin' | 'member' }
  compact?: boolean
}

function getRoleIcon(role: 'owner' | 'admin' | 'member') {
  switch (role) {
    case 'owner':
      return <Crown className="w-3 h-3 text-yellow-500" />
    case 'admin':
      return <Shield className="w-3 h-3 text-blue-500" />
    default:
      return <User className="w-3 h-3 text-slate-400" />
  }
}

function getRoleLabel(role: 'owner' | 'admin' | 'member') {
  switch (role) {
    case 'owner':
      return 'Owner'
    case 'admin':
      return 'Admin'
    default:
      return 'Member'
  }
}

export function CircleCard({ circle, compact = false }: CircleCardProps) {
  if (compact) {
    return (
      <Link href={`/circles/${circle.id}`}>
        <Card variant="interactive" padding="sm" className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-full">
            <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-900 dark:text-white truncate">
              {circle.name}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              {getRoleIcon(circle.role)}
              <span>{getRoleLabel(circle.role)}</span>
              <span className="mx-1">•</span>
              <span>{circle.memberCount} members</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Card>
      </Link>
    )
  }

  return (
    <Link href={`/circles/${circle.id}`}>
      <Card variant="interactive" padding="md">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/50 dark:to-accent-900/50 rounded-xl">
            <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                {circle.name}
              </h3>
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                circle.role === 'owner' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
                circle.role === 'admin' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
                circle.role === 'member' && 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              )}>
                {getRoleIcon(circle.role)}
                {getRoleLabel(circle.role)}
              </span>
            </div>

            {circle.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                {circle.description}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {circle.memberCount} / {circle.maxMembers} members
              </span>
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        </div>
      </Card>
    </Link>
  )
}
