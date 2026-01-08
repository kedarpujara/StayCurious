import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Get today's course ID
    const { data: dailyCourse, error: courseError } = await supabase
      .from('daily_courses')
      .select('id')
      .eq('date', today)
      .single()

    if (courseError || !dailyCourse) {
      return NextResponse.json(
        { error: 'No daily curio available today' },
        { status: 404 }
      )
    }

    // Check if already started
    const { data: existing } = await supabase
      .from('daily_completions')
      .select('id, completed_at')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    if (existing) {
      return NextResponse.json({
        message: 'Already started',
        id: existing.id,
        hasCompleted: !!existing.completed_at,
      })
    }

    // Create completion record to mark as started
    const { data: completion, error: insertError } = await supabase
      .from('daily_completions')
      .insert({
        user_id: user.id,
        daily_course_id: dailyCourse.id,
        date: today,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[API/Daily/Start] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to start daily curio' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      completion,
    })
  } catch (error) {
    console.error('[API/Daily/Start] Error:', error)
    return NextResponse.json(
      { error: 'Failed to start daily curio' },
      { status: 500 }
    )
  }
}
