const DAY_MS = 24 * 60 * 60 * 1000

function startOfUTCDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function endOfUTCDay(date) {
  return new Date(startOfUTCDay(date).getTime() + DAY_MS - 1)
}

export function getDatePresetRange(preset, now = new Date()) {
  const todayStart = startOfUTCDay(now)
  const todayEnd = endOfUTCDay(now)
  const weekEnd = new Date(todayEnd.getTime() + 7 * DAY_MS)
  const monthEnd = new Date(todayEnd.getTime() + 30 * DAY_MS)

  switch (preset) {
    case 'Today':
      return { dueFrom: todayStart.toISOString(), dueTo: todayEnd.toISOString() }
    case 'This Week':
      return { dueFrom: new Date(todayEnd.getTime() + 1).toISOString(), dueTo: weekEnd.toISOString() }
    case 'This Month':
      return { dueFrom: new Date(weekEnd.getTime() + 1).toISOString(), dueTo: monthEnd.toISOString() }
    case 'Future':
      return { dueFrom: new Date(monthEnd.getTime() + 1).toISOString(), dueTo: null }
    default:
      return { dueFrom: null, dueTo: null }
  }
}
