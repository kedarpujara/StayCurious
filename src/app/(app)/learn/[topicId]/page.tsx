'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Play, HelpCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageContainer } from '@/components/layout'
import { Button, Card } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { toDisplayFormat } from '@/lib/blueprint'
import type { CourseContent } from '@/types'

export default function CourseStartPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()

  const courseId = params.topicId as string
  const [isStarting, setIsStarting] = useState(false)

  // Fetch course from course_catalog
  const { data: catalogCourse, isLoading } = useQuery({
    queryKey: ['catalog-course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_catalog')
        .select('*')
        .eq('id', courseId)
        .single()

      if (error) throw error
      return data
    },
  })

  // Check if user already has this course in progress
  const { data: existingProgress, isLoading: isProgressLoading } = useQuery({
    queryKey: ['user-course-progress', courseId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Check for existing progress record for this catalog course (simple query without FK joins)
      const { data: progress } = await supabase
        .from('user_course_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('catalog_course_id', courseId)
        .single()

      return progress
    },
    enabled: !!catalogCourse,
  })

  // Check if course is in progress or completed and should redirect
  const isInProgress = existingProgress?.status === 'in_progress'
  const isCompleted = existingProgress?.status === 'completed'

  // Auto-redirect based on course status (now using catalog_course_id directly)
  useEffect(() => {
    if (isInProgress) {
      router.replace(`/learn/${courseId}/chat`)
    } else if (isCompleted) {
      router.replace(`/learn/${courseId}/complete`)
    }
  }, [isInProgress, isCompleted, courseId, router])

  const handleStartCourse = async () => {
    if (!catalogCourse) return

    setIsStarting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const content = toDisplayFormat(catalogCourse.content) as CourseContent
      const totalSections = content?.sections?.length || 0

      // Check if we have an existing saved progress record
      if (existingProgress?.id && existingProgress.status === 'saved') {
        // Update existing saved record to in_progress
        const { error: updateError } = await supabase
          .from('user_course_progress')
          .update({
            status: 'in_progress',
            total_sections: totalSections,
            current_section: content?.sections?.[0]?.id || null,
            current_section_index: 0,
            started_at: new Date().toISOString(),
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', existingProgress.id)

        if (updateError) {
          console.error('Failed to update progress:', updateError)
          throw updateError
        }
      } else {
        // Create new progress record (no courses table copy needed)
        const { error: insertError } = await supabase
          .from('user_course_progress')
          .insert({
            user_id: user.id,
            catalog_course_id: catalogCourse.id,
            current_section: content?.sections?.[0]?.id || null,
            current_section_index: 0,
            total_sections: totalSections,
            sections_completed: [],
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })

        if (insertError) {
          console.error('Failed to create progress:', insertError)
          throw insertError
        }
      }

      // Invalidate queries and go to chat (using catalog_course_id)
      queryClient.invalidateQueries({ queryKey: ['user-progress'] })
      queryClient.invalidateQueries({ queryKey: ['user-course-progress', courseId] })
      router.push(`/learn/${courseId}/chat`)
    } catch (error) {
      console.error('Failed to start course:', error)
      setIsStarting(false)
    }
  }

  // Show loading while fetching course or progress, or during redirect
  if (isLoading || isProgressLoading || isInProgress || isCompleted) {
    return (
      <PageContainer title="Loading..." showBack>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          {isInProgress && (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Resuming your course...
            </p>
          )}
          {isCompleted && (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Loading course results...
            </p>
          )}
        </div>
      </PageContainer>
    )
  }

  if (!catalogCourse) {
    return (
      <PageContainer title="Course Not Found" showBack>
        <Card className="py-12 text-center">
          <HelpCircle className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            Course not found
          </h2>
          <p className="mb-4 text-slate-500 dark:text-slate-400">
            This course doesn&apos;t exist or has been removed.
          </p>
          <Button onClick={() => router.push('/learn')}>
            Browse Courses
          </Button>
        </Card>
      </PageContainer>
    )
  }

  const content = toDisplayFormat(catalogCourse.content) as CourseContent
  const sections = content?.sections || []

  return (
    <PageContainer title={catalogCourse.topic} showBack>
      <div className="mx-auto max-w-md space-y-6">
        {/* Course header */}
        <div className="text-center pt-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/50">
            <BookOpen className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {catalogCourse.topic}
          </h1>
          {catalogCourse.description && (
            <p className="text-slate-500 dark:text-slate-400">
              {catalogCourse.description}
            </p>
          )}
        </div>

        {/* What you'll learn */}
        <div className="pt-2">
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            What you&apos;ll learn
          </h2>
          <div className="space-y-2">
            {sections.map((section, idx) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {idx + 1}
                  </span>
                </div>
                <span className="text-slate-700 dark:text-slate-300">{section.title}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Start/Continue button */}
        <div className="pt-6">
          <Button
            onClick={handleStartCourse}
            loading={isStarting}
            size="xl"
            className="w-full"
            icon={<Play className="h-5 w-5" />}
          >
            {existingProgress?.status === 'saved' ? 'Continue Course' : 'Start Course'}
          </Button>
        </div>
      </div>
    </PageContainer>
  )
}
