import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getModel, getDefaultProvider } from '@/lib/ai/providers'

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

    // Generate a short title from the question (2-5 words)
    let title: string | null = null
    try {
      const model = getModel(getDefaultProvider())
      const { text } = await generateText({
        model,
        system: 'You are a helpful assistant that creates short, catchy titles. Respond with ONLY the title, nothing else.',
        prompt: `Create a short title (2-5 words) for this question. The title should be a topic name, not a question. For example:
- "How do coffee shops make money?" → "Coffee Shop Profits"
- "I want to learn about black holes" → "Black Holes"
- "What makes the sky blue?" → "Sky Colors"
- "Tell me about the French Revolution" → "French Revolution"

Question: "${question.trim()}"

Title:`,
      })
      title = text.trim().replace(/^["']|["']$/g, '') // Remove quotes if present
    } catch (titleError) {
      console.error('Failed to generate title (non-critical):', titleError)
      // Continue without title - not critical
    }

    // Insert the question
    const { data, error } = await supabase
      .from('user_questions')
      .insert({
        user_id: user.id,
        question: question.trim(),
        title,
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

    // Note: questions_asked stat is incremented in /api/curio when curio is awarded
    // This ensures badges are checked after the stat is updated

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

/**
 * PATCH - Update a user question (e.g., save the AI answer)
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, answer } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 })
    }

    // Update the question (RLS ensures user can only update their own)
    const { data, error } = await supabase
      .from('user_questions')
      .update({ answer })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating question:', error)
      throw error
    }

    return NextResponse.json({ success: true, question: data })
  } catch (error) {
    console.error('Update question error:', error)
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete a user question
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get('id')

    if (!questionId) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 })
    }

    // Delete the question (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from('user_questions')
      .delete()
      .eq('id', questionId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting question:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete question error:', error)
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    )
  }
}
