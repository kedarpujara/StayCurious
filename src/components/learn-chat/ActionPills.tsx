'use client'

import { motion } from 'framer-motion'
import { Check, HelpCircle, Lightbulb, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ActionPillsProps {
  onNext: () => void
  onAskMore: () => void
  onExample: () => void
  isLastStep: boolean
  isLastSection: boolean
  isStreaming: boolean
  mode: 'guided' | 'clarification'
}

export function ActionPills({
  onNext,
  onAskMore,
  onExample,
  isLastStep,
  isLastSection,
  isStreaming,
  mode,
}: ActionPillsProps) {
  console.log('[ActionPills] Component rendering with props:', {
    isLastStep,
    isLastSection,
    isStreaming,
    mode,
    disabled: isStreaming,
  })

  const disabled = isStreaming

  // Determine the Next button label and icon
  const getNextButton = () => {
    if (isLastStep && isLastSection) {
      return { label: 'Take Quiz', icon: ArrowRight }
    }
    if (isLastStep) {
      return { label: 'Next Section', icon: ArrowRight }
    }
    return { label: 'Got it, Next', icon: Check }
  }

  const nextButton = getNextButton()
  const NextIcon = nextButton.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 justify-center py-4"
    >
      {/* Debug marker */}
      <div className="w-full text-center text-xs text-green-500 mb-2">
        ACTION PILLS RENDERED
      </div>
      {/* Next / Got it button - primary action */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all',
          'bg-primary-600 text-white shadow-md shadow-primary-500/20',
          'hover:bg-primary-700 hover:shadow-lg',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <NextIcon className="h-4 w-4" />
        {nextButton.label}
      </motion.button>

      {/* Ask More button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onAskMore}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all',
          mode === 'clarification'
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          'hover:bg-slate-200 dark:hover:bg-slate-700',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <HelpCircle className="h-4 w-4" />
        Ask More
      </motion.button>

      {/* Example button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onExample}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all',
          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          'hover:bg-slate-200 dark:hover:bg-slate-700',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Lightbulb className="h-4 w-4" />
        Example
      </motion.button>
    </motion.div>
  )
}
