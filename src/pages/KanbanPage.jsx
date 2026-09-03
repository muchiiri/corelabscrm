import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PriorityBadge from '@/components/tasks/PriorityBadge'
import { STATUS_DOT_CLASS } from '@/components/tasks/StatusBadge'
import { Avatar } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { supabase } from '@/lib/supabase'
import { isTaskOverdue } from '@/lib/isTaskOverdue'
import { cn } from '@/lib/utils'

const STATUS_COLUMNS = ['Todo', 'In Progress', 'Blocked', 'Waiting', 'Done']

function KanbanPage() {
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const canWrite = myRole !== 'Viewer'
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [dropError, setDropError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, priority, status, due_at, assignee_id')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })

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
    }
  }

  if (loading) {
    return <p className="p-8 text-muted">Loading...</p>
  }

  const membersById = new Map(members.map((member) => [member.id, member]))

  return (
    <div className="p-8">
      <h1 className="mb-6 text-heading font-semibold text-text">Kanban</h1>

      {dropError && (
        <p className="mb-4 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{dropError}</p>
      )}

      <div className="flex gap-4 overflow-x-auto">
        {STATUS_COLUMNS.map((status) => {
          const columnTasks = tasks.filter((task) => task.status === status)
          return (
            <div key={status} className="flex w-64 shrink-0 flex-col gap-3">
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT_CLASS[status])} />
                {status}
                <span className="text-faint">({columnTasks.length})</span>
              </div>

              <div
                className="flex flex-col gap-2"
                onDragOver={canWrite ? handleDragOver : undefined}
                onDrop={canWrite ? (event) => handleDrop(event, status) : undefined}
              >
                {columnTasks.map((task) => {
                  const assignee = task.assignee_id ? membersById.get(task.assignee_id) : null
                  return (
                    <Card
                      key={task.id}
                      onClick={() => navigate(`/tasks/${task.id}/edit`)}
                      draggable={canWrite}
                      onDragStart={canWrite ? (event) => handleDragStart(event, task.id) : undefined}
                      className={cn('p-3 hover:bg-border', canWrite ? 'cursor-grab' : 'cursor-pointer')}
                    >
                      <p className="mb-2 text-sm text-text">{task.title}</p>
                      <div className="mb-2">
                        <PriorityBadge priority={task.priority} />
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
                          </span>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default KanbanPage
