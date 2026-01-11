'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  Star,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Loader2,
  Award,
  MessageCircle,
  Lightbulb,
  Send
} from 'lucide-react'
import { Card, Button } from '@/components/ui'
import { cn } from '@/lib/utils/cn'

interface Concept {
  id: string
  title: string
  hint: string
}

interface Evaluation {
  conceptId: string
  scores: {
    simplicity: number
    clarity: number
    accuracy: number
    completeness: number
  }
  overallScore: number
  feedback: string
  goldStar: boolean
}

interface EvaluationResult {
  evaluations: Evaluation[]
  totalScore: number
  bonusPoints: number
  overallFeedback: string
}

interface TeachBackChallengeProps {
  topic: string
  courseId?: string
  onComplete: (bonusPoints: number) => void
  onSkip: () => void
}

export function TeachBackChallenge({
  topic,
  courseId,
  onComplete,
  onSkip
}: TeachBackChallengeProps) {
  const [stage, setStage] = useState<'intro' | 'challenge' | 'results'>('intro')
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [explanations, setExplanations] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [currentExplanation, setCurrentExplanation] = useState('')

  // Load concepts when starting challenge
  const loadConcepts = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/ai/teach-back', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          topic,
          courseId
        })
      })

      if (!res.ok) throw new Error('Failed to generate concepts')

      const data = await res.json()
      setConcepts(data.concepts || [])
      setExplanations(new Array(data.concepts?.length || 5).fill(''))
    } catch (error) {
      console.error('Failed to load concepts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [topic, courseId])

  // Submit explanations for evaluation
  const submitExplanations = async () => {
    setIsEvaluating(true)
    try {
      const res = await fetch('/api/ai/teach-back', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          topic,
          concepts: concepts.map(c => c.title),
          explanations
        })
      })

      if (!res.ok) throw new Error('Failed to evaluate')

      const data = await res.json()
      setResult(data)
      setStage('results')
    } catch (error) {
      console.error('Failed to evaluate:', error)
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleStartChallenge = async () => {
    setStage('challenge')
    await loadConcepts()
  }

  const handleSaveExplanation = () => {
    const newExplanations = [...explanations]
    newExplanations[currentIndex] = currentExplanation
    setExplanations(newExplanations)
  }

  const handleNext = () => {
    handleSaveExplanation()
    if (currentIndex < concepts.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setCurrentExplanation(explanations[currentIndex + 1] || '')
    }
  }

  const handlePrevious = () => {
    handleSaveExplanation()
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setCurrentExplanation(explanations[currentIndex - 1] || '')
    }
  }

  const handleSubmit = async () => {
    handleSaveExplanation()
    await submitExplanations()
  }

  const handleFinish = () => {
    onComplete(result?.bonusPoints || 0)
  }

  // Update current explanation when index changes
  useEffect(() => {
    setCurrentExplanation(explanations[currentIndex] || '')
  }, [currentIndex, explanations])

  const currentConcept = concepts[currentIndex]
  const allFilled = explanations.every(e => e.trim().length > 0)
  const filledCount = explanations.filter(e => e.trim().length > 0).length

  // Intro stage
  if (stage === 'intro') {
    return (
      <Card className="p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
            <Lightbulb className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Teach It Back Challenge
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          The best way to learn is to teach! Explain 5 key concepts from this lesson
          like you're explaining to a 5 year old.
        </p>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6 text-left">
          <h3 className="font-medium text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Earn Bonus Points!
          </h3>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2">
              <Star className="h-4 w-4 text-amber-500 mt-0.5" />
              <span>Score points for simple, clear explanations</span>
            </li>
            <li className="flex items-start gap-2">
              <Star className="h-4 w-4 text-amber-500 mt-0.5" />
              <span>Earn gold stars for exceptional ELI5 explanations</span>
            </li>
            <li className="flex items-start gap-2">
              <Star className="h-4 w-4 text-amber-500 mt-0.5" />
              <span>Up to 100+ bonus karma points available!</span>
            </li>
          </ul>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onSkip} className="flex-1">
            Skip for Now
          </Button>
          <Button onClick={handleStartChallenge} className="flex-1">
            <Sparkles className="h-4 w-4 mr-2" />
            Start Challenge
          </Button>
        </div>
      </Card>
    )
  }

  // Challenge stage
  if (stage === 'challenge') {
    if (isLoading || concepts.length === 0) {
      return (
        <Card className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300">
            Generating key concepts from your lesson...
          </p>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Concept {currentIndex + 1} of {concepts.length}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {filledCount}/{concepts.length} explained
          </span>
        </div>
        <div className="flex gap-1">
          {concepts.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i === currentIndex
                  ? 'bg-primary-600'
                  : explanations[i]?.trim()
                  ? 'bg-green-500'
                  : 'bg-slate-200 dark:bg-slate-700'
              )}
            />
          ))}
        </div>

        {/* Current concept card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentConcept.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 text-lg font-bold text-primary-600 dark:text-primary-400">
                  {currentIndex + 1}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {currentConcept.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {currentConcept.hint}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-4 flex items-start gap-2">
                <MessageCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Explain this like you're talking to a 5 year old. Use simple words,
                  fun analogies, and everyday examples!
                </p>
              </div>

              <textarea
                value={currentExplanation}
                onChange={(e) => setCurrentExplanation(e.target.value)}
                placeholder="Type your simple explanation here..."
                className="w-full h-32 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              />

              <div className="flex justify-between mt-4">
                <Button
                  variant="secondary"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  Previous
                </Button>

                {currentIndex === concepts.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!allFilled || isEvaluating}
                    loading={isEvaluating}
                    icon={!isEvaluating ? <Send className="h-4 w-4" /> : undefined}
                  >
                    {isEvaluating ? 'Evaluating...' : 'Submit All'}
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Quick navigation dots */}
        <div className="flex justify-center gap-2">
          {concepts.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                handleSaveExplanation()
                setCurrentIndex(i)
              }}
              className={cn(
                'h-3 w-3 rounded-full transition-all',
                i === currentIndex
                  ? 'bg-primary-600 scale-125'
                  : explanations[i]?.trim()
                  ? 'bg-green-500'
                  : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'
              )}
            />
          ))}
        </div>
      </div>
    )
  }

  // Results stage
  if (stage === 'results' && result) {
    const goldStarCount = result.evaluations.filter(e => e.goldStar).length

    return (
      <div className="space-y-4">
        {/* Summary card */}
        <Card className="p-6 text-center bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-white dark:bg-slate-800 shadow-lg mb-4"
          >
            <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {result.totalScore}
            </span>
          </motion.div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {result.overallFeedback}
          </h2>
          <div className="flex justify-center gap-4 mt-4">
            <div className="text-center">
              <div className="flex justify-center mb-1">
                {[...Array(goldStarCount)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-6 w-6 text-amber-500 fill-amber-500"
                  />
                ))}
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {goldStarCount} Gold Star{goldStarCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                +{result.bonusPoints}
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Bonus Karma
              </span>
            </div>
          </div>
        </Card>

        {/* Individual evaluations */}
        <div className="space-y-3">
          {result.evaluations.map((evaluation, i) => (
            <motion.div
              key={evaluation.conceptId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-slate-900 dark:text-white">
                        {concepts[i]?.title}
                      </h4>
                      {evaluation.goldStar && (
                        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {evaluation.feedback}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {evaluation.overallScore.toFixed(1)}
                    </div>
                    <span className="text-xs text-slate-500">/ 5</span>
                  </div>
                </div>
                {/* Score breakdown */}
                <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  {Object.entries(evaluation.scores).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {value}
                      </div>
                      <div className="text-xs text-slate-500 capitalize">
                        {key}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <Button onClick={handleFinish} className="w-full" size="lg">
          <CheckCircle className="h-5 w-5 mr-2" />
          Complete Challenge
        </Button>
      </div>
    )
  }

  return null
}
