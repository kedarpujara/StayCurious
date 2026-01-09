'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, HelpCircle, Lightbulb, ArrowRight } from 'lucide-react'
import { useLessonChat } from './hooks/useLessonChat'
import { LessonMessage, LoadingMessage } from './LessonMessage'
import { ChatInput } from './ChatInput'
import { StepIndicator } from './StepIndicator'
import { useCurio } from '@/hooks/useCurio'
import { cn } from '@/lib/utils/cn'
import type { CourseContent, LessonChatAction } from '@/types'

interface LearnChatContainerProps {
  courseId: string
  courseTopic: string
  courseContent: CourseContent
}

export function LearnChatContainer({
  courseId,
  courseTopic: _courseTopic, // Keep for future use
  courseContent,
}: LearnChatContainerProps) {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasStartedRef = useRef(false)
  const isStreamingRef = useRef(false)
  const { addCurio } = useCurio()

  const {
    state,
    currentSection,
    isLastStepInSection,
    isLastSection,
    totalSections,
    stepsPerSection,
    actions,
  } = useLessonChat(courseContent)

  // Keep ref in sync with state
  useEffect(() => {
    isStreamingRef.current = state.isStreaming
  }, [state.isStreaming])

  const scrollToBottom = useCallback(() => {
    // Small delay to ensure content is rendered
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [state.messages, state.isStreaming, scrollToBottom])

  // Fetch step content from API
  const fetchStepContent = useCallback(
    async (
      action: LessonChatAction,
      sectionIdx: number,
      stepIdx: number,
      messages: { role: string; content: string }[],
      userMessage?: string
    ) => {
      if (isStreamingRef.current) return

      const messageType = action === 'clarify' ? 'clarification' : 'lesson'
      actions.addMessage({
        role: 'assistant',
        content: '',
        type: messageType,
      })
      actions.startStreaming()

      try {
        const res = await fetch('/api/ai/lesson-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            action,
            sectionIndex: sectionIdx,
            stepIndex: stepIdx,
            userMessage,
            conversationHistory: messages.slice(-6),
          }),
        })

        if (!res.ok) throw new Error('Failed to get response')
        if (!res.body) throw new Error('No response body')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          fullResponse += text
          actions.updateStreamingMessage(fullResponse)
        }

        actions.finishStreaming()

        if (action === 'clarify' || action === 'example') {
          actions.exitClarification()
        }
      } catch (error) {
        console.error('Lesson chat error:', error)
        actions.updateStreamingMessage(
          "I'm sorry, I had trouble responding. Please try again."
        )
        actions.finishStreaming()
      }
    },
    [courseId, actions]
  )

  // Auto-start with first step
  useEffect(() => {
    if (!hasStartedRef.current && courseContent && courseContent.sections?.length > 0 && state.messages.length === 0) {
      hasStartedRef.current = true
      fetchStepContent('start', state.currentSectionIndex, state.currentStepIndex, [])
    }
  }, [courseContent, state.messages.length, state.currentSectionIndex, state.currentStepIndex, fetchStepContent])

  // Handle Next button
  const handleNext = useCallback(async () => {
    if (state.isComplete) {
      router.push(`/learn/${courseId}/quiz`)
      return
    }

    if (isLastStepInSection) {
      addCurio('lesson_completed')
    }

    let nextSectionIdx = state.currentSectionIndex
    let nextStepIdx = state.currentStepIndex + 1

    if (nextStepIdx >= stepsPerSection) {
      nextSectionIdx = state.currentSectionIndex + 1
      nextStepIdx = 0
    }

    actions.advanceStep()

    const currentMessages = state.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    setTimeout(() => {
      fetchStepContent('next', nextSectionIdx, nextStepIdx, currentMessages)
    }, 100)
  }, [state.isComplete, state.currentSectionIndex, state.currentStepIndex, state.messages, isLastStepInSection, stepsPerSection, courseId, router, addCurio, actions, fetchStepContent])

  // Handle Ask More button
  const handleAskMore = useCallback(() => {
    actions.enterClarification()
  }, [actions])

  // Handle Example button
  const handleExample = useCallback(() => {
    const currentMessages = state.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))
    fetchStepContent('example', state.currentSectionIndex, state.currentStepIndex, currentMessages)
  }, [state.currentSectionIndex, state.currentStepIndex, state.messages, fetchStepContent])

  // Handle user question submission
  const handleUserQuestion = useCallback(
    (message: string) => {
      actions.addMessage({
        role: 'user',
        content: message,
        type: 'clarification',
      })
      const currentMessages = state.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      fetchStepContent('clarify', state.currentSectionIndex, state.currentStepIndex, currentMessages, message)
    },
    [state.currentSectionIndex, state.currentStepIndex, state.messages, actions, fetchStepContent]
  )

  // Determine button labels
  const getNextLabel = () => {
    if (isLastStepInSection && isLastSection) return 'Take Quiz'
    if (isLastStepInSection) return 'Next Section'
    return 'Got it'
  }

  const showActionPills = state.messages.length > 0 && state.mode === 'guided' && !state.isStreaming

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Progress indicator */}
      <StepIndicator
        currentSection={state.currentSectionIndex}
        totalSections={totalSections}
        currentStep={state.currentStepIndex}
        stepsPerSection={stepsPerSection}
        sectionTitle={currentSection?.title}
      />

      {/* Messages area - scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        {/* Initial loading state */}
        {state.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Starting your lesson...
            </p>
          </div>
        )}

        <AnimatePresence>
          {state.messages.map((message, index) => {
            const isLastMessage = index === state.messages.length - 1
            const isStreamingThis = state.isStreaming && isLastMessage

            return (
              <div key={message.id}>
                <LessonMessage
                  role={message.role}
                  content={message.content}
                  type={message.type}
                  isStreaming={isStreamingThis}
                />

                {/* Show action pills INLINE after the last assistant message when not streaming */}
                {isLastMessage && message.role === 'assistant' && showActionPills && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-2 mt-4 mb-6"
                  >
                    {/* Primary: Got it / Next */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleNext}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all',
                        'bg-primary-600 text-white shadow-md shadow-primary-500/20',
                        'hover:bg-primary-700 hover:shadow-lg'
                      )}
                    >
                      {isLastStepInSection && isLastSection ? (
                        <ArrowRight className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {getNextLabel()}
                    </motion.button>

                    {/* Ask More */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleAskMore}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all',
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                        'hover:bg-slate-200 dark:hover:bg-slate-700'
                      )}
                    >
                      <HelpCircle className="h-4 w-4" />
                      Ask More
                    </motion.button>

                    {/* Example */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleExample}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all',
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                        'hover:bg-slate-200 dark:hover:bg-slate-700'
                      )}
                    >
                      <Lightbulb className="h-4 w-4" />
                      Example
                    </motion.button>
                  </motion.div>
                )}
              </div>
            )
          })}
        </AnimatePresence>

        {/* Loading indicator when starting to stream */}
        {state.isStreaming && state.messages.length > 0 && state.messages[state.messages.length - 1]?.content === '' && (
          <LoadingMessage />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area - only show in clarification mode */}
      {state.mode === 'clarification' && (
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 safe-bottom">
          <ChatInput
            onSubmit={handleUserQuestion}
            disabled={state.isStreaming}
            placeholder="Ask anything about this topic..."
          />
          {!state.isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 pb-3"
            >
              <button
                onClick={() => actions.exitClarification()}
                className="w-full py-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                ← Back to lesson
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}
