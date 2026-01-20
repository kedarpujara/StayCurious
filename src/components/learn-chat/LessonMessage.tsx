'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { TeachingContent } from '@/components/ui'

interface LessonMessageProps {
  role: 'assistant' | 'user'
  content: string
  type?: 'lesson' | 'clarification' | 'example' | 'action'
  isStreaming?: boolean
}

export function LessonMessage({
  role,
  content,
  type = 'lesson',
  isStreaming = false,
}: LessonMessageProps) {
  const isUser = role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[90%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary-600 text-white'
            : type === 'clarification'
              ? 'bg-amber-50 dark:bg-amber-900/20 text-slate-900 dark:text-white border border-amber-200 dark:border-amber-800'
              : type === 'example'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 text-slate-900 dark:text-white border border-yellow-200 dark:border-yellow-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <TeachingContent content={content} />
        )}
      </div>
    </motion.div>
  )
}

// Loading dots component for when waiting for response
export function LoadingMessage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-start"
    >
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-slate-400"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
