import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import StatusBadge from '@/components/tasks/StatusBadge'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { supabase } from '@/lib/supabase'

function TaskListPage() {
  const { currentWorkspace } = useWorkspace()
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
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                to={`/tasks/${task.id}/edit`}
                className="flex items-center gap-4 rounded-sm border border-border px-4 py-3 hover:bg-border"
              >
                <span className="flex-1 text-text">{task.title}</span>
                <span className="text-sm text-muted">{task.priority}</span>
                <StatusBadge status={task.status} />
                <span className="text-sm text-muted">
                  {task.due_at ? new Date(task.due_at).toLocaleDateString() : 'No due date'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default TaskListPage
