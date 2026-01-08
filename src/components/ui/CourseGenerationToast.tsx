'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Check, X, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import { useCourseGeneration } from '@/contexts/CourseGenerationContext'

export function CourseGenerationToast() {
  const { pendingCourse, isToastVisible, dismissToast, goToCourse, clearPendingCourse } =
    useCourseGeneration()
  const [elapsedTime, setElapsedTime] = useState(0)

  // Track elapsed time
  useEffect(() => {
    if (!pendingCourse || pendingCourse.status !== 'generating') {
      setElapsedTime(0)
      return
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - pendingCourse.startedAt.getTime()) / 1000
      )
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [pendingCourse])

  // Auto-dismiss after success (after a delay so user can click)
  useEffect(() => {
    if (pendingCourse?.status === 'completed') {
      const timer = setTimeout(() => {
        // Don't auto-dismiss, let user click to go to course
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [pendingCourse?.status])

  if (!pendingCourse || !isToastVisible) return null

  const isGenerating = pendingCourse.status === 'generating'
  const isCompleted = pendingCourse.status === 'completed'
  const isError = pendingCourse.status === 'error'

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, x: '-50%' }}
        animate={{ opacity: 1, y: 0, x: '-50%' }}
        exit={{ opacity: 0, y: 100, x: '-50%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
      >
        <div
          className={`relative overflow-hidden rounded-xl p-4 shadow-lg ${
            isError
              ? 'bg-gradient-to-r from-red-500 to-red-600'
              : isCompleted
              ? 'bg-gradient-to-r from-green-500 to-emerald-600'
              : 'bg-gradient-to-r from-primary-500 to-primary-600'
          }`}
        >
          {/* Close button */}
          <button
            onClick={isCompleted || isError ? clearPendingCourse : dismissToast}
            className="absolute right-2 top-2 rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
              {isGenerating && <Loader2 className="h-5 w-5 animate-spin text-white" />}
              {isCompleted && <Check className="h-5 w-5 text-white" />}
              {isError && <AlertCircle className="h-5 w-5 text-white" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/90">
                {isGenerating && 'Generating your course...'}
                {isCompleted && 'Course ready!'}
                {isError && 'Generation failed'}
              </p>
              <p className="text-sm text-white/80 truncate">
                {pendingCourse.topic}
              </p>

              {/* Status info */}
              {isGenerating && (
                <p className="mt-1 text-xs text-white/70">
                  {formatTime(elapsedTime)} elapsed - feel free to explore the app
                </p>
              )}
              {isError && pendingCourse.error && (
                <p className="mt-1 text-xs text-white/70">{pendingCourse.error}</p>
              )}

              {/* Action button for completed state */}
              {isCompleted && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={goToCourse}
                  className="mt-2 flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/30 transition-colors"
                >
                  Start Learning
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              )}

              {/* Retry button for error state */}
              {isError && (
                <button
                  onClick={clearPendingCourse}
                  className="mt-2 text-xs text-white/80 underline hover:text-white"
                >
                  Dismiss and try again
                </button>
              )}
            </div>
          </div>

          {/* Progress animation for generating state */}
          {isGenerating && (
            <motion.div
              className="absolute bottom-0 left-0 h-1 bg-white/30"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 60, ease: 'linear' }}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
