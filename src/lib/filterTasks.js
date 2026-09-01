export function filterTasks(tasks, filters = {}) {
  const { search, status, priority, dueFrom, dueTo } = filters
  const searchLower = search ? search.trim().toLowerCase() : ''
  const dueFromDate = dueFrom ? new Date(dueFrom) : null
  const dueToDate = dueTo ? new Date(dueTo) : null

  return tasks.filter((task) => {
    if (searchLower && !task.title.toLowerCase().includes(searchLower)) {
      return false
    }

    if (status && status !== 'All' && task.status !== status) {
      return false
    }

    if (priority && priority !== 'All' && task.priority !== priority) {
      return false
    }

    if (dueFromDate || dueToDate) {
      if (!task.due_at) {
        return false
      }
      const dueAt = new Date(task.due_at)
      if (dueFromDate && dueAt < dueFromDate) {
        return false
      }
      if (dueToDate && dueAt > dueToDate) {
        return false
      }
    }

    return true
  })
}
