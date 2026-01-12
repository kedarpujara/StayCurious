'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Mic, Keyboard, Check, X, ArrowRight, Sparkles, Trophy } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Button, Card } from '@/components/ui'
import { VoiceButton } from '@/components/voice/VoiceButton'
import { LiveTranscript } from '@/components/voice/LiveTranscript'
import { createClient } from '@/lib/supabase/client'
import { useCurio } from '@/hooks/useCurio'
import { toDisplayFormat } from '@/lib/blueprint'
import { cn } from '@/lib/utils/cn'

// ELI5 awards 75 curio for explaining 3 concepts simply
const ELI5_CURIO_REWARD = 75

interface Concept {
  term: string
  definition: string
}

interface VerificationResult {
  concept: string
  passed: boolean
  score: number
  feedback: string
}

type Phase = 'intro' | 'explain' | 'verifying' | 'results'

export default function ELI5Page() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const courseId = params.topicId as string

  const [phase, setPhase] = useState<Phase>('intro')
  const [currentConceptIndex, setCurrentConceptIndex] = useState(0)
  const [explanations, setExplanations] = useState<string[]>([])
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [showTyping, setShowTyping] = useState(false)
  const [typedExplanation, setTypedExplanation] = useState('')
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([])
  const [overallPassed, setOverallPassed] = useState(false)
  const [curioEarned, setCurioEarned] = useState(0)
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)

  const { addCurio } = useCurio()

  // Fetch course data and extract concepts (courseId is now catalog_course_id)
  const { data: courseData, isLoading } = useQuery({
    queryKey: ['course-eli5', courseId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get course content from course_catalog
      const { data: course, error } = await supabase
        .from('course_catalog')
        .select('*')
        .eq('id', courseId)
        .single()

      if (error) throw error

      // Check if already completed ELI5 for this course
      const { data: existing } = await supabase
        .from('eli5_submissions')
        .select('id, passed')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('passed', true)
        .single()

      if (existing) {
        setAlreadyCompleted(true)
      }

      return course
    },
  })

  // Extract 3 key concepts from course content
  const concepts: Concept[] = (() => {
    if (!courseData?.content) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = toDisplayFormat(courseData.content) as any
    const allConcepts: Concept[] = []

    // Extract from blueprint steps if available (v2 format)
    if (content?.steps && Array.isArray(content.steps)) {
      content.steps.forEach((step: { keyIdea?: { term: string; definition: string } }) => {
        if (step.keyIdea?.term) {
          allConcepts.push({
            term: step.keyIdea.term,
            definition: step.keyIdea.definition,
          })
        }
      })
    }

    // Or extract from sections (v1 format)
    if (content?.sections && Array.isArray(content.sections) && allConcepts.length === 0) {
      content.sections.slice(0, 3).forEach((section: { title?: string; content?: string }, idx: number) => {
        allConcepts.push({
          term: section.title || `Concept ${idx + 1}`,
          definition: section.content?.substring(0, 200) || '',
        })
      })
    }

    // Return first 3 concepts
    return allConcepts.slice(0, 3)
  })()

  const currentConcept = concepts[currentConceptIndex]

  const handleTranscriptUpdate = useCallback((text: string, isFinal: boolean) => {
    setTranscript(text)
  }, [])

  const handleSubmitExplanation = async (explanation: string) => {
    if (!explanation.trim()) return

    const newExplanations = [...explanations, explanation.trim()]
    setExplanations(newExplanations)

    // Always clear input state immediately
    setTranscript('')
    setTypedExplanation('')
    setIsListening(false)

    if (currentConceptIndex < concepts.length - 1) {
      // Move to next concept
      setCurrentConceptIndex(prev => prev + 1)
      setShowTyping(false)
    } else {
      // All concepts explained, verify
      setPhase('verifying')
      await verifyExplanations(newExplanations)
    }
  }

  const verifyExplanations = async (allExplanations: string[]) => {
    try {
      const response = await fetch('/api/ai/eli5-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          explanations: concepts.map((c, i) => ({
            concept: c.term,
            explanation: allExplanations[i],
          })),
          courseTopic: courseData?.topic || 'Unknown',
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setVerificationResults(data.results)
      setOverallPassed(data.overallPassed)

      // Award curio if passed
      if (data.overallPassed && !alreadyCompleted) {
        setCurioEarned(ELI5_CURIO_REWARD)

        // Record to database (courseId is now catalog_course_id)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const monthKey = new Date().toISOString().slice(0, 7) // YYYY-MM

          await supabase.from('eli5_submissions').insert({
            user_id: user.id,
            course_id: courseId,
            concepts: concepts.map((c, i) => ({
              term: c.term,
              explanation: allExplanations[i],
              score: data.results[i]?.score || 0,
            })),
            passed: true,
            mcurio_awarded: ELI5_CURIO_REWARD,
            month_key: monthKey,
          })

          // Award curio
          await addCurio('eli5_passed', {
            skipLevelUpToast: true,
          })
        }
      }

      setPhase('results')
    } catch (error) {
      console.error('Verification error:', error)
      setPhase('results')
    }
  }

  const handleStartOver = () => {
    setPhase('intro')
    setCurrentConceptIndex(0)
    setExplanations([])
    setTranscript('')
    setTypedExplanation('')
    setShowTyping(false)
    setVerificationResults([])
    setOverallPassed(false)
    setCurioEarned(0)
  }

  if (isLoading) {
    return (
      <PageContainer title="Loading..." showBack>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      </PageContainer>
    )
  }

  if (concepts.length < 3) {
    return (
      <PageContainer title="ELI5 Challenge" showBack>
        <Card className="text-center py-8">
          <p className="text-slate-500 dark:text-slate-400">
            Not enough concepts available for ELI5 challenge.
          </p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </Card>
      </PageContainer>
    )
  }

  // Intro phase
  if (phase === 'intro') {
    return (
      <PageContainer title="ELI5 Challenge" showBack>
        <div className="mx-auto max-w-md space-y-6 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-indigo-500">
              <Lightbulb className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Explain It Simply
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Can you explain these concepts like you&apos;re teaching a 5-year-old?
            </p>
          </motion.div>

          <Card>
            <h2 className="font-semibold text-slate-900 dark:text-white mb-3">
              The Challenge
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              You&apos;ll explain 3 key concepts from this course using simple language,
              everyday analogies, and no jargon. This proves you truly understand the material!
            </p>

            <div className="space-y-2 mb-4">
              {concepts.map((concept, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-medium">
                    {idx + 1}
                  </div>
                  <span>{concept.term}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>+{ELI5_CURIO_REWARD} Curio</strong> for explaining all 3 simply
              </p>
            </div>
          </Card>

          {alreadyCompleted ? (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-green-700 dark:text-green-300">
                  You&apos;ve already completed this challenge!
                </p>
              </div>
            </Card>
          ) : (
            <Button
              onClick={() => setPhase('explain')}
              size="lg"
              className="w-full"
              icon={<ArrowRight className="h-5 w-5" />}
            >
              Start Challenge
            </Button>
          )}

          <div className="text-center">
            <button
              onClick={() => router.push('/learn')}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              ← Back to Learn
            </button>
          </div>
        </div>
      </PageContainer>
    )
  }

  // Explain phase
  if (phase === 'explain') {
    return (
      <PageContainer title={`Concept ${currentConceptIndex + 1} of ${concepts.length}`} showBack>
        <div className="mx-auto max-w-md space-y-6">
          {/* Progress */}
          <div className="flex gap-2">
            {concepts.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  'h-2 flex-1 rounded-full transition-colors',
                  idx < currentConceptIndex
                    ? 'bg-green-500'
                    : idx === currentConceptIndex
                    ? 'bg-primary-500'
                    : 'bg-slate-200 dark:bg-slate-700'
                )}
              />
            ))}
          </div>

          {/* Concept to explain */}
          <Card variant="highlighted">
            <p className="text-sm text-primary-600 dark:text-primary-400 mb-1">
              Explain this concept simply:
            </p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {currentConcept?.term}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Pretend you&apos;re explaining to a young child. Use analogies and simple words!
            </p>
          </Card>

          {/* Voice or type input */}
          <div className="flex flex-col items-center">
            {!showTyping ? (
              <>
                <p className="mb-6 text-center text-slate-500 dark:text-slate-400">
                  {isListening ? "I'm listening..." : 'Tap to explain'}
                </p>

                <VoiceButton
                  key={`voice-${currentConceptIndex}`}
                  onTranscriptUpdate={handleTranscriptUpdate}
                  onListeningChange={setIsListening}
                />

                <button
                  onClick={() => setShowTyping(true)}
                  className="mt-6 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  <Keyboard className="h-4 w-4" />
                  Type instead
                </button>

                <div className="mt-6 min-h-[80px] w-full">
                  <LiveTranscript transcript={transcript} isListening={isListening} />
                </div>

                {transcript.trim() && !isListening && (
                  <Button
                    onClick={() => handleSubmitExplanation(transcript)}
                    className="mt-4"
                    size="lg"
                  >
                    Submit Explanation
                  </Button>
                )}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <textarea
                  value={typedExplanation}
                  onChange={(e) => setTypedExplanation(e.target.value)}
                  placeholder="Explain it like you're talking to a 5-year-old..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 resize-none"
                  rows={4}
                  autoFocus
                />
                <div className="mt-3 flex gap-3">
                  <Button
                    onClick={() => setShowTyping(false)}
                    variant="secondary"
                    className="flex-1"
                  >
                    Use Voice
                  </Button>
                  <Button
                    onClick={() => handleSubmitExplanation(typedExplanation)}
                    className="flex-1"
                    disabled={!typedExplanation.trim()}
                  >
                    Submit
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={() => router.push('/learn')}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              ← Back to Learn
            </button>
          </div>
        </div>
      </PageContainer>
    )
  }

  // Verifying phase
  if (phase === 'verifying') {
    return (
      <PageContainer title="Checking Your Explanations...">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            Evaluating your explanations...
          </p>
        </div>
      </PageContainer>
    )
  }

  // Results phase
  return (
    <PageContainer title="Results">
      <div className="mx-auto max-w-md space-y-6 pt-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10 }}
            className={cn(
              'mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full',
              overallPassed
                ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                : 'bg-gradient-to-br from-amber-400 to-orange-500'
            )}
          >
            {overallPassed ? (
              <Trophy className="h-10 w-10 text-white" />
            ) : (
              <Lightbulb className="h-10 w-10 text-white" />
            )}
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {overallPassed ? 'Amazing!' : 'Good Effort!'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {overallPassed
              ? "You've proven true understanding!"
              : 'Some explanations need to be simpler. Try again!'}
          </p>
        </motion.div>

        {/* Results breakdown */}
        <div className="space-y-3">
          {verificationResults.map((result, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card
                className={cn(
                  result.passed
                    ? 'border-green-200 dark:border-green-800'
                    : 'border-amber-200 dark:border-amber-800'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      result.passed
                        ? 'bg-green-100 dark:bg-green-900/50'
                        : 'bg-amber-100 dark:bg-amber-900/50'
                    )}
                  >
                    {result.passed ? (
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <X className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {result.concept}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {result.feedback}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Curio earned */}
        {curioEarned > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                  <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-300">Curio earned</p>
                  <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                    +{curioEarned}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {overallPassed ? (
            <Button
              onClick={() => router.push('/learn')}
              size="lg"
              className="w-full"
              icon={<ArrowRight className="h-5 w-5" />}
            >
              Continue Learning
            </Button>
          ) : (
            <>
              <Button onClick={handleStartOver} size="lg" className="w-full">
                Try Again
              </Button>
              <button
                onClick={() => router.push('/learn')}
                className="w-full text-center text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors py-2"
              >
                Skip for now
              </button>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
