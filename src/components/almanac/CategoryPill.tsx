'use client'

import { cn } from '@/lib/utils/cn'
import type { AlmanacCategory } from '@/types'

interface CategoryPillProps {
  category: AlmanacCategory
  isSelected: boolean
  onClick: () => void
  topicCount?: number
}

export function CategoryPill({ category, isSelected, onClick, topicCount }: CategoryPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 rounded-2xl px-4 py-3 transition-all duration-200 min-w-[100px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        isSelected
          ? 'bg-primary-600 text-white shadow-lg scale-105'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
      )}
    >
      <span className="text-2xl">{category.icon}</span>
      <span className="text-xs font-medium text-center leading-tight">
        {category.name.split(' ')[0]}
      </span>
      {topicCount !== undefined && (
        <span className={cn(
          'text-[10px] rounded-full px-1.5',
          isSelected
            ? 'bg-white/20'
            : 'bg-slate-200 dark:bg-slate-700'
        )}>
          {topicCount}
        </span>
      )}
    </button>
  )
}
