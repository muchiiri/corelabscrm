// Supabase Edge Function (Deno runtime, plain JS - see current-feature.md's
// "no shared code with morning-digest" note for why the small helpers below
// are duplicated rather than imported from a shared module).
//
// Deploy with the Supabase CLI (`supabase functions deploy evening-summary`)
// or paste this file into the Dashboard's Edge Functions editor.
//
// Required secrets: EMAILJS_SUMMARY_TEMPLATE_ID is new; EMAILJS_SERVICE_ID,
// EMAILJS_PUBLIC_KEY, and EMAILJS_PRIVATE_KEY are reused as-is from feature
// 27's morning-digest secrets (account-level, not per-template). SUPABASE_URL
// and SUPABASE_SERVICE_ROLE_KEY are injected automatically by Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const EMAILJS_SERVICE_ID = Deno.env.get('EMAILJS_SERVICE_ID')
const EMAILJS_PUBLIC_KEY = Deno.env.get('EMAILJS_PUBLIC_KEY')
const EMAILJS_PRIVATE_KEY = Deno.env.get('EMAILJS_PRIVATE_KEY')
const EMAILJS_SUMMARY_TEMPLATE_ID = Deno.env.get('EMAILJS_SUMMARY_TEMPLATE_ID')

const HOUR_MS = 60 * 60 * 1000
const PLUS_3_OFFSET_MS = 3 * HOUR_MS
const ACTIVITY_DISPLAY_LIMIT = 30
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

// Today's window in +3-UTC terms, as a [start, end) pair of real UTC
// instants. Same shift-forward/take-date/shift-back math feature 27 locked
// for its single cutoff bound, just computed for both ends here since this
// feature needs "did this happen today," not just "is this before today."
function computeTodayWindowUtc(now) {
  const plus3Now = new Date(now.getTime() + PLUS_3_OFFSET_MS)
  const y = plus3Now.getUTCFullYear()
  const m = plus3Now.getUTCMonth()
  const d = plus3Now.getUTCDate()
  return {
    start: new Date(Date.UTC(y, m, d) - PLUS_3_OFFSET_MS),
    end: new Date(Date.UTC(y, m, d + 1) - PLUS_3_OFFSET_MS),
  }
}

// Idempotency-only, plain UTC day boundary - safe because this cron always
// fires at a fixed 15:00 UTC, never near a UTC day boundary.
function startOfTodayUtc(now) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])
}

function formatDateLabel(now) {
  const plus3Now = new Date(now.getTime() + PLUS_3_OFFSET_MS)
  return plus3Now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).toUpperCase()
}

// Display only, not a boundary calculation (those stay manual +3 offset
// math elsewhere in this file) - Africa/Nairobi is a real, DST-free UTC+3
// zone, matching project-overview.md's "+3 UTC (Nairobi)" send-time note.
function formatTimeLabel(occurredAt) {
  return new Date(occurredAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Nairobi' })
}

function buildHeadline(completedCount, activityCount) {
  const parts = []
  if (completedCount > 0) {
    parts.push(`${completedCount} task${completedCount === 1 ? '' : 's'} completed`)
  }
  if (activityCount > 0) {
    parts.push(`${activityCount} update${activityCount === 1 ? '' : 's'}`)
  }
  return parts.join(', ')
}

function buildSummaryHtml(completedTasks, activityEntries, activityOverflowCount, activityTotalCount, dateLabel) {
  const completedCount = completedTasks.length

  const statsHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 24px;">
      <tr>
        <td width="50%" style="padding-right:8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; border-radius:8px;">
            <tr><td style="padding:16px;">
              <div style="font-size:22px; font-weight:700; color:#2f9e44; line-height:26px;">${completedCount}</div>
              <div style="font-size:12px; color:#6b7280;">Completed</div>
            </td></tr>
          </table>
        </td>
        <td width="50%" style="padding-left:8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; border-radius:8px;">
            <tr><td style="padding:16px;">
              <div style="font-size:22px; font-weight:700; color:#1f2937; line-height:26px;">${activityTotalCount}</div>
              <div style="font-size:12px; color:#6b7280;">Updates</div>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  `

  const sections = []

  if (completedTasks.length > 0) {
    const rows = completedTasks
      .map(
        (task) => `
          <tr>
            <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; font-size:14px; font-weight:600; color:#1f2937;">
              ${escapeHtml(task.title)}
            </td>
          </tr>
        `,
      )
      .join('')
    sections.push(`
      <p style="margin:20px 0 4px; font-size:11px; font-weight:700; letter-spacing:0.05em; color:#9ca3af; text-transform:uppercase;">Completed today</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    `)
  }

  if (activityEntries.length > 0) {
    const rows = activityEntries
      .map(
        (entry) => `
          <tr>
            <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; font-size:14px; color:#1f2937;">
              ${escapeHtml(entry.summary)}
            </td>
            <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; text-align:right; white-space:nowrap; font-size:12px; color:#6b7280; vertical-align:top;">
              ${formatTimeLabel(entry.occurred_at)}
            </td>
          </tr>
        `,
      )
      .join('')
    const overflowNote =
      activityOverflowCount > 0
        ? `<p style="margin:8px 0 0; font-size:12px; color:#6b7280;">+${activityOverflowCount} more update${activityOverflowCount === 1 ? '' : 's'} today</p>`
        : ''
    sections.push(`
      <p style="margin:20px 0 4px; font-size:11px; font-weight:700; letter-spacing:0.05em; color:#9ca3af; text-transform:uppercase;">Activity</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      ${overflowNote}
    `)
  }

  return `
    <p style="margin:0; font-size:11px; font-weight:700; letter-spacing:0.05em; color:#9ca3af; text-transform:uppercase;">EVENING SUMMARY &middot; ${dateLabel}</p>
    <h1 style="margin:8px 0 0; font-size:22px; line-height:28px; font-weight:700; color:#1f2937;">${buildHeadline(completedCount, activityTotalCount)}</h1>
    ${statsHtml}
    ${sections.join('')}
  `
}

function buildSubject(completedCount, activityCount) {
  const parts = []
  if (completedCount > 0) {
    parts.push(`${completedCount} completed`)
  }
  if (activityCount > 0) {
    parts.push(`${activityCount} update${activityCount === 1 ? '' : 's'}`)
  }
  return `Your TaskFlow evening summary - ${parts.join(', ')}`
}

async function sendSummaryEmail(toEmail, toName, subject, summaryHtml) {
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_SUMMARY_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: { to_email: toEmail, to_name: toName, subject, summary_html: summaryHtml },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`EmailJS send failed (${response.status}): ${body}`)
  }
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const now = new Date()
  const { start, end } = computeTodayWindowUtc(now)
  const todayUtc = startOfTodayUtc(now)
  const dateLabel = formatDateLabel(now)

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, name')
    .eq('notify_evening_summary', true)

  if (profilesError) {
    console.error('Failed to load profiles:', profilesError)
    return new Response(JSON.stringify({ error: profilesError.message }), { status: 500 })
  }

  let sentCount = 0
  let skippedCount = 0
  let failedCount = 0

  for (const profile of profiles) {
    try {
      const { data: alreadySent, error: alreadySentError } = await supabase
        .from('email_reminders')
        .select('id')
        .eq('user_id', profile.id)
        .eq('type', 'evening-summary')
        .eq('status', 'sent')
        .gte('scheduled_for', todayUtc.toISOString())
        .limit(1)

      if (alreadySentError) {
        throw alreadySentError
      }
      if (alreadySent.length > 0) {
        skippedCount += 1
        continue
      }

      const { data: completedTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('title')
        .eq('assignee_id', profile.id)
        .eq('status', 'Done')
        .gte('updated_at', start.toISOString())
        .lt('updated_at', end.toISOString())

      if (tasksError) {
        throw tasksError
      }

      const { data: memberships, error: membershipsError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', profile.id)

      if (membershipsError) {
        throw membershipsError
      }
      const workspaceIds = memberships.map((membership) => membership.workspace_id)

      let activityEntries = []
      let activityTotalCount = 0
      if (workspaceIds.length > 0) {
        const { count, error: activityCountError } = await supabase
          .from('activity_log')
          .select('id', { count: 'exact', head: true })
          .in('workspace_id', workspaceIds)
          .gte('occurred_at', start.toISOString())
          .lt('occurred_at', end.toISOString())

        if (activityCountError) {
          throw activityCountError
        }
        activityTotalCount = count ?? 0

        const { data: activityRows, error: activityError } = await supabase
          .from('activity_log')
          .select('summary, occurred_at')
          .in('workspace_id', workspaceIds)
          .gte('occurred_at', start.toISOString())
          .lt('occurred_at', end.toISOString())
          .order('occurred_at', { ascending: false })
          .limit(ACTIVITY_DISPLAY_LIMIT)

        if (activityError) {
          throw activityError
        }
        activityEntries = activityRows
      }

      if (completedTasks.length === 0 && activityEntries.length === 0) {
        skippedCount += 1
        continue
      }

      const activityOverflowCount = Math.max(0, activityTotalCount - activityEntries.length)
      const summaryHtml = buildSummaryHtml(completedTasks, activityEntries, activityOverflowCount, activityTotalCount, dateLabel)
      const toName = profile.name || profile.email
      const subject = buildSubject(completedTasks.length, activityTotalCount)

      await sendSummaryEmail(profile.email, toName, subject, summaryHtml)

      await supabase.from('email_reminders').insert({
        user_id: profile.id,
        type: 'evening-summary',
        scheduled_for: now.toISOString(),
        sent_at: new Date().toISOString(),
        status: 'sent',
      })
      sentCount += 1
    } catch (error) {
      console.error(`Failed to send evening summary to ${profile.id}:`, error)
      await supabase.from('email_reminders').insert({
        user_id: profile.id,
        type: 'evening-summary',
        scheduled_for: now.toISOString(),
        status: 'failed',
      })
      failedCount += 1
    }
  }

  return new Response(JSON.stringify({ sent: sentCount, skipped: skippedCount, failed: failedCount }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
