import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import StatusBadge from '@/components/tasks/StatusBadge'
import PriorityBadge from '@/components/tasks/PriorityBadge'
import { Avatar } from '@/components/ui/avatar'
import TagBadge from '@/components/tags/TagBadge'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { supabase } from '@/lib/supabase'
import { filterTasks } from '@/lib/filterTasks'
import { getDatePresetRange } from '@/lib/getDatePresetRange'
import { isTaskOverdue } from '@/lib/isTaskOverdue'
import { cn } from '@/lib/utils'

const INITIAL_FILTERS = {
  search: '',
  status: 'All',
  priority: 'All',
  dueFrom: '',
  dueTo: '',
  overdueOnly: false,
}

const DATE_PRESETS = ['Today', 'This Week', 'This Month', 'Future']

function TaskListPage() {
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const canWrite = myRole !== 'Viewer'
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [tagsByTaskId, setTagsByTaskId] = useState({})
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(INITIAL_FILTERS)

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
        setTagsByTaskId({})
        setLoading(false)
        return
      }

      setTasks(data)

      const taskIds = data.map((task) => task.id)
      if (taskIds.length === 0) {
        setTagsByTaskId({})
        setLoading(false)
        return
      }

      // task_tags.tag_id has a real FK to tags.id, so this can use a single
      // PostgREST embed - unlike useWorkspaceMembers' two-query client join,
      // which exists only because workspace_members.user_id lacks a
      // profiles FK.
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
  }, [currentWorkspace.id])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      // Editing the date range manually is an alternative to a preset, not
      // additive with one - clear any active preset so the typed value wins.
      ...(name === 'dueFrom' || name === 'dueTo' ? { overdueOnly: false } : {}),
    }))
  }

  function handleDatePreset(preset) {
    const { dueFrom, dueTo } = getDatePresetRange(preset)
    setFilters((prev) => ({ ...prev, dueFrom, dueTo: dueTo ?? '', overdueOnly: false }))
  }

  function handleOverduePreset() {
    setFilters((prev) => ({ ...prev, dueFrom: '', dueTo: '', overdueOnly: true }))
  }

  if (loading) {
    return <p className="p-8 text-muted">Loading...</p>
  }

  const filteredTasks = filterTasks(tasks, filters)
  const membersById = new Map(members.map((member) => [member.id, member]))

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-heading font-semibold text-text">Tasks</h1>
        {canWrite && (
          <Button asChild>
            <Link to="/tasks/new">New task</Link>
          </Button>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-muted">
          {canWrite ? (
            <>
              No tasks yet.{' '}
              <Link to="/tasks/new" className="text-secondary hover:underline">
                Create your first one
              </Link>
              .
            </>
          ) : (
            'No tasks yet.'
          )}
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="search" className="text-xs text-muted">
                Search
              </label>
              <Input
                id="search"
                name="search"
                type="text"
                placeholder="Search by title"
                value={filters.search}
                onChange={handleFilterChange}
                className="w-48"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="status" className="text-xs text-muted">
                Status
              </label>
              <Select id="status" name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="All">All</option>
                <option value="Todo">Todo</option>
                <option value="In Progress">In Progress</option>
                <option value="Blocked">Blocked</option>
                <option value="Waiting">Waiting</option>
                <option value="Done">Done</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="priority" className="text-xs text-muted">
                Priority
              </label>
              <Select id="priority" name="priority" value={filters.priority} onChange={handleFilterChange}>
                <option value="All">All</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dueFrom" className="text-xs text-muted">
                Due from
              </label>
              <Input
                id="dueFrom"
                name="dueFrom"
                type="date"
                value={filters.dueFrom ? filters.dueFrom.slice(0, 10) : ''}
                onChange={handleFilterChange}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dueTo" className="text-xs text-muted">
                Due to
              </label>
              <Input
                id="dueTo"
                name="dueTo"
                type="date"
                value={filters.dueTo ? filters.dueTo.slice(0, 10) : ''}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                onClick={() => handleDatePreset(preset)}
              >
                {preset}
              </Button>
            ))}
            <Button type="button" variant="outline" onClick={handleOverduePreset}>
              Overdue
            </Button>
          </div>

          {filteredTasks.length === 0 ? (
            <p className="text-muted">No tasks match your filters.</p>
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
                  <th className="py-2 pr-4 font-normal">Tags</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const assignee = task.assignee_id ? membersById.get(task.assignee_id) : null
                  return (
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
        </>
      )}
    </div>
  )
}

export default TaskListPage
