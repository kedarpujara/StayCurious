import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CurioCircle } from '@/types'

/**
 * POST - Join a Curio Circle by invite code
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { inviteCode } = await request.json()

    if (!inviteCode || inviteCode.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    // Find circle by invite code
    const { data: circle, error: findError } = await supabase
      .from('curio_circles')
      .select('*')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .single()

    if (findError || !circle) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      )
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('curio_circle_members')
      .select('id')
      .eq('circle_id', circle.id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this circle' },
        { status: 400 }
      )
    }

    // Check member count
    const { count } = await supabase
      .from('curio_circle_members')
      .select('*', { count: 'exact', head: true })
      .eq('circle_id', circle.id)

    if (count && count >= circle.max_members) {
      return NextResponse.json(
        { error: 'This circle is full' },
        { status: 400 }
      )
    }

    // Join circle
    const { error: joinError } = await supabase
      .from('curio_circle_members')
      .insert({
        circle_id: circle.id,
        user_id: user.id,
        role: 'member',
      })

    if (joinError) throw joinError

    return NextResponse.json({
      circle: {
        id: circle.id,
        name: circle.name,
        description: circle.description,
        inviteCode: circle.invite_code,
        createdBy: circle.created_by,
        maxMembers: circle.max_members,
        memberCount: (count || 0) + 1,
        createdAt: circle.created_at,
      } as CurioCircle,
      message: `Successfully joined ${circle.name}!`,
    })
  } catch (error) {
    console.error('Join circle error:', error)
    return NextResponse.json(
      { error: 'Failed to join circle' },
      { status: 500 }
    )
  }
}
