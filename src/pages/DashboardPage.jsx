import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PRIORITY_DOT_CLASS } from '@/components/tasks/PriorityBadge'
import { useAuth } from '@/lib/AuthContext'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { supabase } from '@/lib/supabase'
import { computeDashboardMetrics } from '@/lib/computeDashboardMetrics'
import { computeCompletionRate } from '@/lib/computeCompletionRate'
import { computeTeamProductivity } from '@/lib/computeTeamProductivity'
import { getUpcomingDeadlines } from '@/lib/getUpcomingDeadlines'
import { computeProjectStats } from '@/lib/computeProjectStats'
import { cn } from '@/lib/utils'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const CARD_DEFS = [
  { key: 'tasksToday', label: 'Tasks today' },
  { key: 'completedThisWeek', label: 'Completed this week' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'inProgress', label: 'In progress' },
]

function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { projects } = useWorkspaceProjects(currentWorkspace.id)
  const { clients } = useWorkspaceClients(currentWorkspace.id)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, priority, status, due_at, updated_at, assignee_id, project_id, snoozed_until')
        .eq('workspace_id', currentWorkspace.id)

      if (cancelled) {
        return
      }
      if (error) {
        console.error('Failed to load tasks:', error)
        setTasks([])
      } else {
        setTasks(data)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [currentWorkspace.id])

  if (loading) {
    return <p className="p-8 text-muted">Loading...</p>
  }

  const name = user?.user_metadata?.name || user?.email
  const metrics = computeDashboardMetrics(tasks)
  const completionRate = computeCompletionRate(tasks)
  const productivity = computeTeamProductivity(tasks, members)
  const highestCompletedCount = Math.max(0, ...productivity.map((p) => p.completedCount))
  const upcomingDeadlines = getUpcomingDeadlines(tasks)
  const projectStats = computeProjectStats(projects, tasks)

  const OVERVIEW_CARD_DEFS = [
    { key: 'total', label: 'Total projects', value: projectStats.total },
    { key: 'ongoing', label: 'Ongoing projects', value: projectStats.ongoing },
    { key: 'completed', label: 'Completed projects', value: projectStats.completed },
    { key: 'clients', label: 'Total clients', value: clients.length },
    { key: 'team', label: 'Team', value: members.length },
  ]

  return (
    <div className="p-8">
      <h1 className="mb-6 text-heading font-semibold text-text">
        {getGreeting()}, {name}
      </h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {CARD_DEFS.map(({ key, label }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-text">{metrics[key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted">Completion rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-2xl font-semibold text-text">{completionRate.rate}%</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${completionRate.rate}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {completionRate.completed} of {completionRate.total} tasks done
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted">Team productivity</CardTitle>
          </CardHeader>
          <CardContent>
            {productivity.length === 0 ? (
              <p className="text-sm text-muted">No workspace members yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {productivity.map((member) => {
                  const width =
                    highestCompletedCount === 0
                      ? 0
                      : Math.round((member.completedCount / highestCompletedCount) * 100)
                  return (
                    <div key={member.memberId}>
                      <div className="mb-1 flex items-center justify-between text-xs text-text">
                        <span>{member.name}</span>
                        <span className="text-muted">{member.completedCount}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
                        <div className="h-full rounded-full bg-secondary" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-normal text-muted">Upcoming deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-muted">Nothing due in the next 7 days.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingDeadlines.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => navigate(`/tasks/${task.id}/edit`)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-text hover:bg-surface-hover"
                >
                  <span
                    className={cn('h-2 w-2 shrink-0 rounded-full', PRIORITY_DOT_CLASS[task.priority])}
                  />
                  <span className="flex-1 truncate">{task.title}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(task.due_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        {OVERVIEW_CARD_DEFS.map(({ key, label, value }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-text">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default DashboardPage
