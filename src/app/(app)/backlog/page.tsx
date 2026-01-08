'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect to Learn page with backlog tab
// The backlog functionality has been consolidated into the Learn page
export default function BacklogPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/learn?tab=backlog')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
    </div>
  )
}
