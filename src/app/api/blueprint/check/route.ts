import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  // List existing courses (no filters, get all)
  const { data: existingCourses, error } = await supabase
    .from('course_catalog')
    .select('id, topic, slug, showcase_topic_id, source, is_published')
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ existingCourses, error })
}
