'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface StepIndicatorProps {
  currentSection: number
  totalSections: number
  sectionTitle?: string
}

export function StepIndicator({
  currentSection,
  totalSections,
  sectionTitle,
}: StepIndicatorProps) {
  // Progress based on sections completed (1 step per section)
  // Each "Got it" click advances to next section (~16.67% for 6 sections)
  const progressPercent = ((currentSection + 1) / totalSections) * 100

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
      {/* Section title */}
      {sectionTitle && (
        <div className="mb-2">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {sectionTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Section {currentSection + 1} of {totalSections}
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Section dots */}
      <div className="flex justify-between mt-2">
        {Array.from({ length: totalSections }).map((_, idx) => {
          const isCompleted = idx < currentSection
          const isCurrent = idx === currentSection

          return (
            <div
              key={idx}
              className={cn(
                'flex items-center justify-center h-5 w-5 rounded-full text-xs font-medium transition-all',
                isCompleted && 'bg-green-500 text-white',
                isCurrent && 'bg-primary-600 text-white ring-2 ring-primary-200 dark:ring-primary-800',
                !isCompleted && !isCurrent && 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              )}
            >
              {isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
            </div>
          )
        })}
      </div>
    </div>
  )
}
