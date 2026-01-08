'use client'

import { cn } from '@/lib/utils/cn'

export interface ProgressBarProps {
  value: number // 0-100
  variant?: 'default' | 'success' | 'curio'
  animated?: boolean
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ProgressBar({
  value,
  variant = 'default',
  animated = true,
  showLabel = false,
  size = 'md',
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value))

  const variants = {
    default: 'bg-primary-500',
    success: 'bg-green-500',
    curio: 'bg-gradient-to-r from-amber-400 to-amber-500',
  }

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700', sizes[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            variants[variant],
            animated && clampedValue > 0 && 'animate-pulse-slow'
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">
          {Math.round(clampedValue)}%
        </div>
      )}
    </div>
  )
}
