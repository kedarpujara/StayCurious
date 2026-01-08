'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mic, List, BookOpen, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const navItems = [
  {
    href: '/ask',
    label: 'Ask',
    icon: Mic,
  },
  {
    href: '/backlog',
    label: 'Backlog',
    icon: List,
  },
  {
    href: '/learn',
    label: 'Learn',
    icon: BookOpen,
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: User,
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav z-50">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'bottom-nav-item flex-1',
                isActive && 'active'
              )}
            >
              <Icon
                className={cn(
                  'h-6 w-6 transition-colors',
                  isActive ? 'text-primary-600' : 'text-slate-400'
                )}
              />
              <span
                className={cn(
                  'mt-1 text-xs font-medium transition-colors',
                  isActive ? 'text-primary-600' : 'text-slate-500'
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
