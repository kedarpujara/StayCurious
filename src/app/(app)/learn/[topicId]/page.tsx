'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Clock, Play, Zap, BookOpen, Brain, Layers, Target, Lightbulb, HelpCircle, Sparkles, FileText } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout'
import { Button, Card, ProgressBar } from '@/components/ui'
import { CourseChat } from '@/components/course'
import { useAICourse } from '@/hooks/useAI'
import { useKarma } from '@/hooks/useKarma'
import { useCourseGeneration } from '@/contexts/CourseGenerationContext'
import { createClient } from '@/lib/supabase/client'
import { getRandomEncouragement, SECTION_COMPLETIONS } from '@/constants/microcopy'
import type { CourseContent, CourseSection } from '@/types'
import { cn } from '@/lib/utils/cn'

type LearningPhase = 'setup' | 'learning' | 'quiz' | 'complete'

export default function LearnTopicPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()

  const topicId = params.topicId as string
  const topicFromQuery = searchParams.get('topic')

  const [phase, setPhase] = useState<LearningPhase>('setup')
  const [intensity, setIntensity] = useState<'skim' | 'solid' | 'deep'>('solid')
  const [timeBudget, setTimeBudget] = useState<number>(15)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [completedSections, setCompletedSections] = useState<string[]>([])
  const [encouragement, setEncouragement] = useState('')

  const { error: generationError } = useAICourse()
  const { addKarma } = useKarma()
  const { startBackgroundGeneration } = useCourseGeneration()

  // Fetch existing course or backlog item
  // Also checks for existing courses by topic name when navigating to /learn/new?topic=X
  const { data: courseData, isLoading: loadingCourse } = useQuery({
    queryKey: ['course', topicId, topicFromQuery],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { course: null, backlogItem: null }

      // If topicId is 'new' and we have a topic query param, check for existing course by topic name
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
          console.log('[Course] Found existing course for topic:', topicFromQuery, existingCourse.id)
          return { course: existingCourse, backlogItem: null }
        }

        return { course: null, backlogItem: null }
      }

      // For new courses without a topic param
      if (topicId === 'new') {
        return { course: null, backlogItem: null }
      }

      // First check if this is a backlog item
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

      // Otherwise try to fetch as a course directly
      const { data: course } = await supabase
        .from('courses')
        .select('*')
        .eq('id', topicId)
        .eq('user_id', user.id)
        .single()

      return { course: course || null, backlogItem: null }
    },
  })

  // Extract course and backlog info from query result
  const existingCourse = courseData?.course || null
  const backlogItemId = courseData?.backlogItem?.id || null
  const backlogTopic = courseData?.backlogItem?.topic || null

  // Fetch progress for existing course
  const { data: progress } = useQuery({
    queryKey: ['progress', existingCourse?.id],
    queryFn: async (): Promise<{
      sections_completed: string[]
      current_section: string | null
      quiz_completed: boolean
      quiz_score: number | null
    } | null> => {
      if (!existingCourse?.id) return null

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('course_id', existingCourse.id)
        .eq('user_id', user.id)
        .single()

      return data as {
        sections_completed: string[]
        current_section: string | null
        quiz_completed: boolean
        quiz_score: number | null
      } | null
    },
    enabled: !!existingCourse?.id,
  })

  // Set up state from existing course or create progress if missing
  useEffect(() => {
    const initializeProgress = async () => {
      if (!existingCourse) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courseData = existingCourse as any
      const courseContent = courseData?.content as CourseContent | undefined

      // Guard against missing content
      if (!courseContent?.sections?.length) {
        return
      }

      if (progress) {
        // Restore from existing progress
        setPhase('learning')
        setCompletedSections(progress.sections_completed || [])
        const currentIdx = courseContent.sections.findIndex(
          (s: CourseSection) => s.id === progress.current_section
        )
        setCurrentSectionIndex(currentIdx >= 0 ? currentIdx : 0)
      } else {
        // Create progress record if it doesn't exist
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('learning_progress')
            .upsert({
              user_id: user.id,
              course_id: courseData.id,
              current_section: courseContent.sections[0]?.id || null,
              sections_completed: [],
              last_accessed_at: new Date().toISOString(),
            })
          // Start learning from the beginning
          setPhase('learning')
          setCurrentSectionIndex(0)
          setCompletedSections([])
          // Refetch progress
          queryClient.invalidateQueries({ queryKey: ['progress', courseData.id] })
        }
      }
    }

    initializeProgress()
  }, [existingCourse, progress, supabase, queryClient])

  // Get proper course object and ID
  const courseObject = existingCourse || null
  const courseId = existingCourse?.id
  const content = courseObject?.content as CourseContent | undefined
  const currentSection = content?.sections[currentSectionIndex]

  // Get the topic to display
  const displayTopic = topicFromQuery || backlogTopic || 'Learning'

  const handleStartCourse = async () => {
    const topic = displayTopic
    console.log('[Course] Starting background generation for:', topic, { intensity, timeBudget, backlogItemId })

    // Start generation in background and navigate away immediately
    startBackgroundGeneration(topic, intensity, timeBudget, backlogItemId || undefined)
    addKarma('course_started')

    // Navigate user to home so they can explore while course generates
    router.push('/')
  }

  const handleCompleteSection = async () => {
    if (!currentSection || !courseId) return

    const newCompleted = [...completedSections, currentSection.id]
    setCompletedSections(newCompleted)
    setEncouragement(getRandomEncouragement(SECTION_COMPLETIONS))

    // Update progress in database
    const { data: { user } } = await supabase.auth.getUser()
    if (user && courseId) {
      const { error } = await supabase
        .from('learning_progress')
        .upsert(
          {
            user_id: user.id,
            course_id: courseId,
            sections_completed: newCompleted,
            current_section: content?.sections[currentSectionIndex + 1]?.id || currentSection.id,
            last_accessed_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,course_id',
          }
        )

      if (error) {
        console.error('Failed to save progress:', error)
      }
    }

    // Award karma
    addKarma('section_completed')

    // Clear encouragement after a delay
    setTimeout(() => setEncouragement(''), 3000)
  }

  const handleNextSection = () => {
    if (content && currentSectionIndex < content.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1)
    } else {
      // Go to quiz
      router.push(`/learn/${courseId || topicId}/quiz`)
    }
  }

  const handlePrevSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1)
    }
  }

  const progressPercent = content
    ? Math.round((completedSections.length / content.sections.length) * 100)
    : 0

  // Course section previews based on depth
  const getSectionPreviews = (depth: typeof intensity) => {
    const baseSections = [
      { id: 'why', icon: Target, label: 'Why It Matters', desc: 'Real-world relevance' },
      { id: 'model', icon: Brain, label: 'Mental Model', desc: 'Framework for thinking' },
      { id: 'concepts', icon: Layers, label: 'Key Concepts', desc: 'Essential building blocks' },
      { id: 'example', icon: Lightbulb, label: 'Concrete Example', desc: 'Memorable illustration' },
    ]
    const advancedSections = [
      { id: 'misconceptions', icon: HelpCircle, label: 'Common Misconceptions', desc: 'What people get wrong' },
      { id: 'practical', icon: Sparkles, label: 'Practical Application', desc: 'How to use this' },
      { id: 'tldr', icon: FileText, label: 'TL;DR', desc: 'Quick summary' },
    ]

    if (depth === 'skim') return baseSections.slice(0, 3)
    if (depth === 'solid') return [...baseSections, advancedSections[0], advancedSections[2]]
    return [...baseSections, ...advancedSections]
  }

  const getDepthDescription = (depth: typeof intensity) => {
    switch (depth) {
      case 'skim': return { sections: 4, detail: 'Key points only', icon: Zap }
      case 'solid': return { sections: 6, detail: 'Examples & context', icon: BookOpen }
      case 'deep': return { sections: 8, detail: 'Full coverage', icon: Brain }
    }
  }

  // Check if existing course has valid content
  const existingCourseHasContent = existingCourse?.content?.sections?.length > 0

  // Show setup for:
  // 1. New courses (topicId === 'new')
  // 2. Backlog items without a valid course
  // 3. Existing courses that have no valid content (need to regenerate)
  const shouldShowSetup = phase === 'setup' && !loadingCourse && (
    topicId === 'new' ||
    (backlogItemId && !existingCourseHasContent) ||
    !content
  )

  // Loading state for fetching existing courses
  const showLoading = loadingCourse

  // Debug logging - only log when there might be an issue
  if (process.env.NODE_ENV === 'development' && !shouldShowSetup && !showLoading && !content) {
    console.log('[Course] Debug - No content available:', {
      topicId,
      phase,
      loadingCourse,
      hasExistingCourse: !!existingCourse,
      existingCourseHasContent,
      backlogItemId,
      backlogTopic,
      topicFromQuery,
      shouldShowSetup,
      showLoading,
      hasGenerationError: !!generationError,
    })
  }

  // Setup phase
  if (shouldShowSetup) {
    const depthInfo = getDepthDescription(intensity)
    const sections = getSectionPreviews(intensity)
    const DepthIcon = depthInfo.icon

    return (
      <PageContainer title="Create Course" showBack>
        <div className="mx-auto max-w-md">
          {/* Topic header */}
          <Card className="mb-6 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30 border-primary-200 dark:border-primary-700">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {displayTopic}
                </h2>
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  Personalized crash course
                </p>
              </div>
            </div>
          </Card>

          {/* Depth picker */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-medium text-slate-900 dark:text-white">
              <Brain className="h-4 w-4 text-primary-500" />
              Learning Depth
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'skim', label: 'Quick', icon: Zap, color: 'amber' },
                { value: 'solid', label: 'Solid', icon: BookOpen, color: 'primary' },
                { value: 'deep', label: 'Deep', icon: Brain, color: 'purple' },
              ].map((option) => {
                const Icon = option.icon
                const isSelected = intensity === option.value
                return (
                  <motion.button
                    key={option.value}
                    onClick={() => setIntensity(option.value as typeof intensity)}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      'relative flex flex-col items-center rounded-xl p-4 transition-all',
                      isSelected
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    )}
                  >
                    <Icon className={cn('mb-1 h-6 w-6', isSelected && 'text-white')} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </motion.button>
                )
              })}
            </div>
            <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
              {intensity === 'skim' && 'Quick overview of essential points'}
              {intensity === 'solid' && 'Balanced understanding with examples'}
              {intensity === 'deep' && 'Comprehensive coverage with nuances'}
            </p>
          </div>

          {/* Time picker */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-medium text-slate-900 dark:text-white">
              <Clock className="h-4 w-4 text-primary-500" />
              Time Budget
            </h3>
            <div className="flex gap-2">
              {[
                { time: 5, label: '5 min', desc: 'Quick bite' },
                { time: 15, label: '15 min', desc: 'Coffee break' },
                { time: 30, label: '30 min', desc: 'Deep session' },
                { time: 45, label: '45 min', desc: 'Full focus' },
              ].map((option) => (
                <motion.button
                  key={option.time}
                  onClick={() => setTimeBudget(option.time)}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    'flex-1 rounded-xl py-3 text-center transition-all',
                    timeBudget === option.time
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  )}
                >
                  <span className="block text-lg font-semibold">{option.time}</span>
                  <span className="block text-xs opacity-80">min</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Course preview */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-medium text-slate-900 dark:text-white">
              <Layers className="h-4 w-4 text-primary-500" />
              Course Preview
            </h3>
            <Card className="bg-slate-50 dark:bg-slate-800/50">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DepthIcon className="h-4 w-4 text-primary-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {depthInfo.sections} sections
                  </span>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  ~{timeBudget} min total
                </span>
              </div>
              <div className="space-y-2">
                {sections.map((section, idx) => {
                  const SectionIcon = section.icon
                  return (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/50">
                        <SectionIcon className="h-3 w-3 text-primary-600 dark:text-primary-400" />
                      </div>
                      <span className="text-slate-700 dark:text-slate-300">{section.label}</span>
                    </motion.div>
                  )
                })}
                {intensity !== 'deep' && (
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    + {intensity === 'skim' ? '4' : '2'} more sections with deeper depth
                  </p>
                )}
              </div>
            </Card>
          </div>

          <Button
            onClick={handleStartCourse}
            size="xl"
            className="w-full"
            icon={<Play className="h-5 w-5" />}
          >
            Generate Course
          </Button>
        </div>
      </PageContainer>
    )
  }

  // Loading state for fetching existing courses
  if (showLoading) {
    return (
      <PageContainer title="Loading" showBack>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            Loading...
          </h2>
          <p className="mb-4 text-center text-slate-500 dark:text-slate-400">
            Loading course...
          </p>
        </div>
      </PageContainer>
    )
  }

  // Learning phase - no content available
  if (!content || !currentSection) {
    return (
      <PageContainer title="Course Not Found" showBack>
        <Card className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <HelpCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            Course content not available
          </h2>
          <p className="mb-4 text-slate-500 dark:text-slate-400">
            {generationError
              ? generationError.message
              : "This course hasn't been created yet."}
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => router.back()}>
              Go Back
            </Button>
            {generationError && (
              <Button onClick={() => setPhase('setup')}>
                Try Again
              </Button>
            )}
          </div>
        </Card>
      </PageContainer>
    )
  }

  const isCurrentCompleted = completedSections.includes(currentSection.id)
  const isLastSection = currentSectionIndex === content.sections.length - 1
  const isQuizCompleted = progress?.quiz_completed === true

  return (
    <PageContainer
      title={existingCourse?.topic || displayTopic}
      showBack
      headerRight={
        <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
          <Clock className="h-4 w-4" />
          {content.totalEstimatedMinutes}m
        </div>
      }
    >
      {/* Progress bar */}
      <div className="mb-4">
        <ProgressBar value={progressPercent} showLabel />
      </div>

      {/* Section navigation */}
      <div className="mb-4 flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
        {content.sections.map((section, idx) => (
          <button
            key={section.id}
            onClick={() => setCurrentSectionIndex(idx)}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-all',
              idx === currentSectionIndex && 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-900',
              completedSections.includes(section.id)
                ? 'bg-green-500 text-white'
                : idx === currentSectionIndex
                ? 'bg-primary-600 text-white'
                : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
            )}
          >
            {completedSections.includes(section.id) ? (
              <Check className="h-4 w-4" />
            ) : (
              idx + 1
            )}
          </button>
        ))}
      </div>

      {/* Encouragement */}
      <AnimatePresence>
        {encouragement && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 rounded-xl bg-green-50 p-3 text-center text-green-700 dark:bg-green-900/30 dark:text-green-300"
          >
            {encouragement}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {currentSection.title}
          </h2>
          <span className="text-sm text-slate-400 dark:text-slate-500">
            ~{currentSection.estimatedMinutes}m
          </span>
        </div>
        <div className="prose prose-slate prose-sm max-w-none dark:prose-invert">
          {currentSection.content.split('\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handlePrevSection}
          variant="secondary"
          disabled={currentSectionIndex === 0}
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Prev
        </Button>

        {!isCurrentCompleted ? (
          <Button onClick={handleCompleteSection} className="flex-1">
            Mark Complete
          </Button>
        ) : isLastSection && isQuizCompleted ? (
          <Button
            onClick={() => router.push('/learn')}
            className="flex-1"
            icon={<Check className="h-4 w-4" />}
          >
            Completed
          </Button>
        ) : (
          <Button
            onClick={handleNextSection}
            className="flex-1"
            icon={<ArrowRight className="h-4 w-4" />}
          >
            {isLastSection ? 'Take Quiz' : 'Next'}
          </Button>
        )}
      </div>

      {/* Chat for follow-up questions */}
      {courseId && (
        <CourseChat
          courseId={courseId}
          courseTopic={existingCourse?.topic || displayTopic}
          currentSectionId={currentSection?.id}
        />
      )}
    </PageContainer>
  )
}
