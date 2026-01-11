'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface CurioRewardToastProps {
  isVisible: boolean
  amount: number
  onClose: () => void
}

export function CurioRewardToast({ isVisible, amount, onClose }: CurioRewardToastProps) {
  // Auto-close after 1 second
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 shadow-lg">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.4 }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </motion.div>
            <span className="font-semibold text-white">+{amount} Curio</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
