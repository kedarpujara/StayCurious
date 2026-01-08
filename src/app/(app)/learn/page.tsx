'use client'

import { useState, useEffect, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Clock,
  Sparkles,
  ArrowRight,
  Trophy,
  CheckCircle,
  Plus,
  Play,
  Trash2,
  Library,
  List
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout'
import { Card, ProgressBar, Button } from '@/components/ui'
import { useBacklog } from '@/hooks/useBacklog'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/types'
import { cn } from '@/lib/utils/cn'

type TabType = 'almanac' | 'backlog' | 'active' | 'completed'

// Wrapper component to handle searchParams with Suspense
function LearnPageContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as TabType | null
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'almanac')

  // Update active tab when URL changes
  useEffect(() => {
    if (tabParam && ['almanac', 'backlog', 'active', 'completed'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTopic, setNewTopic] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()

  const { items: backlogItems, isLoading: loadingBacklog, addItem, removeItem, isAdding } = useBacklog()

  // Filter backlog items that are pending (not started yet)
  const pendingBacklogItems = backlogItems.filter(item => item.status === 'pending')

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

  // Fetch almanac topics (showcase topics)
  const { data: almanacTopics = [], isLoading: loadingAlmanac } = useQuery({
    queryKey: ['almanac-topics', backlogItems.map(i => i.topic).join(',')],
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

        // Get backlog topics for comparison
        const backlogTopics = backlogItems.map(item => item.topic.toLowerCase())

        // Map topics with existing course info and backlog status
        return topics.map((topic: any) => ({
          ...topic,
          existingCourseId: userCourses?.find(
            (c: any) => c.topic.toLowerCase() === topic.topic.toLowerCase()
          )?.id || null,
          inBacklog: backlogTopics.includes(topic.topic.toLowerCase())
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

  const handleAddToBacklog = async (topic: string, category?: string) => {
    await addItem(topic, 'suggested', category)
  }

  const handleAddCustomTopic = async () => {
    if (!newTopic.trim()) return
    await addItem(newTopic, 'manual', selectedCategory)
    setNewTopic('')
    setSelectedCategory(undefined)
    setShowAddModal(false)
  }

  const handleStartLearning = (itemId: string, topic: string) => {
    router.push(`/learn/${itemId}?topic=${encodeURIComponent(topic)}`)
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'almanac',
      label: 'Almanac',
      icon: <Library className="h-4 w-4" />,
    },
    {
      id: 'backlog',
      label: 'Backlog',
      icon: <List className="h-4 w-4" />,
      count: pendingBacklogItems.length
    },
    {
      id: 'active',
      label: 'In Progress',
      icon: <BookOpen className="h-4 w-4" />,
      count: activeCourses.length
    },
    {
      id: 'completed',
      label: 'Completed',
      icon: <Trophy className="h-4 w-4" />,
      count: completedCourses.length
    },
  ]

  return (
    <PageContainer
      title="Learn"
      headerRight={
        activeTab === 'backlog' && (
          <Button
            onClick={() => setShowAddModal(true)}
            size="sm"
            icon={<Plus className="h-4 w-4" />}
          >
            Add
          </Button>
        )
      }
    >
      {/* Filter Pills */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-xs',
                activeTab === tab.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Almanac Tab */}
      {activeTab === 'almanac' && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Curated topics to spark your curiosity
            </p>
          </div>

          {loadingAlmanac ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
              ))}
            </div>
          ) : almanacTopics.length === 0 ? (
            <Card className="py-12 text-center">
              <Library className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">
                No topics available yet
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {almanacTopics.map((topic: any, index: number) => {
                const category = getCategoryInfo(topic.category)

                return (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="relative">
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
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {topic.existingCourseId ? (
                            <Link href={`/learn/${topic.existingCourseId}`}>
                              <Button size="sm" variant="secondary">
                                Continue
                              </Button>
                            </Link>
                          ) : topic.inBacklog ? (
                            <span className="text-xs text-primary-600 dark:text-primary-400 font-medium px-2 py-1">
                              In Backlog
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAddToBacklog(topic.topic, topic.category)}
                              icon={<Plus className="h-4 w-4" />}
                            >
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Backlog Tab */}
      {activeTab === 'backlog' && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Topics you want to learn
            </p>
          </div>

          {loadingBacklog ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
              ))}
            </div>
          ) : pendingBacklogItems.length === 0 ? (
            <Card className="py-12 text-center">
              <List className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-white">
                Your backlog is empty
              </h3>
              <p className="mb-4 text-slate-500 dark:text-slate-400">
                Add topics from the Almanac or create your own
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setActiveTab('almanac')}
                  variant="secondary"
                  icon={<Library className="h-4 w-4" />}
                >
                  Browse Almanac
                </Button>
                <Button
                  onClick={() => setShowAddModal(true)}
                  icon={<Plus className="h-4 w-4" />}
                >
                  Add Custom
                </Button>
              </div>
            </Card>
          ) : (
            <motion.div layout className="space-y-3">
              <AnimatePresence>
                {pendingBacklogItems.map((item) => {
                  const category = getCategoryInfo(item.category)
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                    >
                      <Card className="relative">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl dark:bg-slate-700">
                            {category.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="mb-1 font-medium text-slate-900 line-clamp-2 dark:text-white">
                              {item.topic}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-700">
                                {category.name}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleStartLearning(item.id, item.topic)}
                              size="sm"
                              icon={<Play className="h-4 w-4" />}
                            >
                              Start
                            </Button>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-700"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      )}

      {/* In Progress Tab */}
      {activeTab === 'active' && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Continue where you left off
            </p>
          </div>

          {loadingCourses ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
              ))}
            </div>
          ) : activeCourses.length === 0 ? (
            <Card className="py-12 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-white">
                No courses in progress
              </h3>
              <p className="mb-4 text-slate-500 dark:text-slate-400">
                Start learning from your backlog
              </p>
              <Button
                onClick={() => setActiveTab('backlog')}
                variant="secondary"
                icon={<List className="h-4 w-4" />}
              >
                View Backlog
              </Button>
            </Card>
          ) : (
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
          )}
        </section>
      )}

      {/* Completed Tab */}
      {activeTab === 'completed' && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your learning achievements
            </p>
          </div>

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

      {/* Add Topic Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-lg rounded-t-2xl bg-white p-6 safe-bottom dark:bg-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
                Add to Backlog
              </h2>

              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="What do you want to learn?"
                className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
                autoFocus
              />

              <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">Category</p>
              <div className="mb-6 flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() =>
                      setSelectedCategory(selectedCategory === cat.id ? undefined : cat.id)
                    }
                    className={cn(
                      'rounded-full px-3 py-1.5 text-sm transition-colors',
                      selectedCategory === cat.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                    )}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowAddModal(false)}
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCustomTopic}
                  loading={isAdding}
                  size="lg"
                  className="flex-1"
                  disabled={!newTopic.trim()}
                >
                  Add Topic
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  )
}

// Loading component for Suspense fallback
function LearnPageLoading() {
  return (
    <PageContainer title="Learn">
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
    </PageContainer>
  )
}

// Default export with Suspense wrapper for useSearchParams
export default function LearnPage() {
  return (
    <Suspense fallback={<LearnPageLoading />}>
      <LearnPageContent />
    </Suspense>
  )
}
