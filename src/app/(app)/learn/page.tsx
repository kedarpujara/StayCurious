'use client'

import { motion } from 'framer-motion'
import { BookOpen, Sparkles, ArrowRight, Play, Bookmark, BookmarkCheck, CheckCircle, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout'
import { Card, Button } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { toDisplayFormat } from '@/lib/blueprint'
import { CATEGORIES } from '@/types'
import { cn } from '@/lib/utils/cn'

export default function LearnPage() {
  const supabase = createClient()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch featured courses from course_catalog
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['featured-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_catalog')
        .select('*')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data || []
    },
  })

  // Fetch user's course progress (in progress, saved, and completed)
  const { data: userProgress = [] } = useQuery({
    queryKey: ['user-progress'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('user_course_progress')
        .select(`
          *,
          course:courses(*),
          catalog_course:course_catalog(*)
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
    refetchOnMount: 'always',
    staleTime: 0,
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

      // Get catalog course IDs for completed courses
      const completedProgressIds = userProgress
        .filter((p: any) => p.status === 'completed' && p.catalog_course_id)
        .map((p: any) => p.catalog_course_id)

      if (completedProgressIds.length === 0) return {}

      // Fetch ALL quiz attempts for these courses (to calculate cross-difficulty multipliers)
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('catalog_course_id, difficulty, passed, curio_earned, created_at')
        .eq('user_id', user.id)
        .in('catalog_course_id', completedProgressIds)
        .order('created_at', { ascending: true })

      if (!attempts) return {}

      // Calculate curio per course, accounting for cross-difficulty multipliers
      const curioMap: Record<string, number> = {}

      // Group attempts by catalog_course_id
      const attemptsByCourse: Record<string, typeof attempts> = {}
      attempts.forEach(a => {
        if (a.catalog_course_id) {
          if (!attemptsByCourse[a.catalog_course_id]) {
            attemptsByCourse[a.catalog_course_id] = []
          }
          attemptsByCourse[a.catalog_course_id].push(a)
        }
      })

      // For each course, calculate total curio earned
      Object.entries(attemptsByCourse).forEach(([courseId, courseAttempts]) => {
        let totalCurio = 0
        const passedDifficulties = new Set<string>()

        // Process attempts in chronological order
        courseAttempts.forEach(attempt => {
          if (attempt.passed && !passedDifficulties.has(attempt.difficulty)) {
            // First pass at this difficulty
            const baseCurio = QUIZ_BASE_CURIO[attempt.difficulty] || 0
            // Cross-difficulty multiplier based on how many already passed
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

      // Get catalog course IDs for completed courses
      const completedProgressIds = userProgress
        .filter((p: any) => p.status === 'completed' && p.catalog_course_id)
        .map((p: any) => p.catalog_course_id)

      if (completedProgressIds.length === 0) return {}

      // Fetch ELI5 submissions for these courses
      const { data: submissions } = await supabase
        .from('eli5_submissions')
        .select('course_id, passed, mcurio_awarded')
        .eq('user_id', user.id)
        .eq('passed', true)
        .in('course_id', completedProgressIds)

      if (!submissions) return {}

      // Map course_id to curio earned
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

  // Mutation to save course
  const saveMutation = useMutation({
    mutationFn: async (catalogCourseId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get course info for total sections
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-progress'] })
    },
  })

  // Mutation to unsave course
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-progress'] })
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

  return (
    <PageContainer title="Learn">
      {/* In Progress Section */}
      {inProgressCourses.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <BookOpen className="h-5 w-5 text-primary-500" />
            Continue Learning
          </h2>
          <div className="space-y-3">
            {inProgressCourses.map((progress: any) => {
              const course = progress.course
              if (!course) return null

              const progressPercent = progress.total_sections > 0
                ? Math.round((progress.current_section_index / progress.total_sections) * 100)
                : 0

              return (
                <Link key={progress.id} href={`/learn/${course.id}/chat`}>
                  <Card variant="interactive" className="relative overflow-hidden">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900">
                        <BookOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 font-medium text-slate-900 dark:text-white line-clamp-1">
                          {course.topic}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{progress.current_section_index} of {progress.total_sections} sections</span>
                          <span>({progressPercent}%)</span>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Completed Courses Section */}
      {completedCourses.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Trophy className="h-5 w-5 text-amber-500" />
            Completed
          </h2>
          <div className="space-y-3">
            {completedCourses.map((progress: any) => {
              const course = progress.course
              if (!course) return null
              const courseCurio = (progress.total_sections || 0) * 5
              const quizCurio = quizCurioByProgress[progress.catalog_course_id] || 0
              const eli5Curio = eli5ByProgress[progress.catalog_course_id] || 0
              const totalCurio = courseCurio + quizCurio + eli5Curio

              return (
                <motion.div key={progress.id}>
                  <Card className="relative">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-slate-900 dark:text-white line-clamp-1">
                          {course.topic}
                        </h3>
                        <div className="flex items-center gap-2 text-xs mt-1 flex-wrap">
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                            <Sparkles className="h-3 w-3" />
                            +{totalCurio} Curio
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="text-slate-500 dark:text-slate-400" title="Course completion">
                            📚 {courseCurio}
                          </span>
                          {quizCurio > 0 && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600">+</span>
                              <span className="text-green-600 dark:text-green-400" title="Quiz bonus">
                                ✓ {quizCurio}
                              </span>
                            </>
                          )}
                          {eli5Curio > 0 && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600">+</span>
                              <span className="text-purple-600 dark:text-purple-400" title="ELI5 bonus">
                                💡 {eli5Curio}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/learn/${course.id}/complete`)}
                          className="text-xs text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          {quizCurio === 0 || eli5Curio === 0 ? 'Earn more' : 'View'}
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </section>
      )}

      {/* Saved for Later Section */}
      {savedCourses.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Bookmark className="h-5 w-5 text-slate-500" />
            Saved for Later
          </h2>
          <div className="space-y-3">
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
                        <h3 className="font-medium text-slate-900 dark:text-white line-clamp-1">
                          {course.topic}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mt-1">
                          <span>{course.section_count} sections</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            handleToggleSave(course.id, true)
                          }}
                          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <BookmarkCheck className="h-5 w-5 text-primary-500" />
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

      {/* Featured Courses */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Featured Courses
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <Card className="py-12 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-white">
              No courses available yet
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Check back soon for new learning content!
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {courses.map((course: any, index: number) => {
              const category = getCategoryInfo(course.category)
              const isSaved = savedCourseIds.has(course.id)
              const isInProgress = inProgressCourses.some((p: any) => p.catalog_course_id === course.id)
              const isCompleted = completedCourses.some((p: any) => p.catalog_course_id === course.id)

              // Skip courses that are in progress or completed (they show in their own sections)
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
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            {course.topic}
                          </h3>
                          {course.is_featured && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                              Featured
                            </span>
                          )}
                        </div>
                        <p className="mb-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                          {course.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
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
                          disabled={saveMutation.isPending || unsaveMutation.isPending}
                          className={cn(
                            "p-2 rounded-full transition-colors",
                            isSaved
                              ? "text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                              : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          {isSaved ? (
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
        )}
      </section>
    </PageContainer>
  )
}
