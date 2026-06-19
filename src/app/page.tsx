import Link from 'next/link'
import { Mic, BookOpen, Trophy, Sparkles, ArrowRight, Shuffle } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="flex h-[100svh] flex-col bg-gradient-to-b from-primary-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40">
            <Sparkles className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            StayCurious
          </span>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          100% free
        </span>
      </header>

      {/* Hero — vertically centered, fits in one viewport */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary-600 dark:text-primary-400">
          Ask a question · Get a short course
        </p>

        <h1 className="mb-4 max-w-2xl text-balance text-4xl font-bold leading-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
          Knowledge that actually sticks.
        </h1>

        <p className="mb-7 max-w-xl text-balance text-base text-slate-600 dark:text-slate-300 sm:text-lg">
          Ask anything by voice or text. Get a short course with quizzes and chat.
        </p>

        {/* Feature row — compact, no scroll */}
        <div className="mb-7 grid w-full max-w-xl grid-cols-3 gap-3">
          <Feature icon={<Mic className="h-5 w-5" />} label="Voice or type" />
          <Feature icon={<BookOpen className="h-5 w-5" />} label="5-min courses" />
          <Feature icon={<Trophy className="h-5 w-5" />} label="Global leaderboard" />
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl active:scale-95 dark:bg-primary-500 dark:hover:bg-primary-600"
        >
          Get started for free
          <ArrowRight className="h-5 w-5" />
        </Link>

        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          or{' '}
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-slate-600 underline-offset-2 hover:text-primary-600 hover:underline dark:text-slate-300 dark:hover:text-primary-400 transition-colors"
          >
            <Shuffle className="h-3.5 w-3.5" />
            sign in to try a random course
          </Link>
        </p>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Earn Curio points · Climb the worldwide learning leaderboard
        </p>
      </section>

      {/* Footer tagline */}
      <footer className="pb-5 text-center text-xs text-slate-500 dark:text-slate-400">
        Answers are cheap. Understanding is earned.
      </footer>
    </main>
  )
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/70 px-3 py-4 shadow-sm backdrop-blur dark:bg-slate-800/70 dark:shadow-slate-900/50">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
        {icon}
      </div>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</span>
    </div>
  )
}
