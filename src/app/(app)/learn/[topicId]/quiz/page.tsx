'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, ArrowRight, RotateCcw, Sparkles, CheckCircle, XCircle, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react'
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
  const [showReview, setShowReview] = useState(false)
  const [expandedQuestionIndex, setExpandedQuestionIndex] = useState<number | null>(null)

  const { addCurio } = useCurio()

  // Fetch quiz questions and previous attempts
  useEffect(() => {
    async function loadQuiz() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // courseId is now the catalog_course_id
      setCatalogCourseId(courseId)

      // Fetch course from course_catalog
      const { data: courseData, error: fetchError } = await supabase
        .from('course_catalog')
        .select('quiz_questions')
        .eq('id', courseId)
        .single()

      if (fetchError) {
        console.error('Failed to fetch course:', fetchError)
        return
      }

      const catalogId = courseId

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
      const { data: previousProgress } = await supabase
        .from('user_course_progress')
        .select('status')
        .eq('catalog_course_id', courseId)
        .eq('user_id', user.id)
        .single()

      const wasAlreadyCompleted = previousProgress?.status === 'completed'

      await supabase
        .from('user_course_progress')
        .update({
          status: didPass ? 'completed' : 'in_progress',
          completed_at: didPass && !wasAlreadyCompleted ? new Date().toISOString() : undefined,
        })
        .eq('catalog_course_id', courseId)
        .eq('user_id', user.id)

      // Increment courses_completed stat if this is the first time completing this course
      if (didPass && !wasAlreadyCompleted) {
        await supabase.rpc('increment_user_stat', {
          p_user_id: user.id,
          p_stat: 'courses_completed'
        })
      }

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
    setShowReview(false)
    setExpandedQuestionIndex(null)
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

  // Quiz Review Component
  const QuizReview = () => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="w-full max-w-sm mt-4"
    >
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-slate-500" />
          <span className="font-medium text-slate-900 dark:text-white">Review Answers</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {quiz?.questions.map((question, index) => {
            const userAnswer = answers[index]
            const isCorrect = userAnswer === question.correctAnswer
            const isExpanded = expandedQuestionIndex === index

            return (
              <div key={question.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedQuestionIndex(isExpanded ? null : index)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    isCorrect
                      ? "bg-green-100 dark:bg-green-900/50"
                      : "bg-red-100 dark:bg-red-900/50"
                  )}>
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">
                      Q{index + 1}: {question.question}
                    </p>
                    <p className={cn(
                      "text-xs mt-0.5",
                      isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 bg-slate-50 dark:bg-slate-800/30">
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                          {question.question}
                        </p>
                        <div className="space-y-2">
                          {question.options.map((option, optIndex) => {
                            const isUserAnswer = optIndex === userAnswer
                            const isCorrectAnswer = optIndex === question.correctAnswer

                            return (
                              <div
                                key={optIndex}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-lg text-sm",
                                  isCorrectAnswer && "bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800",
                                  isUserAnswer && !isCorrectAnswer && "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800",
                                  !isUserAnswer && !isCorrectAnswer && "bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"
                                )}
                              >
                                <div className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                                  isCorrectAnswer && "bg-green-500 text-white",
                                  isUserAnswer && !isCorrectAnswer && "bg-red-500 text-white",
                                  !isUserAnswer && !isCorrectAnswer && "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                )}>
                                  {String.fromCharCode(65 + optIndex)}
                                </div>
                                <span className={cn(
                                  "flex-1",
                                  isCorrectAnswer && "text-green-800 dark:text-green-200 font-medium",
                                  isUserAnswer && !isCorrectAnswer && "text-red-800 dark:text-red-200",
                                  !isUserAnswer && !isCorrectAnswer && "text-slate-600 dark:text-slate-400"
                                )}>
                                  {option}
                                </span>
                                {isCorrectAnswer && (
                                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                                )}
                                {isUserAnswer && !isCorrectAnswer && (
                                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {question.explanation && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Explanation</p>
                            <p className="text-sm text-blue-800 dark:text-blue-200">{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </Card>
    </motion.div>
  )

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
              className="mb-6 w-full max-w-sm"
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

          {/* Review Button */}
          <Button
            onClick={() => setShowReview(!showReview)}
            variant="secondary"
            className="w-full max-w-sm mb-3"
            icon={showReview ? <ChevronUp className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
          >
            {showReview ? 'Hide Review' : 'Review Answers'}
          </Button>

          {/* Quiz Review Section */}
          <AnimatePresence>
            {showReview && <QuizReview />}
          </AnimatePresence>

          <Button
            onClick={() => router.push('/learn')}
            size="lg"
            className="w-full max-w-sm mt-4"
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

          {/* Review Button */}
          <Button
            onClick={() => setShowReview(!showReview)}
            variant="secondary"
            className="w-full max-w-sm mb-4"
            icon={showReview ? <ChevronUp className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
          >
            {showReview ? 'Hide Review' : 'Review Answers'}
          </Button>

          {/* Quiz Review Section */}
          <AnimatePresence>
            {showReview && <QuizReview />}
          </AnimatePresence>

          <div className="flex w-full max-w-sm gap-3 mt-4">
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
