'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'highlighted'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700',
      interactive: 'bg-white border border-slate-200 shadow-sm card-interactive cursor-pointer dark:bg-slate-800 dark:border-slate-700',
      highlighted: 'bg-gradient-to-br from-primary-50 to-accent-50 border border-primary-200 shadow-md dark:from-primary-900/30 dark:to-accent-900/30 dark:border-primary-700',
    }

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl',
          variants[variant],
          paddings[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export { Card }
