'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface LiveTranscriptProps {
  transcript: string
  isListening: boolean
  className?: string
}

export function LiveTranscript({
  transcript,
  isListening,
  className,
}: LiveTranscriptProps) {
  if (!transcript && !isListening) {
    return null
  }

  return (
    <div className={cn('text-center', className)}>
      {transcript ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg text-slate-800 dark:text-slate-200"
        >
          {transcript}
          {isListening && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="ml-1 inline-block h-5 w-0.5 bg-primary-500"
            />
          )}
        </motion.p>
      ) : isListening ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-1"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-primary-400"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      ) : null}
    </div>
  )
}
