import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { KarmaAction, KarmaResult } from '@/types'

const KARMA_AMOUNTS: Record<KarmaAction, number> = {
  question_asked: 1,
  course_started: 5,
  section_completed: 3,
  lesson_completed: 5,
  quiz_passed: 10, // Base amount, can be scaled
  eli5_passed: 75,
  streak_maintained: 2,
}

// Calculate scaled karma for quiz based on intensity and time
function calculateQuizKarma(intensity?: string, timeBudget?: number): number {
  if (!intensity || !timeBudget) {
    return KARMA_AMOUNTS.quiz_passed // Fallback to base amount
  }

  const intensityMultiplier: Record<string, number> = {
    skim: 1,
    solid: 1.5,
    deep: 2.5,
  }

  const multiplier = intensityMultiplier[intensity] || 1
  const timeBonus = Math.floor(timeBudget / 10) // 0, 1, 3, 4 for 5, 15, 30, 45
  const base = 5

  return Math.round(base * multiplier + timeBonus * 3)
  // Results: skim/5=5, skim/15=8, solid/15=11, solid/30=17, deep/30=22, deep/45=31
}

interface KarmaRequestBody {
  action: KarmaAction
  intensity?: string
  timeBudget?: number
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, intensity, timeBudget } = await request.json() as KarmaRequestBody

    if (!action || !KARMA_AMOUNTS[action]) {
      return NextResponse.json(
        { error: 'Invalid karma action' },
        { status: 400 }
      )
    }

    // Calculate karma amount (scaled for quiz_passed if intensity/time provided)
    let karmaAmount = KARMA_AMOUNTS[action]
    if (action === 'quiz_passed' && (intensity || timeBudget)) {
      karmaAmount = calculateQuizKarma(intensity, timeBudget)
    }

    // Update user karma and check for title upgrade
    const { data, error } = await supabase.rpc('update_user_karma', {
      p_user_id: user.id,
      p_karma_amount: karmaAmount,
    })

    if (error) {
      throw error
    }

    const result = data[0]
    // Return both karma (legacy) and curio (new) fields for compatibility
    const response = {
      karma: result.new_karma,
      karmaEarned: karmaAmount,
      curio: result.new_karma,
      curioEarned: karmaAmount,
      newTitle: result.title_upgraded ? result.new_title : undefined,
      titleUpgraded: result.title_upgraded,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Karma update error:', error)
    return NextResponse.json(
      { error: 'Failed to update karma' },
      { status: 500 }
    )
  }
}
