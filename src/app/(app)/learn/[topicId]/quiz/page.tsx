'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Trophy, ArrowRight, RotateCcw } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout'
import { Button, Card, ProgressBar } from '@/components/ui'
import { CelebrationModal } from '@/components/celebration'
import { useAIQuiz } from '@/hooks/useAI'
import { useCurio } from '@/hooks/useCurio'
import { createClient } from '@/lib/supabase/client'
import { getRandomEncouragement, QUIZ_ENCOURAGEMENTS } from '@/constants/microcopy'
import type { Quiz, QuizQuestion, CurioResult } from '@/types'
import { cn } from '@/lib/utils/cn'

type QuizPhase = 'loading' | 'question' | 'feedback' | 'results'

interface CourseInfo {
  intensity: string
  time_budget: number
}

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.topicId as string
  const supabase = createClient()

  const [phase, setPhase] = useState<QuizPhase>('loading')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [curioResult, setCurioResult] = useState<CurioResult | null>(null)

  const { generateQuiz, isLoading: isGenerating } = useAIQuiz()
  const { addCurio, curio } = useCurio()

  // Fetch or generate quiz
  useEffect(() => {
    async function loadQuiz() {
      // First try to get existing quiz from course
      const { data: course } = await supabase
        .from('courses')
        .select('quiz_questions, intensity, time_budget')
        .eq('id', courseId)
        .single()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courseData = course as any
      if (courseData) {
        // Store course info for celebration modal
        setCourseInfo({
          intensity: courseData.intensity,
          time_budget: courseData.time_budget,
        })

        if (courseData.quiz_questions) {
          setQuiz(courseData.quiz_questions as Quiz)
          setPhase('question')
        } else {
          // Generate new quiz
          const generatedQuiz = await generateQuiz(courseId)
          if (generatedQuiz) {
            setQuiz(generatedQuiz)
            setPhase('question')
          }
        }
      }
    }

    loadQuiz()
  }, [courseId, generateQuiz, supabase])

  const currentQuestion = quiz?.questions[currentQuestionIndex]
  const isCorrect = selectedAnswer === currentQuestion?.correctAnswer
  const score = answers.filter((a, i) => a === quiz?.questions[i].correctAnswer).length
  const totalQuestions = quiz?.questions.length || 0
  const scorePercent = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
  const passed = scorePercent >= 80

  const handleSelectAnswer = (answerIndex: number) => {
    if (phase !== 'question') return
    setSelectedAnswer(answerIndex)
    setPhase('feedback')
  }

  const handleNextQuestion = async () => {
    // Save answer
    const newAnswers = [...answers, selectedAnswer!]
    setAnswers(newAnswers)

    if (currentQuestionIndex < totalQuestions - 1) {
      // Next question
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(null)
      setPhase('question')
    } else {
      // Show results
      setPhase('results')

      // Calculate final score
      const finalScore = newAnswers.filter(
        (a, i) => a === quiz?.questions[i].correctAnswer
      ).length
      const finalPercent = Math.round((finalScore / totalQuestions) * 100)
      const didPass = finalPercent >= 80

      // Update progress in database
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('learning_progress')
          .update({
            quiz_completed: true,
            quiz_score: finalPercent,
            quiz_attempts: 1, // Increment this properly in production
            status: didPass ? 'completed' : 'in_progress',
            completed_at: didPass ? new Date().toISOString() : null,
          })
          .eq('course_id', courseId)
          .eq('user_id', user.id)

        // Update backlog item if exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('backlog_items')
          .update({
            status: didPass ? 'completed' : 'in_progress',
            completed_at: didPass ? new Date().toISOString() : null,
          })
          .eq('course_id', courseId)
          .eq('user_id', user.id)
      }

      // Award curio and show celebration if passed
      if (didPass) {
        const result = await addCurio('quiz_passed', {
          intensity: courseInfo?.intensity as 'skim' | 'solid' | 'deep' | undefined,
          skipLevelUpToast: true, // CelebrationModal handles level-up display
        })
        if (result) {
          setCurioResult(result)
        }
        setShowCelebration(true)
      }
    }
  }

  const handleRetry = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setAnswers([])
    setPhase('question')
  }

  // Loading state with better UX
  if (phase === 'loading' || isGenerating) {
    return (
      <PageContainer title="Preparing Quiz" showBack>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            Creating Your Quiz
          </h2>
          <p className="mb-4 text-center text-slate-500 dark:text-slate-400">
            Our AI is generating personalized questions...
          </p>
          <Card className="mt-4 max-w-sm text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This usually takes 20-40 seconds. Hang tight!
            </p>
          </Card>
        </div>
      </PageContainer>
    )
  }

  // Handle celebration modal close
  const handleCelebrationClose = () => {
    setShowCelebration(false)
    router.push('/learn')
  }

  // Results phase
  if (phase === 'results') {
    // Show celebration modal for passed quizzes
    if (passed && showCelebration) {
      return (
        <PageContainer title="Quiz Complete">
          <CelebrationModal
            isOpen={showCelebration}
            onClose={handleCelebrationClose}
            score={scorePercent}
            curioEarned={curioResult?.curioEarned || 10}
            totalCurio={curioResult?.curio || curio}
            titleUpgraded={curioResult?.titleUpgraded || false}
            newTitle={curioResult?.newTitle}
            intensity={courseInfo?.intensity}
            timeBudget={courseInfo?.time_budget}
          />
        </PageContainer>
      )
    }

    // Show regular results for failed attempts
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

  // Question/Feedback phases
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

  return (
    <PageContainer title="Quiz" showBack>
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
          <span>{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%</span>
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
      <div className="mb-6 space-y-3">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === index
          const isCorrectAnswer = index === currentQuestion.correctAnswer
          const showResult = phase === 'feedback'

          return (
            <motion.button
              key={index}
              onClick={() => handleSelectAnswer(index)}
              disabled={phase === 'feedback'}
              whileTap={{ scale: phase === 'question' ? 0.98 : 1 }}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all',
                phase === 'question' && 'hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30',
                phase === 'question' && !isSelected && 'border-slate-200 dark:border-slate-700',
                showResult && isCorrectAnswer && 'border-green-500 bg-green-50 dark:bg-green-900/30',
                showResult && isSelected && !isCorrectAnswer && 'border-red-500 bg-red-50 dark:bg-red-900/30',
                isSelected && phase === 'question' && 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                  showResult && isCorrectAnswer && 'bg-green-500 text-white',
                  showResult && isSelected && !isCorrectAnswer && 'bg-red-500 text-white',
                  !showResult && 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                )}
              >
                {showResult && isCorrectAnswer ? (
                  <CheckCircle className="h-5 w-5" />
                ) : showResult && isSelected ? (
                  <XCircle className="h-5 w-5" />
                ) : (
                  String.fromCharCode(65 + index)
                )}
              </div>
              <span className="flex-1 text-slate-900 dark:text-white">{option}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {phase === 'feedback' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Card
              className={cn(
                'mb-6',
                isCorrect ? 'bg-green-50 dark:bg-green-900/30' : 'bg-amber-50 dark:bg-amber-900/30'
              )}
            >
              <p className={cn(
                'mb-2 font-medium',
                isCorrect ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'
              )}>
                {isCorrect
                  ? getRandomEncouragement(QUIZ_ENCOURAGEMENTS.correct)
                  : getRandomEncouragement(QUIZ_ENCOURAGEMENTS.incorrect)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {currentQuestion.explanation}
              </p>
            </Card>

            <Button
              onClick={handleNextQuestion}
              size="lg"
              className="w-full"
              icon={<ArrowRight className="h-5 w-5" />}
            >
              {currentQuestionIndex < totalQuestions - 1 ? 'Next Question' : 'See Results'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  )
}
