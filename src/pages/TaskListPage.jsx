import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import StatusBadge from '@/components/tasks/StatusBadge'
import PriorityBadge from '@/components/tasks/PriorityBadge'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { supabase } from '@/lib/supabase'

function TaskListPage() {
  const { currentWorkspace } = useWorkspace()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, priority, status, due_at')
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

  if (loading) {
    return <p className="p-8 text-muted">Loading...</p>
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-heading font-semibold text-text">Tasks</h1>
        <Button asChild>
          <Link to="/tasks/new">New task</Link>
        </Button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-muted">
          No tasks yet.{' '}
          <Link to="/tasks/new" className="text-secondary hover:underline">
            Create your first one
          </Link>
          .
        </p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2 pr-4 font-normal">ID</th>
              <th className="py-2 pr-4 font-normal">Name</th>
              <th className="py-2 pr-4 font-normal">Priority</th>
              <th className="py-2 pr-4 font-normal">List</th>
              <th className="py-2 pr-4 font-normal">Due Date</th>
              <th className="py-2 pr-4 font-normal">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}/edit`)}
                className="cursor-pointer border-b border-border hover:bg-border"
              >
                <td className="py-3 pr-4 text-faint">{task.id.slice(0, 8)}</td>
                <td className="max-w-xs truncate py-3 pr-4 text-text">{task.title}</td>
                <td className="py-3 pr-4">
                  <PriorityBadge priority={task.priority} />
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={task.status} />
                </td>
                <td className="py-3 pr-4 text-muted">
                  {task.due_at ? new Date(task.due_at).toLocaleDateString() : 'No due date'}
                </td>
                <td className="py-3 pr-4 text-muted">Unassigned</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default TaskListPage
