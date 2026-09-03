export function computeTeamProductivity(tasks, members) {
  const completedCountByMemberId = new Map()
  for (const task of tasks) {
    if (task.status === 'Done' && task.assignee_id) {
      completedCountByMemberId.set(
        task.assignee_id,
        (completedCountByMemberId.get(task.assignee_id) || 0) + 1,
      )
    }
  }

  return members
    .map((member) => ({
      memberId: member.id,
      name: member.name || member.email,
      completedCount: completedCountByMemberId.get(member.id) || 0,
    }))
    .sort((a, b) => b.completedCount - a.completedCount || a.name.localeCompare(b.name))
}
