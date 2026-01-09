'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Library, Shuffle, Calendar, Sparkles, ArrowRight, Clock } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import { CategoryPill } from './CategoryPill'
import { SubcategoryAccordion } from './SubcategoryAccordion'
import { TopicCard } from './TopicCard'
import type { AlmanacCategory, AlmanacTopic } from '@/types'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'

interface AlmanacBrowserProps {
  categories: AlmanacCategory[]
  topics: AlmanacTopic[]
  onAddToBacklog: (topic: string, category?: string) => void | Promise<void>
  isLoading?: boolean
  initialCategory?: string
  dailyTopic?: AlmanacTopic | null
  onStartLearning?: (topic: AlmanacTopic) => void
}

export function AlmanacBrowser({
  categories,
  topics,
  onAddToBacklog,
  isLoading = false,
  initialCategory,
  dailyTopic,
  onStartLearning
}: AlmanacBrowserProps) {
  const [randomTopic, setRandomTopic] = useState<AlmanacTopic | null>(null)
  const [isShuffling, setIsShuffling] = useState(false)

  // Pick a random topic with animation
  const pickRandomTopic = useCallback(() => {
    if (topics.length === 0) return

    setIsShuffling(true)

    // Animate through a few random topics before settling
    let count = 0
    const maxCount = 8
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * topics.length)
      setRandomTopic(topics[randomIndex])
      count++

      if (count >= maxCount) {
        clearInterval(interval)
        setIsShuffling(false)
      }
    }, 100)
  }, [topics])

  const clearRandomTopic = useCallback(() => {
    setRandomTopic(null)
  }, [])

  // Get top-level categories (no parent)
  const topLevelCategories = useMemo(
    () => categories.filter(c => !c.parent_id).sort((a, b) => a.display_order - b.display_order),
    [categories]
  )

  // Default to first category or the initial one
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>(
    initialCategory || topLevelCategories[0]?.slug || ''
  )

  // Get selected top-level category
  const selectedCategory = useMemo(
    () => topLevelCategories.find(c => c.slug === selectedCategorySlug),
    [topLevelCategories, selectedCategorySlug]
  )

  // Get subcategories for selected category
  const subcategories = useMemo(
    () => categories
      .filter(c => c.parent_id === selectedCategory?.id)
      .sort((a, b) => a.display_order - b.display_order),
    [categories, selectedCategory]
  )

  // Group topics by subcategory
  const topicsBySubcategory = useMemo(() => {
    const grouped = new Map<string, AlmanacTopic[]>()
    topics.forEach(topic => {
      if (topic.subcategory_id) {
        const existing = grouped.get(topic.subcategory_id) || []
        grouped.set(topic.subcategory_id, [...existing, topic])
      }
    })
    return grouped
  }, [topics])

  // Get topics that belong to selected category but have no subcategory
  const uncategorizedTopics = useMemo(
    () => topics.filter(t =>
      t.category === selectedCategorySlug && !t.subcategory_id
    ),
    [topics, selectedCategorySlug]
  )

  // Count topics per top-level category
  const topicCountByCategory = useMemo(() => {
    const counts = new Map<string, number>()
    topLevelCategories.forEach(cat => {
      const catSubcategories = categories.filter(c => c.parent_id === cat.id)
      let count = 0
      catSubcategories.forEach(sub => {
        count += topicsBySubcategory.get(sub.id)?.length || 0
      })
      // Also count topics directly under this category
      count += topics.filter(t => t.category === cat.slug && !t.subcategory_id).length
      counts.set(cat.slug, count)
    })
    return counts
  }, [topLevelCategories, categories, topics, topicsBySubcategory])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-20 w-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    )
  }

  if (topLevelCategories.length === 0) {
    return (
      <Card className="py-12 text-center">
        <Library className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
        <p className="text-slate-500 dark:text-slate-400">
          No categories available yet
        </p>
      </Card>
    )
  }

  const difficultyColors = {
    beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }

  return (
    <div className="space-y-4">
      {/* Topic of the Day & Random Topic Actions */}
      <div className="flex gap-3 mb-2">
        <Button
          onClick={pickRandomTopic}
          variant="secondary"
          icon={<Shuffle className={cn("h-4 w-4", isShuffling && "animate-spin")} />}
          disabled={isShuffling || topics.length === 0}
        >
          {isShuffling ? 'Picking...' : 'Random Topic'}
        </Button>
      </div>

      {/* Topic of the Day Featured Card */}
      {dailyTopic && !randomTopic && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50">
                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  Topic of the Day
                </span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {dailyTopic.topic}
            </h3>
            {dailyTopic.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
                {dailyTopic.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="h-3 w-3" />
                  {dailyTopic.estimated_minutes} min
                </span>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs capitalize',
                  difficultyColors[dailyTopic.difficulty]
                )}>
                  {dailyTopic.difficulty}
                </span>
              </div>
              {dailyTopic.existingCourseId ? (
                <Link href={`/learn/${dailyTopic.existingCourseId}`}>
                  <Button size="sm" icon={<ArrowRight className="h-4 w-4" />}>
                    Continue
                  </Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onAddToBacklog(dailyTopic.topic, dailyTopic.category)}
                  icon={<Sparkles className="h-4 w-4" />}
                >
                  Start Learning
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Random Topic Result Card */}
      <AnimatePresence>
        {randomTopic && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-primary-900/20 dark:to-indigo-900/20 border-primary-200 dark:border-primary-800 relative">
              <button
                onClick={clearRandomTopic}
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/50 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <span className="sr-only">Dismiss</span>
                ×
              </button>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/50">
                  <Shuffle className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                </div>
                <span className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wide">
                  {isShuffling ? 'Shuffling...' : 'Random Pick'}
                </span>
              </div>
              <motion.div
                key={randomTopic.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {randomTopic.topic}
                </h3>
                {randomTopic.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
                    {randomTopic.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="h-3 w-3" />
                      {randomTopic.estimated_minutes} min
                    </span>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs capitalize',
                      difficultyColors[randomTopic.difficulty]
                    )}>
                      {randomTopic.difficulty}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={pickRandomTopic}
                      icon={<Shuffle className="h-4 w-4" />}
                      disabled={isShuffling}
                    >
                      Reshuffle
                    </Button>
                    {randomTopic.existingCourseId ? (
                      <Link href={`/learn/${randomTopic.existingCourseId}`}>
                        <Button size="sm" icon={<ArrowRight className="h-4 w-4" />}>
                          Continue
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          onAddToBacklog(randomTopic.topic, randomTopic.category)
                          clearRandomTopic()
                        }}
                        icon={<Sparkles className="h-4 w-4" />}
                      >
                        Start Learning
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {topLevelCategories.map(category => (
          <CategoryPill
            key={category.id}
            category={category}
            isSelected={selectedCategorySlug === category.slug}
            onClick={() => setSelectedCategorySlug(category.slug)}
            topicCount={topicCountByCategory.get(category.slug)}
          />
        ))}
      </div>

      {/* Category Description */}
      {selectedCategory && (
        <motion.div
          key={selectedCategory.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-slate-500 dark:text-slate-400"
        >
          {selectedCategory.description}
        </motion.div>
      )}

      {/* Subcategories with Accordions */}
      <motion.div
        key={selectedCategorySlug}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="space-y-3"
      >
        {subcategories.map((subcategory, index) => {
          const subTopics = topicsBySubcategory.get(subcategory.id) || []
          if (subTopics.length === 0) return null

          return (
            <motion.div
              key={subcategory.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <SubcategoryAccordion
                subcategory={subcategory}
                topics={subTopics}
                onAddToBacklog={onAddToBacklog}
                defaultExpanded={index === 0}
              />
            </motion.div>
          )
        })}

        {/* Uncategorized topics (directly under category) */}
        {uncategorizedTopics.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 px-1">
              Other Topics
            </h3>
            {uncategorizedTopics.map(topic => (
              <TopicCard
                key={topic.id}
                topic={topic}
                onAddToBacklog={onAddToBacklog}
              />
            ))}
          </div>
        )}

        {/* Empty state for category */}
        {subcategories.length === 0 && uncategorizedTopics.length === 0 && (
          <Card className="py-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              No topics in this category yet
            </p>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
