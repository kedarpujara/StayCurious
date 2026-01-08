import { BottomNav } from '@/components/layout'
import { DailyCurioModal } from '@/components/daily/DailyCurioModal'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900">
      {children}
      <BottomNav />
      <DailyCurioModal />
    </div>
  )
}
