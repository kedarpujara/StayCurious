import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Check if daily exists for today
    const { data: dailyCourse } = await supabase
      .from('daily_courses')
      .select('id')
      .eq('date', today)
      .single()

    if (!dailyCourse) {
      return NextResponse.json({
        available: false,
        reason: 'no_daily',
        hasStarted: false,
        hasCompleted: false,
        score: null,
        unlocked: false,
        streak: 0,
        longestStreak: 0,
      })
    }

    // Check user's completion status
    const { data: completion } = await supabase
      .from('daily_completions')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    // Get user's streak info
    const { data: userData } = await supabase
      .from('users')
      .select('daily_curio_streak, longest_daily_streak')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      available: true,
      hasStarted: !!completion,
      hasCompleted: !!completion?.completed_at,
      score: completion?.quiz_score ?? null,
      unlocked: completion?.unlocked ?? false,
      streak: userData?.daily_curio_streak ?? 0,
      longestStreak: userData?.longest_daily_streak ?? 0,
    })
  } catch (error) {
    console.error('[API/Daily/Status] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}
