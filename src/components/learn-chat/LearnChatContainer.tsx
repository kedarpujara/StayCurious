'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useLessonChat } from './hooks/useLessonChat'
import { LessonMessage, LoadingMessage } from './LessonMessage'
import { ActionPills } from './ActionPills'
import { ChatInput } from './ChatInput'
import { StepIndicator } from './StepIndicator'
import { useCurio } from '@/hooks/useCurio'
import type { CourseContent, LessonChatAction } from '@/types'

interface LearnChatContainerProps {
  courseId: string
  courseTopic: string
  courseContent: CourseContent
}

export function LearnChatContainer({
  courseId,
  courseTopic,
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
    currentStepKind,
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [state.messages, scrollToBottom])

  // Fetch step content from API - use refs to avoid stale closures
  const fetchStepContent = useCallback(
    async (
      action: LessonChatAction,
      sectionIdx: number,
      stepIdx: number,
      messages: { role: string; content: string }[],
      userMessage?: string
    ) => {
      console.log('[LearnChat] fetchStepContent called:', { action, sectionIdx, stepIdx, isStreaming: isStreamingRef.current })

      if (isStreamingRef.current) {
        console.log('[LearnChat] Already streaming, skipping')
        return
      }

      // Add placeholder message for streaming
      const messageType = action === 'clarify' ? 'clarification' : 'lesson'
      actions.addMessage({
        role: 'assistant',
        content: '',
        type: messageType,
      })
      actions.startStreaming()

      try {
        console.log('[LearnChat] Making API request...')
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

        console.log('[LearnChat] API response status:', res.status)

        if (!res.ok) {
          const errorText = await res.text()
          console.error('[LearnChat] API error:', errorText)
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
          actions.updateStreamingMessage(fullResponse)
        }

        console.log('[LearnChat] Streaming complete, response length:', fullResponse.length)
        actions.finishStreaming()

        // Exit clarification mode after responding
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
    console.log('[LearnChat] Auto-start check:', {
      hasStarted: hasStartedRef.current,
      hasCourseContent: !!courseContent,
      messagesLength: state.messages.length,
      sectionsLength: courseContent?.sections?.length,
    })

    if (!hasStartedRef.current && courseContent && courseContent.sections?.length > 0 && state.messages.length === 0) {
      hasStartedRef.current = true
      console.log('[LearnChat] Starting first step...')
      // Pass current state values directly
      fetchStepContent(
        'start',
        state.currentSectionIndex,
        state.currentStepIndex,
        []
      )
    }
  }, [courseContent, state.messages.length, state.currentSectionIndex, state.currentStepIndex, fetchStepContent])

  // Handle Next button
  const handleNext = useCallback(async () => {
    if (state.isComplete) {
      // Navigate to quiz
      router.push(`/learn/${courseId}/quiz`)
      return
    }

    // Award curio for completing a section
    if (isLastStepInSection) {
      addCurio('lesson_completed')
    }

    // Calculate next step/section indexes
    let nextSectionIdx = state.currentSectionIndex
    let nextStepIdx = state.currentStepIndex + 1

    // Check if we need to move to next section
    if (nextStepIdx >= stepsPerSection) {
      nextSectionIdx = state.currentSectionIndex + 1
      nextStepIdx = 0
    }

    // Advance to next step
    actions.advanceStep()

    // Fetch next content with calculated indexes
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

  // Debug render logging
  const shouldShowActionPills = state.messages.length > 0 && state.mode === 'guided'
  const shouldShowButtons = shouldShowActionPills && !state.isStreaming
  console.log('[LearnChat] Render state:', {
    messagesLength: state.messages.length,
    mode: state.mode,
    modeType: typeof state.mode,
    isStreaming: state.isStreaming,
    shouldShowActionPills,
    shouldShowButtons,
    isLastStepInSection,
    isLastSection,
  })

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

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
          {state.messages.map((message) => (
            <LessonMessage
              key={message.id}
              role={message.role}
              content={message.content}
              type={message.type}
              isStreaming={
                state.isStreaming &&
                message.id === state.messages[state.messages.length - 1]?.id
              }
            />
          ))}
        </AnimatePresence>

        {state.isStreaming && state.messages.length > 0 && state.messages[state.messages.length - 1]?.content === '' && (
          <LoadingMessage />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="px-4 py-2 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 border-t">
          Debug: mode={state.mode} | streaming={state.isStreaming.toString()} | messages={state.messages.length} | section={state.currentSectionIndex}/{totalSections} | step={state.currentStepIndex}
        </div>
      )}

      {/* Action pills area - fixed at bottom with safe area padding */}
      <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 safe-bottom">
        {/* Always visible test element */}
        <div className="text-xs text-red-500 text-center py-1">
          TEST: Container visible | shouldShow={shouldShowButtons.toString()}
        </div>

        {shouldShowActionPills && (
          state.isStreaming ? (
            /* Show loading indicator while streaming */
            <div className="flex flex-wrap gap-2 justify-center py-4 opacity-50">
              <span className="px-4 py-2.5 rounded-full text-sm bg-slate-200 dark:bg-slate-700 text-slate-400 animate-pulse">
                Curio is thinking...
              </span>
            </div>
          ) : (
            <>
              {console.log('[LearnChat] Rendering ActionPills now!')}
              <ActionPills
                onNext={handleNext}
                onAskMore={handleAskMore}
                onExample={handleExample}
                isLastStep={isLastStepInSection}
                isLastSection={isLastSection}
                isStreaming={state.isStreaming}
                mode={state.mode}
              />
            </>
          )
        )}

        {/* Fallback if conditions not met - for debugging */}
        {!shouldShowActionPills && (
          <div className="py-4 text-center text-sm text-slate-400">
            Waiting: msgs={state.messages.length} mode={state.mode}
          </div>
        )}
      </div>

      {/* Input area - only show in clarification mode */}
      {state.mode === 'clarification' && (
        <ChatInput
          onSubmit={handleUserQuestion}
          disabled={state.isStreaming}
          placeholder="Ask anything about this topic..."
        />
      )}

      {/* Back to lesson button when in clarification mode and not streaming */}
      {state.mode === 'clarification' && !state.isStreaming && (
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
  )
}
