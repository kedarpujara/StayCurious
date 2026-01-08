'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

export interface PageContainerProps {
  title?: string
  showBack?: boolean
  headerRight?: React.ReactNode
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export function PageContainer({
  title,
  showBack,
  headerRight,
  children,
  className,
  noPadding = false,
}: PageContainerProps) {
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col pb-20">
      {/* Header */}
      {(title || showBack || headerRight) && (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-sm safe-top dark:border-slate-700 dark:bg-slate-900/80">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              {showBack && (
                <button
                  onClick={() => router.back()}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              {title && (
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
              )}
            </div>
            {headerRight && (
              <div className="flex items-center">{headerRight}</div>
            )}
          </div>
        </header>
      )}

      {/* Content */}
      <main className={cn('flex-1', !noPadding && 'px-4 py-4', className)}>
        {children}
      </main>
    </div>
  )
}
