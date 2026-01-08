'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { LevelUpToast } from '@/components/ui/LevelUpToast'

interface LevelUpContextType {
  showLevelUp: (newTitle: string) => void
}

const LevelUpContext = createContext<LevelUpContextType | undefined>(undefined)

export function LevelUpProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false)
  const [title, setTitle] = useState('')

  const showLevelUp = useCallback((newTitle: string) => {
    setTitle(newTitle)
    setIsVisible(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsVisible(false)
  }, [])

  return (
    <LevelUpContext.Provider value={{ showLevelUp }}>
      {children}
      <LevelUpToast
        isVisible={isVisible}
        newTitle={title}
        onClose={handleClose}
      />
    </LevelUpContext.Provider>
  )
}

export function useLevelUp() {
  const context = useContext(LevelUpContext)
  if (!context) {
    throw new Error('useLevelUp must be used within a LevelUpProvider')
  }
  return context
}
