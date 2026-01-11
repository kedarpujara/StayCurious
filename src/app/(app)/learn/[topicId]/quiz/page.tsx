'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Trophy, ArrowRight, RotateCcw, Sparkles } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Button, Card, ProgressBar } from '@/components/ui'
import { useCurio } from '@/hooks/useCurio'
import { createClient } from '@/lib/supabase/client'
import { getRandomEncouragement, QUIZ_ENCOURAGEMENTS } from '@/constants/microcopy'
import type { Quiz } from '@/types'
import { cn } from '@/lib/utils/cn'

type QuizPhase = 'loading' | 'question' | 'results'
type QuizDifficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTY_CONFIG = {
  easy: { questionCount: 5, curioReward: 10, label: 'Easy' },
  medium: { questionCount: 5, curioReward: 25, label: 'Medium' },
  hard: { questionCount: 10, curioReward: 50, label: 'Hard' },
}

// Retry multipliers - each subsequent attempt earns less
const ATTEMPT_MULTIPLIER: Record<number, number> = {
  1: 1.0,   // Full reward
  2: 0.5,   // 50%
  3: 0.25,  // 25%
}

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = params.topicId as string
  const supabase = createClient()

  // Get difficulty from URL, default to medium
  const difficulty = (searchParams.get('difficulty') as QuizDifficulty) || 'medium'
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium

  const [phase, setPhase] = useState<QuizPhase>('loading')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [curioEarned, setCurioEarned] = useState(0)
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [catalogCourseId, setCatalogCourseId] = useState<string | null>(null)
  const [alreadyPassed, setAlreadyPassed] = useState(false)
  const [passedDifficultiesCount, setPassedDifficultiesCount] = useState(0)

  const { addCurio } = useCurio()

  // Fetch quiz questions and previous attempts
  useEffect(() => {
    async function loadQuiz() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch course and progress in parallel
      const [courseResult, progressResult] = await Promise.all([
        supabase
          .from('courses')
          .select('quiz_questions')
          .eq('id', courseId)
          .single(),
        supabase
          .from('user_course_progress')
          .select('catalog_course_id')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .single(),
      ])

      const catalogId = progressResult.data?.catalog_course_id
      setCatalogCourseId(catalogId || null)

      // Check for previous attempts
      if (catalogId) {
        // Fetch ALL attempts for this course (all difficulties)
        const { data: allAttempts } = await supabase
          .from('quiz_attempts')
          .select('difficulty, passed')
          .eq('user_id', user.id)
          .eq('catalog_course_id', catalogId)

        if (allAttempts) {
          // Count attempts at this specific difficulty
          const thisDifficultyAttempts = allAttempts.filter(a => a.difficulty === difficulty)
          if (thisDifficultyAttempts.length > 0) {
            setAttemptNumber(thisDifficultyAttempts.length + 1)
            const hasPassed = thisDifficultyAttempts.some(a => a.passed)
            setAlreadyPassed(hasPassed)
          }

          // Count how many DISTINCT difficulties have been passed
          const passedDifficulties = new Set(
            allAttempts.filter(a => a.passed).map(a => a.difficulty)
          )
          setPassedDifficultiesCount(passedDifficulties.size)
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courseData = courseResult.data as any
      if (courseData?.quiz_questions) {
        const fullQuiz = courseData.quiz_questions as Quiz
        // Slice questions based on difficulty, but use all available if not enough
        const availableQuestions = fullQuiz.questions.length
        const targetCount = Math.min(config.questionCount, availableQuestions)
        const questions = fullQuiz.questions.slice(0, targetCount)
        setQuiz({ ...fullQuiz, questions })
        setPhase('question')
      }
    }

    loadQuiz()
  }, [courseId, config.questionCount, difficulty, supabase])

  const currentQuestion = quiz?.questions[currentQuestionIndex]
  const score = answers.filter((a, i) => a === quiz?.questions[i].correctAnswer).length
  const totalQuestions = quiz?.questions.length || 0
  const scorePercent = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
  const passed = scorePercent >= 80

  const handleSelectAnswer = async (answerIndex: number) => {
    if (phase !== 'question') return
    setSelectedAnswer(answerIndex)

    // Record answer and move to next question immediately (no feedback)
    const newAnswers = [...answers, answerIndex]
    setAnswers(newAnswers)

    if (currentQuestionIndex < totalQuestions - 1) {
      // Small delay for visual feedback that answer was selected
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setSelectedAnswer(null)
      }, 300)
    } else {
      // Last question - show results
      setPhase('results')

      const finalScore = newAnswers.filter(
        (a, i) => a === quiz?.questions[i].correctAnswer
      ).length
      const finalPercent = Math.round((finalScore / totalQuestions) * 100)
      const didPass = finalPercent >= 80

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Calculate reward if passing (with multiplier for retries AND cross-difficulty)
      // Each subsequent quiz difficulty passed earns less curio
      let reward = 0
      if (didPass && !alreadyPassed) {
        // Retry multiplier for this specific difficulty
        const retryMultiplier = ATTEMPT_MULTIPLIER[Math.min(attemptNumber, 3)] ?? 0
        // Cross-difficulty multiplier: 1st quiz = 100%, 2nd = 50%, 3rd = 25%
        const crossDiffMultiplier = ATTEMPT_MULTIPLIER[passedDifficultiesCount + 1] ?? 0
        reward = Math.floor(config.curioReward * retryMultiplier * crossDiffMultiplier)
      }

      // Record quiz attempt with curio earned
      await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        course_id: courseId,
        catalog_course_id: catalogCourseId,
        difficulty,
        questions_total: totalQuestions,
        questions_correct: finalScore,
        score_percent: finalPercent,
        passed: didPass,
        curio_earned: reward,
        answers: newAnswers,
        attempt_number: attemptNumber,
      })

      // Update progress status
      await supabase
        .from('user_course_progress')
        .update({
          status: didPass ? 'completed' : 'in_progress',
        })
        .eq('course_id', courseId)
        .eq('user_id', user.id)

      // Award curio if passed
      if (didPass && !alreadyPassed && reward > 0) {
        setCurioEarned(reward)

        // Award curio to user's total
        await addCurio('quiz_passed', {
          intensity: difficulty === 'hard' ? 'deep' : difficulty === 'medium' ? 'solid' : 'skim',
          skipLevelUpToast: true,
        })
        setShowCelebration(true)
      } else if (didPass && alreadyPassed) {
        // Already passed before - no additional curio
        setShowCelebration(true)
      }
    }
  }

  const handleRetry = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setAnswers([])
    setAttemptNumber(prev => prev + 1)
    setPhase('question')
  }

  // Calculate expected reward based on attempt number, cross-difficulty, and whether already passed
  const expectedReward = alreadyPassed
    ? 0
    : Math.floor(
        config.curioReward *
        (ATTEMPT_MULTIPLIER[Math.min(attemptNumber, 3)] ?? 0) *
        (ATTEMPT_MULTIPLIER[passedDifficultiesCount + 1] ?? 0)
      )

  // Loading state
  if (phase === 'loading') {
    return (
      <PageContainer title="Loading Quiz..." showBack>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      </PageContainer>
    )
  }

  // Results - Passed (showCelebration indicates curio was awarded)
  if (phase === 'results' && passed) {
    return (
      <PageContainer title="Quiz Complete">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10 }}
            className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500"
          >
            <Trophy className="h-12 w-12 text-white" />
          </motion.div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
            Amazing!
          </h1>
          <p className="mb-6 text-center text-slate-600 dark:text-slate-300">
            You passed the {config.label.toLowerCase()} quiz!
          </p>

          <Card className="mb-6 w-full max-w-sm text-center">
            <p className="text-5xl font-bold text-slate-900 dark:text-white">{scorePercent}%</p>
            <p className="text-slate-500 dark:text-slate-400">
              {score} out of {totalQuestions} correct
            </p>
          </Card>

          {curioEarned > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6"
            >
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                    <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-amber-700 dark:text-amber-300">Bonus Curio earned</p>
                    <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                      +{curioEarned}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          <Button
            onClick={() => router.push('/learn')}
            size="lg"
            className="w-full max-w-sm"
            icon={<ArrowRight className="h-5 w-5" />}
          >
            Continue Learning
          </Button>
        </motion.div>
      </PageContainer>
    )
  }

  // Results - Failed
  if (phase === 'results' && !passed) {
    return (
      <PageContainer title="Quiz Complete">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-8"
        >
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <RotateCcw className="h-12 w-12 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
            Almost there!
          </h1>
          <p className="mb-2 text-center text-slate-600 dark:text-slate-300">
            {getRandomEncouragement(QUIZ_ENCOURAGEMENTS.retry)}
          </p>
          <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
            You need 80% to pass. Keep going!
          </p>

          <Card className="mb-6 w-full max-w-sm text-center">
            <p className="text-5xl font-bold text-slate-900 dark:text-white">{scorePercent}%</p>
            <p className="text-slate-500 dark:text-slate-400">
              {score} out of {totalQuestions} correct
            </p>
          </Card>

          <div className="flex w-full max-w-sm gap-3">
            <Button onClick={handleRetry} variant="secondary" className="flex-1">
              Try Again
            </Button>
            <Button
              onClick={() => router.push('/learn')}
              className="flex-1"
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Continue
            </Button>
          </div>
        </motion.div>
      </PageContainer>
    )
  }

  // No questions available
  if (!currentQuestion) {
    return (
      <PageContainer title="Quiz" showBack>
        <Card className="py-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">Quiz not available.</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </Card>
      </PageContainer>
    )
  }

  // Question/Feedback phases
  return (
    <PageContainer title={`${config.label} Quiz`} showBack>
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            {expectedReward > 0 ? (
              <>+{expectedReward} Curio</>
            ) : alreadyPassed ? (
              <span className="text-slate-400">Already passed</span>
            ) : (
              <span className="text-slate-400">No Curio (retry limit)</span>
            )}
          </span>
        </div>
        <ProgressBar
          value={((currentQuestionIndex + 1) / totalQuestions) * 100}
        />
      </div>

      {/* Question */}
      <Card className="mb-6">
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">
          {currentQuestion.question}
        </h2>
      </Card>

      {/* Options */}
      <div className="space-y-3">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === index

          return (
            <motion.button
              key={index}
              onClick={() => handleSelectAnswer(index)}
              disabled={selectedAnswer !== null}
              whileTap={{ scale: selectedAnswer === null ? 0.98 : 1 }}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all',
                selectedAnswer === null && 'hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30',
                !isSelected && 'border-slate-200 dark:border-slate-700',
                isSelected && 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                  isSelected && 'bg-primary-500 text-white'
                )}
              >
                {String.fromCharCode(65 + index)}
              </div>
              <span className="flex-1 text-slate-900 dark:text-white">{option}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Back to Learn link */}
      <div className="mt-6 text-center">
        <button
          onClick={() => router.push('/learn')}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          ← Back to Learn
        </button>
      </div>
    </PageContainer>
  )
}
