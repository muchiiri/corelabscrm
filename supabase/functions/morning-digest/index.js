// Supabase Edge Function (Deno runtime, plain JS - see current-feature.md's
// Notes for why this stays .js rather than the usual .ts template).
//
// Deploy with the Supabase CLI (`supabase functions deploy morning-digest`)
// or paste this file into the Dashboard's Edge Functions editor - this
// project has no CLI/config set up yet, see the feature's Prerequisites.
//
// Required secrets (set via `supabase secrets set` or the Dashboard, never
// as VITE_* client vars): EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY,
// EMAILJS_PRIVATE_KEY, EMAILJS_DIGEST_TEMPLATE_ID. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are injected automatically by Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const EMAILJS_SERVICE_ID = Deno.env.get('EMAILJS_SERVICE_ID')
const EMAILJS_PUBLIC_KEY = Deno.env.get('EMAILJS_PUBLIC_KEY')
const EMAILJS_PRIVATE_KEY = Deno.env.get('EMAILJS_PRIVATE_KEY')
const EMAILJS_DIGEST_TEMPLATE_ID = Deno.env.get('EMAILJS_DIGEST_TEMPLATE_ID')

const HOUR_MS = 60 * 60 * 1000
const PLUS_3_OFFSET_MS = 3 * HOUR_MS
const PRIORITY_ORDER = ['High', 'Medium', 'Low']
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

// A task qualifies when due_at falls before the end of the current +3-UTC
// calendar day - i.e. due today or already overdue. Shift "now" forward by
// 3 hours to land on the +3 calendar date, take the start of the next day
// on that shifted clock, then shift back by 3 hours to get the real UTC
// instant the digest should cut off at. Locked in current-feature.md as
// load-bearing for features 28-29 too.
function computeCutoffUtc(now) {
  const plus3Now = new Date(now.getTime() + PLUS_3_OFFSET_MS)
  const startOfTomorrowPlus3 = Date.UTC(plus3Now.getUTCFullYear(), plus3Now.getUTCMonth(), plus3Now.getUTCDate() + 1)
  return new Date(startOfTomorrowPlus3 - PLUS_3_OFFSET_MS)
}

// Separate from computeCutoffUtc: this only keys the idempotency check to
// "today" in plain UTC terms, which is safe because the cron always fires
// at a fixed 05:00 UTC, never near a UTC day boundary.
function startOfTodayUtc(now) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

// Feature 59: the +3-UTC start-of-day counterpart to computeCutoffUtc's
// end-of-day bound, used only to split the already-fetched task list into
// overdue vs due-today counts for the digest's stat boxes - doesn't change
// what counts as "qualifying" for the query itself.
function startOfTodayPlus3Utc(now) {
  const plus3Now = new Date(now.getTime() + PLUS_3_OFFSET_MS)
  const startOfTodayPlus3 = Date.UTC(plus3Now.getUTCFullYear(), plus3Now.getUTCMonth(), plus3Now.getUTCDate())
  return new Date(startOfTodayPlus3 - PLUS_3_OFFSET_MS)
}

function formatDateLabel(now) {
  const plus3Now = new Date(now.getTime() + PLUS_3_OFFSET_MS)
  return plus3Now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).toUpperCase()
}

function groupTasksByPriority(tasks) {
  const groups = { High: [], Medium: [], Low: [] }
  for (const task of tasks) {
    groups[task.priority].push(task)
  }
  for (const priority of PRIORITY_ORDER) {
    groups[priority].sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
  }
  return groups
}

function formatDueDate(dueAt) {
  return new Date(dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])
}

function buildDigestHtml(groups, overdueCount, dueTodayCount, dateLabel) {
  const totalCount = overdueCount + dueTodayCount

  const statsHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 24px;">
      <tr>
        <td width="50%" style="padding-right:8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; border-radius:8px;">
            <tr><td style="padding:16px;">
              <div style="font-size:22px; font-weight:700; color:#e03131; line-height:26px;">${overdueCount}</div>
              <div style="font-size:12px; color:#6b7280;">Overdue</div>
            </td></tr>
          </table>
        </td>
        <td width="50%" style="padding-left:8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; border-radius:8px;">
            <tr><td style="padding:16px;">
              <div style="font-size:22px; font-weight:700; color:#1f2937; line-height:26px;">${dueTodayCount}</div>
              <div style="font-size:12px; color:#6b7280;">Due today</div>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  `

  const sections = PRIORITY_ORDER.filter((priority) => groups[priority].length > 0)
    .map((priority) => {
      const rows = groups[priority]
        .map((task) => {
          const project = task.project_name ? escapeHtml(task.project_name) : 'No project'
          return `
            <tr>
              <td style="padding:10px 0; border-bottom:1px solid #e5e7eb;">
                <div style="font-size:14px; font-weight:600; color:#1f2937;">${escapeHtml(task.title)}</div>
                <div style="font-size:12px; color:#6b7280;">${project}</div>
              </td>
              <td style="padding:10px 0; border-bottom:1px solid #e5e7eb; text-align:right; white-space:nowrap; font-size:12px; color:#6b7280; vertical-align:top;">
                ${formatDueDate(task.due_at)}
              </td>
            </tr>
          `
        })
        .join('')
      return `
        <p style="margin:20px 0 4px; font-size:11px; font-weight:700; letter-spacing:0.05em; color:#9ca3af; text-transform:uppercase;">${priority} priority</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      `
    })
    .join('')

  return `
    <p style="margin:0; font-size:11px; font-weight:700; letter-spacing:0.05em; color:#9ca3af; text-transform:uppercase;">MORNING DIGEST &middot; ${dateLabel}</p>
    <h1 style="margin:8px 0 0; font-size:22px; line-height:28px; font-weight:700; color:#1f2937;">${totalCount} task${totalCount === 1 ? '' : 's'} need your attention today</h1>
    ${statsHtml}
    ${sections}
  `
}

async function sendDigestEmail(toEmail, toName, subject, digestHtml) {
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_DIGEST_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: { to_email: toEmail, to_name: toName, subject, digest_html: digestHtml },
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
  const cutoffUtc = computeCutoffUtc(now)
  const todayUtc = startOfTodayUtc(now)
  const todayStartPlus3Utc = startOfTodayPlus3Utc(now)
  const dateLabel = formatDateLabel(now)

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, name')
    .eq('notify_due_soon', true)

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
        .eq('type', 'morning-digest')
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

      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('title, priority, due_at, projects(name)')
        .eq('assignee_id', profile.id)
        .neq('status', 'Done')
        .lt('due_at', cutoffUtc.toISOString())

      if (tasksError) {
        throw tasksError
      }
      if (!tasks || tasks.length === 0) {
        skippedCount += 1
        continue
      }

      const normalizedTasks = tasks.map((task) => ({
        ...task,
        project_name: task.projects ? task.projects.name : null,
      }))
      const groups = groupTasksByPriority(normalizedTasks)
      const overdueCount = normalizedTasks.filter((task) => new Date(task.due_at) < todayStartPlus3Utc).length
      const dueTodayCount = normalizedTasks.length - overdueCount
      const digestHtml = buildDigestHtml(groups, overdueCount, dueTodayCount, dateLabel)
      const toName = profile.name || profile.email
      const subject = `Your TaskFlow digest - ${tasks.length} task${tasks.length === 1 ? '' : 's'} due`

      await sendDigestEmail(profile.email, toName, subject, digestHtml)

      await supabase.from('email_reminders').insert({
        user_id: profile.id,
        type: 'morning-digest',
        scheduled_for: now.toISOString(),
        sent_at: new Date().toISOString(),
        status: 'sent',
      })
      sentCount += 1
    } catch (error) {
      console.error(`Failed to send morning digest to ${profile.id}:`, error)
      await supabase.from('email_reminders').insert({
        user_id: profile.id,
        type: 'morning-digest',
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
