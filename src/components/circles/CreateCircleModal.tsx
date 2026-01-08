'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { X, Users, Sparkles } from 'lucide-react'

interface CreateCircleModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, description?: string) => Promise<unknown>
  isCreating: boolean
}

export function CreateCircleModal({ isOpen, onClose, onCreate, isCreating }: CreateCircleModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter a circle name')
      return
    }

    if (name.length < 3) {
      setError('Circle name must be at least 3 characters')
      return
    }

    if (name.length > 50) {
      setError('Circle name must be 50 characters or less')
      return
    }

    const result = await onCreate(name.trim(), description.trim() || undefined)

    if (result) {
      setName('')
      setDescription('')
      onClose()
    } else {
      setError('Failed to create circle. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative w-full max-w-md z-10" padding="lg">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-full">
            <Users className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Create a Curio Circle
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Invite friends to compete on your own leaderboard
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="circle-name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Circle Name
            </label>
            <input
              id="circle-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Study Buddies"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="circle-description"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Description <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              id="circle-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this circle about?"
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isCreating}
              icon={<Sparkles className="w-4 h-4" />}
              className="flex-1"
            >
              Create Circle
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
