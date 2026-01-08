import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

    // Get leaderboard
    const { data: leaderboardData, error: leaderboardError } = await supabase.rpc('get_monthly_leaderboard', {
      p_limit: limit,
      ...(year && { p_year: year }),
      ...(month && { p_month: month }),
    })

    if (leaderboardError) {
      console.error('Leaderboard error:', leaderboardError)
      throw leaderboardError
    }

    // Get current user's position
    const { data: positionData, error: positionError } = await supabase.rpc('get_user_leaderboard_position', {
      p_user_id: user.id,
      ...(year && { p_year: year }),
      ...(month && { p_month: month }),
    })

    if (positionError) {
      console.error('Position error:', positionError)
    }

    // Transform to LeaderboardEntry format
    const entries: LeaderboardEntry[] = (leaderboardData || []).map((entry: {
      rank: number
      user_id: string
      display_name: string | null
      avatar_url: string | null
      monthly_curio: number
      current_title: string
    }) => ({
      rank: entry.rank,
      userId: entry.user_id,
      displayName: entry.display_name,
      avatarUrl: entry.avatar_url,
      monthlyCurio: entry.monthly_curio,
      currentTitle: entry.current_title,
      isCurrentUser: entry.user_id === user.id,
    }))

    const position = positionData?.[0]
    const userPosition: UserLeaderboardPosition | null = position ? {
      rank: position.rank,
      totalUsers: position.total_users,
      percentile: position.percentile,
      monthlyCurio: position.monthly_curio,
      isTopTenPercent: position.percentile !== null && position.percentile >= 90,
    } : null

    return NextResponse.json({
      entries,
      userPosition,
      month: month || new Date().getMonth() + 1,
      year: year || new Date().getFullYear(),
    })
  } catch (error) {
    console.error('Leaderboard fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
