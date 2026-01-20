'use client'

import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils/cn'

interface TeachingContentProps {
  content: string
  className?: string
  size?: 'sm' | 'base'
}

/**
 * Shared component for rendering educational/teaching content with consistent markdown styling.
 * Used across Ask responses, course content, lesson chat, etc.
 *
 * Features:
 * - Proper paragraph spacing with blank lines
 * - Bold text highlighted in primary color
 * - Well-styled lists with visible bullets
 * - Headers with appropriate sizing
 * - Blockquotes for callouts
 * - Inline code styling
 */
export function TeachingContent({
  content,
  className,
  size = 'sm'
}: TeachingContentProps) {
  return (
    <div
      className={cn(
        'prose max-w-none',
        size === 'sm' ? 'prose-sm' : 'prose-base',
        'prose-slate dark:prose-invert',
        // Better paragraph spacing
        '[&>p]:mb-4 [&>p]:leading-relaxed [&>p:last-child]:mb-0',
        // Headers - visually distinct from body text (large and prominent)
        '[&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-8 [&>h2]:mb-4 [&>h2]:text-slate-900 dark:[&>h2]:text-white [&>h2]:leading-tight',
        '[&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-3 [&>h3]:text-slate-800 dark:[&>h3]:text-slate-100 [&>h3]:leading-snug',
        // Bold text styling - stand out in primary color
        '[&_strong]:font-semibold [&_strong]:text-primary-700 dark:[&_strong]:text-primary-300',
        // Lists with proper spacing and visible bullets
        '[&>ul]:my-4 [&>ul]:space-y-2 [&>ul]:list-disc [&>ul]:pl-5',
        '[&>ol]:my-4 [&>ol]:space-y-2 [&>ol]:list-decimal [&>ol]:pl-5',
        '[&_li]:leading-relaxed [&_li]:marker:text-primary-500 dark:[&_li]:marker:text-primary-400',
        // Nested lists
        '[&_ul_ul]:mt-1.5 [&_ul_ul]:mb-0',
        '[&_ol_ol]:mt-1.5 [&_ol_ol]:mb-0',
        // Blockquotes for callouts/notes
        '[&>blockquote]:border-l-4 [&>blockquote]:border-primary-300 dark:[&>blockquote]:border-primary-600',
        '[&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-3',
        '[&>blockquote]:text-slate-600 dark:[&>blockquote]:text-slate-300',
        // Inline code
        '[&_code]:text-xs [&_code]:bg-slate-200 dark:[&_code]:bg-slate-700',
        '[&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono',
        // Links
        '[&_a]:text-primary-600 dark:[&_a]:text-primary-400 [&_a]:underline',
        className
      )}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
