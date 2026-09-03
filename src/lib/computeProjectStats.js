export function computeProjectStats(projects, tasks) {
  const tasksByProjectId = new Map()
  for (const task of tasks) {
    if (!task.project_id) continue
    if (!tasksByProjectId.has(task.project_id)) {
      tasksByProjectId.set(task.project_id, [])
    }
    tasksByProjectId.get(task.project_id).push(task)
  }

  let ongoing = 0
  let completed = 0
  for (const project of projects) {
    const projectTasks = tasksByProjectId.get(project.id) || []
    if (projectTasks.length === 0) continue
    if (projectTasks.every((task) => task.status === 'Done')) {
      completed += 1
    } else {
      ongoing += 1
    }
  }

  return { total: projects.length, ongoing, completed }
}
