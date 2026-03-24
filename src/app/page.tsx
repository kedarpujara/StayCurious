import Link from 'next/link'
import { Mic, BookOpen, Sparkles, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center px-6 pt-20 pb-12">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40">
          <Sparkles className="h-10 w-10 text-primary-600 dark:text-primary-400" />
        </div>

        <h1 className="mb-4 text-center text-4xl font-bold text-slate-900 dark:text-slate-50">
          StayCurious
        </h1>

        <p className="mb-8 max-w-sm text-center text-lg text-slate-600 dark:text-slate-300">
          Your voice-first learning companion for curious minds
        </p>

        {/* Main CTA */}
        <Link
          href="/login"
          className="flex items-center gap-2 rounded-full bg-primary-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl active:scale-95 dark:bg-primary-500 dark:hover:bg-primary-600"
        >
          Get Started
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>

      {/* Features */}
      <div className="px-6 pb-20">
        <div className="mx-auto max-w-md space-y-6">
          {/* Feature 1 */}
          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800 dark:shadow-slate-900/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40">
              <Mic className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
              Ask anything, instantly
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Speak your questions out loud and get clear, friendly explanations in seconds.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800 dark:shadow-slate-900/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900/30">
              <BookOpen className="h-6 w-6 text-accent-600 dark:text-accent-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
              Learn for real
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Turn curiosity into understanding with structured crash courses and quizzes.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800 dark:shadow-slate-900/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Sparkles className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
              Grow your curious mind
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Earn Curio, collect badges, and watch your learner identity evolve.
            </p>
          </div>
        </div>

        {/* Bottom message */}
        <p className="mt-12 text-center text-sm text-slate-500 dark:text-slate-400">
          Answers are cheap. Understanding is earned.
        </p>
      </div>
    </main>
  )
}
