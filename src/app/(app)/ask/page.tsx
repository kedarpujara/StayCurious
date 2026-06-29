'use client'

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  Suspense,
  KeyboardEvent,
} from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, MicOff, BookOpen, Loader2, Sparkles, Shuffle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout'
import { TeachingContent } from '@/components/ui'
import { useDeepgram } from '@/hooks/useDeepgram'
import { useCurio } from '@/hooks/useCurio'
import { useCourseGeneration } from '@/contexts/CourseGenerationContext'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  error?: string
  questionId?: string
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

function AskPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hasHandledSearchParam = useRef(false)

  const { addCurio, recentCurio } = useCurio()
  const { startBackgroundGeneration, pendingCourse, goToCourse } = useCourseGeneration()

  const {
    isListening,
    isConnecting,
    transcript: voiceTranscript,
    interimTranscript,
    startListening,
    stopListening,
    reset: resetVoice,
  } = useDeepgram()

  // Almanac courses for Surprise Me
  const { data: almanacCourses = [], isLoading: almanacLoading } = useQuery({
    queryKey: ['all-almanac-course-titles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_catalog')
        .select('id, topic')
        .eq('is_published', true)
        .eq('source', 'almanac')
      if (error) throw error
      return (data || []) as { id: string; topic: string }[]
    },
    staleTime: 1000 * 60 * 10,
  })

  const handleSurpriseMe = () => {
    if (almanacCourses.length === 0) return
    const pick = almanacCourses[Math.floor(Math.random() * almanacCourses.length)]
    router.push(`/learn/${pick.id}`)
  }

  const buildHistory = (msgs: ChatMessage[]) =>
    msgs
      .filter((m) => !m.isStreaming && !m.error && m.content)
      .map((m) => ({ role: m.role, content: m.content }))

  const sendRequest = useCallback(
    async (question: string, assistantId: string, history: { role: string; content: string }[]) => {
      // Save question to DB
      let questionId: string | undefined
      try {
        const res = await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, source: 'ask_page' }),
        })
        const data = await res.json()
        if (data.question?.id) {
          questionId = data.question.id
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, questionId } : m))
          )
        }
      } catch {
        // Non-fatal — continue without DB record
      }

      const abort = new AbortController()
      abortRef.current = abort

      try {
        const res = await fetch('/api/ai/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, history }),
          signal: abort.signal,
        })

        if (!res.ok || !res.body) {
          throw new Error('Failed to get explanation')
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          accumulated += chunk
          const snapshot = accumulated
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: snapshot, isStreaming: true }
                : m
            )
          )
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: accumulated, isStreaming: false }
              : m
          )
        )

        // Save answer to question record
        if (questionId && accumulated) {
          fetch('/api/questions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: questionId, answer: accumulated }),
          }).catch((err) => console.error('Failed to save answer:', err))
        }

        addCurio('question_asked')
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        const message = err instanceof Error ? err.message : 'Something went wrong'
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, isStreaming: false, error: message }
              : m
          )
        )
      } finally {
        setIsSubmitting(false)
        abortRef.current = null
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    },
    [addCurio]
  )

  const handleSend = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (!trimmed || isSubmitting) return

      // Stop voice if active
      if (isListening) stopListening()
      resetVoice()
      setInputValue('')
      setIsSubmitting(true)

      // Snapshot history from current messages before adding new ones
      const history = buildHistory(messages)

      const userMsg: ChatMessage = { id: generateId(), role: 'user', content: trimmed }
      const assistantId = generateId()
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      await sendRequest(trimmed, assistantId, history)
    },
    [isSubmitting, isListening, stopListening, resetVoice, messages, sendRequest]
  )

  // Stable ref so the ?generate= effect always calls the latest handleSend
  const handleSendRef = useRef(handleSend)
  useEffect(() => {
    handleSendRef.current = handleSend
  }, [handleSend])

  // Sync voice transcript into input field
  useEffect(() => {
    const full = voiceTranscript + (interimTranscript ? ' ' + interimTranscript : '')
    if (full.trim()) {
      setInputValue(full.trim())
    }
  }, [voiceTranscript, interimTranscript])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle ?generate= search param on mount — uses ref to avoid stale closure
  useEffect(() => {
    if (hasHandledSearchParam.current) return
    const generateTopic = searchParams.get('generate')
    if (generateTopic) {
      hasHandledSearchParam.current = true
      handleSendRef.current(generateTopic)
    }
  }, [searchParams])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(inputValue)
    }
  }

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleGenerateCourse = (topic: string, questionId?: string) => {
    startBackgroundGeneration(topic, questionId)
  }

  const isCourseGeneratingForTopic = (topic: string) =>
    pendingCourse?.status === 'generating' && pendingCourse.topic === topic

  const isCourseReadyForTopic = (topic: string) =>
    pendingCourse?.status === 'completed' && pendingCourse.topic === topic

  return (
    <PageContainer
      title="Ask Curio"
      noPadding
      headerRight={
        recentCurio > 0 ? (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
          >
            <Sparkles className="h-4 w-4" />
            +{recentCurio}
          </motion.div>
        ) : undefined
      }
    >
      <div className="flex h-[calc(100vh-7rem)] flex-col">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-col items-center justify-center gap-4 text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40">
                  <Sparkles className="h-8 w-8 text-primary-500" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-800 dark:text-white">
                    What are you curious about?
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Ask anything — follow up as much as you like
                  </p>
                </div>
                <button
                  onClick={handleSurpriseMe}
                  disabled={almanacLoading || almanacCourses.length === 0}
                  className="mt-2 flex items-center gap-1.5 text-sm text-slate-400 hover:text-primary-600 dark:text-slate-500 dark:hover:text-primary-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  {almanacLoading ? 'Loading…' : 'or try a random course'}
                </button>
              </motion.div>
            ) : (
              messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'mb-4',
                    msg.role === 'user' ? 'flex justify-end' : 'flex flex-col justify-start'
                  )}
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary-600 px-4 py-2.5 text-white dark:bg-primary-500">
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  ) : (
                    <>
                      {msg.error ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                          <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            Something went wrong
                          </p>
                          <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                            {msg.error}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                          {msg.isStreaming && !msg.content ? (
                            <div className="flex items-center gap-2 text-slate-400">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                              <span className="text-sm">Thinking…</span>
                            </div>
                          ) : (
                            <TeachingContent content={msg.content} />
                          )}
                          {msg.isStreaming && msg.content && (
                            <span className="mt-1 inline-block h-4 w-0.5 animate-pulse bg-primary-500" />
                          )}
                        </div>
                      )}

                      {/* Action pills — shown after streaming completes */}
                      {!msg.isStreaming && msg.content && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="mt-2 flex flex-wrap gap-2"
                        >
                          {(() => {
                            const userMsg = messages[index - 1]
                            const topic = userMsg?.content ?? ''
                            if (isCourseReadyForTopic(topic)) {
                              return (
                                <button
                                  onClick={goToCourse}
                                  className="flex items-center gap-1.5 rounded-full border border-green-300 bg-green-50 px-3 py-1 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
                                >
                                  <BookOpen className="h-3.5 w-3.5" />
                                  View Course
                                </button>
                              )
                            }
                            return (
                              <button
                                onClick={() => handleGenerateCourse(topic, msg.questionId)}
                                disabled={isCourseGeneratingForTopic(topic)}
                                className="flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-primary-700 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/40"
                              >
                                {isCourseGeneratingForTopic(topic) ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Generating…
                                  </>
                                ) : (
                                  <>
                                    <BookOpen className="h-3.5 w-3.5" />
                                    Generate Course
                                  </>
                                )}
                              </button>
                            )
                          })()}
                        </motion.div>
                      )}
                    </>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-end gap-2">
            {/* Mic button */}
            <button
              onClick={handleVoiceToggle}
              disabled={isSubmitting}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all',
                isListening
                  ? 'bg-red-100 text-red-600 ring-2 ring-red-400 dark:bg-red-900/30 dark:text-red-400'
                  : isConnecting
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                isSubmitting && 'cursor-not-allowed opacity-50'
              )}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isConnecting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isListening ? (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  <MicOff className="h-5 w-5" />
                </motion.div>
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>

            {/* Text input */}
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Listening…' : 'Ask anything…'}
              rows={1}
              disabled={isSubmitting}
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-primary-500"
              style={{ maxHeight: '120px', overflowY: 'auto' }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`
              }}
            />

            {/* Send button */}
            <button
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim() || isSubmitting}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-primary-500 dark:hover:bg-primary-600"
              aria-label="Send"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-center text-xs text-slate-400 dark:text-slate-600">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </PageContainer>
  )
}

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <PageContainer title="Ask Curio">
          <div className="flex items-center justify-center pt-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        </PageContainer>
      }
    >
      <AskPageContent />
    </Suspense>
  )
}
