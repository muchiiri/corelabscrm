import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import StatusBadge from '@/components/tasks/StatusBadge'
import PriorityBadge from '@/components/tasks/PriorityBadge'
import { Avatar } from '@/components/ui/avatar'
import TagBadge from '@/components/tags/TagBadge'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { isTaskOverdue } from '@/lib/isTaskOverdue'

function ProjectOverviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [tagsByTaskId, setTagsByTaskId] = useState({})
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', id)
        .maybeSingle()

      if (cancelled) {
        return
      }
      if (projectError || !projectData) {
        if (projectError) {
          console.error('Failed to load project:', projectError)
        }
        setNotFound(true)
        setLoading(false)
        return
      }
      setProject(projectData)

      const { data: taskRows, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, priority, status, due_at, assignee_id')
        .eq('project_id', id)
        .order('created_at', { ascending: false })

      if (cancelled) {
        return
      }
      if (tasksError) {
        console.error('Failed to load project tasks:', tasksError)
        setTasks([])
        setTagsByTaskId({})
        setLoading(false)
        return
      }
      setTasks(taskRows)

      const taskIds = taskRows.map((task) => task.id)
      if (taskIds.length === 0) {
        setTagsByTaskId({})
        setLoading(false)
        return
      }

      const { data: taskTagRows, error: taskTagsError } = await supabase
        .from('task_tags')
        .select('task_id, tags(id, name, color)')
        .in('task_id', taskIds)

      if (cancelled) {
        return
      }
      if (taskTagsError) {
        console.error('Failed to load task tags:', taskTagsError)
        setTagsByTaskId({})
      } else {
        const grouped = {}
        for (const row of taskTagRows) {
          if (!grouped[row.task_id]) {
            grouped[row.task_id] = []
          }
          grouped[row.task_id].push(row.tags)
        }
        setTagsByTaskId(grouped)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <p className="p-8 text-muted">Loading...</p>
  }

  if (notFound) {
    return (
      <p className="p-8 text-muted">
        Project not found.{' '}
        <Link to="/projects" className="text-secondary hover:underline">
          Back to projects
        </Link>
        .
      </p>
    )
  }

  const membersById = new Map(members.map((member) => [member.id, member]))

  return (
    <div className="p-8">
      <h1 className="mb-6 text-heading font-semibold text-text">{project.name}</h1>

      {tasks.length === 0 ? (
        <p className="text-muted">No tasks in this project yet.</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2 pr-4 font-normal">Name</th>
              <th className="py-2 pr-4 font-normal">Priority</th>
              <th className="py-2 pr-4 font-normal">Status</th>
              <th className="py-2 pr-4 font-normal">Due Date</th>
              <th className="py-2 pr-4 font-normal">Assignee</th>
              <th className="py-2 pr-4 font-normal">Tags</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const assignee = task.assignee_id ? membersById.get(task.assignee_id) : null
              return (
                <tr
                  key={task.id}
                  onClick={() => navigate(`/tasks/${task.id}/edit`)}
                  className="cursor-pointer border-b border-border hover:bg-border"
                >
                  <td className="max-w-xs truncate py-3 pr-4 text-text">{task.title}</td>
                  <td className="py-3 pr-4">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className={cn('py-3 pr-4', isTaskOverdue(task) ? 'text-danger' : 'text-muted')}>
                    {task.due_at ? new Date(task.due_at).toLocaleDateString() : 'No due date'}
                  </td>
                  <td className="py-3 pr-4">
                    {assignee ? (
                      <span className="flex items-center gap-2 text-text">
                        <Avatar name={assignee.name} email={assignee.email} />
                        {assignee.name || assignee.email}
                      </span>
                    ) : (
                      <span className="text-muted">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {(tagsByTaskId[task.id] ?? []).map((tag) => (
                        <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default ProjectOverviewPage
