'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, BookOpen, Award, Flame, LogOut, Sun, Moon, Monitor, MessageCircle, Pencil, Check, X, Loader2, ChevronRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import { PageContainer } from '@/components/layout'
import { Card, ProgressBar } from '@/components/ui'
import { useAuth, useCurio } from '@/hooks'
import { useTheme } from '@/contexts/ThemeContext'
import { createClient } from '@/lib/supabase/client'
import { getProgressToNextTitle, getNextTitle } from '@/constants/titles'
import { BADGES, RARITY_COLORS } from '@/constants/badges'
import { cn } from '@/lib/utils/cn'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { curio, title, isLoading: curioLoading } = useCurio()
  const { theme, setTheme } = useTheme()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [showAllBadges, setShowAllBadges] = useState(false)

  // Fetch user stats from users table and actual counts
  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return null

      // Get user profile with stats
      const { data: profile } = await supabase
        .from('users')
        .select('username, questions_asked, courses_completed, quizzes_passed, perfect_quizzes, current_streak, longest_streak, longest_daily_streak')
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
        username: profile?.username || null,
        questionsAsked: profile?.questions_asked || 0,
        quizzesPassed,
        coursesCompleted,
        perfectQuizzes: profile?.perfect_quizzes || 0,
        currentStreak: profile?.current_streak || profile?.longest_daily_streak || 0,
        longestStreak: profile?.longest_streak || profile?.longest_daily_streak || 0,
      }
    },
  })

  // Username update mutation
  const updateUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await fetch('/api/user/username', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update username')
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
      setIsEditingUsername(false)
      setUsernameError(null)
    },
    onError: (error: Error) => {
      setUsernameError(error.message)
    },
  })

  // Initialize username input when stats load
  useEffect(() => {
    if (stats?.username) {
      setUsernameInput(stats.username)
    }
  }, [stats?.username])

  const handleSaveUsername = () => {
    setUsernameError(null)
    updateUsernameMutation.mutate(usernameInput)
  }

  const handleCancelEdit = () => {
    setIsEditingUsername(false)
    setUsernameInput(stats?.username || '')
    setUsernameError(null)
  }

  // Fetch earned badges from user_badges table
  const { data: earnedBadges = [] } = useQuery({
    queryKey: ['user-badges'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return []

      const { data } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at')
        .eq('user_id', authUser.id)

      return data || []
    },
  })

  // Fetch recent questions
  const { data: recentQuestions = [] } = useQuery({
    queryKey: ['recent-questions'],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return []

      const { data } = await supabase
        .from('user_questions')
        .select('id, question, created_at')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(5)

      return data || []
    },
  })

  const nextTitle = getNextTitle(curio)
  const titleProgress = getProgressToNextTitle(curio)

  const earnedBadgeIds = new Set(earnedBadges.map((b: any) => b.badge_id))

  // Sort badges: earned first, then unearned
  const sortedBadges = useMemo(() => {
    const earned = BADGES.filter(b => earnedBadgeIds.has(b.id))
    const unearned = BADGES.filter(b => !earnedBadgeIds.has(b.id))
    return [...earned, ...unearned]
  }, [earnedBadgeIds])

  // For display: show all earned + some unearned to fill 6 slots
  const displayBadges = useMemo(() => {
    const earned = sortedBadges.filter(b => earnedBadgeIds.has(b.id))
    const unearned = sortedBadges.filter(b => !earnedBadgeIds.has(b.id))
    const slotsForUnearned = Math.max(0, 6 - earned.length)
    return [...earned, ...unearned.slice(0, slotsForUnearned)]
  }, [sortedBadges, earnedBadgeIds])

  const unearnedCount = BADGES.length - earnedBadges.length

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

        {/* Username with edit functionality */}
        {isEditingUsername ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">@</span>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-1 text-center text-lg font-bold focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                placeholder="username"
                maxLength={20}
                autoFocus
              />
              <button
                onClick={handleSaveUsername}
                disabled={updateUsernameMutation.isPending || usernameInput.length < 3}
                className="rounded-lg p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-900/30"
              >
                {updateUsernameMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={handleCancelEdit}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {usernameError && (
              <p className="text-sm text-red-500">{usernameError}</p>
            )}
            <p className="text-xs text-slate-400">3-20 characters, letters, numbers, underscores</p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              @{stats?.username || user?.email?.split('@')[0] || 'username'}
            </h1>
            <button
              onClick={() => setIsEditingUsername(true)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              title="Edit username"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        )}

        <p className="mt-1 text-slate-500 dark:text-slate-400">{user?.email}</p>
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Badges</h2>
          <button
            onClick={() => setShowAllBadges(true)}
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            See All
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {displayBadges.map((badge) => {
            const isEarned = earnedBadgeIds.has(badge.id)

            return (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  'flex flex-col rounded-xl p-3 transition-colors',
                  isEarned
                    ? 'bg-white shadow-sm dark:bg-slate-700'
                    : 'bg-slate-100 opacity-50 dark:bg-slate-800'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{badge.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {badge.name}
                    </p>
                    <span className={cn(
                      'inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                      RARITY_COLORS[badge.rarity]
                    )}>
                      {badge.rarity}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {badge.howToEarn}
                </p>
                {isEarned && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400 font-medium">
                    ✓ Earned
                  </p>
                )}
              </motion.div>
            )
          })}
        </div>

        {unearnedCount > 0 && (
          <button
            onClick={() => setShowAllBadges(true)}
            className="mt-3 w-full text-center text-sm text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
          >
            +{unearnedCount} more badges to discover
          </button>
        )}
      </section>

      {/* All Badges Modal */}
      <AnimatePresence>
        {showAllBadges && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
            onClick={() => setShowAllBadges(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  All Badges ({earnedBadges.length}/{BADGES.length} earned)
                </h3>
                <button
                  onClick={() => setShowAllBadges(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(85vh - 65px)' }}>
                <div className="space-y-3">
                  {sortedBadges.map((badge) => {
                    const isEarned = earnedBadgeIds.has(badge.id)

                    return (
                      <div
                        key={badge.id}
                        className={cn(
                          'flex items-start gap-3 rounded-xl p-3 transition-colors',
                          isEarned
                            ? 'bg-primary-50 dark:bg-primary-900/20'
                            : 'bg-slate-50 opacity-60 dark:bg-slate-700/50'
                        )}
                      >
                        <span className="text-3xl">{badge.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-slate-900 dark:text-white">
                              {badge.name}
                            </p>
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                              RARITY_COLORS[badge.rarity]
                            )}>
                              {badge.rarity}
                            </span>
                            {isEarned && (
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                ✓ Earned
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                            {badge.description}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {badge.howToEarn}
                          </p>
                          {badge.curioReward > 0 && (
                            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                              +{badge.curioReward} Curio
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Questions */}
      {recentQuestions.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Recent Questions</h2>
          <Card>
            <div className="space-y-3">
              {recentQuestions.map((q: { id: string; question: string; created_at: string }) => (
                <div key={q.id} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/50">
                    <MessageCircle className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-white line-clamp-2">{q.question}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {new Date(q.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

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
