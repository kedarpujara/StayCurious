'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'

interface LevelUpToastProps {
  isVisible: boolean
  newTitle: string
  onClose: () => void
}

export function LevelUpToast({ isVisible, newTitle, onClose }: LevelUpToastProps) {
  // Auto-close after 5 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -100, x: '-50%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 p-4 shadow-lg">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-2 top-2 rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20"
              >
                <Sparkles className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <p className="text-sm font-medium text-white/90">Level Up!</p>
                <p className="text-lg font-bold text-white">{newTitle}</p>
              </div>
            </div>

            {/* Animated background sparkles */}
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
