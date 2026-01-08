'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Send, Keyboard, Mic, ChevronDown } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { useDeepgram } from '@/hooks/useDeepgram'
import { cn } from '@/lib/utils/cn'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface CourseChatProps {
  courseId: string
  courseTopic: string
  currentSectionId?: string
}

export function CourseChat({ courseId, courseTopic, currentSectionId }: CourseChatProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMode, setInputMode] = useState<'voice' | 'typing'>('voice')
  const [typedQuestion, setTypedQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentResponse, setCurrentResponse] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    reset: resetVoice,
  } = useDeepgram()

  const fullTranscript = transcript + (interimTranscript ? ' ' + interimTranscript : '')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentResponse])

  const handleAsk = useCallback(async (question: string) => {
    if (!question.trim() || isLoading) return

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    resetVoice()
    setTypedQuestion('')
    setIsLoading(true)
    setCurrentResponse('')

    try {
      const res = await fetch('/api/ai/course-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          question: question.trim(),
          currentSectionId,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to get response')
      }

      if (!res.body) {
        throw new Error('No response body')
      }

      // Handle streaming response
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        fullResponse += text
        setCurrentResponse(fullResponse)
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])
      setCurrentResponse('')
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble responding. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [courseId, currentSectionId, isLoading, messages, resetVoice])

  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening()
      // Auto-submit after stopping if there's a transcript
      const currentTranscript = transcript + (interimTranscript ? ' ' + interimTranscript : '')
      if (currentTranscript.trim()) {
        setTimeout(() => {
          handleAsk(currentTranscript.trim())
        }, 300)
      }
    } else {
      resetVoice()
      startListening()
    }
  }, [isListening, stopListening, startListening, resetVoice, transcript, interimTranscript, handleAsk])

  const handleTypedSubmit = () => {
    if (typedQuestion.trim()) {
      handleAsk(typedQuestion)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTypedSubmit()
    }
  }

  // Collapsed state - just show a floating button
  if (!isExpanded) {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-colors"
        aria-label="Ask a question about this course"
      >
        <MessageCircle className="h-6 w-6" />
        {messages.length === 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-bold">
            ?
          </span>
        )}
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-lg"
    >
      <Card className="flex flex-col overflow-hidden shadow-xl" padding="none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary-500" />
            <span className="font-medium text-slate-900 dark:text-white">
              Ask about {courseTopic.length > 20 ? courseTopic.slice(0, 20) + '...' : courseTopic}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Minimize chat"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 max-h-64 min-h-[150px] space-y-3">
          {messages.length === 0 && !currentResponse && (
            <div className="flex flex-col items-center justify-center h-full text-center py-6">
              <MessageCircle className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Have a question about what you&apos;re learning?
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Ask me anything about this topic!
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2',
                message.role === 'user'
                  ? 'ml-auto bg-primary-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </motion.div>
          ))}

          {/* Streaming response */}
          {currentResponse && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-[85%] rounded-2xl px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <p className="text-sm whitespace-pre-wrap">{currentResponse}</p>
            </motion.div>
          )}

          {/* Loading indicator */}
          {isLoading && !currentResponse && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-[85%] rounded-2xl px-4 py-2 bg-slate-100 dark:bg-slate-700"
            >
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-2 w-2 rounded-full bg-slate-400"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-3">
          {inputMode === 'voice' ? (
            <div className="flex flex-col gap-3">
              {/* Voice input row */}
              <div className="flex items-center gap-3">
                <div className="flex-1 min-h-[40px] flex items-center">
                  {fullTranscript ? (
                    <p className="text-sm text-slate-800 dark:text-slate-200">
                      {fullTranscript}
                      {isListening && (
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="ml-1 inline-block h-4 w-0.5 bg-primary-500"
                        />
                      )}
                    </p>
                  ) : isListening ? (
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="h-2 w-2 rounded-full bg-primary-400"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      Tap mic to ask a question...
                    </p>
                  )}
                </div>

                {/* Mic button */}
                <div className="relative">
                  {isListening && (
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-full bg-primary-400"
                        initial={{ scale: 1, opacity: 0.3 }}
                        animate={{ scale: 1.6, opacity: 0 }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full bg-primary-400"
                        initial={{ scale: 1, opacity: 0.3 }}
                        animate={{ scale: 1.6, opacity: 0 }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                      />
                    </>
                  )}
                  <button
                    onClick={handleVoiceToggle}
                    disabled={isLoading}
                    className={cn(
                      'relative z-10 flex h-12 w-12 items-center justify-center rounded-full transition-all',
                      isListening
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600',
                      isLoading && 'opacity-50 cursor-not-allowed'
                    )}
                    aria-label={isListening ? 'Stop and send' : 'Start recording'}
                  >
                    {isListening ? (
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Mic className="h-5 w-5" />
                      </motion.div>
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Manual send if transcript available but not listening */}
              {fullTranscript && !isListening && (
                <Button
                  onClick={() => handleAsk(fullTranscript)}
                  size="sm"
                  disabled={isLoading}
                  className="w-full"
                >
                  Send Question
                </Button>
              )}

              {/* Switch to typing */}
              <button
                onClick={() => setInputMode('typing')}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 self-center"
              >
                <Keyboard className="h-3 w-3" />
                Type instead
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <textarea
                  value={typedQuestion}
                  onChange={(e) => setTypedQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question..."
                  className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
                  rows={2}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleTypedSubmit}
                  disabled={!typedQuestion.trim() || isLoading}
                  size="sm"
                  className="self-end"
                  icon={<Send className="h-4 w-4" />}
                >
                  Send
                </Button>
              </div>
              <button
                onClick={() => setInputMode('voice')}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 self-center"
              >
                <Mic className="h-3 w-3" />
                Use voice
              </button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
