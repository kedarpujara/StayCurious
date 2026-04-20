# StayCurious — CLAUDE.md

Voice-first AI learning companion. Users ask a question (voice or text) and get back a structured crash-course with sections, quizzes, and chat-based teach-back. Daily learning challenge, gamified via Curio points + badges + monthly leaderboard. Learning communities called "Curio Circles".

_Prefix: `SC` · Repo: `~/projects/StayCurious` · Deploy: Vercel._

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14.2.35 (App Router), React 18 |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 3.4 + Framer Motion + Lucide React |
| Data | Supabase (Postgres + Auth) |
| Server state | TanStack Query 5 |
| Client state | Zustand 5 (transient UI only) |
| AI providers | Anthropic Claude (Sonnet 4 for generation, Haiku 4.5 for chat) + OpenAI GPT-4o fallback |
| Voice | Deepgram SDK 4 (real-time STT) |
| Web search | Tavily (for current-event topics) |
| Deploy | Vercel (cron enabled) |
| Markdown | react-markdown 10 |

## Repo layout

```
src/
  app/
    (auth)/login              OAuth login (Supabase)
    (app)/                    All protected routes — layout enforces session
      learn/                  Course listing + per-course view/quiz/chat
        [topicId]/            Course page, quiz, chat, ELI5, completion
      ask/                    Generate a course on-demand from a question
      daily/                  5-minute daily challenge
      backlog/                User's saved-for-later topics
      leaderboard/            Monthly Curio ranking
      circles/                Curio Circles (learning groups)
      learn-chat/             Chat-based lesson walkthrough
    api/
      ai/                     course, quiz, explain, lesson-chat, teach-back, eli5-verify
      voice/token             Deepgram API token proxy
      daily/                  Daily challenge submission + streaks
      cron/generate-daily     Vercel cron — picks tomorrow's topic (15:00 UTC)
      cron/monthly-snapshot   Captures monthly leaderboard
      curio/                  Point math
      circles/                Create/join/list/leaderboard for circles
      questions/              User question history
      blueprint/              Course-structure validation
  components/                 UI — organized to mirror routes (learn/, daily/, circles/)
  lib/
    ai/providers.ts           Model selection, provider fallback
    ai/prompts/               Course, quiz, explain, chat, blueprint prompts
    blueprint/                Structural validation of generated courses
    curio/                    Point formula + constants + badge triggers
    search/                   Tavily wrapper (invoked for recent topics)
    supabase/                 Client, server, middleware helpers
  hooks/                      useAuth, useAI, useCurio, useDaily, useDeepgram
  types/                      Shared TS interfaces (AIProvider, CourseContent, Quiz, …)
  constants/
supabase/
  migrations/                 25 numbered SQL migrations — incremental schema evolution
```

## Run / dev / build

```bash
npm install
npm run dev          # :3000
npm run build
npm start
```

## Environment

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=            # server only

ANTHROPIC_API_KEY=                    # at least one AI provider required
OPENAI_API_KEY=

DEEPGRAM_API_KEY=                     # voice input
TAVILY_API_KEY=                       # recent-topic web search
```

## Data model (Supabase)

Core tables (see `supabase/migrations/`):

- **`users`** — id (FK `auth.users`), email, display_name, avatar_url, `karma_points`, `current_title`, `longest_streak`, `preferred_ai_provider`, `voice_enabled`.
- **`course_catalog`** — generated or user-created courses. `content` + `quiz_questions` as JSONB. `is_published`, `is_vetted`, `section_count`.
- **`user_course_progress`** — per-user course state. `current_section_index`, `sections_completed[]`, `started_at`, `completed_at`, `status` (`in_progress` | `completed`).
- **`user_questions`** — history of questions → course_id linkage.
- **`daily_topics`** — one row per date, assigned by the cron.
- **`daily_courses`** — generated course body per daily topic.
- **`daily_completions`** — per-user submission + quiz answers + streak math.
- **`user_badges`** — awarded via `check_and_award_badges()` trigger.
- **`curio_circles`** / **`circle_members`** — learning groups with invite codes.
- **`leaderboard_entries`** — monthly ranking (rebuilt by monthly-snapshot cron).

All tables have RLS. Server-side code uses the service role key; client-side uses anon + session.

## Deploy

- **Target:** Vercel.
- **Cron jobs (`vercel.json`):**
  - `GET /api/cron/generate-daily` — 15:00 UTC daily.
  - `GET /api/cron/monthly-snapshot` — captures leaderboard at month end.
- **Server Actions** enabled (2MB body limit).
- Remote images from `lh3.googleusercontent.com` and `*.supabase.co` whitelisted.

## Key patterns

- **Data fetching:** TanStack Query everywhere. Mutations invalidate matching query keys (e.g., after `saveProgress`, invalidate `['user-progress']`).
- **Auth:** `useAuth()` listens to Supabase `onAuthStateChange`; protected layouts call `getSession()` (not `getUser()`) for speed.
- **AI calls:** Always go through `/lib/ai/providers.ts` — never import the Anthropic/OpenAI SDK directly in routes. Provider selection honors `user.preferred_ai_provider` with fallback.
- **Prompts:** All in `/lib/ai/prompts/`. Treat these like config — changes here retroactively affect course quality for all users.
- **Course generation with web search:** `/api/ai/course` calls `isRecentTopic()`; if true, fetches Tavily context and injects it into the prompt so recent-event courses don't hallucinate.
- **Voice:** `useDeepgram()` + `/api/voice/token` returns a short-lived API key to the client. Switching voice → typing preserves the transcript (regression fixed in `14b8719`).
- **Curio economy:** `/lib/curio/calculateCurio.ts` owns the formula. Point changes ripple across the leaderboard retroactively, so treat edits as policy changes.

## DO NOT casually change

- **`/lib/curio/*`** — point formulas drive leaderboard fairness. Coordinate with a user-facing communication plan.
- **Supabase migrations** — 25 migrations deep, built incrementally. New changes must be additive + preserve old data.
- **`check_and_award_badges()` function** — recently fixed (`awarded_at` vs `earned_at` in migration 025). Any SQL change here also needs a backfill plan.
- **`/lib/ai/prompts/*`** — prompt quality is iterative and tested empirically.
- **Auth middleware / `/lib/supabase/server.ts`** — cookie-based session refresh is SSR-sensitive.
- **Deepgram token endpoint** — currently returns the raw API key; don't expose more than that, and consider moving to short-lived scoped tokens before public launch.
- **`isRecentTopic()` logic** — disabling it silently regresses current-events course accuracy.

## Known gotchas

- **Cache staleness:** `saveProgress` must always invalidate `['user-progress']` and call `getSession()` — earlier versions had stale-auth bugs (commit `36bd63c`).
- **Model deprecations:** model IDs are pinned (`claude-sonnet-4-20250514`, `claude-haiku-4-5-20251001`). Periodically update when Anthropic publishes new versions.
- **Server Action 2MB limit** — long course content + audio payloads can exceed this. Stream large content instead.
- **Cron reliability:** `generate-daily` is the only source of new daily topics. If it misses, users see "no daily today" — consider a backfill job.

## Common tasks

- **Tweak course generation:** edit `/lib/ai/prompts/course.ts` + retest against a few topics.
- **Add a route:** create under `src/app/(app)/` to inherit the auth layout automatically.
- **Add a Supabase column:** new migration file, run against Supabase, add types to `/types/`, wire through hooks.
- **Add a new AI provider:** extend `/lib/ai/providers.ts` with a factory; all consumers will pick it up.

## Current priorities

Recent commits focused on voice/typing transcript preservation and live web-search context. No single "current milestone" file present — check recent git log for focus.
