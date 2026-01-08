'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Sparkles, ArrowRight } from 'lucide-react'
import confetti from 'canvas-confetti'
import { Button, Card, ProgressBar } from '@/components/ui'
import { getTitleForCurio, getNextTitle, getProgressToNextTitle } from '@/constants/titles'
import { cn } from '@/lib/utils/cn'

interface CelebrationModalProps {
  isOpen: boolean
  onClose: () => void
  score: number
  curioEarned: number
  totalCurio: number
  titleUpgraded: boolean
  newTitle?: string
  intensity?: string
  timeBudget?: number
}

export function CelebrationModal({
  isOpen,
  onClose,
  score,
  curioEarned,
  totalCurio,
  titleUpgraded,
  newTitle,
  intensity,
  timeBudget,
}: CelebrationModalProps) {
  const [showLevelUp, setShowLevelUp] = useState(false)
  const confettiTriggered = useRef(false)

  // Fire confetti when modal opens
  useEffect(() => {
    if (isOpen && !confettiTriggered.current) {
      confettiTriggered.current = true

      // Fire confetti from both sides
      const duration = 3000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 }

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          clearInterval(interval)
          return
        }

        const particleCount = 50 * (timeLeft / duration)

        // Confetti from left
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f59e0b'],
        })

        // Confetti from right
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f59e0b'],
        })
      }, 250)

      // Show level up animation after a delay if title was upgraded
      if (titleUpgraded) {
        setTimeout(() => setShowLevelUp(true), 1500)
      }

      return () => clearInterval(interval)
    }
  }, [isOpen, titleUpgraded])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      confettiTriggered.current = false
      setShowLevelUp(false)
    }
  }, [isOpen])

  const currentTitle = getTitleForCurio(totalCurio)
  const nextTitle = getNextTitle(totalCurio)
  const progress = getProgressToNextTitle(totalCurio)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="relative overflow-hidden text-center">
              {/* Level up overlay */}
              <AnimatePresence>
                {showLevelUp && newTitle && (
                  <motion.div
                    initial={{ opacity: 0, scale: 1.2 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 p-6"
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5, repeat: 2 }}
                    >
                      <Sparkles className="mb-4 h-16 w-16 text-white" />
                    </motion.div>
                    <motion.h2
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="mb-2 text-2xl font-bold text-white"
                    >
                      Level Up!
                    </motion.h2>
                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mb-6 text-lg text-white/90"
                    >
                      You are now a
                    </motion.p>
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mb-6 rounded-xl bg-white/20 px-6 py-3"
                    >
                      <span className="text-xl font-bold text-white">{newTitle}</span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Button
                        onClick={() => setShowLevelUp(false)}
                        className="bg-white text-orange-600 hover:bg-white/90"
                      >
                        Continue
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main celebration content */}
              <div className="py-6">
                {/* Trophy icon with glow */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center"
                >
                  <div className="absolute inset-0 rounded-full bg-green-400/20 blur-xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600">
                    <Trophy className="h-10 w-10 text-white" />
                  </div>
                </motion.div>

                {/* Congratulations */}
                <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
                  Congratulations!
                </h2>
                <p className="mb-6 text-slate-500 dark:text-slate-400">
                  You crushed it!
                </p>

                {/* Score */}
                <div className="mb-4">
                  <p className="text-5xl font-bold text-slate-900 dark:text-white">{score}%</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Quiz Score</p>
                </div>

                {/* Curio earned */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 dark:bg-amber-900/50"
                >
                  <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    +{curioEarned} Curio
                  </span>
                </motion.div>

                {/* Course info */}
                {intensity && timeBudget && (
                  <div className="mb-4 flex items-center justify-center gap-2 text-sm">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 font-medium capitalize',
                      intensity === 'deep'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                        : intensity === 'solid'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    )}>
                      {intensity}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500">•</span>
                    <span className="text-slate-500 dark:text-slate-400">{timeBudget} min course</span>
                  </div>
                )}

                {/* Level progress */}
                {progress && nextTitle && (
                  <div className="mb-6 rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {currentTitle.name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {progress.current}/{progress.required}
                      </span>
                    </div>
                    <ProgressBar value={progress.percentage} variant="curio" />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {progress.required - progress.current} Curio to {nextTitle.name}
                    </p>
                  </div>
                )}

                {/* Continue button */}
                <Button
                  onClick={onClose}
                  size="lg"
                  className="w-full"
                  icon={<ArrowRight className="h-5 w-5" />}
                >
                  Continue
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
