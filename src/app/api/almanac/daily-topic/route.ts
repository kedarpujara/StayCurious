import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface DailyTopicResult {
  topic_id: string
  topic: string
  description: string | null
  category: string
  difficulty: string
  date: string
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Call the database function that gets or creates today's topic
    const { data, error } = await supabase
      .rpc('get_almanac_daily_topic')
      .single()

    if (error) {
      console.error('[Daily Topic] Error fetching daily topic:', error)
      // Fall back to a random topic if the function fails
      const { data: randomTopic, error: randomError } = await supabase
        .from('showcase_topics')
        .select('id, topic, description, category, difficulty, estimated_minutes')
        .limit(1)
        .single()

      if (randomError || !randomTopic) {
        return NextResponse.json({ error: 'No topics available' }, { status: 404 })
      }

      return NextResponse.json({
        topic_id: randomTopic.id,
        topic: randomTopic.topic,
        description: randomTopic.description,
        category: randomTopic.category,
        difficulty: randomTopic.difficulty,
        estimated_minutes: randomTopic.estimated_minutes,
        date: new Date().toISOString().split('T')[0]
      })
    }

    if (!data) {
      return NextResponse.json({ error: 'No daily topic available' }, { status: 404 })
    }

    const dailyData = data as DailyTopicResult

    // Get the full topic details including estimated_minutes
    const { data: fullTopic } = await supabase
      .from('showcase_topics')
      .select('estimated_minutes, subcategory_id')
      .eq('id', dailyData.topic_id)
      .single()

    return NextResponse.json({
      ...dailyData,
      estimated_minutes: fullTopic?.estimated_minutes || 15,
      subcategory_id: fullTopic?.subcategory_id
    })
  } catch (error) {
    console.error('[Daily Topic] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to fetch daily topic' }, { status: 500 })
  }
}
