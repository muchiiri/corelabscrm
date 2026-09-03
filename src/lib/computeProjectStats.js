import { groupTasksByProjectId } from '@/lib/groupTasksByProjectId'

export function computeProjectStats(projects, tasks) {
  const tasksByProjectId = groupTasksByProjectId(tasks)

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
