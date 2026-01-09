import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stoicismSolidBlueprint } from '@/lib/blueprint/samples/stoicism-solid'

// Use service role for seeding
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    // Find the Stoicism showcase topic
    const { data: topic, error: topicError } = await supabase
      .from('showcase_topics')
      .select('id, topic')
      .ilike('topic', '%Stoicism%')
      .single()

    if (topicError || !topic) {
      return NextResponse.json(
        { error: 'Stoicism topic not found in showcase_topics', details: topicError },
        { status: 404 }
      )
    }

    console.log('Found topic:', topic)

    // Check if course already exists
    const { data: existing } = await supabase
      .from('course_catalog')
      .select('id')
      .eq('showcase_topic_id', topic.id)
      .eq('depth', 'solid')
      .single()

    if (existing) {
      return NextResponse.json({
        message: 'Course already exists',
        courseId: existing.id,
        topicId: topic.id,
      })
    }

    // Insert the blueprint course
    const { data: course, error: insertError } = await supabase
      .from('course_catalog')
      .insert({
        topic: stoicismSolidBlueprint.topic,
        slug: 'stoicism-solid-v2',
        source: 'almanac',
        creator_type: 'system',
        showcase_topic_id: topic.id,
        depth: 'solid',
        content: stoicismSolidBlueprint,
        quiz_questions: { questions: [] }, // TODO: Generate quiz
        description: 'A practical philosophy focused on emotional resilience and wisdom',
        category: 'philosophy',
        difficulty: 'beginner',
        estimated_minutes: 15,
        section_count: 6,
        schema_version: 2,
        is_vetted: true,
        is_featured: false,
        is_published: true,
        ai_provider: 'anthropic',
        generation_version: 2,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to insert course', details: insertError },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Stoicism blueprint course seeded successfully',
      courseId: course.id,
      topicId: topic.id,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return POST()
}
