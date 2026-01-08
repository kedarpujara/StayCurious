'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Clock, Sparkles, ArrowRight, Trophy, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout'
import { Card, ProgressBar } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/types'
import { cn } from '@/lib/utils/cn'

export default function LearnPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')

  // Fetch in-progress courses
  const { data: activeCourses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ['active-courses'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('learning_progress')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('last_accessed_at', { ascending: false })

      if (error) throw error
      return data
    },
  })

  // Fetch showcase topics with existing course status
  const { data: showcaseTopics = [], isLoading: loadingShowcase } = useQuery({
    queryKey: ['showcase-topics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: topics, error } = await supabase
        .from('showcase_topics')
        .select('*')
        .order('display_order')

      if (error) throw error
      if (!topics) return []

      // If user is logged in, check which topics they already have courses for
      if (user) {
        const { data: userCourses } = await supabase
          .from('courses')
          .select('id, topic')
          .eq('user_id', user.id)

        // Map topics with existing course info
        return topics.map((topic: any) => ({
          ...topic,
          existingCourseId: userCourses?.find(
            (c: any) => c.topic.toLowerCase() === topic.topic.toLowerCase()
          )?.id || null
        }))
      }

      return topics
    },
  })

  // Fetch completed courses
  const { data: completedCourses = [], isLoading: loadingCompleted } = useQuery({
    queryKey: ['completed-courses'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('learning_progress')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (error) throw error
      return data
    },
  })

  const getCategoryInfo = (categoryId: string | null) => {
    return CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[5]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <PageContainer title="Learn">
      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {(['active', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            )}
          >
            {tab === 'active' ? (
              <>
                <BookOpen className="h-4 w-4" />
                In Progress
                {activeCourses.length > 0 && (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-xs',
                    activeTab === tab ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
                  )}>
                    {activeCourses.length}
                  </span>
                )}
              </>
            ) : (
              <>
                <Trophy className="h-4 w-4" />
                Completed
                {completedCourses.length > 0 && (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-xs',
                    activeTab === tab ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
                  )}>
                    {completedCourses.length}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Completed courses tab */}
      {activeTab === 'completed' && (
        <section>
          {loadingCompleted ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
              ))}
            </div>
          ) : completedCourses.length === 0 ? (
            <Card className="py-12 text-center">
              <Trophy className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-white">
                No completed courses yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Complete your first course to see it here!
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedCourses.map((progress: any) => {
                const course = progress.course
                return (
                  <Link key={progress.id} href={`/learn/${course.id}`}>
                    <Card variant="interactive" className="relative overflow-hidden">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/50">
                          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="mb-1 font-medium text-slate-900 dark:text-white line-clamp-1">
                            {course.topic}
                          </h3>
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className={cn(
                              'rounded-full px-2 py-0.5 font-medium capitalize',
                              course.intensity === 'deep'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                                : course.intensity === 'solid'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            )}>
                              {course.intensity}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {course.time_budget} min
                            </span>
                            <span className="text-slate-400 dark:text-slate-500">•</span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              {progress.quiz_score}%
                            </span>
                            {progress.completed_at && (
                              <>
                                <span className="text-slate-400 dark:text-slate-500">•</span>
                                <span className="text-slate-400 dark:text-slate-500">
                                  {formatDate(progress.completed_at)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Active tab content */}
      {activeTab === 'active' && (
        <>
          {/* Active courses section */}
          {activeCourses.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
            Continue Learning
          </h2>
          <div className="space-y-3">
            {activeCourses.map((progress: any) => {
              const course = progress.course
              const courseContent = course?.content as { sections?: { id: string }[] } | undefined
              const sectionsTotal = courseContent?.sections?.length || 8
              const completedCount = progress.sections_completed?.length || 0
              const progressPercent = Math.round((completedCount / sectionsTotal) * 100)

              return (
                <Link key={progress.id} href={`/learn/${course.id}`}>
                  <Card variant="interactive" className="relative overflow-hidden">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900">
                        <BookOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 font-medium text-slate-900 dark:text-white line-clamp-1">
                          {course.topic}
                        </h3>
                        <div className="mb-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="capitalize">{course.intensity}</span>
                          <span>•</span>
                          <span>{course.time_budget} min</span>
                        </div>
                        <ProgressBar value={progressPercent} size="sm" />
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          {completedCount} of {sectionsTotal} sections
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Showcase topics */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Featured Topics
          </h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">Curated for you</span>
        </div>

        {loadingShowcase ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {showcaseTopics.map((topic: any, index: number) => {
              const category = getCategoryInfo(topic.category)

              return (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={
                    topic.existingCourseId
                      ? `/learn/${topic.existingCourseId}`
                      : `/learn/new?topic=${encodeURIComponent(topic.topic)}&category=${topic.category}`
                  }>
                    <Card variant="interactive">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xl">
                          {category.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="mb-1 font-medium text-slate-900 dark:text-white">
                            {topic.topic}
                          </h3>
                          <p className="mb-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                            {topic.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {topic.estimated_minutes} min
                            </span>
                            <span className="capitalize">{topic.difficulty}</span>
                            {topic.existingCourseId && (
                              <span className="text-primary-500 font-medium">Continue →</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>

      {/* Empty state */}
      {!loadingCourses && !loadingShowcase && activeCourses.length === 0 && showcaseTopics.length === 0 && (
        <Card className="py-12 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400">
            Start asking questions to discover topics to learn!
          </p>
          <Link
            href="/ask"
            className="mt-4 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Go to Ask <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      )}
        </>
      )}
    </PageContainer>
  )
}
