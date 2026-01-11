import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST - Reset user profile while keeping courses and course-related curio
 * This recalculates curio based only on completed courses, quizzes, and eli5
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate curio from completed courses (5 per section)
    const { data: completedCourses } = await supabase
      .from('user_course_progress')
      .select('total_sections')
      .eq('user_id', user.id)
      .eq('status', 'completed')

    const courseCurio = (completedCourses || []).reduce(
      (sum, c) => sum + (c.total_sections || 0) * 5,
      0
    )

    // Calculate curio from passed quizzes
    const { data: passedQuizzes } = await supabase
      .from('quiz_attempts')
      .select('curio_earned')
      .eq('user_id', user.id)
      .eq('passed', true)

    const quizCurio = (passedQuizzes || []).reduce(
      (sum, q) => sum + (q.curio_earned || 0),
      0
    )

    // Calculate curio from eli5 submissions
    const { data: eli5Submissions } = await supabase
      .from('eli5_submissions')
      .select('mcurio_awarded')
      .eq('user_id', user.id)
      .eq('passed', true)

    const eli5Curio = (eli5Submissions || []).reduce(
      (sum, e) => sum + (e.mcurio_awarded || 0),
      0
    )

    // Total curio from learning activities only
    const totalCurio = courseCurio + quizCurio + eli5Curio

    // Get title for this curio level
    const { data: titles } = await supabase
      .from('titles')
      .select('name, curio_required')
      .lte('curio_required', totalCurio)
      .order('curio_required', { ascending: false })
      .limit(1)

    const newTitle = titles?.[0]?.name || 'Curious Newcomer'

    // Reset user profile
    const { error: updateError } = await supabase
      .from('users')
      .update({
        curio_points: totalCurio,
        current_title: newTitle,
        questions_asked: 0,
        courses_completed: completedCourses?.length || 0,
        quizzes_passed: passedQuizzes?.length || 0,
        perfect_quizzes: 0, // Will be recalculated if needed
        current_streak: 0,
        longest_streak: 0,
        daily_curio_streak: 0,
        longest_daily_streak: 0,
        last_activity_date: null,
        last_daily_completion_date: null,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      throw updateError
    }

    // Delete all badges (they'll be re-earned)
    await supabase
      .from('user_badges')
      .delete()
      .eq('user_id', user.id)

    // Delete curiosity logs (questions asked history)
    await supabase
      .from('curiosity_logs')
      .delete()
      .eq('user_id', user.id)

    // Re-check badges based on current stats
    await supabase.rpc('check_and_award_badges', { p_user_id: user.id })

    return NextResponse.json({
      success: true,
      curio: totalCurio,
      title: newTitle,
      breakdown: {
        courses: courseCurio,
        quizzes: quizCurio,
        eli5: eli5Curio,
      },
      coursesCompleted: completedCourses?.length || 0,
      quizzesPassed: passedQuizzes?.length || 0,
    })
  } catch (error) {
    console.error('Profile reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset profile' },
      { status: 500 }
    )
  }
}
