'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Send, Keyboard, Mic } from 'lucide-react'
import { Button } from '@/components/ui'
import { useDeepgram } from '@/hooks/useDeepgram'
import { cn } from '@/lib/utils/cn'

interface ChatInputProps {
  onSubmit: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSubmit,
  disabled = false,
  placeholder = 'Ask a question...',
}: ChatInputProps) {
  const [inputMode, setInputMode] = useState<'voice' | 'typing'>('typing')
  const [typedMessage, setTypedMessage] = useState('')

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    reset: resetVoice,
  } = useDeepgram()

  const fullTranscript = transcript + (interimTranscript ? ' ' + interimTranscript : '')

  const handleSubmit = useCallback(
    (message: string) => {
      if (!message.trim() || disabled) return
      onSubmit(message.trim())
      setTypedMessage('')
      resetVoice()
    },
    [disabled, onSubmit, resetVoice]
  )

  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening()
      const currentTranscript = transcript + (interimTranscript ? ' ' + interimTranscript : '')
      if (currentTranscript.trim()) {
        setTimeout(() => {
          handleSubmit(currentTranscript.trim())
        }, 300)
      }
    } else {
      resetVoice()
      startListening()
    }
  }, [isListening, stopListening, startListening, resetVoice, transcript, interimTranscript, handleSubmit])

  const handleTypedSubmit = () => {
    handleSubmit(typedMessage)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTypedSubmit()
    }
  }

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
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
                disabled={disabled}
                className={cn(
                  'relative z-10 flex h-12 w-12 items-center justify-center rounded-full transition-all',
                  isListening
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                aria-label={isListening ? 'Stop and send' : 'Start recording'}
              >
                {isListening ? (
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }}>
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
            <Button onClick={() => handleSubmit(fullTranscript)} size="sm" disabled={disabled} className="w-full">
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
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20"
              rows={2}
              disabled={disabled}
            />
            <Button
              onClick={handleTypedSubmit}
              disabled={!typedMessage.trim() || disabled}
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
  )
}
