'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface WaveformProps {
  isActive: boolean
  audioData?: Float32Array
  variant?: 'minimal' | 'full'
  className?: string
}

export function Waveform({
  isActive,
  audioData,
  variant = 'minimal',
  className,
}: WaveformProps) {
  const barsCount = variant === 'minimal' ? 5 : 20

  // If we have audio data, calculate bar heights from it
  const getBarHeight = (index: number): number => {
    if (!isActive) return 20
    if (audioData && audioData.length > 0) {
      const dataIndex = Math.floor((index / barsCount) * audioData.length)
      const value = Math.abs(audioData[dataIndex] || 0)
      return 20 + value * 80
    }
    // Default animated heights when no data
    return 20 + Math.random() * 60
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-1',
        variant === 'full' && 'gap-0.5',
        className
      )}
    >
      {Array.from({ length: barsCount }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            'rounded-full bg-primary-500',
            variant === 'minimal' ? 'w-1' : 'w-0.5'
          )}
          animate={{
            height: isActive ? [20, getBarHeight(i), 20] : 20,
            opacity: isActive ? 1 : 0.3,
          }}
          transition={{
            duration: 0.5,
            repeat: isActive ? Infinity : 0,
            delay: i * 0.05,
            ease: 'easeInOut',
          }}
          style={{ height: 20 }}
        />
      ))}
    </div>
  )
}
