'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { BookOpen, Clock, Sparkles, Star, MessageSquare, Trophy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout'
import { Button, Card } from '@/components/ui'
import { useCurio } from '@/hooks/useCurio'
import { createClient } from '@/lib/supabase/client'
import type { CourseDepth } from '@/types'
import { toDisplayFormat } from '@/lib/blueprint'

export default function LearnTopicPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const topicId = params.topicId as string
  const topicFromQuery = searchParams.get('topic')

  const { addCurio } = useCurio()

  // Fetch existing course or backlog item
  const { data: courseData, isLoading: loadingCourse } = useQuery({
    queryKey: ['course', topicId, topicFromQuery],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { course: null, backlogItem: null }

      // If topicId is 'new' and we have a topic query param, check for existing course
      if (topicId === 'new' && topicFromQuery) {
        const { data: existingCourse } = await supabase
          .from('courses')
          .select('*')
          .eq('user_id', user.id)
          .ilike('topic', topicFromQuery)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (existingCourse) {
          return { course: existingCourse, backlogItem: null }
        }
        return { course: null, backlogItem: null }
      }

      if (topicId === 'new') {
        return { course: null, backlogItem: null }
      }

      // Check if this is a backlog item
      const { data: backlogItem } = await supabase
        .from('backlog_items')
        .select('*, course:courses(*)')
        .eq('id', topicId)
        .eq('user_id', user.id)
        .single()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const backlogWithCourse = backlogItem as any

      if (backlogWithCourse) {
        return {
          course: backlogWithCourse.course || null,
          backlogItem: {
            id: backlogWithCourse.id,
            topic: backlogWithCourse.topic,
          },
        }
      }

      // Try to fetch as a course directly
      const { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('id', topicId)
        .eq('user_id', user.id)
        .single()

      return { course: course || null, backlogItem: null }
    },
  })

  const existingCourse = courseData?.course || null
  const backlogItemId = courseData?.backlogItem?.id || null
  const backlogTopic = courseData?.backlogItem?.topic || null

  // Get course content
  const content = existingCourse?.content ? toDisplayFormat(existingCourse.content) : undefined

  // Get the topic to display
  const displayTopic = existingCourse?.topic || topicFromQuery || backlogTopic || 'Learning'

  // If we already have a course with content, redirect to chat
  useEffect(() => {
    if (existingCourse?.id && content?.sections && content.sections.length > 0) {
      router.replace(`/learn/${existingCourse.id}/chat`)
    }
  }, [existingCourse, content, router])

  const [isStarting, setIsStarting] = useState(false)

  const handleStartCourse = async () => {
    if (isStarting) return
    setIsStarting(true)

    const topic = displayTopic
    // Default to 'solid' depth - quiz difficulty determines rewards now
    const depth: CourseDepth = 'solid'

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Look up pre-generated course from course_catalog
      let catalogCourse = null

      // Try by showcase_topic_id first
      const { data: byId } = await supabase
        .from('course_catalog')
        .select('*')
        .eq('showcase_topic_id', topicId)
        .eq('depth', depth)
        .eq('is_published', true)
        .single()

      if (byId) {
        catalogCourse = byId
      } else {
        // Fall back to topic name search
        const { data: byTopic } = await supabase
          .from('course_catalog')
          .select('*')
          .eq('topic', topic)
          .eq('depth', depth)
          .eq('is_published', true)
          .single()

        if (byTopic) {
          catalogCourse = byTopic
        } else {
          // Try any depth
          const { data: anyDepth } = await supabase
            .from('course_catalog')
            .select('*')
            .eq('topic', topic)
            .eq('is_published', true)
            .limit(1)
            .single()

          if (anyDepth) {
            catalogCourse = anyDepth
          } else {
            alert(`No course found for "${topic}". The course may not have been created yet.`)
            setIsStarting(false)
            return
          }
        }
      }

      // Create a user-specific course record
      const { data: newCourse, error: courseError } = await supabase
        .from('courses')
        .insert({
          user_id: user.id,
          topic: catalogCourse.topic,
          content: catalogCourse.content,
          quiz_questions: catalogCourse.quiz_questions,
          intensity: 'solid',
          time_budget: 15,
          ai_provider: catalogCourse.ai_provider || 'anthropic',
        })
        .select()
        .single()

      if (courseError || !newCourse) {
        alert(`Failed to create course: ${courseError?.message || 'Unknown error'}`)
        setIsStarting(false)
        return
      }

      // Create progress record
      const contentData = catalogCourse.content as { sections?: { id: string }[]; steps?: { id: string }[] }
      const firstSectionId = contentData?.sections?.[0]?.id || contentData?.steps?.[0]?.id || null

      await supabase
        .from('learning_progress')
        .insert({
          user_id: user.id,
          course_id: newCourse.id,
          current_section: firstSectionId,
          sections_completed: [],
        })

      // Update backlog item if exists
      if (backlogItemId) {
        await supabase
          .from('backlog_items')
          .update({
            course_id: newCourse.id,
            status: 'in_progress',
          })
          .eq('id', backlogItemId)
          .eq('user_id', user.id)
      }

      addCurio('course_started')

      // Go directly to chat mode
      router.push(`/learn/${newCourse.id}/chat`)
    } catch (error) {
      console.error('Error starting course:', error)
      alert(`Error starting course: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsStarting(false)
    }
  }

  // Loading state
  if (loadingCourse) {
    return (
      <PageContainer title="Loading" showBack>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          <p className="text-slate-500 dark:text-slate-400">Loading...</p>
        </div>
      </PageContainer>
    )
  }

  // Simple start screen - no depth selection
  return (
    <PageContainer title="" showBack>
      <div className="mx-auto max-w-md py-8">
        {/* Topic Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-lg shadow-primary-500/30">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {displayTopic}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Learn through conversation
          </p>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6 bg-slate-50 dark:bg-slate-800/50">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Chat-based learning</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Curio guides you through the topic step by step
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">~15 minutes</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Go at your own pace, ask questions anytime
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Quiz at the end</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Choose Easy, Medium, or Hard for different rewards
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Curio rewards preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50">
                <Star className="h-6 w-6 text-amber-600 dark:text-amber-400 fill-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  Earn 15-75 Curio
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Based on quiz difficulty and performance
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Start button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            type="button"
            onClick={handleStartCourse}
            loading={isStarting}
            disabled={isStarting}
            size="xl"
            className="w-full bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700"
            icon={!isStarting ? <Sparkles className="h-5 w-5" /> : undefined}
          >
            {isStarting ? 'Starting...' : 'Start Learning'}
          </Button>
        </motion.div>
      </div>
    </PageContainer>
  )
}
