'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Keyboard } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Button, Card } from '@/components/ui'
import { VoiceButton } from '@/components/voice/VoiceButton'
import { LiveTranscript } from '@/components/voice/LiveTranscript'
import { useAIExplain } from '@/hooks/useAI'
import { useCurio } from '@/hooks/useCurio'
import { getRandomEncouragement, CURIOSITY_ENCOURAGEMENTS, LEARNING_REMINDERS } from '@/constants/microcopy'

export default function AskPage() {
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showTyping, setShowTyping] = useState(false)
  const [typedQuestion, setTypedQuestion] = useState('')

  const { explain, response, isLoading: isExplaining, reset: resetExplanation } = useAIExplain()
  const { addCurio, recentCurio } = useCurio()

  const handleTranscriptUpdate = useCallback((text: string, isFinal: boolean) => {
    setTranscript(text)
    if (isFinal && text.trim()) {
      handleAsk(text)
    }
  }, [])

  const handleAsk = async (question: string) => {
    setShowAnswer(true)
    await explain(question)
    addCurio('question_asked')
  }

  const handleNewQuestion = () => {
    setTranscript('')
    setTypedQuestion('')
    setShowAnswer(false)
    setShowTyping(false)
    resetExplanation()
  }

  const handleTypedSubmit = () => {
    if (typedQuestion.trim()) {
      setTranscript(typedQuestion)
      setShowTyping(false)
      handleAsk(typedQuestion)
    }
  }

  return (
    <PageContainer
      title="Ask Curio"
      headerRight={
        recentCurio > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
          >
            <Sparkles className="h-4 w-4" />
            +{recentCurio}
          </motion.div>
        )
      }
    >
      <div className="flex flex-col items-center">
        <AnimatePresence mode="wait">
          {!showAnswer ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex w-full flex-col items-center pt-8"
            >
              <p className="mb-8 text-center text-slate-500 dark:text-slate-400">
                {isListening ? "I'm listening..." : 'Tap to ask anything'}
              </p>

              {!showTyping && (
                <>
                  <VoiceButton
                    onTranscriptUpdate={handleTranscriptUpdate}
                    onListeningChange={setIsListening}
                    disabled={isExplaining}
                  />

                  <button
                    onClick={() => setShowTyping(true)}
                    className="mt-6 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  >
                    <Keyboard className="h-4 w-4" />
                    Type instead
                  </button>
                </>
              )}

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

              {!showTyping && (
                <div className="mt-8 min-h-[60px] w-full max-w-md">
                  <LiveTranscript
                    transcript={transcript}
                    isListening={isListening}
                  />
                </div>
              )}

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
              <Card variant="highlighted" className="mb-4">
                <p className="text-sm font-medium text-primary-700 dark:text-primary-300">Your question</p>
                <p className="mt-1 text-slate-900 dark:text-white">{transcript}</p>
              </Card>

              {!isExplaining && response && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-3 text-center text-sm text-primary-600 dark:text-primary-400"
                >
                  {getRandomEncouragement(CURIOSITY_ENCOURAGEMENTS)}
                </motion.p>
              )}

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

                  <Button
                    onClick={handleNewQuestion}
                    variant="secondary"
                    size="lg"
                    className="w-full"
                  >
                    Ask Another Question
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageContainer>
  )
}
