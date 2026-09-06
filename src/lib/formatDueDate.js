import { formatDate } from './formatDate.js'
import { isTaskOverdue } from './isTaskOverdue.js'
import { isTaskDueToday } from './isTaskDueToday.js'
import { isTaskDueTomorrow } from './isTaskDueTomorrow.js'

export function formatDueDate(task, now = new Date()) {
  if (isTaskOverdue(task, now)) {
    return 'Overdue'
  }
  if (isTaskDueToday(task, now)) {
    return 'Today'
  }
  if (isTaskDueTomorrow(task, now)) {
    return 'Tomorrow'
  }
  return formatDate(task.due_at)
}
