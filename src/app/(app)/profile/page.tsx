'use client'

import { motion } from 'framer-motion'
import { Sparkles, BookOpen, Award, Flame, LogOut, Sun, Moon, Monitor } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { PageContainer } from '@/components/layout'
import { Card, Button, ProgressBar } from '@/components/ui'
import { useAuth, useCurio } from '@/hooks'
import { useTheme } from '@/contexts/ThemeContext'
import { createClient } from '@/lib/supabase/client'
import { getProgressToNextTitle, getNextTitle } from '@/constants/titles'
import { BADGES } from '@/constants/badges'
import { cn } from '@/lib/utils/cn'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { curio, title, isLoading: curioLoading } = useCurio()
  const { theme, setTheme } = useTheme()
  const supabase = createClient()

  // Fetch user stats from users table and actual counts
  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return null

      // Get user profile with stats
      const { data: profile } = await supabase
        .from('users')
        .select('questions_asked, courses_completed, quizzes_passed, perfect_quizzes, current_streak, longest_streak, longest_daily_streak')
        .eq('id', authUser.id)
        .single()

      // Fallback: count from user_course_progress if user stats are 0
      let coursesCompleted = profile?.courses_completed || 0
      if (coursesCompleted === 0) {
        const { count } = await supabase
          .from('user_course_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id)
          .eq('status', 'completed')
        coursesCompleted = count || 0
      }

      // Fallback: count quizzes from quiz_attempts if user stats are 0
      let quizzesPassed = profile?.quizzes_passed || 0
      if (quizzesPassed === 0) {
        const { count } = await supabase
          .from('quiz_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id)
          .eq('passed', true)
        quizzesPassed = count || 0
      }

      return {
        questionsAsked: profile?.questions_asked || 0,
        quizzesPassed,
        coursesCompleted,
        perfectQuizzes: profile?.perfect_quizzes || 0,
        currentStreak: profile?.current_streak || profile?.longest_daily_streak || 0,
        longestStreak: profile?.longest_streak || profile?.longest_daily_streak || 0,
      }
    },
  })

  // Fetch earned badges from user_badges table
  const { data: earnedBadges = [] } = useQuery({
    queryKey: ['user-badges'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return []

      const { data } = await supabase
        .from('user_badges')
        .select('badge_id, awarded_at')
        .eq('user_id', authUser.id)

      return data || []
    },
  })

  const nextTitle = getNextTitle(curio)
  const titleProgress = getProgressToNextTitle(curio)

  const earnedBadgeIds = new Set(earnedBadges.map((b: any) => b.badge_id))

  return (
    <PageContainer
      title="Profile"
      headerRight={
        <button
          onClick={() => signOut()}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      }
    >
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-center"
      >
        {user?.user_metadata?.avatar_url ? (
          <Image
            src={user.user_metadata.avatar_url}
            alt="Avatar"
            width={80}
            height={80}
            className="mx-auto mb-3 rounded-full"
          />
        ) : (
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {user?.email?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
        )}
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Curious Learner'}
        </h1>
        <p className="text-slate-500 dark:text-slate-400">{user?.email}</p>
      </motion.div>

      {/* Title & Curio */}
      <Card variant="highlighted" className="mb-6">
        <div className="text-center">
          <p className="text-sm text-primary-600 dark:text-primary-400">Current Title</p>
          <h2 className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
            <Sparkles className="h-5 w-5" />
            <span className="text-lg font-semibold">{curio} Curio</span>
          </div>
        </div>

        {titleProgress && nextTitle && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Next: {nextTitle.name}</span>
              <span className="text-slate-500 dark:text-slate-400">
                {titleProgress.current}/{titleProgress.required}
              </span>
            </div>
            <ProgressBar value={titleProgress.percentage} variant="curio" />
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/50">
              <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats?.quizzesPassed || 0}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Quizzes Passed</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
              <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats?.coursesCompleted || 0}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Courses Completed</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50">
              <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats?.currentStreak || 0}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Day Streak</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
              <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {earnedBadges.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Badges Earned</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Badges */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Badges</h2>
        <div className="grid grid-cols-4 gap-3">
          {BADGES.slice(0, 12).map((badge) => {
            const isEarned = earnedBadgeIds.has(badge.id)

            return (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.05 }}
                className={cn(
                  'flex flex-col items-center rounded-xl p-3 transition-colors',
                  isEarned
                    ? 'bg-white shadow-sm dark:bg-slate-700'
                    : 'bg-slate-100 opacity-50 dark:bg-slate-800'
                )}
              >
                <span className="mb-1 text-2xl">{badge.icon}</span>
                <span className="text-center text-xs text-slate-600 line-clamp-2 dark:text-slate-300">
                  {badge.name}
                </span>
              </motion.div>
            )
          })}
        </div>

        {BADGES.length > 12 && (
          <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
            +{BADGES.length - 12} more badges to discover
          </p>
        )}
      </section>

      {/* Settings */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Settings</h2>
        <Card>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Appearance</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors',
                    theme === 'light'
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                  )}
                >
                  <Sun className="h-4 w-4" />
                  Light
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors',
                    theme === 'dark'
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                  )}
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors',
                    theme === 'system'
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                  )}
                >
                  <Monitor className="h-4 w-4" />
                  Auto
                </button>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </PageContainer>
  )
}
