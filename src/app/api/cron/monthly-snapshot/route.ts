import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  CURIO_CLUB_PERCENTILE,
  CURIO_CLUB_MIN_QUIZZES,
  CURIO_CLUB_MIN_USERS,
} from '@/lib/curio'

// Create a service role client without cookies for cron jobs
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Monthly snapshot cron job
 *
 * Runs at month end to:
 * 1. Sum all curio_events per user for the month
 * 2. Calculate ranks and percentiles
 * 3. Determine eligible users (min quiz passes)
 * 4. Mark top 10% as Curio Club
 * 5. Set curio_club_eligible_until for next month
 * 6. Store in monthly_snapshots
 */
export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const supabase = createServiceClient()

    // Get year and month from query params, or use previous month
    const { searchParams } = new URL(request.url)
    const now = new Date()

    // Default to previous month (run at start of new month)
    const defaultDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const year = parseInt(searchParams.get('year') || String(defaultDate.getFullYear()), 10)
    const month = parseInt(searchParams.get('month') || String(defaultDate.getMonth() + 1), 10)

    console.log(`[Cron/Monthly] Processing snapshot for ${year}-${String(month).padStart(2, '0')}`)

    // Check if snapshot already exists
    const { data: existingSnapshot } = await supabase
      .from('monthly_snapshots')
      .select('id')
      .eq('year', year)
      .eq('month', month)
      .limit(1)
      .single()

    if (existingSnapshot) {
      return NextResponse.json({
        message: 'Snapshot already exists for this month',
        year,
        month,
      })
    }

    // Get monthly mCurio totals and quiz counts from curio_events
    // Using date range for the specified month
    const monthStart = new Date(year, month - 1, 1).toISOString()
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

    // Query curio_events for the month
    const { data: monthlyData, error: queryError } = await supabase
      .from('curio_events')
      .select('user_id, mcurio_delta, event_type')
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd)

    if (queryError) {
      throw new Error(`Failed to query curio_events: ${queryError.message}`)
    }

    // Aggregate by user
    const userAggregates = new Map<string, { totalMcurio: number; quizCount: number }>()

    for (const event of monthlyData || []) {
      const existing = userAggregates.get(event.user_id) || { totalMcurio: 0, quizCount: 0 }
      existing.totalMcurio += event.mcurio_delta
      if (event.event_type === 'quiz_pass') {
        existing.quizCount += 1
      }
      userAggregates.set(event.user_id, existing)
    }

    // Convert to array and sort by total mCurio (descending)
    const sortedUsers = Array.from(userAggregates.entries())
      .map(([userId, data]) => ({
        userId,
        totalMcurio: data.totalMcurio,
        quizCount: data.quizCount,
        isEligible: data.quizCount >= CURIO_CLUB_MIN_QUIZZES,
      }))
      .sort((a, b) => b.totalMcurio - a.totalMcurio)

    const totalUsers = sortedUsers.length

    console.log(`[Cron/Monthly] Found ${totalUsers} users with activity`)

    if (totalUsers === 0) {
      return NextResponse.json({
        message: 'No users with activity this month',
        year,
        month,
      })
    }

    // Calculate ranks and percentiles, determine Curio Club
    // Only eligible users can be in Curio Club, and need minimum user count
    const eligibleUsers = sortedUsers.filter(u => u.isEligible)
    const eligibleCount = eligibleUsers.length
    const hasSufficientUsers = eligibleCount >= CURIO_CLUB_MIN_USERS

    // Top 10% of eligible users
    const curioClubCutoff = hasSufficientUsers
      ? Math.ceil(eligibleCount * (1 - CURIO_CLUB_PERCENTILE / 100))
      : 0

    // Calculate next month's eligibility date
    const nextMonthEnd = new Date(year, month + 1, 0) // Last day of next month
    const eligibleUntil = nextMonthEnd.toISOString().split('T')[0]

    // Prepare snapshots
    const snapshots = sortedUsers.map((user, index) => {
      const rank = index + 1
      const percentile = totalUsers > 1
        ? ((totalUsers - rank) / (totalUsers - 1)) * 100
        : 100

      // Check if this user is in Curio Club
      const eligibleRank = user.isEligible
        ? eligibleUsers.findIndex(u => u.userId === user.userId) + 1
        : 0
      const isCurioClub = user.isEligible && eligibleRank <= curioClubCutoff

      return {
        year,
        month,
        user_id: user.userId,
        total_mcurio: user.totalMcurio,
        rank,
        percentile: Math.round(percentile * 100) / 100,
        is_eligible: user.isEligible,
        is_curio_club: isCurioClub,
      }
    })

    // Insert snapshots
    const { error: insertError } = await supabase
      .from('monthly_snapshots')
      .insert(snapshots)

    if (insertError) {
      throw new Error(`Failed to insert snapshots: ${insertError.message}`)
    }

    // Update users' Curio Club status
    const curioClubUserIds = snapshots
      .filter(s => s.is_curio_club)
      .map(s => s.user_id)

    if (curioClubUserIds.length > 0) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          curio_club_active: true,
          curio_club_eligible_until: eligibleUntil,
        })
        .in('id', curioClubUserIds)

      if (updateError) {
        console.error('[Cron/Monthly] Failed to update Curio Club status:', updateError)
      }
    }

    // Deactivate users who were in Curio Club but didn't make it this month
    const { error: deactivateError } = await supabase
      .from('users')
      .update({ curio_club_active: false })
      .eq('curio_club_active', true)
      .not('id', 'in', `(${curioClubUserIds.join(',')})`)

    if (deactivateError) {
      console.error('[Cron/Monthly] Failed to deactivate old Curio Club members:', deactivateError)
    }

    console.log(`[Cron/Monthly] Snapshot complete. ${curioClubUserIds.length} users in Curio Club`)

    return NextResponse.json({
      success: true,
      year,
      month,
      totalUsers,
      eligibleUsers: eligibleCount,
      curioClubMembers: curioClubUserIds.length,
      minQuizzesRequired: CURIO_CLUB_MIN_QUIZZES,
      percentileRequired: CURIO_CLUB_PERCENTILE,
    })
  } catch (error) {
    console.error('[Cron/Monthly] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create monthly snapshot',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
