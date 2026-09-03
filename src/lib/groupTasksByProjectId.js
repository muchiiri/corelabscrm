export function groupTasksByProjectId(tasks) {
  const tasksByProjectId = new Map()
  for (const task of tasks) {
    if (!task.project_id) continue
    if (!tasksByProjectId.has(task.project_id)) {
      tasksByProjectId.set(task.project_id, [])
    }
    tasksByProjectId.get(task.project_id).push(task)
  }
  return tasksByProjectId
}
