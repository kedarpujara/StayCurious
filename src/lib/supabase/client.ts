import { createBrowserClient } from '@supabase/ssr'

// Note: For production, generate proper types using `npx supabase gen types typescript`
// For now, using untyped client to avoid build-time type conflicts

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
