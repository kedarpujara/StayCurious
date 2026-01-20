import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load env
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const t = line.trim()
  if (t && !t.startsWith('#')) {
    const i = t.indexOf('=')
    if (i > 0) {
      process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^['"]|['"]$/g, '')
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
  const { count: almanacCount } = await supabase
    .from('course_catalog')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'almanac')

  const { count: topicCount } = await supabase
    .from('showcase_topics')
    .select('*', { count: 'exact', head: true })

  console.log('Almanac courses:', almanacCount)
  console.log('Total topics:', topicCount)
  console.log('Progress:', Math.round(((almanacCount || 0) / (topicCount || 1)) * 100) + '%')

  if (almanacCount === topicCount) {
    console.log('\n✅ All courses generated!')
  } else {
    console.log('\n⏳ Still need:', (topicCount || 0) - (almanacCount || 0), 'courses')
  }
}

check()
