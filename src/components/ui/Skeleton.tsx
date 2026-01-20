'use client'

import { cn } from '@/lib/utils/cn'

interface SkeletonProps {
  className?: string
  variant?: 'card' | 'list-item' | 'grid-item' | 'text' | 'circle'
}

/**
 * Reusable skeleton loading component for consistent shimmer effects across the app.
 *
 * Variants:
 * - card: Standard card height (h-20) - for course cards, topic cards
 * - list-item: List item height (h-16) - for subcategories, menu items
 * - grid-item: Grid card height (h-24) - for category grid cards
 * - text: Single line text (h-4) - for text placeholders
 * - circle: Circle shape - for avatars, icons
 */
export function Skeleton({ className, variant = 'card' }: SkeletonProps) {
  const variantClasses = {
    'card': 'h-20 rounded-xl',
    'list-item': 'h-16 rounded-xl',
    'grid-item': 'h-24 rounded-xl',
    'text': 'h-4 rounded',
    'circle': 'h-10 w-10 rounded-full',
  }

  return (
    <div
      className={cn(
        'animate-pulse bg-slate-200 dark:bg-slate-700',
        variantClasses[variant],
        className
      )}
    />
  )
}

/**
 * Renders multiple skeleton items with consistent spacing.
 */
export function SkeletonList({
  count = 3,
  variant = 'card',
  className,
  gap = 'space-y-3',
}: {
  count?: number
  variant?: SkeletonProps['variant']
  className?: string
  gap?: string
}) {
  return (
    <div className={cn(gap, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant={variant} />
      ))}
    </div>
  )
}
