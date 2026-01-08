'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, MessageSquare, HelpCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageContainer } from '@/components/layout'
import { Card, Button } from '@/components/ui'
import { LearnChatContainer } from '@/components/learn-chat'
import { createClient } from '@/lib/supabase/client'
import type { CourseContent } from '@/types'

export default function LearnChatPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const courseId = params.topicId as string

  // Fetch course data
  const { data: courseData, isLoading, error } = useQuery({
    queryKey: ['course-chat', courseId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: course, error: fetchError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('user_id', user.id)
        .single()

      if (fetchError || !course) {
        throw new Error('Course not found')
      }

      return {
        course,
        content: course.content as CourseContent,
      }
    },
    enabled: !!courseId && courseId !== 'new',
  })

  // Loading state
  if (isLoading) {
    return (
      <PageContainer title="Loading..." showBack>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          <p className="text-slate-500 dark:text-slate-400">Loading course...</p>
        </div>
      </PageContainer>
    )
  }

  // Error state
  if (error || !courseData) {
    return (
      <PageContainer title="Error" showBack>
        <Card className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <HelpCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            Course not found
          </h2>
          <p className="mb-4 text-slate-500 dark:text-slate-400">
            {error instanceof Error ? error.message : 'Unable to load the course.'}
          </p>
          <Button variant="secondary" onClick={() => router.back()}>
            Go Back
          </Button>
        </Card>
      </PageContainer>
    )
  }

  // No content
  if (!courseData.content?.sections?.length) {
    return (
      <PageContainer title="No Content" showBack>
        <Card className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <HelpCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            Course content not available
          </h2>
          <p className="mb-4 text-slate-500 dark:text-slate-400">
            This course hasn&apos;t been generated yet.
          </p>
          <Button variant="secondary" onClick={() => router.push(`/learn/${courseId}`)}>
            Generate Course
          </Button>
        </Card>
      </PageContainer>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 safe-top"
      >
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary-500 shrink-0" />
            <h1 className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {courseData.course.topic}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chat Mode
          </p>
        </div>
        <button
          onClick={() => router.push(`/learn/${courseId}`)}
          className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
        >
          Classic View
        </button>
      </motion.header>

      {/* Chat container - flex-1 to fill remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <LearnChatContainer
          courseId={courseId}
          courseTopic={courseData.course.topic}
          courseContent={courseData.content}
        />
      </div>
    </div>
  )
}
