import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mcurioToCurio, CURIO_CLUB_PERCENTILE, CURIO_CLUB_MIN_QUIZZES } from '@/lib/curio'
import type { LeaderboardEntry, UserLeaderboardPosition } from '@/types'

/**
 * GET - Fetch global monthly leaderboard
 * Query params:
 * - limit: number (default 100)
 * - year: number (default current year)
 * - month: number (default current month)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : undefined

    // Get leaderboard (use v2 function that reads from curio_events)
    const { data: leaderboardData, error: leaderboardError } = await supabase.rpc('get_monthly_leaderboard_v2', {
      p_limit: limit,
      ...(year && { p_year: year }),
      ...(month && { p_month: month }),
    })

    if (leaderboardError) {
      console.error('Leaderboard error:', leaderboardError)
      throw leaderboardError
    }

    // Get current user's position (use v2 function)
    const { data: positionData, error: positionError } = await supabase.rpc('get_user_monthly_position_v2', {
      p_user_id: user.id,
      ...(year && { p_year: year }),
      ...(month && { p_month: month }),
    })

    if (positionError) {
      console.error('Position error:', positionError)
    }

    // Transform to LeaderboardEntry format (convert mCurio to Curio for display)
    const entries: LeaderboardEntry[] = (leaderboardData || []).map((entry: {
      rank: number
      user_id: string
      username: string | null
      display_name: string | null
      avatar_url: string | null
      monthly_mcurio: number
      quiz_passes: number
      current_title: string
      is_curio_club: boolean
    }) => ({
      rank: entry.rank,
      userId: entry.user_id,
      username: entry.username,
      displayName: entry.display_name,
      avatarUrl: entry.avatar_url,
      monthlyCurio: mcurioToCurio(entry.monthly_mcurio),
      monthlyMcurio: entry.monthly_mcurio,
      quizCount: entry.quiz_passes,
      currentTitle: entry.current_title,
      isCurrentUser: entry.user_id === user.id,
      isEligible: entry.quiz_passes >= CURIO_CLUB_MIN_QUIZZES,
      isCurioClub: entry.is_curio_club,
    }))

    const position = positionData?.[0]
    const userPosition: UserLeaderboardPosition | null = position ? {
      rank: position.rank,
      totalUsers: position.total_users,
      percentile: position.percentile,
      monthlyCurio: mcurioToCurio(position.monthly_mcurio),
      monthlyMcurio: position.monthly_mcurio,
      quizCount: position.quiz_passes,
      isEligible: position.is_eligible,
      isTopTenPercent: position.percentile !== null && position.percentile >= CURIO_CLUB_PERCENTILE,
      isCurioClub: position.is_curio_club,
    } : null

    return NextResponse.json({
      entries,
      userPosition,
      month: month || new Date().getMonth() + 1,
      year: year || new Date().getFullYear(),
      eligibilityRequirements: {
        minQuizzes: CURIO_CLUB_MIN_QUIZZES,
        percentile: CURIO_CLUB_PERCENTILE,
      },
    })
  } catch (error) {
    console.error('Leaderboard fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
