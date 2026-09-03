export function isTaskSnoozed(task, now = new Date()) {
  if (!task.snoozed_until) {
    return false
  }
  return new Date(task.snoozed_until) > now
}
