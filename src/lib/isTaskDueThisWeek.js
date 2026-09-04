import { isTaskSnoozed } from './isTaskSnoozed.js'
import { getDatePresetRange } from './getDatePresetRange.js'

export function isTaskDueThisWeek(task, now = new Date()) {
  if (!task.due_at || isTaskSnoozed(task, now)) {
    return false
  }
  const { dueFrom, dueTo } = getDatePresetRange('This Week', now)
  const dueAt = new Date(task.due_at)
  return dueAt >= new Date(dueFrom) && dueAt <= new Date(dueTo)
}
