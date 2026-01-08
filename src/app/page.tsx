import Link from 'next/link'
import { Mic, BookOpen, Sparkles, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center px-6 pt-20 pb-12">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
          <Sparkles className="h-10 w-10 text-primary-600" />
        </div>

        <h1 className="mb-4 text-center text-4xl font-bold text-slate-900">
          StayCurious
        </h1>

        <p className="mb-8 max-w-sm text-center text-lg text-slate-600">
          Your voice-first learning companion for curious minds
        </p>

        {/* Main CTA */}
        <Link
          href="/login"
          className="flex items-center gap-2 rounded-full bg-primary-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl active:scale-95"
        >
          Get Started
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>

      {/* Features */}
      <div className="px-6 pb-20">
        <div className="mx-auto max-w-md space-y-6">
          {/* Feature 1 */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
              <Mic className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              Ask anything, instantly
            </h3>
            <p className="text-slate-600">
              Speak your questions out loud and get clear, friendly explanations in seconds.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-100">
              <BookOpen className="h-6 w-6 text-accent-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              Learn for real
            </h3>
            <p className="text-slate-600">
              Turn curiosity into understanding with structured crash courses and quizzes.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Sparkles className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              Grow your curious mind
            </h3>
            <p className="text-slate-600">
              Earn Curio, collect badges, and watch your learner identity evolve.
            </p>
          </div>
        </div>

        {/* Bottom message */}
        <p className="mt-12 text-center text-sm text-slate-500">
          Answers are cheap. Understanding is earned.
        </p>
      </div>
    </main>
  )
}
