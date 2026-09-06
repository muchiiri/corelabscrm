import { isTaskSnoozed } from './isTaskSnoozed.js'

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

export function isTaskDueTomorrow(task, now = new Date()) {
  if (!task.due_at || isTaskSnoozed(task, now)) {
    return false
  }
  const dueAt = new Date(task.due_at)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return dueAt >= startOfDay(tomorrow) && dueAt <= endOfDay(tomorrow)
}
