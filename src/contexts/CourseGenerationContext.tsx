'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { CourseContent } from '@/types'

interface PendingCourse {
  topic: string
  intensity: 'skim' | 'solid' | 'deep'
  timeBudget: number
  backlogItemId?: string
  status: 'generating' | 'completed' | 'error'
  courseId?: string
  content?: CourseContent
  error?: string
  startedAt: Date
}

interface CourseGenerationContextValue {
  pendingCourse: PendingCourse | null
  startBackgroundGeneration: (
    topic: string,
    intensity: 'skim' | 'solid' | 'deep',
    timeBudget: number,
    backlogItemId?: string
  ) => void
  clearPendingCourse: () => void
  goToCourse: () => void
  dismissToast: () => void
  isToastVisible: boolean
}

const CourseGenerationContext = createContext<CourseGenerationContextValue | null>(null)

export function CourseGenerationProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [pendingCourse, setPendingCourse] = useState<PendingCourse | null>(null)
  const [isToastVisible, setIsToastVisible] = useState(false)

  const startBackgroundGeneration = useCallback(
    async (
      topic: string,
      intensity: 'skim' | 'solid' | 'deep',
      timeBudget: number,
      backlogItemId?: string
    ) => {
      // Set pending state immediately
      setPendingCourse({
        topic,
        intensity,
        timeBudget,
        backlogItemId,
        status: 'generating',
        startedAt: new Date(),
      })
      setIsToastVisible(true)

      try {
        const res = await fetch('/api/ai/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, intensity, timeBudget, backlogItemId }),
        })

        const data = await res.json()

        if (!res.ok) {
          setPendingCourse((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'error',
                  error: data.error || 'Failed to generate course',
                }
              : null
          )
          return
        }

        // Success!
        setPendingCourse((prev) =>
          prev
            ? {
                ...prev,
                status: 'completed',
                courseId: data.courseId,
                content: data.content,
              }
            : null
        )
      } catch (err) {
        setPendingCourse((prev) =>
          prev
            ? {
                ...prev,
                status: 'error',
                error: err instanceof Error ? err.message : 'Unknown error',
              }
            : null
        )
      }
    },
    []
  )

  const clearPendingCourse = useCallback(() => {
    setPendingCourse(null)
    setIsToastVisible(false)
  }, [])

  const goToCourse = useCallback(() => {
    if (pendingCourse?.courseId) {
      router.push(`/learn/${pendingCourse.courseId}`)
      clearPendingCourse()
    }
  }, [pendingCourse, router, clearPendingCourse])

  const dismissToast = useCallback(() => {
    setIsToastVisible(false)
  }, [])

  return (
    <CourseGenerationContext.Provider
      value={{
        pendingCourse,
        startBackgroundGeneration,
        clearPendingCourse,
        goToCourse,
        dismissToast,
        isToastVisible,
      }}
    >
      {children}
    </CourseGenerationContext.Provider>
  )
}

export function useCourseGeneration() {
  const context = useContext(CourseGenerationContext)
  if (!context) {
    throw new Error('useCourseGeneration must be used within a CourseGenerationProvider')
  }
  return context
}
