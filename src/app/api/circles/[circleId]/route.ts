import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CurioCircle, CircleLeaderboardEntry } from '@/types'

interface RouteParams {
  params: Promise<{ circleId: string }>
}

/**
 * GET - Get circle details and leaderboard
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { circleId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a member
    const { data: membership, error: memberError } = await supabase
      .from('curio_circle_members')
      .select('role')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'You are not a member of this circle' },
        { status: 403 }
      )
    }

    // Get circle details
    const { data: circle, error: circleError } = await supabase
      .from('curio_circles')
      .select('*')
      .eq('id', circleId)
      .single()

    if (circleError || !circle) {
      return NextResponse.json(
        { error: 'Circle not found' },
        { status: 404 }
      )
    }

    // Get member count
    const { count: memberCount } = await supabase
      .from('curio_circle_members')
      .select('*', { count: 'exact', head: true })
      .eq('circle_id', circleId)

    // Get circle leaderboard
    const { data: leaderboardData, error: leaderboardError } = await supabase.rpc('get_circle_leaderboard', {
      p_circle_id: circleId,
    })

    if (leaderboardError) {
      console.error('Circle leaderboard error:', leaderboardError)
    }

    const leaderboard: CircleLeaderboardEntry[] = (leaderboardData || []).map((entry: {
      rank: number
      user_id: string
      display_name: string | null
      avatar_url: string | null
      monthly_curio: number
      current_title: string
      role: string
    }) => ({
      rank: entry.rank,
      userId: entry.user_id,
      displayName: entry.display_name,
      avatarUrl: entry.avatar_url,
      monthlyCurio: entry.monthly_curio,
      currentTitle: entry.current_title,
      role: entry.role as 'owner' | 'admin' | 'member',
      isCurrentUser: entry.user_id === user.id,
    }))

    return NextResponse.json({
      circle: {
        id: circle.id,
        name: circle.name,
        description: circle.description,
        inviteCode: circle.invite_code,
        createdBy: circle.created_by,
        maxMembers: circle.max_members,
        memberCount: memberCount || 0,
        createdAt: circle.created_at,
      } as CurioCircle,
      userRole: membership.role,
      leaderboard,
    })
  } catch (error) {
    console.error('Get circle error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch circle' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Leave or delete circle
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { circleId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check membership and role
    const { data: membership, error: memberError } = await supabase
      .from('curio_circle_members')
      .select('role')
      .eq('circle_id', circleId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'You are not a member of this circle' },
        { status: 403 }
      )
    }

    if (membership.role === 'owner') {
      // Delete the entire circle (cascade will remove members)
      const { error: deleteError } = await supabase
        .from('curio_circles')
        .delete()
        .eq('id', circleId)

      if (deleteError) throw deleteError

      return NextResponse.json({ message: 'Circle deleted' })
    } else {
      // Just leave the circle
      const { error: leaveError } = await supabase
        .from('curio_circle_members')
        .delete()
        .eq('circle_id', circleId)
        .eq('user_id', user.id)

      if (leaveError) throw leaveError

      return NextResponse.json({ message: 'Left circle' })
    }
  } catch (error) {
    console.error('Leave/delete circle error:', error)
    return NextResponse.json(
      { error: 'Failed to leave/delete circle' },
      { status: 500 }
    )
  }
}
