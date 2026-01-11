'use client'

import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils/cn'

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
          <div
            className={cn(
              'prose prose-sm prose-slate max-w-none',
              'dark:prose-invert',
              // Better paragraph spacing
              '[&>p]:mb-3 [&>p]:leading-relaxed [&>p:last-child]:mb-0',
              // Headers - larger and bolder (relative to prose-sm base)
              '[&>h2]:text-base [&>h2]:font-bold [&>h2]:mt-4 [&>h2]:mb-2 [&>h2]:text-slate-900 dark:[&>h2]:text-white',
              '[&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mt-3 [&>h3]:mb-1.5 [&>h3]:text-slate-800 dark:[&>h3]:text-slate-100',
              // Bold text styling
              '[&_strong]:font-semibold [&_strong]:text-primary-700 dark:[&_strong]:text-primary-300',
              // Lists with proper spacing and visible bullets
              '[&>ul]:my-3 [&>ul]:space-y-1.5 [&>ul]:list-disc [&>ul]:pl-5',
              '[&>ol]:my-3 [&>ol]:space-y-1.5 [&>ol]:list-decimal [&>ol]:pl-5',
              '[&_li]:leading-relaxed [&_li]:marker:text-slate-500 dark:[&_li]:marker:text-slate-400',
              // Blockquotes
              '[&>blockquote]:border-l-4 [&>blockquote]:border-primary-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-3',
              // Inline code
              '[&_code]:text-xs [&_code]:bg-slate-200 dark:[&_code]:bg-slate-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded'
            )}
          >
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
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
