const DAY_MS = 24 * 60 * 60 * 1000

// Local calendar day, not UTC - matches isTaskOverdue/isTaskSnoozed/
// computeDashboardMetrics's day-boundary convention. toISOString() would
// shift a task completed just after local midnight into the previous
// UTC day for any positive UTC offset (this app's declared +3 users
// included), misattributing it in the trend.
function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function computeCompletionTrend(tasks, days, now = new Date()) {
  const counts = new Map()
  for (let i = days - 1; i >= 0; i--) {
    counts.set(toDateKey(new Date(now.getTime() - i * DAY_MS)), 0)
  }

  for (const task of tasks) {
    if (task.status !== 'Done') {
      continue
    }
    const key = toDateKey(new Date(task.updated_at))
    if (counts.has(key)) {
      counts.set(key, counts.get(key) + 1)
    }
  }

  return [...counts.entries()].map(([date, count]) => ({ date, count }))
}

// Inverse of the local-day key above - `new Date('YYYY-MM-DD')` parses as
// UTC midnight and would reintroduce the same off-by-one-day risk when
// formatting a label from it.
export function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}
