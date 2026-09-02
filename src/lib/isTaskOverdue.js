export function isTaskOverdue(task, now = new Date()) {
  if (!task.due_at) {
    return false
  }
  return new Date(task.due_at) < now && task.status !== 'Done'
}
