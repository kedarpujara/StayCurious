import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET - Check username availability
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Check if username is taken by another user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .neq('id', user.id)
      .single()

    return NextResponse.json({
      available: !existingUser,
      username: username.toLowerCase(),
    })
  } catch (error) {
    console.error('Check username error:', error)
    return NextResponse.json(
      { error: 'Failed to check username' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update username
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { username } = await request.json()

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Validate username format
    const cleanUsername = username.toLowerCase().trim()

    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    }

    if (cleanUsername.length > 20) {
      return NextResponse.json({ error: 'Username must be 20 characters or less' }, { status: 400 })
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 })
    }

    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', cleanUsername)
      .neq('id', user.id)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
    }

    // Update username
    const { data, error } = await supabase
      .from('users')
      .update({ username: cleanUsername })
      .eq('id', user.id)
      .select('username')
      .single()

    if (error) {
      console.error('Error updating username:', error)
      throw error
    }

    return NextResponse.json({ success: true, username: data.username })
  } catch (error) {
    console.error('Update username error:', error)
    return NextResponse.json(
      { error: 'Failed to update username' },
      { status: 500 }
    )
  }
}
