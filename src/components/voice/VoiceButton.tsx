'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mic, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useDeepgram } from '@/hooks/useDeepgram'

interface VoiceButtonProps {
  onTranscriptUpdate: (transcript: string, isFinal: boolean) => void
  onListeningChange?: (isListening: boolean) => void
  onError?: (error: Error) => void
  disabled?: boolean
}

export function VoiceButton({
  onTranscriptUpdate,
  onListeningChange,
  onError,
  disabled = false,
}: VoiceButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const {
    isConnected,
    isConnecting,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
  } = useDeepgram()

  // Notify parent of transcript updates
  useEffect(() => {
    const fullTranscript = transcript + (interimTranscript ? ' ' + interimTranscript : '')
    if (fullTranscript) {
      onTranscriptUpdate(fullTranscript.trim(), !interimTranscript && !!transcript)
    }
  }, [transcript, interimTranscript, onTranscriptUpdate])

  // Notify parent of listening state changes
  useEffect(() => {
    onListeningChange?.(isListening)
  }, [isListening, onListeningChange])

  // Handle errors
  useEffect(() => {
    if (error) {
      onError?.(error)
    }
  }, [error, onError])

  const handleToggle = useCallback(() => {
    if (disabled || isConnecting) return

    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, isConnecting, startListening, stopListening, disabled])

  return (
    <div className="relative">
      {/* Pulse rings when listening */}
      {isListening && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full bg-primary-400"
            initial={{ scale: 1, opacity: 0.3 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-primary-400"
            initial={{ scale: 1, opacity: 0.3 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          />
        </>
      )}

      {/* Main button */}
      <motion.button
        onClick={handleToggle}
        disabled={disabled || isConnecting}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'relative z-10 flex h-24 w-24 items-center justify-center rounded-full shadow-lg transition-all duration-200',
          isListening
            ? 'bg-primary-600 text-white shadow-primary-500/30'
            : isConnecting
            ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400'
            : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
          (disabled || isConnecting) && 'cursor-not-allowed',
          'focus:outline-none focus:ring-4 focus:ring-primary-500/30'
        )}
        aria-label={isConnecting ? 'Connecting...' : isListening ? 'Stop listening' : 'Start listening'}
      >
        {isConnecting ? (
          <Loader2 className="h-10 w-10 animate-spin" />
        ) : isListening ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Mic className="h-10 w-10" />
          </motion.div>
        ) : (
          <Mic className="h-10 w-10" />
        )}
      </motion.button>

      {/* Connection status */}
      {isConnecting ? (
        <p className="mt-4 text-center text-xs text-primary-500 dark:text-primary-400">
          Connecting...
        </p>
      ) : !isConnected && !isListening ? (
        <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
          Tap to connect
        </p>
      ) : null}
    </div>
  )
}
