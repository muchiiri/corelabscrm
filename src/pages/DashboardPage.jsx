import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PageHeader from '@/components/layout/PageHeader'
import CompletionTrendChart from '@/components/dashboard/CompletionTrendChart'
import TaskCreateModal from '@/components/tasks/TaskCreateModal'
import { PRIORITY_DOT_CLASS } from '@/components/tasks/PriorityBadge'
import { useAuth } from '@/lib/AuthContext'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { useWorkspaceTags } from '@/lib/useWorkspaceTags'
import { supabase } from '@/lib/supabase'
import { formatDueDate } from '@/lib/formatDueDate'
import { computeDashboardMetrics } from '@/lib/computeDashboardMetrics'
import { isTaskDueToday } from '@/lib/isTaskDueToday'
import { computeCompletionRate } from '@/lib/computeCompletionRate'
import { computeTeamProductivity } from '@/lib/computeTeamProductivity'
import { getUpcomingDeadlines } from '@/lib/getUpcomingDeadlines'
import { computeProjectStats } from '@/lib/computeProjectStats'
import { computeStatusBreakdown } from '@/lib/computeStatusBreakdown'
import { STATUS_DOT_CLASS } from '@/components/tasks/StatusBadge'
import { cn } from '@/lib/utils'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { members, loading: membersLoading } = useWorkspaceMembers(currentWorkspace.id)
  const { projects } = useWorkspaceProjects(currentWorkspace.id)
  const { clients } = useWorkspaceClients(currentWorkspace.id)
  const { tags, createTag } = useWorkspaceTags(currentWorkspace.id)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Guards two calls to load() racing within this same effect run (the
    // initial fetch and a 'tasks:changed' event firing before it resolves) -
    // same shape as useActivityFeed.js's requestId guard. Matters here more
    // than it looks: these stats are the first thing to go stale without it,
    // since a task created from this page's own modal used to require a
    // full navigation (and remount) to show up.
    let requestId = 0

    async function load() {
      const currentRequestId = ++requestId

      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, priority, status, due_at, updated_at, assignee_id, project_id, snoozed_until')
        .eq('workspace_id', currentWorkspace.id)

      if (cancelled || requestId !== currentRequestId) {
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
    window.addEventListener('tasks:changed', load)
    return () => {
      cancelled = true
      window.removeEventListener('tasks:changed', load)
    }
  }, [currentWorkspace.id])

  if (loading || membersLoading) {
    return <p className="p-8 text-muted">Loading...</p>
  }

  const fullName = members.find((member) => member.id === user?.id)?.name
  const name = fullName?.trim().split(/\s+/)[0] || user?.email
  const metrics = computeDashboardMetrics(tasks)
  const completionRate = computeCompletionRate(tasks)
  const productivity = computeTeamProductivity(tasks, members)
  const highestCompletedCount = Math.max(0, ...productivity.map((p) => p.completedCount))
  const upcomingDeadlines = getUpcomingDeadlines(tasks)
  const projectStats = computeProjectStats(projects, tasks)
  const statusBreakdown = computeStatusBreakdown(tasks)
  const tasksDueToday = tasks.filter((task) => isTaskDueToday(task))
  const todayStatusBreakdown = computeStatusBreakdown(tasksDueToday)

  const OVERVIEW_CARD_DEFS = [
    { key: 'total', label: 'Total projects', value: projectStats.total },
    { key: 'ongoing', label: 'Ongoing projects', value: projectStats.ongoing },
    { key: 'completed', label: 'Completed projects', value: projectStats.completed },
    { key: 'clients', label: 'Total clients', value: clients.length },
    { key: 'team', label: 'Team', value: members.length },
  ]

  const SECONDARY_CARD_DEFS = [
    {
      key: 'completedThisWeek',
      label: 'Completed this week',
      borderClass: 'border-l-4 border-l-success',
      numberClass: 'text-success',
    },
    {
      key: 'overdue',
      label: 'Overdue',
      borderClass: 'border-l-4 border-l-danger',
      numberClass: 'text-danger',
    },
    {
      key: 'inProgress',
      label: 'In progress',
      caption: `across ${projectStats.ongoing} ongoing project${projectStats.ongoing === 1 ? '' : 's'}`,
      borderClass: 'border-l-4 border-l-status-in-progress',
      numberClass: 'text-status-in-progress',
    },
  ]

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const taskWord = metrics.tasksToday === 1 ? 'task' : 'tasks'

  return (
    <div className="p-8">
      <PageHeader
        title={
          <>
            {getGreeting()}, <span className="font-bold">{name}</span>
          </>
        }
        subtitle={`${todayLabel} · ${metrics.tasksToday} ${taskWord} on your plate`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label="Search"
              className="bg-surface"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label="Notifications"
              className="bg-surface"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="bg-[#1F2937] text-white hover:bg-[#111827] hover:opacity-100"
            >
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted">Tasks today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-text">{metrics.tasksToday}</p>
            {tasksDueToday.length > 0 && (
              <>
                <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-surface-hover">
                  {todayStatusBreakdown
                    .filter((entry) => entry.percent > 0)
                    .map((entry) => (
                      <div
                        key={entry.status}
                        className={STATUS_DOT_CLASS[entry.status]}
                        style={{ width: `${entry.percent}%` }}
                        title={`${entry.status} · ${entry.percent}%`}
                      />
                    ))}
                </div>
                <p className="mt-2 text-xs text-muted">
                  {todayStatusBreakdown
                    .filter((entry) => entry.count > 0)
                    .map((entry) => `${entry.count} ${entry.status.toLowerCase()}`)
                    .join(' · ')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {SECONDARY_CARD_DEFS.map(({ key, label, caption, borderClass, numberClass }) => (
          <Card key={key} className={borderClass}>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn('text-2xl font-semibold', numberClass)}>{metrics[key]}</p>
              {caption && <p className="mt-1 text-xs text-muted">{caption}</p>}
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

      <div className="mt-6">
        <CompletionTrendChart tasks={tasks} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted">Workload by status</CardTitle>
            <p className="mt-1 text-xs text-faint">
              {tasks.length} task{tasks.length === 1 ? '' : 's'} total
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-hover">
              {statusBreakdown
                .filter((entry) => entry.percent > 0)
                .map((entry) => (
                  <div
                    key={entry.status}
                    className={STATUS_DOT_CLASS[entry.status]}
                    style={{ width: `${entry.percent}%` }}
                    title={`${entry.status} · ${entry.percent}%`}
                  />
                ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {statusBreakdown.map((entry) => (
                <div key={entry.status} className="flex items-center gap-2 text-xs text-muted">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT_CLASS[entry.status])} />
                  {entry.status} {entry.percent}%
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
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
                      {formatDueDate(task)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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

      <TaskCreateModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        workspaceId={currentWorkspace.id}
        members={members}
        tags={tags}
        onCreateTag={createTag}
        projects={projects}
        initialValues={{}}
      />
    </div>
  )
}

export default DashboardPage
