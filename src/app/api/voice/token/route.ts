import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return the Deepgram API key
    // In production, you might want to use temporary tokens
    const apiKey = process.env.DEEPGRAM_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Voice service not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      token: apiKey,
      expiresAt: Date.now() + 3600000, // 1 hour
    })
  } catch (error) {
    console.error('Voice token error:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
