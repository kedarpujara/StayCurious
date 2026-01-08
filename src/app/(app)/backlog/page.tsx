'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Play, Clock, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { Button, Card } from '@/components/ui'
import { useBacklog } from '@/hooks/useBacklog'
import { CATEGORIES } from '@/types'
import { cn } from '@/lib/utils/cn'

export default function BacklogPage() {
  const router = useRouter()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTopic, setNewTopic] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')

  const { items, isLoading, addItem, removeItem, isAdding } = useBacklog()

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return item.status !== 'archived'
    return item.status === filter
  })

  const handleAddTopic = async () => {
    if (!newTopic.trim()) return

    await addItem(newTopic, 'manual', selectedCategory)
    setNewTopic('')
    setSelectedCategory(undefined)
    setShowAddModal(false)
  }

  const handleStartLearning = (itemId: string, topic: string) => {
    router.push(`/learn/${itemId}?topic=${encodeURIComponent(topic)}`)
  }

  const getCategoryInfo = (categoryId: string | null) => {
    return CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[5] // Default to misc
  }

  return (
    <PageContainer
      title="Learning Backlog"
      headerRight={
        <Button
          onClick={() => setShowAddModal(true)}
          size="sm"
          icon={<Plus className="h-4 w-4" />}
        >
          Add
        </Button>
      }
    >
      {/* Filter tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['all', 'pending', 'in_progress', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            )}
          >
            {f === 'all' && 'All'}
            {f === 'pending' && 'To Learn'}
            {f === 'in_progress' && 'In Progress'}
            {f === 'completed' && 'Completed'}
          </button>
        ))}
      </div>

      {/* Backlog items */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="py-12 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400">
            {filter === 'all'
              ? 'No topics in your backlog yet'
              : `No ${filter.replace('_', ' ')} topics`}
          </p>
          <Button
            onClick={() => setShowAddModal(true)}
            variant="ghost"
            className="mt-4"
            icon={<Plus className="h-4 w-4" />}
          >
            Add your first topic
          </Button>
        </Card>
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence>
            {filteredItems.map((item) => {
              const category = getCategoryInfo(item.category)
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                >
                  <Card variant="interactive" className="relative">
                    <div className="flex items-start gap-3">
                      {/* Category icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl dark:bg-slate-700">
                        {category.icon}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 font-medium text-slate-900 line-clamp-2 dark:text-white">
                          {item.topic}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-700">
                            {category.name}
                          </span>
                          {item.status === 'in_progress' && (
                            <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
                              <Clock className="h-3 w-3" />
                              In progress
                            </span>
                          )}
                          {item.status === 'completed' && (
                            <span className="text-green-600 dark:text-green-400">✓ Completed</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {item.status === 'pending' && (
                          <Button
                            onClick={() => handleStartLearning(item.id, item.topic)}
                            size="sm"
                            icon={<Play className="h-4 w-4" />}
                          >
                            Start
                          </Button>
                        )}
                        {item.status === 'in_progress' && (
                          <Button
                            onClick={() => handleStartLearning(item.id, item.topic)}
                            size="sm"
                            variant="secondary"
                          >
                            Continue
                          </Button>
                        )}
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

      {/* Add topic modal */}
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
                  onClick={handleAddTopic}
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
