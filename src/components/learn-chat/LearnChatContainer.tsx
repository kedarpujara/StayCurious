'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Lightbulb, Send, Mic, X } from 'lucide-react'
import { useLessonChat } from './hooks/useLessonChat'
import { LessonMessage, LoadingMessage } from './LessonMessage'
import { StepIndicator } from './StepIndicator'
import { useCurio } from '@/hooks/useCurio'
import { useDeepgram } from '@/hooks/useDeepgram'
import { CurioRewardToast } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import type { CourseContent, LessonChatAction } from '@/types'

interface LearnChatContainerProps {
  courseId: string
  courseTopic: string
  courseContent: CourseContent
  initialSectionIndex?: number
  isReviewMode?: boolean
}

export function LearnChatContainer({
  courseId,
  courseTopic,
  courseContent,
  initialSectionIndex = 0,
  isReviewMode = false,
}: LearnChatContainerProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasStartedRef = useRef(false)
  const isStreamingRef = useRef(false)
  const { addCurio } = useCurio()

  // For smooth text streaming
  const [displayedContent, setDisplayedContent] = useState('')
  const [targetContent, setTargetContent] = useState('')

  // Track loaded example content per section
  const [exampleContent, setExampleContent] = useState<string>('')

  // Curio reward toast state
  const [showCurioReward, setShowCurioReward] = useState(false)

  // Chat input state
  const [inputValue, setInputValue] = useState('')
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    reset: resetVoice,
  } = useDeepgram()

  const {
    state,
    currentSection,
    isLastSection,
    totalSections,
    hasStoredExample,
    actions,
  } = useLessonChat(courseContent, initialSectionIndex)

  useEffect(() => {
    isStreamingRef.current = state.isStreaming
  }, [state.isStreaming])

  // Smooth text animation - reveal characters gradually
  useEffect(() => {
    if (targetContent.length > displayedContent.length) {
      const charsToAdd = targetContent.length - displayedContent.length
      const delay = Math.max(5, Math.min(20, 300 / charsToAdd)) // Adaptive speed

      const animate = () => {
        setDisplayedContent((prev) => {
          if (prev.length < targetContent.length) {
            // Add 1-3 characters at a time for smoother feel
            const charsPerTick = Math.ceil((targetContent.length - prev.length) / 50)
            const nextLength = Math.min(prev.length + Math.max(1, Math.min(3, charsPerTick)), targetContent.length)
            return targetContent.slice(0, nextLength)
          }
          return prev
        })
      }

      const timeoutId = setTimeout(() => {
        animate()
      }, delay)

      return () => clearTimeout(timeoutId)
    }
  }, [targetContent, displayedContent])

  // Sync displayed content when streaming finishes
  useEffect(() => {
    if (!state.isStreaming && targetContent) {
      setDisplayedContent(targetContent)
    }
  }, [state.isStreaming, targetContent])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Only scroll when a NEW message is added (user sends a message)
  const prevMessageCountRef = useRef(0)
  useEffect(() => {
    const newCount = state.messages.length
    if (newCount > prevMessageCountRef.current) {
      const lastMsg = state.messages[newCount - 1]
      // Only scroll if it's a user message
      if (lastMsg?.role === 'user') {
        scrollToBottom()
      }
      prevMessageCountRef.current = newCount
    }
  }, [state.messages, scrollToBottom])

  // Fetch section content (stored content, no AI generation needed)
  const fetchSectionContent = useCallback(
    async (
      action: LessonChatAction,
      sectionIdx: number,
      messages: { role: string; content: string }[],
      userMessage?: string
    ) => {
      if (isStreamingRef.current) return

      const messageType = action === 'clarify' ? 'clarification' : action === 'example' ? 'example' : 'lesson'
      actions.addMessage({
        role: 'assistant',
        content: '',
        type: messageType,
      })
      actions.startStreaming()
      setTargetContent('')
      setDisplayedContent('')

      try {
        const res = await fetch('/api/ai/lesson-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            action,
            sectionIndex: sectionIdx,
            userMessage,
            conversationHistory: messages.slice(-6),
          }),
        })

        if (!res.ok || !res.body) {
          throw new Error('Failed to get response')
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          fullResponse += text
          setTargetContent(fullResponse)
          actions.updateStreamingMessage(fullResponse)
        }

        actions.finishStreaming()

        // Store example content if this was an example request
        if (action === 'example') {
          setExampleContent(fullResponse)
          actions.markExampleLoaded()
        }

        if (action === 'clarify') {
          actions.exitClarification()
        }
      } catch (error) {
        console.error('Lesson chat error:', error)
        const errorMsg = "I'm sorry, I had trouble responding. Please try again."
        setTargetContent(errorMsg)
        actions.updateStreamingMessage(errorMsg)
        actions.finishStreaming()
      }
    },
    [courseId, actions]
  )

  // Start with first section content
  useEffect(() => {
    if (!hasStartedRef.current && courseContent?.sections?.length > 0 && state.messages.length === 0) {
      hasStartedRef.current = true
      fetchSectionContent('start', state.currentSectionIndex, [])
    }
  }, [courseContent, state.messages.length, state.currentSectionIndex, fetchSectionContent])

  // Reset example state when section changes
  useEffect(() => {
    setExampleContent('')
  }, [state.currentSectionIndex])

  // Save progress to database
  const saveProgress = useCallback(async (sectionIndex: number, isComplete: boolean = false) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_course_progress')
        .update({
          current_section_index: sectionIndex,
          status: isComplete ? 'completed' : 'in_progress',
          last_accessed_at: new Date().toISOString(),
          completed_at: isComplete ? new Date().toISOString() : null,
        })
        .eq('catalog_course_id', courseId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Failed to save progress:', error)
      } else {
        // Invalidate queries so the learn page shows updated progress
        queryClient.invalidateQueries({ queryKey: ['user-progress'] })
      }
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }, [courseId, queryClient])

  const handleNext = useCallback(async () => {
    // Already complete - go to completion screen
    if (state.isComplete) {
      router.push(`/learn/${courseId}/complete`)
      return
    }

    // This is the last section
    if (isLastSection) {
      // In review mode, just go back to complete page
      if (isReviewMode) {
        router.push(`/learn/${courseId}/complete`)
        return
      }
      // Normal mode - award curio and mark complete
      addCurio('section_completed')
      setShowCurioReward(true)
      saveProgress(state.currentSectionIndex + 1, true)
      setTimeout(() => {
        router.push(`/learn/${courseId}/complete`)
      }, 1500)
      return
    }

    // Award curio only in non-review mode
    if (!isReviewMode) {
      addCurio('section_completed')
      setShowCurioReward(true)
    }

    // Advance to next section
    const nextSectionIdx = state.currentSectionIndex + 1

    // Save progress only in non-review mode
    if (!isReviewMode) {
      saveProgress(nextSectionIdx)
    }

    actions.nextSection()

    const currentMessages = state.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    setTimeout(() => {
      fetchSectionContent('next', nextSectionIdx, currentMessages)
    }, 100)
  }, [state.isComplete, state.currentSectionIndex, state.messages, isLastSection, courseId, router, addCurio, actions, fetchSectionContent, saveProgress, isReviewMode])

  // Toggle example visibility
  const handleExampleToggle = useCallback(() => {
    if (state.exampleVisible) {
      // Hide example
      actions.hideExample()
    } else {
      // Show example
      actions.showExample()

      // If example hasn't been loaded yet, fetch it
      if (!state.exampleLoaded) {
        // Check if we have a stored example in courseContent
        const storedExample = currentSection?.example
        if (storedExample) {
          // Use stored example directly - add as a message
          actions.addMessage({
            role: 'assistant',
            content: storedExample,
            type: 'example',
          })
          setExampleContent(storedExample)
          actions.markExampleLoaded()
        } else {
          // No stored example, fetch from API (generates one)
          const currentMessages = state.messages.map((m) => ({
            role: m.role,
            content: m.content,
          }))
          fetchSectionContent('example', state.currentSectionIndex, currentMessages)
        }
      }
    }
  }, [state.exampleVisible, state.exampleLoaded, state.messages, state.currentSectionIndex, currentSection?.example, actions, fetchSectionContent])

  const handleUserQuestion = useCallback(
    (message: string) => {
      if (!message.trim()) return
      actions.addMessage({
        role: 'user',
        content: message.trim(),
        type: 'clarification',
      })
      const currentMessages = state.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      fetchSectionContent('clarify', state.currentSectionIndex, currentMessages, message.trim())
      setInputValue('')
      resetVoice()
    },
    [state.currentSectionIndex, state.messages, actions, fetchSectionContent, resetVoice]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleUserQuestion(inputValue)
    }
  }

  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening()
      const currentTranscript = transcript + (interimTranscript ? ' ' + interimTranscript : '')
      if (currentTranscript.trim()) {
        setInputValue(currentTranscript.trim())
      }
      resetVoice()
    } else {
      setInputValue('')
      resetVoice()
      startListening()
    }
  }, [isListening, stopListening, startListening, resetVoice, transcript, interimTranscript])

  const showQuickReplies = state.messages.length > 0 && !state.isStreaming
  const lastMessage = state.messages[state.messages.length - 1]

  // Get display content for the last message (smoothly animated)
  const getMessageContent = (message: typeof lastMessage, index: number) => {
    const isLast = index === state.messages.length - 1
    if (isLast && message.role === 'assistant' && state.isStreaming) {
      return displayedContent
    }
    return message.content
  }

  // Get the continue button text
  const getContinueText = () => {
    if (state.isComplete) return 'Continue'
    if (isLastSection) return 'Finish'
    return 'Got it'
  }

  // Get example button text based on state
  const getExampleButtonText = () => {
    if (state.exampleVisible && state.exampleLoaded) return 'Hide example'
    return 'Show example'
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Curio reward toast */}
      <CurioRewardToast
        isVisible={showCurioReward}
        amount={5}
        onClose={() => setShowCurioReward(false)}
      />

      {/* Progress indicator */}
      <StepIndicator
        currentSection={state.currentSectionIndex}
        totalSections={totalSections}
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
          {state.messages.map((message, index) => {
            const isLast = index === state.messages.length - 1
            const content = getMessageContent(message, index)
            // Don't render empty assistant messages (show loading dots instead)
            if (message.role === 'assistant' && !content && isLast && state.isStreaming) {
              return null
            }
            // Hide example messages if example is hidden (but keep them in history)
            if (message.type === 'example' && !state.exampleVisible && !state.isStreaming) {
              return null
            }
            return (
              <LessonMessage
                key={message.id}
                role={message.role}
                content={content}
                type={message.type}
                isStreaming={state.isStreaming && isLast}
              />
            )
          })}
        </AnimatePresence>

        {state.isStreaming && (!lastMessage?.content || displayedContent === '') && (
          <LoadingMessage />
        )}

        {/* Quick action buttons - appear as response options on the right */}
        {showQuickReplies && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end"
          >
            <div className="flex flex-wrap gap-2 justify-end max-w-[90%]">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium bg-primary-600 text-white active:bg-primary-700 transition-colors shadow-sm touch-manipulation"
              >
                <Check className="h-4 w-4" />
                {getContinueText()}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleExampleToggle}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium transition-colors border touch-manipulation',
                  state.exampleVisible && state.exampleLoaded
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 active:bg-slate-200 dark:active:bg-slate-700'
                )}
              >
                {state.exampleVisible && state.exampleLoaded ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Lightbulb className="h-4 w-4" />
                )}
                {getExampleButtonText()}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Scroll anchor with padding */}
        <div className="h-40" />
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom input area - always visible, with safe area padding for mobile */}
      <div
        className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)' }}
      >
        {/* Chat input */}
        <div className="px-3 sm:px-4 pb-2 pt-2">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={isListening ? (transcript + (interimTranscript ? ' ' + interimTranscript : '')) : inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up question..."
                className="w-full resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-base sm:text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all touch-manipulation"
                rows={1}
                disabled={state.isStreaming || isListening}
                style={{ fontSize: '16px' }}
              />
            </div>

            {/* Voice button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleVoiceToggle}
              disabled={state.isStreaming}
              className={cn(
                'flex h-11 w-11 min-w-[44px] min-h-[44px] items-center justify-center rounded-full transition-all touch-manipulation',
                isListening
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-700',
                state.isStreaming && 'opacity-50'
              )}
              aria-label={isListening ? 'Stop recording' : 'Voice input'}
            >
              {isListening ? (
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                  <Mic className="h-5 w-5" />
                </motion.div>
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </motion.button>

            {/* Send button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleUserQuestion(inputValue)}
              disabled={state.isStreaming || !inputValue.trim()}
              className={cn(
                'flex h-11 w-11 min-w-[44px] min-h-[44px] items-center justify-center rounded-full transition-all touch-manipulation',
                inputValue.trim()
                  ? 'bg-primary-600 text-white active:bg-primary-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500',
                (state.isStreaming || !inputValue.trim()) && 'opacity-50'
              )}
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
