import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CurioAction, CurioResult, Intensity } from '@/types'
import {
  calculateQuizCurio,
  mcurioToCurio,
  MCURIO_PER_CURIO,
} from '@/lib/curio'

/**
 * Base mCurio amounts for non-quiz actions (in mCurio)
 * 1 Curio = 1000 mCurio
 */
const MCURIO_AMOUNTS: Record<Exclude<CurioAction, 'quiz_passed'>, number> = {
  question_asked: 1_000,      // 1 Curio
  course_started: 5_000,      // 5 Curio
  section_completed: 3_000,   // 3 Curio
  lesson_completed: 5_000,    // 5 Curio
  streak_maintained: 2_000,   // 2 Curio
}

interface CurioRequestBody {
  action: CurioAction
  // For quiz_passed action
  intensity?: Intensity
  quizScore?: number
  attemptNumber?: number
  courseId?: string // Used to track daily completions
}

/**
 * Get the number of courses a user has completed today (before this one)
 */
async function getDailyCompletionCount(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, userId: string): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('learning_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', today.toISOString())

  if (error) {
    console.error('Error getting daily completion count:', error)
    return 3 // Default to no bonus on error
  }

  return count || 0
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as CurioRequestBody
    const { action, intensity, quizScore, attemptNumber } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action' },
        { status: 400 }
      )
    }

    let curioAmount: number
    let breakdown: CurioResult['breakdown'] | undefined

    if (action === 'quiz_passed') {
      // Calculate curio using the new attempt-based system with daily bonus
      if (!intensity) {
        return NextResponse.json(
          { error: 'Missing intensity for quiz_passed action' },
          { status: 400 }
        )
      }

      // Get how many courses completed today (before this one)
      const completedToday = await getDailyCompletionCount(supabase, user.id)
      // This will be the Nth course completed today (1-indexed)
      const dailyCourseNumber = completedToday + 1

      const calculation = calculateQuizCurio({
        intensity,
        quizScore: quizScore ?? 0,
        attemptNumber: attemptNumber ?? 1,
        dailyCourseNumber,
      })

      curioAmount = calculation.finalCurio
      breakdown = calculation.breakdown

      console.log('[Curio] Quiz completion:', {
        intensity,
        quizScore,
        attemptNumber,
        dailyCourseNumber,
        curioAmount,
        breakdown,
      })
    } else {
      // Use fixed amounts for other actions
      curioAmount = MCURIO_AMOUNTS[action]
    }

    // Update user curio and check for title upgrade
    const { data, error } = await supabase.rpc('update_user_curio', {
      p_user_id: user.id,
      p_curio_amount: curioAmount,
    })

    if (error) {
      console.error('Curio RPC error:', error)
      throw error
    }

    const result = data[0]
    const response: CurioResult = {
      curio: result.new_curio,
      curioEarned: curioAmount,
      newTitle: result.title_upgraded ? result.new_title : undefined,
      titleUpgraded: result.title_upgraded,
      breakdown,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Curio update error:', error)
    return NextResponse.json(
      { error: 'Failed to update curio' },
      { status: 500 }
    )
  }
}

/**
 * GET - Fetch current user's curio and leaderboard position
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's curio and title
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('curio_points, current_title')
      .eq('id', user.id)
      .single()

    if (userError) throw userError

    // Get user's leaderboard position
    const { data: positionData, error: positionError } = await supabase.rpc('get_user_leaderboard_position', {
      p_user_id: user.id,
    })

    if (positionError) {
      console.error('Leaderboard position error:', positionError)
      // Continue without position data
    }

    const position = positionData?.[0]

    // Convert mCurio to Curio for display
    const curioDisplay = mcurioToCurio(userData.curio_points)

    return NextResponse.json({
      curio: curioDisplay,
      mcurio: userData.curio_points, // Raw mCurio value
      title: userData.current_title,
      leaderboard: position ? {
        rank: position.rank,
        totalUsers: position.total_users,
        percentile: position.percentile,
        monthlyCurio: position.monthly_curio ? mcurioToCurio(position.monthly_curio) : 0,
        monthlyMcurio: position.monthly_curio,
        isTopTenPercent: position.percentile !== null && position.percentile >= 90,
      } : null,
    })
  } catch (error) {
    console.error('Get curio error:', error)
    return NextResponse.json(
      { error: 'Failed to get curio' },
      { status: 500 }
    )
  }
}
