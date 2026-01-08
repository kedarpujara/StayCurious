import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CurioCircle } from '@/types'

/**
 * GET - List user's Curio Circles
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get circles where user is a member
    const { data: memberships, error: membershipError } = await supabase
      .from('curio_circle_members')
      .select(`
        role,
        circle:curio_circles (
          id,
          name,
          description,
          invite_code,
          created_by,
          max_members,
          created_at
        )
      `)
      .eq('user_id', user.id)

    if (membershipError) throw membershipError

    // Type the memberships properly - Supabase returns single object for 1:1 relations
    type MembershipWithCircle = {
      role: string
      circle: {
        id: string
        name: string
        description: string | null
        invite_code: string
        created_by: string
        max_members: number
        created_at: string
      } | null
    }
    const typedMemberships = memberships as unknown as MembershipWithCircle[] | null

    // Get member counts for each circle
    const circleIds = typedMemberships?.map(m => m.circle?.id).filter(Boolean) as string[] || []

    let memberCounts: Record<string, number> = {}
    if (circleIds.length > 0) {
      const { data: countData } = await supabase
        .from('curio_circle_members')
        .select('circle_id')
        .in('circle_id', circleIds)

      memberCounts = (countData || []).reduce((acc, { circle_id }) => {
        acc[circle_id] = (acc[circle_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    const circles: (CurioCircle & { role: string })[] = (typedMemberships || [])
      .filter(m => m.circle)
      .map(m => ({
        id: m.circle!.id,
        name: m.circle!.name,
        description: m.circle!.description,
        inviteCode: m.circle!.invite_code,
        createdBy: m.circle!.created_by,
        maxMembers: m.circle!.max_members,
        memberCount: memberCounts[m.circle!.id] || 0,
        createdAt: m.circle!.created_at,
        role: m.role,
      }))

    return NextResponse.json({ circles })
  } catch (error) {
    console.error('Get circles error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch circles' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create a new Curio Circle
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Circle name is required' },
        { status: 400 }
      )
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: 'Circle name must be 50 characters or less' },
        { status: 400 }
      )
    }

    // Generate invite code
    const { data: inviteCode, error: codeError } = await supabase.rpc('generate_invite_code')

    if (codeError) {
      console.error('Invite code generation error:', codeError)
      throw codeError
    }

    // Create circle
    const { data: circle, error: createError } = await supabase
      .from('curio_circles')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        invite_code: inviteCode,
        created_by: user.id,
      })
      .select()
      .single()

    if (createError) throw createError

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('curio_circle_members')
      .insert({
        circle_id: circle.id,
        user_id: user.id,
        role: 'owner',
      })

    if (memberError) throw memberError

    return NextResponse.json({
      circle: {
        id: circle.id,
        name: circle.name,
        description: circle.description,
        inviteCode: circle.invite_code,
        createdBy: circle.created_by,
        maxMembers: circle.max_members,
        memberCount: 1,
        createdAt: circle.created_at,
      } as CurioCircle,
    })
  } catch (error) {
    console.error('Create circle error:', error)
    return NextResponse.json(
      { error: 'Failed to create circle' },
      { status: 500 }
    )
  }
}
