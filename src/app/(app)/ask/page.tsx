'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Sparkles, Keyboard, CheckCircle, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { Button, Card } from '@/components/ui'
import { VoiceButton } from '@/components/voice/VoiceButton'
import { LiveTranscript } from '@/components/voice/LiveTranscript'
import { useAIExplain } from '@/hooks/useAI'
import { useKarma } from '@/hooks/useKarma'
import { useBacklog } from '@/hooks/useBacklog'
import { getRandomEncouragement, CURIOSITY_ENCOURAGEMENTS, LEARNING_REMINDERS } from '@/constants/microcopy'

export default function AskPage() {
  const router = useRouter()
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showTyping, setShowTyping] = useState(false)
  const [typedQuestion, setTypedQuestion] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [addedTopic, setAddedTopic] = useState('')

  const { explain, response, isLoading: isExplaining, reset: resetExplanation } = useAIExplain()
  const { addKarma, recentKarma } = useKarma()
  const { addItem, isAdding } = useBacklog()

  const handleTranscriptUpdate = useCallback((text: string, isFinal: boolean) => {
    setTranscript(text)
    if (isFinal && text.trim()) {
      handleAsk(text)
    }
  }, [])

  const handleAsk = async (question: string) => {
    setShowAnswer(true)
    await explain(question)
    // Award karma for asking
    addKarma('question_asked')
  }

  const handleAddToBacklog = async () => {
    if (transcript.trim()) {
      await addItem(transcript, 'instant_curiosity')
      setAddedTopic(transcript)
      setShowConfirmation(true)
    }
  }

  const handleNewQuestion = () => {
    setTranscript('')
    setTypedQuestion('')
    setShowAnswer(false)
    setShowTyping(false)
    setShowConfirmation(false)
    resetExplanation()
  }

  const handleTypedSubmit = () => {
    if (typedQuestion.trim()) {
      setTranscript(typedQuestion)
      setShowTyping(false)
      handleAsk(typedQuestion)
    }
  }

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <PageContainer
      title="Ask Curio"
      headerRight={
        recentKarma > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 rounded-full bg-karma-light px-3 py-1 text-sm font-medium text-karma-dark"
          >
            <Sparkles className="h-4 w-4" />
            +{recentKarma}
          </motion.div>
        )
      }
    >
      <div className="flex flex-col items-center">
        {/* Main interaction area */}
        <AnimatePresence mode="wait">
          {!showAnswer ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex w-full flex-col items-center pt-8"
            >
              {/* Encouragement */}
              <p className="mb-8 text-center text-slate-500 dark:text-slate-400">
                {isListening
                  ? "I'm listening..."
                  : 'Tap to ask anything'}
              </p>

              {/* Voice button */}
              {!showTyping && (
                <>
                  <VoiceButton
                    onTranscriptUpdate={handleTranscriptUpdate}
                    onListeningChange={setIsListening}
                    disabled={isExplaining}
                  />

                  {/* Type instead button */}
                  <button
                    onClick={() => setShowTyping(true)}
                    className="mt-6 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  >
                    <Keyboard className="h-4 w-4" />
                    Type instead
                  </button>
                </>
              )}

              {/* Typing input */}
              {showTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-md"
                >
                  <textarea
                    value={typedQuestion}
                    onChange={(e) => setTypedQuestion(e.target.value)}
                    placeholder="What do you want to know?"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-400 resize-none"
                    rows={3}
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
                      onClick={handleTypedSubmit}
                      className="flex-1"
                      disabled={!typedQuestion.trim()}
                    >
                      Ask
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Live transcript */}
              {!showTyping && (
                <div className="mt-8 min-h-[60px] w-full max-w-md">
                  <LiveTranscript
                    transcript={transcript}
                    isListening={isListening}
                  />
                </div>
              )}

              {/* Manual submit if needed */}
              {transcript.trim() && !isListening && !showTyping && (
                <Button
                  onClick={() => handleAsk(transcript)}
                  className="mt-4"
                  size="lg"
                >
                  Get Answer
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full pt-4"
            >
              {/* Question */}
              <Card variant="highlighted" className="mb-4">
                <p className="text-sm font-medium text-primary-700 dark:text-primary-300">Your question</p>
                <p className="mt-1 text-slate-900 dark:text-white">{transcript}</p>
              </Card>

              {/* Encouragement */}
              {!isExplaining && response && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-3 text-center text-sm text-primary-600 dark:text-primary-400"
                >
                  {getRandomEncouragement(CURIOSITY_ENCOURAGEMENTS)}
                </motion.p>
              )}

              {/* Answer */}
              <Card className="mb-4">
                {isExplaining && !response ? (
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                    <span className="text-slate-500 dark:text-slate-400">Thinking...</span>
                  </div>
                ) : (
                  <div className="prose prose-slate prose-sm max-w-none dark:prose-invert">
                    {response}
                  </div>
                )}
              </Card>

              {/* Learning reminder */}
              {!isExplaining && response && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card variant="default" className="mb-4 bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-center text-sm italic text-slate-500 dark:text-slate-400">
                      {getRandomEncouragement(LEARNING_REMINDERS)}
                    </p>
                  </Card>

                  {/* Actions */}
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleAddToBacklog}
                      loading={isAdding}
                      size="lg"
                      className="w-full"
                      icon={<Plus className="h-5 w-5" />}
                    >
                      Add to Backlog to Learn
                    </Button>

                    <Button
                      onClick={handleNewQuestion}
                      variant="ghost"
                      size="lg"
                      className="w-full"
                    >
                      Ask Another Question
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 dark:bg-slate-800"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
                  Added to Backlog!
                </h2>
                <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
                  &quot;{addedTopic.length > 50 ? addedTopic.substring(0, 50) + '...' : addedTopic}&quot; has been saved for later learning.
                </p>
                <div className="flex w-full flex-col gap-3">
                  <Button
                    onClick={handleGoHome}
                    size="lg"
                    className="w-full"
                    icon={<Home className="h-5 w-5" />}
                  >
                    Go Home
                  </Button>
                  <Button
                    onClick={handleNewQuestion}
                    variant="ghost"
                    size="lg"
                    className="w-full"
                  >
                    Ask Another Question
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  )
}
