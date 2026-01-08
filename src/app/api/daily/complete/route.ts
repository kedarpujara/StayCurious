import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Quiz } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dailyCourseId, answers } = (await request.json()) as {
      dailyCourseId: string
      answers: number[]
    }

    // Validate input
    if (!dailyCourseId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (answers.length !== 5) {
      return NextResponse.json(
        { error: 'Must provide exactly 5 answers' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // Verify the course exists and is for today
    const { data: course, error: courseError } = await supabase
      .from('daily_courses')
      .select('quiz_questions, date')
      .eq('id', dailyCourseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Daily course not found' },
        { status: 404 }
      )
    }

    if (course.date !== today) {
      return NextResponse.json(
        { error: 'This daily course is not for today' },
        { status: 400 }
      )
    }

    // Check if already completed
    const { data: existingCompletion } = await supabase
      .from('daily_completions')
      .select('completed_at, quiz_score')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    if (existingCompletion?.completed_at) {
      return NextResponse.json(
        {
          error: 'Already completed today',
          score: existingCompletion.quiz_score,
        },
        { status: 400 }
      )
    }

    // Calculate score
    const quiz = course.quiz_questions as Quiz
    let score = 0
    for (let i = 0; i < answers.length; i++) {
      if (answers[i] === quiz.questions[i].correctAnswer) {
        score++
      }
    }

    // Submit via RPC function for atomic update
    const { data: result, error: rpcError } = await supabase.rpc(
      'submit_daily_quiz',
      {
        p_user_id: user.id,
        p_daily_course_id: dailyCourseId,
        p_quiz_answers: answers,
        p_quiz_score: score,
      }
    )

    if (rpcError) {
      console.error('[API/Daily/Complete] RPC error:', rpcError)
      return NextResponse.json(
        { error: 'Failed to submit quiz' },
        { status: 500 }
      )
    }

    const resultData = result?.[0] || {
      success: false,
      unlocked: false,
      new_streak: 0,
      karma_earned: 0,
    }

    if (!resultData.success) {
      return NextResponse.json(
        { error: 'Quiz submission failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      score,
      totalQuestions: 5,
      unlocked: resultData.unlocked,
      streak: resultData.new_streak,
      karmaEarned: resultData.karma_earned,
    })
  } catch (error) {
    console.error('[API/Daily/Complete] Error:', error)
    return NextResponse.json(
      { error: 'Failed to submit daily quiz' },
      { status: 500 }
    )
  }
}
