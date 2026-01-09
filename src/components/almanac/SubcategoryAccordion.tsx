'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { AlmanacCategory, AlmanacTopic } from '@/types'
import { TopicCard } from './TopicCard'

interface SubcategoryAccordionProps {
  subcategory: AlmanacCategory
  topics: AlmanacTopic[]
  onAddToBacklog: (topic: string, category?: string) => void
  defaultExpanded?: boolean
}

export function SubcategoryAccordion({
  subcategory,
  topics,
  onAddToBacklog,
  defaultExpanded = false
}: SubcategoryAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex w-full items-center justify-between p-4 text-left transition-colors',
          'hover:bg-slate-50 dark:hover:bg-slate-700/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500'
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{subcategory.icon}</span>
          <div>
            <h3 className="font-medium text-slate-900 dark:text-white">
              {subcategory.name}
            </h3>
            {subcategory.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subcategory.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {topics.length} topics
          </span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-slate-400" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 p-3 space-y-2 dark:border-slate-700">
              {topics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  onAddToBacklog={onAddToBacklog}
                  compact
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
