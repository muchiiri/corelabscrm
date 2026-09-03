import { isTaskOverdue } from './isTaskOverdue.js'
import { isTaskSnoozed } from './isTaskSnoozed.js'

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

function endOfDay(date) {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return end
}

export function computeDashboardMetrics(tasks, now = new Date()) {
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS)

  let tasksToday = 0
  let completedThisWeek = 0
  let overdue = 0
  let inProgress = 0

  for (const task of tasks) {
    const dueAt = task.due_at ? new Date(task.due_at) : null

    if (dueAt && dueAt >= todayStart && dueAt <= todayEnd && !isTaskSnoozed(task, now)) {
      tasksToday += 1
    }

    if (isTaskOverdue(task, now)) {
      overdue += 1
    }

    if (task.status === 'Done') {
      const updatedAt = new Date(task.updated_at)
      if (updatedAt >= sevenDaysAgo && updatedAt <= now) {
        completedThisWeek += 1
      }
    }

    if (task.status === 'In Progress') {
      inProgress += 1
    }
  }

  return { tasksToday, completedThisWeek, overdue, inProgress }
}
