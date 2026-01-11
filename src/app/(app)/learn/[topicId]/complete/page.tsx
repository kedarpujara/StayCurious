'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trophy, Sparkles, ArrowRight, Check, Lightbulb } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Button, Card } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { toDisplayFormat } from '@/lib/blueprint'
import type { CourseContent } from '@/types'
import { cn } from '@/lib/utils/cn'

type QuizDifficulty = 'easy' | 'medium' | 'hard'

interface QuizOption {
  difficulty: QuizDifficulty
  baseCurio: number
  description: string
}

const QUIZ_OPTIONS: QuizOption[] = [
  { difficulty: 'easy', baseCurio: 10, description: '5 questions, 80% to pass' },
  { difficulty: 'medium', baseCurio: 25, description: '5 questions, 80% to pass' },
  { difficulty: 'hard', baseCurio: 50, description: '10 questions, 80% to pass' },
]

// Retry multipliers
const ATTEMPT_MULTIPLIER: Record<number, number> = {
  1: 1.0,   // Full reward
  2: 0.5,   // 50%
  3: 0.25,  // 25%
}

// ELI5 challenge reward
const ELI5_CURIO_REWARD = 75

interface QuizAttemptSummary {
  difficulty: QuizDifficulty
  passed: boolean
  attemptCount: number
}

export default function CourseCompletePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const courseId = params.topicId as string

  // Fetch course data
  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single()

      if (error) throw error
      return data
    },
  })

  // Fetch quiz attempts for this course
  const { data: quizAttempts } = useQuery({
    queryKey: ['quiz-attempts', courseId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Get the catalog_course_id from progress
      const { data: progress } = await supabase
        .from('user_course_progress')
        .select('catalog_course_id')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .single()

      if (!progress?.catalog_course_id) return []

      // Fetch all attempts for this catalog course
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('difficulty, passed')
        .eq('user_id', user.id)
        .eq('catalog_course_id', progress.catalog_course_id)

      if (!attempts) return []

      // Summarize by difficulty
      const summary: Record<QuizDifficulty, QuizAttemptSummary> = {
        easy: { difficulty: 'easy', passed: false, attemptCount: 0 },
        medium: { difficulty: 'medium', passed: false, attemptCount: 0 },
        hard: { difficulty: 'hard', passed: false, attemptCount: 0 },
      }

      attempts.forEach(attempt => {
        const diff = attempt.difficulty as QuizDifficulty
        summary[diff].attemptCount++
        if (attempt.passed) summary[diff].passed = true
      })

      return Object.values(summary)
    },
    enabled: !!course,
    refetchOnMount: 'always',
    staleTime: 0,
  })

  // Fetch ELI5 completion status
  const { data: eli5Completed } = useQuery({
    queryKey: ['eli5-status', courseId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { data: progress } = await supabase
        .from('user_course_progress')
        .select('catalog_course_id')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .single()

      if (!progress?.catalog_course_id) return false

      const { data: submission } = await supabase
        .from('eli5_submissions')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', progress.catalog_course_id)
        .eq('passed', true)
        .single()

      return !!submission
    },
    enabled: !!course,
    refetchOnMount: 'always',
    staleTime: 0,
  })

  // Helper to get quiz status for a difficulty
  const getQuizStatus = (difficulty: QuizDifficulty) => {
    const attempt = quizAttempts?.find(a => a.difficulty === difficulty)
    return {
      passed: attempt?.passed ?? false,
      attemptCount: attempt?.attemptCount ?? 0,
    }
  }

  // Count how many distinct difficulties have been passed
  const passedDifficultiesCount = quizAttempts?.filter(a => a.passed).length ?? 0

  // Calculate expected curio for a difficulty based on attempts AND cross-difficulty
  const getExpectedCurio = (option: QuizOption) => {
    const status = getQuizStatus(option.difficulty)
    if (status.passed) return 0 // Already passed this difficulty
    const nextAttempt = status.attemptCount + 1
    // Retry multiplier for this specific difficulty
    const retryMultiplier = ATTEMPT_MULTIPLIER[Math.min(nextAttempt, 3)] ?? 0
    // Cross-difficulty multiplier: each subsequent quiz earns less
    const crossDiffMultiplier = ATTEMPT_MULTIPLIER[passedDifficultiesCount + 1] ?? 0
    return Math.floor(option.baseCurio * retryMultiplier * crossDiffMultiplier)
  }

  const handleStartQuiz = (difficulty: QuizDifficulty) => {
    router.push(`/learn/${courseId}/quiz?difficulty=${difficulty}`)
  }

  const handleSkipQuiz = () => {
    router.push('/learn')
  }

  const handleStartELI5 = () => {
    router.push(`/learn/${courseId}/eli5`)
  }

  if (isLoading) {
    return (
      <PageContainer title="Loading...">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      </PageContainer>
    )
  }

  const content = course?.content ? toDisplayFormat(course.content) as CourseContent : null
  const sections = content?.sections || []
  const totalCurioEarned = sections.length * 5

  return (
    <PageContainer title="Course Complete">
      <div className="mx-auto max-w-md space-y-6">
        {/* Celebration header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center pt-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2, damping: 10 }}
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500"
          >
            <Trophy className="h-10 w-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Congratulations!
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            You&apos;ve completed all {sections.length} sections
          </p>
        </motion.div>

        {/* Curio earned summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                  <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-300">Curio earned</p>
                  <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                    +{totalCurioEarned}
                  </p>
                </div>
              </div>
              <div className="text-right text-sm text-amber-600 dark:text-amber-400">
                {sections.length} sections × 5
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quiz options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Take a quiz for bonus Curio
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
            Pick your best difficulty! 2nd quiz = 50% Curio, 3rd = 25%.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
            <button
              onClick={() => router.push(`/learn/${courseId}/chat`)}
              className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 underline"
            >
              Review material
            </button>{' '}
            if you&apos;re unsure.
          </p>
          <div className="space-y-3">
            {QUIZ_OPTIONS.map((option, idx) => {
              const status = getQuizStatus(option.difficulty)
              const expectedCurio = getExpectedCurio(option)
              const isPassed = status.passed
              const hasAttempts = status.attemptCount > 0

              return (
                <motion.div
                  key={option.difficulty}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                >
                  <button
                    onClick={() => handleStartQuiz(option.difficulty)}
                    className={cn(
                      'w-full text-left',
                      isPassed && 'cursor-default'
                    )}
                    disabled={isPassed}
                  >
                    <Card
                      variant="interactive"
                      className={cn(
                        isPassed
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'hover:border-primary-300 dark:hover:border-primary-700'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'font-semibold capitalize',
                              isPassed
                                ? 'text-green-700 dark:text-green-300'
                                : 'text-slate-900 dark:text-white'
                            )}>
                              {option.difficulty}
                            </span>
                            {isPassed ? (
                              <span className="rounded-full bg-green-100 dark:bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300 flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Passed
                              </span>
                            ) : expectedCurio > 0 ? (
                              <span className="rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                +{expectedCurio} Curio
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                No Curio
                              </span>
                            )}
                          </div>
                          <p className={cn(
                            'text-sm mt-0.5',
                            isPassed
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-slate-500 dark:text-slate-400'
                          )}>
                            {isPassed ? (
                              'Completed'
                            ) : hasAttempts && expectedCurio < option.baseCurio ? (
                              <>Retry #{status.attemptCount + 1} - {option.description}</>
                            ) : (
                              option.description
                            )}
                          </p>
                        </div>
                        {isPassed ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                        ) : (
                          <ArrowRight className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </Card>
                  </button>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* ELI5 Challenge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Mastery Challenge
          </h2>
          <button
            onClick={handleStartELI5}
            className="w-full text-left"
            disabled={eli5Completed}
          >
            <Card
              variant="interactive"
              className={cn(
                eli5Completed
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                  : 'hover:border-purple-300 dark:hover:border-purple-700'
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                    eli5Completed
                      ? 'bg-purple-100 dark:bg-purple-900/50'
                      : 'bg-gradient-to-br from-purple-400 to-indigo-500'
                  )}
                >
                  <Lightbulb
                    className={cn(
                      'h-6 w-6',
                      eli5Completed
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-white'
                    )}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-semibold',
                        eli5Completed
                          ? 'text-purple-700 dark:text-purple-300'
                          : 'text-slate-900 dark:text-white'
                      )}
                    >
                      ELI5 Challenge
                    </span>
                    {eli5Completed ? (
                      <span className="rounded-full bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Completed
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                        +{ELI5_CURIO_REWARD} Curio
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      'text-sm mt-0.5',
                      eli5Completed
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-slate-500 dark:text-slate-400'
                    )}
                  >
                    {eli5Completed
                      ? 'You proved true understanding!'
                      : 'Explain 3 concepts simply using voice'}
                  </p>
                </div>
                {eli5Completed ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
                    <Check className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                ) : (
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                )}
              </div>
            </Card>
          </button>
        </motion.div>

        {/* Skip option */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center pt-2"
        >
          <button
            onClick={handleSkipQuiz}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Skip for now
          </button>
        </motion.div>
      </div>
    </PageContainer>
  )
}
