import { isTaskOverdue } from './isTaskOverdue.js'
import { isTaskDueToday } from './isTaskDueToday.js'

const DAY_MS = 24 * 60 * 60 * 1000

export function computeDashboardMetrics(tasks, now = new Date()) {
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS)

  let tasksToday = 0
  let completedThisWeek = 0
  let overdue = 0
  let inProgress = 0

  for (const task of tasks) {
    if (isTaskDueToday(task, now)) {
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
