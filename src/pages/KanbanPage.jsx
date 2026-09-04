import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Plus, Search } from 'lucide-react'
import { STATUS_DOT_CLASS } from '@/components/tasks/StatusBadge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import PageHeader from '@/components/layout/PageHeader'
import TaskCreateModal from '@/components/tasks/TaskCreateModal'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useWorkspaceTags } from '@/lib/useWorkspaceTags'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { useAuth } from '@/lib/AuthContext'
import { logActivity } from '@/lib/logActivity'
import { supabase } from '@/lib/supabase'
import { isTaskOverdue } from '@/lib/isTaskOverdue'
import { isTaskSnoozed } from '@/lib/isTaskSnoozed'
import { cn } from '@/lib/utils'

const STATUS_COLUMNS = ['Todo', 'In Progress', 'Blocked', 'Waiting', 'Done']

// Local to this page, not the shared PriorityBadge component - same
// reasoning as TaskListPage's STATUS_PILL_CLASS (feature 32c). Literal
// class strings, not `bg-priority-${priority}/15` interpolation, so
// Tailwind's build-time scanner can see them.
const PRIORITY_PILL_CLASS = {
  High: 'bg-priority-high/15 text-priority-high',
  Medium: 'bg-priority-medium/15 text-priority-medium',
  Low: 'bg-priority-low/15 text-priority-low',
}

function KanbanPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { projects } = useWorkspaceProjects(currentWorkspace.id)
  const { tags, createTag } = useWorkspaceTags(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const canWrite = myRole !== 'Viewer'
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [dropError, setDropError] = useState(null)
  const [createDefaults, setCreateDefaults] = useState(null)

  useEffect(() => {
    let cancelled = false
    // Guards two calls to load() racing within this same effect run (the
    // initial fetch and a 'tasks:changed' event firing before it resolves) -
    // same shape as useActivityFeed.js's requestId guard.
    let requestId = 0

    async function load() {
      const currentRequestId = ++requestId

      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, priority, status, due_at, assignee_id, project_id, snoozed_until')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })

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

  function handleDragStart(event, taskId) {
    event.dataTransfer.setData('text/plain', taskId)
  }

  function handleDragOver(event) {
    event.preventDefault()
  }

  async function handleDrop(event, newStatus) {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/plain')
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) {
      return
    }

    const previousStatus = task.status
    setDropError(null)
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))

    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    if (error) {
      console.error('Failed to update task status:', error)
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: previousStatus } : t)))
      setDropError('Something went wrong updating that task. Please try again.')
    } else {
      const actorName = members.find((member) => member.id === user.id)?.name || user.email
      logActivity(currentWorkspace.id, user.id, `${actorName} moved "${task.title}" to ${newStatus}`, 'task', taskId)
    }
  }

  if (loading) {
    return <p className="p-8 text-muted">Loading...</p>
  }

  const membersById = new Map(members.map((member) => [member.id, member]))
  const projectsById = new Map(projects.map((project) => [project.id, project]))
  const overdueCount = tasks.filter((task) => isTaskOverdue(task)).length

  return (
    <div className="p-8">
      <PageHeader
        title="Tasks Kanban"
        subtitle={`${tasks.length} task${tasks.length === 1 ? '' : 's'}, ${overdueCount} overdue`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label="Search"
              className="bg-surface-hover"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label="Notifications"
              className="bg-surface-hover"
            >
              <Bell className="h-4 w-4" />
            </Button>
            {canWrite && (
              <Button type="button" onClick={() => setCreateDefaults({})}>
                New task
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Drag a card between columns to change status.</p>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((member) => (
              <Avatar
                key={member.id}
                name={member.name}
                email={member.email}
                className="border-2 border-surface"
              />
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" disabled>
            Group: Status
          </Button>
        </div>
      </div>

      {dropError && (
        <p className="mb-4 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{dropError}</p>
      )}

      <div className="flex gap-4 overflow-x-auto">
        {STATUS_COLUMNS.map((status) => {
          const columnTasks = tasks.filter((task) => task.status === status)
          return (
            <div
              key={status}
              className="flex w-64 shrink-0 flex-col gap-3 rounded-lg bg-surface-hover p-3"
            >
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT_CLASS[status])} />
                {status}
                <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-faint">
                  {columnTasks.length}
                </span>
              </div>

              <div
                className="flex flex-col gap-2"
                onDragOver={canWrite ? handleDragOver : undefined}
                onDrop={canWrite ? (event) => handleDrop(event, status) : undefined}
              >
                {columnTasks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-center">
                    <p className="text-xs font-medium text-text">Nothing in {status}</p>
                    <p className="mt-1 text-xs text-muted">Drag a task here to move it to {status}.</p>
                  </div>
                )}
                {columnTasks.map((task) => {
                  const assignee = task.assignee_id ? membersById.get(task.assignee_id) : null
                  const project = task.project_id ? projectsById.get(task.project_id) : null
                  return (
                    <Card
                      key={task.id}
                      onClick={() => navigate(`/tasks/${task.id}/edit`)}
                      draggable={canWrite}
                      onDragStart={canWrite ? (event) => handleDragStart(event, task.id) : undefined}
                      className={cn('p-3 hover:shadow-md', canWrite ? 'cursor-grab' : 'cursor-pointer')}
                    >
                      <p className="text-sm text-text">{task.title}</p>
                      {project && <p className="text-xs text-muted">{project.name}</p>}
                      <div className="mb-2 mt-2">
                        <span
                          className={cn(
                            'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                            PRIORITY_PILL_CLASS[task.priority],
                          )}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        {assignee ? (
                          <span className="flex items-center gap-1.5 text-text">
                            <Avatar name={assignee.name} email={assignee.email} />
                            {assignee.name || assignee.email}
                          </span>
                        ) : (
                          <span className="text-muted">Unassigned</span>
                        )}
                        {task.due_at && (
                          <span className={isTaskOverdue(task) ? 'text-danger' : 'text-muted'}>
                            {new Date(task.due_at).toLocaleDateString()}
                            {isTaskSnoozed(task) && (
                              <span className="ml-1.5 text-faint">
                                (Snoozed until {new Date(task.snoozed_until).toLocaleDateString()})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>

              {canWrite && (
                <button
                  type="button"
                  onClick={() => setCreateDefaults({ status })}
                  className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-muted hover:bg-surface hover:text-text"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add task
                </button>
              )}
            </div>
          )
        })}
      </div>

      <TaskCreateModal
        open={createDefaults !== null}
        onOpenChange={(next) => !next && setCreateDefaults(null)}
        workspaceId={currentWorkspace.id}
        members={members}
        tags={tags}
        onCreateTag={createTag}
        projects={projects}
        initialValues={createDefaults ?? {}}
      />
    </div>
  )
}

export default KanbanPage
