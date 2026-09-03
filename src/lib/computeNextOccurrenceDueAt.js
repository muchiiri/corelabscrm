const STEP_BY_FREQUENCY = {
  Daily: (date, interval) => date.setDate(date.getDate() + interval),
  Weekly: (date, interval) => date.setDate(date.getDate() + interval * 7),
  Monthly: (date, interval) => date.setMonth(date.getMonth() + interval),
}

export function computeNextOccurrenceDueAt(dueAt, recurrenceRule) {
  if (!dueAt || !recurrenceRule) return null

  const step = STEP_BY_FREQUENCY[recurrenceRule.frequency]
  if (!step) return null

  const nextDate = new Date(dueAt)
  step(nextDate, recurrenceRule.interval)

  if (recurrenceRule.endDate) {
    const [year, month, day] = recurrenceRule.endDate.split('-').map(Number)
    const endOfEndDate = new Date(year, month - 1, day, 23, 59, 59, 999)
    if (nextDate > endOfEndDate) return null
  }

  return nextDate.toISOString()
}
