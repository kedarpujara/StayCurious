import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST - Save a user question
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { question, category, source, courseId } = await request.json()

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    // Insert the question
    const { data, error } = await supabase
      .from('user_questions')
      .insert({
        user_id: user.id,
        question: question.trim(),
        category: category || null,
        source: source || 'ask_page',
        course_id: courseId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving question:', error)
      throw error
    }

    // Increment questions_asked stat
    await supabase.rpc('increment_user_stat', {
      p_user_id: user.id,
      p_stat: 'questions_asked'
    })

    return NextResponse.json({ success: true, question: data })
  } catch (error) {
    console.error('Save question error:', error)
    return NextResponse.json(
      { error: 'Failed to save question' },
      { status: 500 }
    )
  }
}

/**
 * GET - Fetch user's questions
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const { data, error, count } = await supabase
      .from('user_questions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching questions:', error)
      throw error
    }

    return NextResponse.json({
      questions: data || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Fetch questions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}
