'use client'

import { useState } from 'react'
import { Sparkles, Chrome } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Login error:', error)
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
        <Sparkles className="h-12 w-12 text-primary-600 dark:text-primary-400" />
      </div>

      {/* Title */}
      <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">Welcome to StayCurious</h1>
      <p className="mb-12 text-center text-slate-600 dark:text-slate-400">
        Your voice-first learning companion
      </p>

      {/* Google Sign In */}
      <Button
        onClick={handleGoogleLogin}
        loading={isLoading}
        size="xl"
        variant="secondary"
        className="w-full max-w-xs border border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
        icon={<Chrome className="h-5 w-5" />}
      >
        Continue with Google
      </Button>

      {/* Terms */}
      <p className="mt-8 max-w-xs text-center text-xs text-slate-500 dark:text-slate-400">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>

      {/* Decorative quote */}
      <div className="absolute bottom-8 px-6">
        <p className="text-center text-sm italic text-slate-400 dark:text-slate-500">
          &quot;Answers are cheap. Understanding is earned.&quot;
        </p>
      </div>
    </main>
  )
}
