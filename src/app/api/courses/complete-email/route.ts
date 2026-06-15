import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { toDisplayFormat } from '@/lib/blueprint'
import type { CourseContent } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// /api/courses/complete-email
//
// Fired by the chat completion flow once a user finishes the last section of a
// course (regardless of quiz/ELI5). Sends a short refresher email — one bullet
// per section — plus a link back to the quiz so they can attempt it.
//
// Mirrors the Resend pattern used by QuillOS daily-email: POST to
// https://api.resend.com/emails with a Bearer token. Idempotency is enforced
// client-side (the chat container only fires once on the transition into
// `completed`), so this route does not gate on a sent-flag column.
// ─────────────────────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? ''
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO ?? ''

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function firstSentence(text: string): string {
  // Strip markdown emphasis / headers and grab the first sentence — keeps the
  // bullet readable without dumping a paragraph.
  const cleaned = text
    .replace(/[#*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return ''
  const match = cleaned.match(/^(.+?[.!?])(\s|$)/)
  const sentence = (match ? match[1] : cleaned).trim()
  return sentence.length > 220 ? sentence.slice(0, 217).trimEnd() + '…' : sentence
}

function renderEmailHtml(args: {
  firstName: string | null
  topic: string
  sections: { title: string; summary: string }[]
  quizUrl: string
}): string {
  const greeting = args.firstName ? `Hey ${escapeHtml(args.firstName)},` : 'Hey,'
  const bullets = args.sections
    .map(
      (s) => `
        <li style="margin: 0 0 12px 0; line-height: 1.5;">
          <strong style="color: #0f172a;">${escapeHtml(s.title)}</strong>${
            s.summary ? `<br/><span style="color: #475569;">${escapeHtml(s.summary)}</span>` : ''
          }
        </li>`,
    )
    .join('')

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
            <tr>
              <td>
                <p style="margin:0 0 8px 0;color:#64748b;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;">StayCurious · Quick Refresher</p>
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0f172a;">${escapeHtml(args.topic)}</h1>
                <p style="margin:0 0 16px 0;color:#334155;line-height:1.6;">${greeting} you just finished this course — here's a quick recap so it sticks.</p>
                <ul style="margin:0 0 24px 0;padding-left:20px;color:#0f172a;">
                  ${bullets}
                </ul>
                <p style="margin:0 0 12px 0;color:#334155;line-height:1.6;">Want to lock it in? Take the quiz:</p>
                <p style="margin:0 0 24px 0;">
                  <a href="${escapeHtml(args.quizUrl)}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Take the quiz</a>
                </p>
                <p style="margin:24px 0 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">Stay curious.<br/>— The StayCurious team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function renderEmailText(args: {
  firstName: string | null
  topic: string
  sections: { title: string; summary: string }[]
  quizUrl: string
}): string {
  const greeting = args.firstName ? `Hey ${args.firstName},` : 'Hey,'
  const bullets = args.sections
    .map((s) => `- ${s.title}${s.summary ? ` — ${s.summary}` : ''}`)
    .join('\n')
  return [
    `StayCurious — Quick Refresher`,
    args.topic,
    '',
    `${greeting} you just finished this course — here's a quick recap so it sticks.`,
    '',
    bullets,
    '',
    `Want to lock it in? Take the quiz:`,
    args.quizUrl,
    '',
    'Stay curious.',
    '— The StayCurious team',
  ].join('\n')
}

function resolveBaseUrl(request: Request): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const origin = request.headers.get('origin')
  if (origin) return origin.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`.replace(/\/$/, '')
  return ''
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId } = (await request.json()) as { courseId?: string }
    if (!courseId) {
      return NextResponse.json({ error: 'Missing courseId' }, { status: 400 })
    }

    // Confirm the user actually completed this course (don't trust the client).
    const { data: progress, error: progressError } = await supabase
      .from('user_course_progress')
      .select('status, completed_at')
      .eq('user_id', user.id)
      .eq('catalog_course_id', courseId)
      .maybeSingle()

    if (progressError) {
      console.error('[API/Courses/CompleteEmail] progress lookup failed:', progressError)
      return NextResponse.json({ error: 'Progress lookup failed' }, { status: 500 })
    }
    if (!progress || progress.status !== 'completed') {
      return NextResponse.json(
        { error: 'Course is not marked completed for this user' },
        { status: 400 },
      )
    }

    // Fetch course (topic + content). Anon-with-session works because
    // course_catalog is readable to authenticated users.
    const { data: course, error: courseError } = await supabase
      .from('course_catalog')
      .select('topic, content')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      console.error('[API/Courses/CompleteEmail] course lookup failed:', courseError)
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const content = toDisplayFormat(course.content) as CourseContent
    const sections = (content?.sections || []).map((s) => ({
      title: s.title ?? '',
      summary: firstSentence(s.content ?? ''),
    }))

    if (sections.length === 0) {
      return NextResponse.json(
        { error: 'Course has no sections to summarize' },
        { status: 400 },
      )
    }

    // Need the user's email + first name. Use the service-role client so we
    // can hit auth.admin.getUserById without the user JWT scope (mirrors the
    // QuillOS daily-email pattern).
    const service = await createServiceClient()
    const { data: authData, error: authErr } = await service.auth.admin.getUserById(user.id)
    if (authErr || !authData?.user?.email) {
      console.error('[API/Courses/CompleteEmail] auth lookup failed:', authErr)
      return NextResponse.json({ error: 'Could not resolve user email' }, { status: 500 })
    }
    const userEmail = authData.user.email
    const firstName =
      ((authData.user.user_metadata?.first_name as string | null | undefined) ??
        (authData.user.user_metadata?.full_name as string | null | undefined)?.split(' ')[0] ??
        null) || null

    if (!RESEND_API_KEY || !EMAIL_FROM_ADDRESS) {
      console.warn(
        '[API/Courses/CompleteEmail] RESEND_API_KEY / EMAIL_FROM_ADDRESS not set — skipping send',
      )
      return NextResponse.json({ ok: true, skipped: true, reason: 'email_not_configured' })
    }

    const baseUrl = resolveBaseUrl(request)
    const quizUrl = `${baseUrl}/learn/${encodeURIComponent(courseId)}/quiz`

    const html = renderEmailHtml({
      firstName,
      topic: course.topic,
      sections,
      quizUrl,
    })
    const text = renderEmailText({
      firstName,
      topic: course.topic,
      sections,
      quizUrl,
    })
    const subject = `Quick refresher: ${course.topic}`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `StayCurious <${EMAIL_FROM_ADDRESS}>`,
        to: [userEmail],
        reply_to: EMAIL_REPLY_TO || undefined,
        subject,
        html,
        text,
      }),
    })

    if (!resendRes.ok) {
      const errBody = await resendRes.text().catch(() => '')
      console.error(
        `[API/Courses/CompleteEmail] Resend error ${resendRes.status}: ${errBody}`,
      )
      return NextResponse.json({ error: 'Email send failed' }, { status: 502 })
    }

    const resendData = (await resendRes.json().catch(() => ({}))) as { id?: string }
    return NextResponse.json({ ok: true, sent: true, resend_id: resendData.id ?? null })
  } catch (error) {
    console.error('[API/Courses/CompleteEmail] Error:', error)
    return NextResponse.json({ error: 'Failed to send refresher email' }, { status: 500 })
  }
}
