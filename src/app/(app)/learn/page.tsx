'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Sparkles, ArrowRight, Play, Bookmark, BookmarkCheck, CheckCircle, Trophy, MessageCircle, Library, Clock, Plus, Loader2, Trash2, ChevronDown, ChevronUp, User, ChevronLeft, FlaskConical } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout'
import { Card, Button } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { toDisplayFormat } from '@/lib/blueprint'
import { CATEGORIES } from '@/types'
import { cn } from '@/lib/utils/cn'
import { useCourseGeneration } from '@/contexts/CourseGenerationContext'

type TabType = 'my-courses' | 'saved' | 'questions' | 'almanac' | 'sample'

interface AlmanacCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  parent_id: string | null
  display_order: number
  topic_count?: number
}

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState<TabType>('my-courses')
  const [generatingQuestionId, setGeneratingQuestionId] = useState<string | null>(null)
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null)
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)
  const [savingCourseId, setSavingCourseId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<AlmanacCategory | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<AlmanacCategory | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { startBackgroundGeneration, pendingCourse } = useCourseGeneration()

  // Fetch top-level almanac categories with topic counts
  // OPTIMIZED: Added staleTime to cache results
  const { data: almanacCategories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['almanac-categories'],
    queryFn: async () => {
      // Fetch all categories
      const { data: categories, error } = await supabase
        .from('almanac_categories')
        .select('*')
        .is('parent_id', null)
        .order('display_order')

      if (error) throw error

      // For each top-level category, get topic count from subcategories
      const categoriesWithCounts = await Promise.all(
        (categories || []).map(async (cat) => {
          // Get subcategories
          const { data: subs } = await supabase
            .from('almanac_categories')
            .select('id')
            .eq('parent_id', cat.id)

          const subIds = subs?.map(s => s.id) || []

          // Get topic count from those subcategories
          const { count } = await supabase
            .from('showcase_topics')
            .select('*', { count: 'exact', head: true })
            .in('subcategory_id', subIds.length > 0 ? subIds : ['none'])

          return { ...cat, topic_count: count || 0 }
        })
      )

      return categoriesWithCounts as AlmanacCategory[]
    },
    staleTime: 1000 * 60 * 10, // Cache categories for 10 minutes (they rarely change)
  })

  // Fetch subcategories for selected category
  // OPTIMIZED: Added staleTime to cache results
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery({
    queryKey: ['almanac-subcategories', selectedCategory?.id],
    queryFn: async () => {
      if (!selectedCategory) return []

      const { data: subs, error } = await supabase
        .from('almanac_categories')
        .select('*')
        .eq('parent_id', selectedCategory.id)
        .order('display_order')

      if (error) throw error

      // Get topic counts for each subcategory
      const subsWithCounts = await Promise.all(
        (subs || []).map(async (sub) => {
          const { count } = await supabase
            .from('showcase_topics')
            .select('*', { count: 'exact', head: true })
            .eq('subcategory_id', sub.id)

          return { ...sub, topic_count: count || 0 }
        })
      )

      return subsWithCounts as AlmanacCategory[]
    },
    enabled: !!selectedCategory,
    staleTime: 1000 * 60 * 10, // Cache subcategories for 10 minutes
  })

  // Fetch topics for selected subcategory with their course status
  // OPTIMIZED: Added staleTime to cache results
  const { data: subcategoryTopics = [], isLoading: topicsLoading } = useQuery({
    queryKey: ['almanac-topics', selectedSubcategory?.id],
    queryFn: async () => {
      if (!selectedSubcategory) return []

      // Get topics in this subcategory
      const { data: topics, error } = await supabase
        .from('showcase_topics')
        .select('*')
        .eq('subcategory_id', selectedSubcategory.id)
        .order('display_order')

      if (error) throw error

      // Get courses for these topics
      const topicIds = topics?.map(t => t.id) || []
      const { data: coursesForTopics } = await supabase
        .from('course_catalog')
        .select('id, topic, showcase_topic_id, section_count, difficulty, estimated_minutes')
        .eq('source', 'almanac')
        .eq('is_published', true)
        .in('showcase_topic_id', topicIds.length > 0 ? topicIds : ['none'])

      // Map courses to topics
      const courseMap = new Map(
        coursesForTopics?.map(c => [c.showcase_topic_id, c]) || []
      )

      return (topics || []).map(topic => ({
        ...topic,
        course: courseMap.get(topic.id) || null
      }))
    },
    enabled: !!selectedSubcategory,
    staleTime: 1000 * 60 * 5, // Cache topics for 5 minutes
  })

  // Fetch featured courses from course_catalog with creator info
  // OPTIMIZED: Select only needed fields (not full content JSONB)
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['featured-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_catalog')
        .select(`
          id,
          topic,
          description,
          category,
          difficulty,
          section_count,
          estimated_minutes,
          is_featured,
          source,
          content,
          creator:creator_id(username)
        `)
        .eq('is_published', true)
        .eq('source', 'almanac')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error fetching courses:', error)
        throw error
      }
      return data || []
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  // Fetch user's course progress (in progress, saved, and completed)
  // OPTIMIZED: Select only needed fields, cache for 30 seconds
  const { data: userProgress = [], isLoading: userProgressLoading, isFetching: userProgressFetching } = useQuery({
    queryKey: ['user-progress'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('user_course_progress')
        .select(`
          id,
          user_id,
          catalog_course_id,
          current_section_index,
          total_sections,
          status,
          completed_at,
          last_accessed_at,
          catalog_course:course_catalog(
            id,
            topic,
            description,
            category,
            difficulty,
            section_count,
            source,
            creator:creator_id(username)
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['in_progress', 'saved', 'completed'])
        .order('last_accessed_at', { ascending: false })

      if (error) {
        console.error('Error fetching user progress:', error)
        throw error
      }
      return data || []
    },
    staleTime: 1000 * 30, // Cache for 30 seconds to reduce refetches
  })

  // Show loading state on initial load OR when refetching with no data
  const showCoursesLoading = userProgressLoading || (userProgressFetching && userProgress.length === 0)

  // Fetch recent questions with linked course info
  const { data: recentQuestions = [] } = useQuery({
    queryKey: ['user-questions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('user_questions')
        .select('id, question, title, answer, created_at, course_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error fetching questions:', error)
        return []
      }

      return data || []
    },
    staleTime: 1000 * 60 * 2, // Cache questions for 2 minutes
  })

  // Base curio rewards by quiz difficulty
  const QUIZ_BASE_CURIO: Record<string, number> = {
    easy: 10,
    medium: 25,
    hard: 50,
  }

  // ELI5 challenge reward
  const ELI5_CURIO_REWARD = 75

  // Fetch quiz attempts for completed courses to show total curio earned
  const { data: quizCurioByProgress = {} } = useQuery({
    queryKey: ['quiz-curio-by-progress', userProgress],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return {}

      const completedProgressIds = userProgress
        .filter((p: any) => p.status === 'completed' && p.catalog_course_id)
        .map((p: any) => p.catalog_course_id)

      if (completedProgressIds.length === 0) return {}

      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('catalog_course_id, difficulty, passed, curio_earned, created_at')
        .eq('user_id', user.id)
        .in('catalog_course_id', completedProgressIds)
        .order('created_at', { ascending: true })

      if (!attempts) return {}

      const curioMap: Record<string, number> = {}
      const attemptsByCourse: Record<string, typeof attempts> = {}
      attempts.forEach(a => {
        if (a.catalog_course_id) {
          if (!attemptsByCourse[a.catalog_course_id]) {
            attemptsByCourse[a.catalog_course_id] = []
          }
          attemptsByCourse[a.catalog_course_id].push(a)
        }
      })

      Object.entries(attemptsByCourse).forEach(([courseId, courseAttempts]) => {
        let totalCurio = 0
        const passedDifficulties = new Set<string>()

        courseAttempts.forEach(attempt => {
          if (attempt.passed && !passedDifficulties.has(attempt.difficulty)) {
            const baseCurio = QUIZ_BASE_CURIO[attempt.difficulty] || 0
            const multipliers = [1.0, 0.5, 0.25]
            const multiplier = multipliers[passedDifficulties.size] ?? 0
            totalCurio += Math.floor(baseCurio * multiplier)
            passedDifficulties.add(attempt.difficulty)
          }
        })

        curioMap[courseId] = totalCurio
      })

      return curioMap
    },
    enabled: userProgress.length > 0,
  })

  // Fetch ELI5 submissions for completed courses
  const { data: eli5ByProgress = {} } = useQuery({
    queryKey: ['eli5-by-progress', userProgress],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return {}

      const completedProgressIds = userProgress
        .filter((p: any) => p.status === 'completed' && p.catalog_course_id)
        .map((p: any) => p.catalog_course_id)

      if (completedProgressIds.length === 0) return {}

      const { data: submissions } = await supabase
        .from('eli5_submissions')
        .select('course_id, passed, mcurio_awarded')
        .eq('user_id', user.id)
        .eq('passed', true)
        .in('course_id', completedProgressIds)

      if (!submissions) return {}

      const eli5Map: Record<string, number> = {}
      submissions.forEach(s => {
        if (s.course_id) {
          eli5Map[s.course_id] = s.mcurio_awarded || ELI5_CURIO_REWARD
        }
      })

      return eli5Map
    },
    enabled: userProgress.length > 0,
  })

  // Split progress into categories
  const inProgressCourses = userProgress.filter((p: any) => p.status === 'in_progress')
  const savedCourses = userProgress.filter((p: any) => p.status === 'saved')
  const completedCourses = userProgress.filter((p: any) => p.status === 'completed')

  // Get set of saved catalog course IDs for quick lookup
  const savedCourseIds = new Set(
    userProgress.map((p: any) => p.catalog_course_id).filter(Boolean)
  )

  // Mutation to save course (with optimistic update to prevent flicker)
  const saveMutation = useMutation({
    mutationFn: async (catalogCourseId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const course = courses.find((c: any) => c.id === catalogCourseId)
      const content = course?.content ? toDisplayFormat(course.content) : null
      const totalSections = content?.sections?.length || 0

      const { error } = await supabase
        .from('user_course_progress')
        .insert({
          user_id: user.id,
          catalog_course_id: catalogCourseId,
          total_sections: totalSections,
          status: 'saved',
          sections_completed: [],
          current_section_index: 0,
        })

      if (error) throw error
      return catalogCourseId
    },
    onMutate: async (catalogCourseId) => {
      setSavingCourseId(catalogCourseId)
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['user-progress'] })

      // Snapshot current value
      const previousProgress = queryClient.getQueryData(['user-progress'])

      // Optimistically update by adding a fake saved entry
      const course = courses.find((c: any) => c.id === catalogCourseId)
      queryClient.setQueryData(['user-progress'], (old: any[] = []) => [
        ...old,
        {
          id: `temp-${catalogCourseId}`,
          catalog_course_id: catalogCourseId,
          status: 'saved',
          catalog_course: course,
        },
      ])

      return { previousProgress }
    },
    onError: (_err, _vars, context) => {
      // Roll back on error
      if (context?.previousProgress) {
        queryClient.setQueryData(['user-progress'], context.previousProgress)
      }
    },
    onSettled: () => {
      setSavingCourseId(null)
      queryClient.invalidateQueries({ queryKey: ['user-progress'] })
    },
  })

  // Mutation to unsave course (with optimistic update to prevent flicker)
  const unsaveMutation = useMutation({
    mutationFn: async (catalogCourseId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('user_course_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('catalog_course_id', catalogCourseId)
        .eq('status', 'saved')

      if (error) throw error
      return catalogCourseId
    },
    onMutate: async (catalogCourseId) => {
      setSavingCourseId(catalogCourseId)
      await queryClient.cancelQueries({ queryKey: ['user-progress'] })

      const previousProgress = queryClient.getQueryData(['user-progress'])

      // Optimistically remove the saved entry
      queryClient.setQueryData(['user-progress'], (old: any[] = []) =>
        old.filter((p) => p.catalog_course_id !== catalogCourseId || p.status !== 'saved')
      )

      return { previousProgress }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousProgress) {
        queryClient.setQueryData(['user-progress'], context.previousProgress)
      }
    },
    onSettled: () => {
      setSavingCourseId(null)
      queryClient.invalidateQueries({ queryKey: ['user-progress'] })
    },
  })

  // Mutation to delete question
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      setDeletingQuestionId(questionId)
      const response = await fetch(`/api/questions?id=${questionId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete question')
      return questionId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-questions'] })
      setDeletingQuestionId(null)
    },
    onError: () => {
      setDeletingQuestionId(null)
    },
  })

  const getCategoryInfo = (categoryId: string | null) => {
    return CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[5]
  }

  const handleStartCourse = (courseId: string) => {
    router.push(`/learn/${courseId}`)
  }

  const handleToggleSave = async (catalogCourseId: string, isSaved: boolean) => {
    if (isSaved) {
      unsaveMutation.mutate(catalogCourseId)
    } else {
      saveMutation.mutate(catalogCourseId)
    }
  }

  const handleGenerateCourse = (questionId: string, question: string) => {
    setGeneratingQuestionId(questionId)
    startBackgroundGeneration(question, questionId)
  }

  // Check if a specific question is generating
  const isQuestionGenerating = (questionId: string, questionText: string) => {
    return (generatingQuestionId === questionId && pendingCourse?.status === 'generating') ||
           (pendingCourse?.status === 'generating' && pendingCourse?.topic === questionText)
  }

  const tabs = [
    { id: 'my-courses' as TabType, label: 'My Courses', icon: BookOpen, count: inProgressCourses.length + completedCourses.length },
    { id: 'saved' as TabType, label: 'Saved', icon: Bookmark, count: savedCourses.length },
    { id: 'questions' as TabType, label: 'My Questions', icon: MessageCircle, count: recentQuestions.length },
    { id: 'almanac' as TabType, label: 'Almanac', icon: Library, count: null },
    { id: 'sample' as TabType, label: 'Sample', icon: FlaskConical, count: null },
  ]

  return (
    <PageContainer title="Learn">
      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                isActive
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className={cn(
                  'px-1.5 py-0.5 text-xs rounded-full',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* My Courses Tab */}
        {activeTab === 'my-courses' && (
          <motion.div
            key="my-courses"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Loading Skeleton */}
            {showCoursesLoading && (
              <div className="space-y-8">
                {/* Continue Learning Skeleton */}
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-5 w-5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Card key={i} className="relative overflow-hidden">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                            <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                          </div>
                          <div className="h-5 w-5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>

                {/* Completed Skeleton */}
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-5 w-5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="relative">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                            <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                          </div>
                          <div className="h-8 w-20 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* In Progress Section */}
            {!showCoursesLoading && inProgressCourses.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                  <Clock className="h-5 w-5 text-primary-500" />
                  Continue Learning
                </h2>
                <div className="space-y-4">
                  {inProgressCourses.map((progress: any) => {
                    const course = progress.catalog_course
                    if (!course) return null

                    const progressPercent = progress.total_sections > 0
                      ? Math.round((progress.current_section_index / progress.total_sections) * 100)
                      : 0

                    return (
                      <Card key={progress.id} variant="interactive" className="relative overflow-hidden">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900">
                            <BookOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="mb-1 font-medium text-slate-900 dark:text-white line-clamp-2">
                              {course.topic}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                              <span>{progress.current_section_index} of {progress.total_sections} sections</span>
                              <span>({progressPercent}%)</span>
                              <span className="flex items-center gap-1">
                                •
                                {course.source === 'almanac' ? (
                                  <>
                                    <Library className="h-3 w-3" />
                                    Almanac
                                  </>
                                ) : course.creator?.username ? (
                                  <>
                                    <User className="h-3 w-3" />
                                    @{course.creator.username}
                                  </>
                                ) : (
                                  <>
                                    <User className="h-3 w-3" />
                                    You
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-primary-500 transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => router.push(`/learn/${progress.catalog_course_id}/chat`)}
                            icon={<ArrowRight className="h-4 w-4" />}
                          >
                            Continue
                          </Button>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Completed Courses Section */}
            {!showCoursesLoading && completedCourses.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Completed
                </h2>
                <div className="space-y-4">
                  {completedCourses.map((progress: any) => {
                    const course = progress.catalog_course
                    if (!course) return null
                    const courseCurio = (progress.total_sections || 0) * 5
                    const quizCurio = quizCurioByProgress[progress.catalog_course_id] || 0
                    const eli5Curio = eli5ByProgress[progress.catalog_course_id] || 0
                    const totalCurio = courseCurio + quizCurio + eli5Curio

                    // Calculate potential additional earnings
                    const hasQuiz = quizCurio > 0
                    const hasEli5 = eli5Curio > 0
                    const potentialQuiz = hasQuiz ? 0 : 85 // Max ~85 from quizzes
                    const potentialEli5 = hasEli5 ? 0 : 75 // 75 from ELI5
                    const potentialTotal = potentialQuiz + potentialEli5

                    // Determine CTA text
                    let ctaText = 'Review'
                    if (!hasQuiz && !hasEli5) {
                      ctaText = `+${potentialTotal} available`
                    } else if (!hasQuiz) {
                      ctaText = 'Take quiz!'
                    } else if (!hasEli5) {
                      ctaText = 'Try ELI5!'
                    }

                    // Format completion date
                    const completedDate = progress.completed_at
                      ? new Date(progress.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : null

                    return (
                      <motion.div key={progress.id}>
                        <Card className="relative">
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-slate-900 dark:text-white line-clamp-2">
                                {course.topic}
                              </h3>
                              <div className="flex items-center gap-2 text-xs mt-1 flex-wrap">
                                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                  <Sparkles className="h-3 w-3" />
                                  +{totalCurio} Curio
                                </span>
                                {hasQuiz && (
                                  <span className="text-green-600 dark:text-green-400">✓ Quiz</span>
                                )}
                                {hasEli5 && (
                                  <span className="text-purple-600 dark:text-purple-400">✓ ELI5</span>
                                )}
                                {completedDate && (
                                  <span className="text-slate-400 dark:text-slate-500">• {completedDate}</span>
                                )}
                                <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                                  •
                                  {course.source === 'almanac' ? (
                                    <>
                                      <Library className="h-3 w-3" />
                                      Almanac
                                    </>
                                  ) : course.creator?.username ? (
                                    <>
                                      <User className="h-3 w-3" />
                                      @{course.creator.username}
                                    </>
                                  ) : (
                                    <>
                                      <User className="h-3 w-3" />
                                      You
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Button
                              size="sm"
                              variant={potentialTotal > 0 ? 'primary' : 'secondary'}
                              onClick={() => router.push(`/learn/${progress.catalog_course_id}/complete`)}
                            >
                              {ctaText}
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Empty State */}
            {!showCoursesLoading && inProgressCourses.length === 0 && completedCourses.length === 0 && (
              <Card className="py-12 text-center">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
                <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-white">
                  No courses yet
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  Start learning by browsing the Almanac or asking a question!
                </p>
                <Button onClick={() => setActiveTab('almanac')}>
                  Browse Almanac
                </Button>
              </Card>
            )}
          </motion.div>
        )}

        {/* Saved Tab */}
        {activeTab === 'saved' && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {showCoursesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="relative">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                        <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                        <div className="h-8 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : savedCourses.length > 0 ? (
              <div className="space-y-4">
                {savedCourses.map((progress: any) => {
                  const course = progress.catalog_course
                  if (!course) return null
                  const category = getCategoryInfo(course.category)

                  return (
                    <motion.div key={progress.id}>
                      <Card className="relative">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xl">
                            {category.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-slate-900 dark:text-white line-clamp-2">
                              {course.topic}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mt-1">
                              <span>{course.section_count} sections</span>
                              <span className="capitalize">{course.difficulty || 'beginner'}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              handleToggleSave(course.id, true)
                            }}
                            disabled={savingCourseId === course.id}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                          >
                            {savingCourseId === course.id ? (
                              <Loader2 className="h-5 w-5 text-primary-500 animate-spin" />
                            ) : (
                              <BookmarkCheck className="h-5 w-5 text-primary-500" />
                            )}
                          </button>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleStartCourse(course.id)}
                            icon={<Play className="h-4 w-4" />}
                          >
                            Start
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <Card className="py-12 text-center">
                <Bookmark className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
                <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-white">
                  No saved courses
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  Save courses from the Almanac to learn later
                </p>
                <Button onClick={() => setActiveTab('almanac')}>
                  Browse Almanac
                </Button>
              </Card>
            )}
          </motion.div>
        )}

        {/* My Questions Tab */}
        {activeTab === 'questions' && (
          <motion.div
            key="questions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {recentQuestions.length > 0 ? (
              <div className="space-y-4">
                {recentQuestions.map((q: any) => {
                  const hasCourse = !!q.course_id
                  // Use title if available, otherwise raw question
                  const displayTitle = q.title
                  const hasNiceTitle = !!displayTitle
                  const isExpanded = expandedQuestionId === q.id
                  const hasAnswer = !!q.answer

                  return (
                    <Card key={q.id} className="relative">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          hasCourse
                            ? "bg-green-100 dark:bg-green-900/50"
                            : "bg-primary-100 dark:bg-primary-900/50"
                        )}>
                          {hasCourse ? (
                            <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <MessageCircle className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">
                            {displayTitle || q.question}
                          </p>
                          {hasNiceTitle && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {q.question}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {new Date(q.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteQuestionMutation.mutate(q.id)}
                          disabled={deleteQuestionMutation.isPending}
                          className="p-2 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors shrink-0"
                          title="Delete question"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {/* Action buttons row */}
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          {hasAnswer && (
                            <button
                              onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {isExpanded ? 'Hide answer' : 'Show answer'}
                            </button>
                          )}
                        </div>
                        {hasCourse ? (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/learn/${q.course_id}`)}
                            icon={<Play className="h-4 w-4" />}
                          >
                            View Course
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleGenerateCourse(q.id, q.question)}
                            disabled={isQuestionGenerating(q.id, q.question)}
                            icon={isQuestionGenerating(q.id, q.question)
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Plus className="h-4 w-4" />
                            }
                          >
                            {isQuestionGenerating(q.id, q.question) ? 'Generating...' : 'Generate Course'}
                          </Button>
                        )}
                      </div>
                      {/* Expandable answer section */}
                      <AnimatePresence>
                        {isExpanded && hasAnswer && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Quick Answer</p>
                              <div className="text-sm text-slate-700 dark:text-slate-300 prose prose-sm max-w-none dark:prose-invert">
                                {q.answer}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="py-12 text-center">
                <MessageCircle className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
                <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-white">
                  No questions yet
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  Ask questions on the Ask page and they'll appear here
                </p>
                <Link href="/ask">
                  <Button>Ask a Question</Button>
                </Link>
              </Card>
            )}
          </motion.div>
        )}

        {/* Almanac Tab */}
        {activeTab === 'almanac' && (
          <motion.div
            key="almanac"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Breadcrumb Navigation */}
            {(selectedCategory || selectedSubcategory) && (
              <div className="mb-4 flex items-center gap-2 text-sm">
                <button
                  onClick={() => {
                    setSelectedCategory(null)
                    setSelectedSubcategory(null)
                  }}
                  className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  Almanac
                </button>
                {selectedCategory && (
                  <>
                    <ChevronLeft className="h-4 w-4 text-slate-400 rotate-180" />
                    <button
                      onClick={() => setSelectedSubcategory(null)}
                      className={cn(
                        selectedSubcategory
                          ? "text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                          : "text-slate-900 dark:text-white font-medium"
                      )}
                    >
                      {selectedCategory.name}
                    </button>
                  </>
                )}
                {selectedSubcategory && (
                  <>
                    <ChevronLeft className="h-4 w-4 text-slate-400 rotate-180" />
                    <span className="text-slate-900 dark:text-white font-medium">
                      {selectedSubcategory.name}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Top-level Categories View */}
            {!selectedCategory && !selectedSubcategory && (
              <section>
                <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                  Browse the Almanac
                </h2>
                {categoriesLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {almanacCategories.map((cat) => (
                      <Card
                        key={cat.id}
                        variant="interactive"
                        className="text-center py-4 cursor-pointer"
                        onClick={() => setSelectedCategory(cat)}
                      >
                        <span className="text-3xl mb-2 block">{cat.icon || '📚'}</span>
                        <h3 className="font-medium text-slate-900 dark:text-white text-sm">
                          {cat.name}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          {cat.topic_count || 0} topics
                        </p>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Recent/Featured Courses */}
                {courses.length > 0 && (
                  <section className="mt-8">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      Available Courses
                    </h2>
                    <div className="space-y-3">
                      {courses.slice(0, 5).map((course: any, index: number) => {
                        const category = getCategoryInfo(course.category)
                        const isSaved = savedCourseIds.has(course.id)
                        const isInProgress = inProgressCourses.some((p: any) => p.catalog_course_id === course.id)
                        const isCompleted = completedCourses.some((p: any) => p.catalog_course_id === course.id)

                        if (isInProgress || isCompleted) return null

                        return (
                          <motion.div
                            key={course.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card className="relative">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xl">
                                  {category.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-medium text-slate-900 dark:text-white line-clamp-1">
                                    {course.topic}
                                  </h3>
                                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                                    {course.description}
                                  </p>
                                  <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mt-1">
                                    <span className="capitalize">{course.difficulty || 'beginner'}</span>
                                    <span>{course.section_count} sections</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault()
                                      handleToggleSave(course.id, isSaved)
                                    }}
                                    disabled={savingCourseId === course.id}
                                    className={cn(
                                      "p-2 rounded-full transition-colors",
                                      isSaved
                                        ? "text-primary-500"
                                        : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                  >
                                    {savingCourseId === course.id ? (
                                      <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : isSaved ? (
                                      <BookmarkCheck className="h-5 w-5" />
                                    ) : (
                                      <Bookmark className="h-5 w-5" />
                                    )}
                                  </button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleStartCourse(course.id)}
                                    icon={<Play className="h-4 w-4" />}
                                  >
                                    Start
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        )
                      })}
                    </div>
                  </section>
                )}
              </section>
            )}

            {/* Subcategories View */}
            {selectedCategory && !selectedSubcategory && (
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="text-2xl">{selectedCategory.icon || '📚'}</span>
                      {selectedCategory.name}
                    </h2>
                    {selectedCategory.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {selectedCategory.description}
                      </p>
                    )}
                  </div>
                </div>

                {subcategoriesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subcategories.map((sub) => (
                      <Card
                        key={sub.id}
                        variant="interactive"
                        className="cursor-pointer"
                        onClick={() => setSelectedSubcategory(sub)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{sub.icon || '📖'}</span>
                            <div>
                              <h3 className="font-medium text-slate-900 dark:text-white">
                                {sub.name}
                              </h3>
                              {sub.description && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                                  {sub.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400 dark:text-slate-500">
                              {sub.topic_count || 0} topics
                            </span>
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Topics View */}
            {selectedSubcategory && (
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedSubcategory(null)}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="text-2xl">{selectedSubcategory.icon || '📖'}</span>
                      {selectedSubcategory.name}
                    </h2>
                    {selectedSubcategory.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {selectedSubcategory.description}
                      </p>
                    )}
                  </div>
                </div>

                {topicsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
                    ))}
                  </div>
                ) : subcategoryTopics.length === 0 ? (
                  <Card className="py-8 text-center">
                    <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <p className="text-slate-500 dark:text-slate-400">
                      No topics in this category yet
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {subcategoryTopics.map((topic: any, index: number) => {
                      const hasCourse = !!topic.course
                      const isSaved = hasCourse && savedCourseIds.has(topic.course.id)

                      return (
                        <motion.div
                          key={topic.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <Card className={cn(
                            "relative",
                            !hasCourse && "opacity-70"
                          )}>
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                                hasCourse
                                  ? "bg-primary-100 dark:bg-primary-900/50"
                                  : "bg-slate-100 dark:bg-slate-700"
                              )}>
                                {hasCourse ? (
                                  <BookOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                                ) : (
                                  <Clock className="h-5 w-5 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-slate-900 dark:text-white">
                                  {topic.topic}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                                  {topic.description}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mt-1">
                                  <span className="capitalize">{topic.difficulty || 'beginner'}</span>
                                  {hasCourse && (
                                    <span>{topic.course.section_count} sections</span>
                                  )}
                                  {!hasCourse && (
                                    <span className="text-amber-500 dark:text-amber-400">Course generating...</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {hasCourse ? (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault()
                                        handleToggleSave(topic.course.id, isSaved)
                                      }}
                                      disabled={savingCourseId === topic.course.id}
                                      className={cn(
                                        "p-2 rounded-full transition-colors",
                                        isSaved
                                          ? "text-primary-500"
                                          : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                      )}
                                    >
                                      {savingCourseId === topic.course.id ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                      ) : isSaved ? (
                                        <BookmarkCheck className="h-5 w-5" />
                                      ) : (
                                        <Bookmark className="h-5 w-5" />
                                      )}
                                    </button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleStartCourse(topic.course.id)}
                                      icon={<Play className="h-4 w-4" />}
                                    >
                                      Start
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">
                                    Coming soon
                                  </span>
                                )}
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}
          </motion.div>
        )}

        {/* Sample Tab */}
        {activeTab === 'sample' && (
          <motion.div
            key="sample"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <section>
              <div className="mb-6 text-center">
                <FlaskConical className="mx-auto h-12 w-12 text-primary-500 mb-3" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  Test the New Course Format
                </h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Generate a sample course with ADHD-friendly formatting: subheadings, chunked content, front-loaded takeaways.
                </p>
              </div>

              <Card className="mb-6">
                <h3 className="font-medium text-slate-900 dark:text-white mb-3">Pick a topic from the Almanac</h3>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { topic: 'Why do we dream?', description: 'The science of dreams and sleep' },
                    { topic: 'How does compound interest work?', description: 'The power of exponential growth' },
                    { topic: 'What is the trolley problem?', description: 'Classic ethical dilemmas' },
                    { topic: 'How do black holes form?', description: 'The death of massive stars' },
                    { topic: 'What is cryptocurrency?', description: 'Digital money explained' },
                  ].map((item) => {
                    const isGenerating = pendingCourse?.status === 'generating' && pendingCourse?.topic === item.topic

                    return (
                      <button
                        key={item.topic}
                        onClick={() => startBackgroundGeneration(item.topic)}
                        disabled={pendingCourse?.status === 'generating'}
                        className={cn(
                          "text-left p-3 rounded-lg border transition-all",
                          isGenerating
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-slate-50 dark:hover:bg-slate-800",
                          pendingCourse?.status === 'generating' && !isGenerating && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{item.topic}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                          </div>
                          {isGenerating ? (
                            <Loader2 className="h-5 w-5 text-primary-500 animate-spin" />
                          ) : (
                            <Play className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </Card>

              {pendingCourse?.status === 'completed' && pendingCourse?.courseId && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card variant="highlighted" className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">Course Ready!</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {pendingCourse.topic}
                        </p>
                      </div>
                      <Button
                        onClick={() => router.push(`/learn/${pendingCourse.courseId}/chat`)}
                        icon={<Play className="h-4 w-4" />}
                      >
                        Start Learning
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}

              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <h4 className="font-medium text-slate-900 dark:text-white mb-2">New ADHD-Friendly Features</h4>
                <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                  <li>• <strong>Front-loaded takeaways</strong> - Key point at the start of each section</li>
                  <li>• <strong>Subheadings (###)</strong> - 2-3 scannable headers per section</li>
                  <li>• <strong>Chunked content</strong> - Short paragraphs (2-3 sentences max)</li>
                  <li>• <strong>Visual hierarchy</strong> - Bold terms, bullet points, white space</li>
                  <li>• <strong>Novelty hooks</strong> - Surprising facts to maintain engagement</li>
                </ul>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  )
}
