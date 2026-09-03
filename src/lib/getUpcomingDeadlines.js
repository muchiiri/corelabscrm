const DAY_MS = 24 * 60 * 60 * 1000
const UPCOMING_WINDOW_DAYS = 7
const MAX_RESULTS = 5

export function getUpcomingDeadlines(tasks, now = new Date()) {
  const windowEnd = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * DAY_MS)

  return tasks
    .filter((task) => {
      if (!task.due_at || task.status === 'Done') return false
      const dueAt = new Date(task.due_at)
      return dueAt >= now && dueAt <= windowEnd
    })
    .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
    .slice(0, MAX_RESULTS)
}
