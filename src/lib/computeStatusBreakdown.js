const STATUSES = ['Todo', 'In Progress', 'Blocked', 'Waiting', 'Done']

export function computeStatusBreakdown(tasks) {
  const total = tasks.length
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]))

  for (const task of tasks) {
    if (counts[task.status] !== undefined) {
      counts[task.status] += 1
    }
  }

  return STATUSES.map((status) => ({
    status,
    count: counts[status],
    percent: total === 0 ? 0 : Math.round((counts[status] / total) * 100),
  }))
}
