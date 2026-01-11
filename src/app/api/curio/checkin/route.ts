import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { awardDailyCheckin, mcurioToCurio, DAILY_CHECKIN_MCURIO } from '@/lib/curio'

/**
 * POST /api/curio/checkin
 *
 * Award daily check-in bonus (30 Curio) once per UTC day.
 * Idempotent - calling multiple times on same day won't award extra.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get trigger action from body (optional)
    let triggerAction = 'manual'
    try {
      const body = await request.json()
      triggerAction = body.trigger || 'manual'
    } catch {
      // Body is optional
    }

    const result = await awardDailyCheckin(user.id, triggerAction)

    return NextResponse.json({
      success: result.success,
      alreadyCheckedIn: result.alreadyCheckedIn,
      mcurioAwarded: result.mcurioAwarded,
      curioAwarded: mcurioToCurio(result.mcurioAwarded),
      dateUtc: result.dateUtc,
      message: result.alreadyCheckedIn
        ? 'Already checked in today'
        : `+${mcurioToCurio(DAILY_CHECKIN_MCURIO)} Curio for daily check-in!`,
    })
  } catch (error) {
    console.error('[Daily Checkin] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/curio/checkin
 *
 * Check if user has already checked in today.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check for today's check-in
    const today = new Date().toISOString().split('T')[0]
    const { data: checkin } = await supabase
      .from('daily_checkins')
      .select('id, mcurio_awarded, created_at')
      .eq('user_id', user.id)
      .eq('date_utc', today)
      .single()

    return NextResponse.json({
      checkedIn: !!checkin,
      dateUtc: today,
      mcurioAwarded: checkin?.mcurio_awarded ?? 0,
      curioAwarded: mcurioToCurio(checkin?.mcurio_awarded ?? 0),
      checkinReward: mcurioToCurio(DAILY_CHECKIN_MCURIO),
    })
  } catch (error) {
    console.error('[Daily Checkin] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
