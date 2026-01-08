'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { X, UserPlus, Ticket } from 'lucide-react'

interface JoinCircleModalProps {
  isOpen: boolean
  onClose: () => void
  onJoin: (inviteCode: string) => Promise<{ circle: { name: string }; message: string } | null>
  isJoining: boolean
}

export function JoinCircleModal({ isOpen, onClose, onJoin, isJoining }: JoinCircleModalProps) {
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const code = inviteCode.trim().toUpperCase()

    if (!code) {
      setError('Please enter an invite code')
      return
    }

    if (code.length !== 8) {
      setError('Invite codes are 8 characters long')
      return
    }

    const result = await onJoin(code)

    if (result) {
      setSuccess(`You've joined ${result.circle.name}!`)
      setTimeout(() => {
        setInviteCode('')
        setSuccess(null)
        onClose()
      }, 1500)
    } else {
      setError('Invalid invite code or circle is full')
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
          <div className="p-2 bg-accent-100 dark:bg-accent-900/50 rounded-full">
            <Ticket className="w-6 h-6 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Join a Curio Circle
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enter the invite code shared by a friend
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="invite-code"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Invite Code
            </label>
            <input
              id="invite-code"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g., ABC12DEF"
              maxLength={8}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-center text-lg font-mono tracking-widest uppercase"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          )}

          {success && (
            <p className="text-sm text-green-600 dark:text-green-400 text-center">{success}</p>
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
              loading={isJoining}
              disabled={!!success}
              icon={<UserPlus className="w-4 h-4" />}
              className="flex-1"
            >
              Join Circle
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
