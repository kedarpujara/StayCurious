import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CurioAction, CurioResult, Intensity } from '@/types'
import { calculateQuizCurio, CURIO_BASE_AMOUNTS } from '@/lib/curio'

/**
 * Base Curio amounts for non-quiz actions
 */
const CURIO_AMOUNTS: Record<Exclude<CurioAction, 'quiz_passed'>, number> = {
  question_asked: 1,
  course_started: 5,
  section_completed: 5,
  lesson_completed: 5,
  eli5_passed: 75,
  streak_maintained: 2,
}

interface CurioRequestBody {
  action: CurioAction
  // For quiz_passed action
  intensity?: Intensity
  quizScore?: number
  attemptNumber?: number
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
      // Calculate curio using the new attempt-based system
      if (!intensity) {
        return NextResponse.json(
          { error: 'Missing intensity for quiz_passed action' },
          { status: 400 }
        )
      }

      const calculation = calculateQuizCurio({
        intensity,
        quizScore: quizScore ?? 0,
        attemptNumber: attemptNumber ?? 1,
      })

      curioAmount = calculation.finalCurio
      breakdown = calculation.breakdown
    } else {
      // Use fixed amounts for other actions
      curioAmount = CURIO_AMOUNTS[action]
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

    // Update stats based on action
    if (action === 'question_asked') {
      await supabase.rpc('increment_user_stat', { p_user_id: user.id, p_stat: 'questions_asked' })
    } else if (action === 'quiz_passed') {
      await supabase.rpc('increment_user_stat', { p_user_id: user.id, p_stat: 'quizzes_passed' })
      if (quizScore === 100) {
        await supabase.rpc('increment_user_stat', { p_user_id: user.id, p_stat: 'perfect_quizzes' })
      }
    }

    // Check and award any new badges
    await supabase.rpc('check_and_award_badges', { p_user_id: user.id })

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

    return NextResponse.json({
      curio: userData.curio_points,
      title: userData.current_title,
      leaderboard: position ? {
        rank: position.rank,
        totalUsers: position.total_users,
        percentile: position.percentile,
        monthlyCurio: position.monthly_curio,
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
