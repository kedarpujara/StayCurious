'use client'

import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils/cn'

interface LessonMessageProps {
  role: 'assistant' | 'user'
  content: string
  type?: 'lesson' | 'clarification' | 'action'
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
              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div
            className={cn(
              'prose prose-sm max-w-none',
              'dark:prose-invert',
              // Override default prose styles for better readability
              'prose-p:my-2 prose-p:leading-relaxed',
              'prose-headings:mt-4 prose-headings:mb-2',
              'prose-ul:my-2 prose-ol:my-2',
              'prose-li:my-1',
              'prose-strong:text-primary-700 dark:prose-strong:text-primary-300',
              // Links
              'prose-a:text-primary-600 dark:prose-a:text-primary-400',
              // Code
              'prose-code:text-sm prose-code:bg-slate-200 dark:prose-code:bg-slate-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded'
            )}
          >
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && !isUser && (
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="inline-block ml-1 h-4 w-0.5 bg-primary-500"
          />
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
