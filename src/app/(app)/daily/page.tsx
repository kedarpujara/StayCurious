'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  Flame,
  ArrowRight,
  CheckCircle,
  XCircle,
  Sparkles,
  Clock,
  Star,
  Home,
} from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useDaily } from '@/hooks/useDaily'
import { cn } from '@/lib/utils/cn'
import type { DailyQuizResult } from '@/types'

type Phase = 'loading' | 'intro' | 'reading' | 'quiz' | 'results'

export default function DailyPage() {
  const router = useRouter()
  const { status, daily, isLoading, startDaily, submitQuiz, isSubmitting } =
    useDaily()

  const [phase, setPhase] = useState<Phase>('loading')
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [results, setResults] = useState<DailyQuizResult | null>(null)

  // Initialize phase based on status
  useEffect(() => {
    if (!isLoading) {
      if (!daily || !status?.available) {
        setPhase('loading')
      } else if (status?.hasCompleted) {
        // Already completed - could show results or redirect
        setPhase('results')
      } else if (status?.hasStarted) {
        setPhase('reading')
      } else {
        setPhase('intro')
      }
    }
  }, [isLoading, daily, status])

  // Loading state
  if (isLoading || phase === 'loading') {
    return (
      <PageContainer title="Daily Curio">
        <div className="flex flex-col items-center justify-center py-12">
          {!daily && !isLoading ? (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Sparkles className="h-8 w-8 text-slate-400" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                No Daily Available
              </h2>
              <p className="mb-4 text-center text-slate-500">
                Check back later for today&apos;s curio!
              </p>
              <Button onClick={() => router.push('/ask')}>Go Home</Button>
            </>
          ) : (
            <>
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              <p className="mt-4 text-slate-500">
                Loading today&apos;s curio...
              </p>
            </>
          )}
        </div>
      </PageContainer>
    )
  }

  // Already completed state
  if (status?.hasCompleted && phase !== 'results') {
    return (
      <PageContainer title="Daily Curio" showBack>
        <Card className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            Already Completed
          </h2>
          <p className="mb-2 text-slate-500 dark:text-slate-400">
            You&apos;ve finished today&apos;s Daily Curio!
          </p>
          <p className="mb-4 text-sm text-slate-400">
            Score: {status.score}/5{' '}
            {status.unlocked && (
              <span className="text-amber-500">- Unlocked!</span>
            )}
          </p>
          <Button onClick={() => router.push('/ask')}>Back to Home</Button>
        </Card>
      </PageContainer>
    )
  }

  if (!daily) return null

  const content = daily.dailyCourse.content
  const quiz = daily.dailyCourse.quiz_questions
  const topic = daily.dailyCourse.daily_topic
  const currentSection = content.sections[currentSectionIndex]
  const currentQuestion = quiz?.questions?.[currentQuestionIndex]

  // Handle starting
  const handleStart = async () => {
    await startDaily()
    setPhase('reading')
  }

  // Handle section navigation
  const handleNextSection = () => {
    if (currentSectionIndex < content.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1)
    } else {
      setPhase('quiz')
    }
  }

  // Handle quiz answer selection
  const handleSelectAnswer = (answerIndex: number) => {
    if (showFeedback) return
    setSelectedAnswer(answerIndex)
    setShowFeedback(true)
  }

  // Handle next question
  const handleNextQuestion = async () => {
    const newAnswers = [...answers, selectedAnswer!]
    setAnswers(newAnswers)
    setSelectedAnswer(null)
    setShowFeedback(false)

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Submit quiz
      const result = await submitQuiz({
        dailyCourseId: daily.dailyCourse.id,
        answers: newAnswers,
      })
      if (result) {
        setResults(result)
        setPhase('results')
      }
    }
  }

  // Intro phase
  if (phase === 'intro') {
    return (
      <PageContainer title="Daily Curio" showBack>
        <div className="mx-auto max-w-md">
          <Card className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {topic.topic}
                </h2>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {topic.description}
                </p>
              </div>
            </div>
          </Card>

          <Card className="mb-6">
            <h3 className="mb-3 font-medium text-slate-900 dark:text-white">
              How it works
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-600 dark:bg-primary-900/50 dark:text-primary-400">
                  1
                </span>
                Read through 4 quick sections (~5 min)
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-600 dark:bg-primary-900/50 dark:text-primary-400">
                  2
                </span>
                Answer 5 quiz questions
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-600 dark:bg-primary-900/50 dark:text-primary-400">
                  3
                </span>
                Score 4/5 or better to unlock!
              </li>
            </ul>
          </Card>

          <div className="mb-4 text-center text-sm text-amber-600 dark:text-amber-400">
            <Star className="mr-1 inline h-4 w-4" />
            One attempt only - make it count!
          </div>

          <Button onClick={handleStart} size="lg" className="w-full">
            Begin Daily Curio
          </Button>
        </div>
      </PageContainer>
    )
  }

  // Reading phase
  if (phase === 'reading' && currentSection) {
    return (
      <PageContainer title={topic.topic} showBack>
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>
              Section {currentSectionIndex + 1} of {content.sections.length}
            </span>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{currentSection.estimatedMinutes} min</span>
            </div>
          </div>
          <ProgressBar
            value={
              ((currentSectionIndex + 1) / content.sections.length) * 100
            }
          />
        </div>

        <Card className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
            {currentSection.title}
          </h2>
          <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
            {currentSection.content.split('\n').map((paragraph, i) => (
              <p key={i} className="mb-3 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </Card>

        <Button
          onClick={handleNextSection}
          size="lg"
          className="w-full"
          icon={<ArrowRight className="h-5 w-5" />}
        >
          {currentSectionIndex < content.sections.length - 1
            ? 'Next Section'
            : 'Start Quiz'}
        </Button>
      </PageContainer>
    )
  }

  // Quiz phase
  if (phase === 'quiz' && currentQuestion) {
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer

    return (
      <PageContainer title="Quiz Time" showBack>
        <div className="mb-4">
          <div className="mb-2 flex justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </span>
          </div>
          <ProgressBar
            value={((currentQuestionIndex + 1) / quiz.questions.length) * 100}
          />
        </div>

        <Card className="mb-6">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white">
            {currentQuestion.question}
          </h2>
        </Card>

        <div className="mb-6 space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx
            const isCorrectAnswer = idx === currentQuestion.correctAnswer

            return (
              <motion.button
                key={idx}
                onClick={() => handleSelectAnswer(idx)}
                disabled={showFeedback}
                whileTap={{ scale: !showFeedback ? 0.98 : 1 }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all',
                  !showFeedback &&
                    'hover:border-primary-300 hover:bg-primary-50 dark:hover:border-primary-700 dark:hover:bg-primary-900/20',
                  !showFeedback &&
                    !isSelected &&
                    'border-slate-200 dark:border-slate-700',
                  showFeedback &&
                    isCorrectAnswer &&
                    'border-green-500 bg-green-50 dark:border-green-500 dark:bg-green-900/20',
                  showFeedback &&
                    isSelected &&
                    !isCorrectAnswer &&
                    'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-900/20'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                    showFeedback &&
                      isCorrectAnswer &&
                      'bg-green-500 text-white',
                    showFeedback &&
                      isSelected &&
                      !isCorrectAnswer &&
                      'bg-red-500 text-white',
                    !showFeedback &&
                      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  )}
                >
                  {showFeedback && isCorrectAnswer ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : showFeedback && isSelected ? (
                    <XCircle className="h-5 w-5" />
                  ) : (
                    String.fromCharCode(65 + idx)
                  )}
                </div>
                <span className="flex-1 text-slate-900 dark:text-white">
                  {option}
                </span>
              </motion.button>
            )
          })}
        </div>

        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card
                className={cn(
                  'mb-6',
                  isCorrect
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'bg-amber-50 dark:bg-amber-900/20'
                )}
              >
                <p
                  className={cn(
                    'mb-2 font-medium',
                    isCorrect
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-amber-700 dark:text-amber-300'
                  )}
                >
                  {isCorrect ? 'Correct!' : 'Not quite!'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {currentQuestion.explanation}
                </p>
              </Card>

              <Button
                onClick={handleNextQuestion}
                loading={isSubmitting}
                size="lg"
                className="w-full"
                icon={<ArrowRight className="h-5 w-5" />}
              >
                {currentQuestionIndex < quiz.questions.length - 1
                  ? 'Next Question'
                  : 'See Results'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </PageContainer>
    )
  }

  // Results phase
  if (phase === 'results') {
    const displayResults = results || {
      score: status?.score || 0,
      unlocked: status?.unlocked || false,
      streak: status?.streak || 0,
      curioEarned: 0,
    }
    const passed = displayResults.unlocked

    return (
      <PageContainer title="Results">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-8"
        >
          {passed ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl"
              >
                <Trophy className="h-12 w-12 text-white" />
              </motion.div>
              <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
                Daily Unlocked!
              </h1>
              <p className="mb-6 text-center text-slate-600 dark:text-slate-300">
                You&apos;ve mastered today&apos;s curio! Keep the streak going.
              </p>
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30"
              >
                <Star className="h-12 w-12 text-amber-600 dark:text-amber-400" />
              </motion.div>
              <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
                Good Try!
              </h1>
              <p className="mb-6 text-center text-slate-600 dark:text-slate-300">
                You needed 4/5 to unlock. Come back tomorrow!
              </p>
            </>
          )}

          <Card className="mb-6 w-full max-w-sm text-center">
            <p className="text-5xl font-bold text-slate-900 dark:text-white">
              {displayResults.score}/5
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              {Math.round((displayResults.score / 5) * 100)}% correct
            </p>
          </Card>

          <div className="mb-6 flex gap-6 text-center">
            <div>
              <p className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-500">
                <Flame className="h-6 w-6" />
                {displayResults.streak}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Day Streak
              </p>
            </div>
            {displayResults.curioEarned > 0 && (
              <div>
                <p className="text-2xl font-bold text-primary-500">
                  +{displayResults.curioEarned}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Curio
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={() => router.push('/ask')}
            size="lg"
            className="w-full max-w-sm"
            icon={<Home className="h-5 w-5" />}
          >
            Continue Learning
          </Button>
        </motion.div>
      </PageContainer>
    )
  }

  return null
}
