export function computeCompletionRate(tasks) {
  const total = tasks.length
  const completed = tasks.filter((task) => task.status === 'Done').length
  const rate = total === 0 ? 0 : Math.round((completed / total) * 100)
  return { completed, total, rate }
}
