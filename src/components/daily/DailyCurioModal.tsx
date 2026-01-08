'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Trophy, Clock, ArrowRight, Flame } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useDaily } from '@/hooks/useDaily'

const STORAGE_KEY = 'daily_curio_dismissed'

export function DailyCurioModal() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const { status, daily, isLoading, shouldShowModal } = useDaily()

  useEffect(() => {
    if (!isLoading && shouldShowModal && daily) {
      // Check if user dismissed today
      const dismissed = localStorage.getItem(STORAGE_KEY)
      const today = new Date().toISOString().split('T')[0]

      if (dismissed !== today) {
        // Small delay for better UX
        const timer = setTimeout(() => setIsOpen(true), 500)
        return () => clearTimeout(timer)
      }
    }
  }, [isLoading, shouldShowModal, daily])

  const handleDismiss = () => {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem(STORAGE_KEY, today)
    setIsOpen(false)
  }

  const handleStart = () => {
    setIsOpen(false)
    router.push('/daily')
  }

  if (!isOpen || !daily) return null

  const topic = daily.dailyCourse.daily_topic

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="relative overflow-hidden">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute right-3 top-3 z-10 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Daily Curio
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Today&apos;s curiosity challenge
                </p>
              </div>
            </div>

            {/* Topic preview */}
            <div className="mb-4 rounded-xl bg-gradient-to-br from-primary-50 to-accent-50 p-4 dark:from-primary-900/30 dark:to-accent-900/30">
              <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">
                {topic.topic}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {topic.description}
              </p>
            </div>

            {/* Stats */}
            <div className="mb-4 flex items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>5 min</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4" />
                <span>5 questions</span>
              </div>
              {status && status.streak > 0 && (
                <div className="flex items-center gap-1.5 text-amber-500">
                  <Flame className="h-4 w-4" />
                  <span>{status.streak} day streak</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleDismiss}
                className="flex-1"
              >
                Later
              </Button>
              <Button
                onClick={handleStart}
                className="flex-1"
                icon={<ArrowRight className="h-4 w-4" />}
              >
                Start
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
