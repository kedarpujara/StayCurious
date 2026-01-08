'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LevelUpProvider } from '@/contexts/LevelUpContext'
import { CourseGenerationProvider } from '@/contexts/CourseGenerationContext'
import { CourseGenerationToast } from '@/components/ui/CourseGenerationToast'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LevelUpProvider>
          <CourseGenerationProvider>
            {children}
            <CourseGenerationToast />
          </CourseGenerationProvider>
        </LevelUpProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
