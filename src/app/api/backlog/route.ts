import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getModel, getDefaultProvider } from '@/lib/ai/providers'

// Generate a concise topic title from a question
async function generateTopicTitle(question: string): Promise<string> {
  try {
    const model = getModel(getDefaultProvider())
    const { text } = await generateText({
      model,
      prompt: `Convert this question into a concise learning topic title (3-6 words, no quotes, no punctuation at end). Focus on the core subject matter, not filler words like "do you know" or "what is".

Question: "${question}"

Topic title:`,
    })

    // Clean up the response
    const title = text.trim().replace(/^["']|["']$/g, '').replace(/[.!?]$/, '')
    return title || question.substring(0, 50)
  } catch (error) {
    console.error('Failed to generate topic title:', error)
    // Fallback: extract key words from question
    return question.substring(0, 50)
  }
}

// GET - Fetch backlog items
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('backlog_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ items: data })
  } catch (error) {
    console.error('Backlog fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch backlog' },
      { status: 500 }
    )
  }
}

// POST - Add to backlog
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { topic, source, category, description } = await request.json() as {
      topic: string
      source: 'instant_curiosity' | 'manual' | 'suggested'
      category?: string
      description?: string
    }

    if (!topic || !source) {
      return NextResponse.json(
        { error: 'Topic and source are required' },
        { status: 400 }
      )
    }

    // Generate a summarized title for questions from instant_curiosity
    let topicTitle = topic
    if (source === 'instant_curiosity' && topic.length > 20) {
      topicTitle = await generateTopicTitle(topic)
    }

    const { data, error } = await supabase
      .from('backlog_items')
      .insert({
        user_id: user.id,
        topic: topicTitle,
        source,
        category: category || null,
        description: source === 'instant_curiosity' ? topic : (description || null), // Store original question as description
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ item: data })
  } catch (error) {
    console.error('Backlog add error:', error)
    return NextResponse.json(
      { error: 'Failed to add to backlog' },
      { status: 500 }
    )
  }
}

// PATCH - Update backlog item
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('backlog_items')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ item: data })
  } catch (error) {
    console.error('Backlog update error:', error)
    return NextResponse.json(
      { error: 'Failed to update backlog item' },
      { status: 500 }
    )
  }
}

// DELETE - Remove from backlog
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('backlog_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Backlog delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete backlog item' },
      { status: 500 }
    )
  }
}
