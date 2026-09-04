import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { PRIORITY_DOT_CLASS } from '@/components/tasks/PriorityBadge'
import TagPicker from '@/components/tags/TagPicker'
import { validateTaskForm } from '@/lib/validateTaskForm'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { cn } from '@/lib/utils'
import { validateRecurrenceRule } from '@/lib/validateRecurrenceRule'
import { computeNextOccurrenceDueAt } from '@/lib/computeNextOccurrenceDueAt'
import { toEndOfDayISOString } from '@/lib/toEndOfDayISOString'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useWorkspaceTags } from '@/lib/useWorkspaceTags'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { useAuth } from '@/lib/AuthContext'
import { logActivity } from '@/lib/logActivity'
import { supabase } from '@/lib/supabase'

function toDatetimeLocalValue(isoString) {
  if (!isoString) {
    return ''
  }
  const date = new Date(isoString)
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localTime.toISOString().slice(0, 16)
}

function toDateValue(isoString) {
  if (!isoString) {
    return ''
  }
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const CAPTION_CLASS = 'text-xs font-semibold uppercase tracking-wide text-muted'
const PRIORITIES = ['High', 'Medium', 'Low']

function TaskEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { tags, createTag } = useWorkspaceTags(currentWorkspace.id)
  const { projects } = useWorkspaceProjects(currentWorkspace.id)
  const { clients } = useWorkspaceClients(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const readOnly = myRole === 'Viewer'
  const [values, setValues] = useState(null)
  const [initialStatus, setInitialStatus] = useState(null)
  const [taskFacts, setTaskFacts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('tasks')
        .select(
          'id, title, description, priority, status, due_at, assignee_id, project_id, client_id, recurrence_rule, snoozed_until, created_at, updated_at',
        )
        .eq('id', id)
        .maybeSingle()

      if (cancelled) {
        return
      }
      if (error || !data) {
        if (error) {
          console.error('Failed to load task:', error)
        }
        setNotFound(true)
        setLoading(false)
        return
      }

      const { data: taskTagRows, error: taskTagsError } = await supabase
        .from('task_tags')
        .select('tag_id')
        .eq('task_id', id)

      if (cancelled) {
        return
      }
      if (taskTagsError) {
        console.error('Failed to load task tags:', taskTagsError)
      }

      setValues({
        title: data.title,
        description: data.description ?? '',
        priority: data.priority,
        status: data.status,
        dueAt: toDatetimeLocalValue(data.due_at),
        assigneeId: data.assignee_id ?? '',
        projectId: data.project_id ?? '',
        clientId: data.client_id ?? '',
        tagIds: (taskTagRows ?? []).map((row) => row.tag_id),
        recurrenceFrequency: data.recurrence_rule?.frequency ?? '',
        recurrenceInterval: String(data.recurrence_rule?.interval ?? 1),
        recurrenceEndDate: data.recurrence_rule?.endDate ?? '',
        snoozedUntil: toDateValue(data.snoozed_until),
      })
      setInitialStatus(data.status)
      setTaskFacts({ id: data.id, createdAt: data.created_at, updatedAt: data.updated_at })
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  function handleChange(event) {
    const { name, value } = event.target
    setValues((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'dueAt' && !value ? { recurrenceFrequency: '' } : {}),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = {
      ...validateTaskForm(values),
      ...validateRecurrenceRule({
        frequency: values.recurrenceFrequency,
        interval: values.recurrenceInterval,
        dueAt: values.dueAt,
      }),
    }
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitError(null)
    setIsSubmitting(true)

    const recurrenceRule = values.recurrenceFrequency
      ? {
          frequency: values.recurrenceFrequency,
          interval: Number(values.recurrenceInterval),
          endDate: values.recurrenceEndDate || null,
        }
      : null

    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        title: values.title,
        description: values.description || null,
        priority: values.priority,
        status: values.status,
        due_at: values.dueAt ? new Date(values.dueAt).toISOString() : null,
        assignee_id: values.assigneeId || null,
        project_id: values.projectId || null,
        client_id: values.clientId || null,
        recurrence_rule: recurrenceRule,
        snoozed_until: toEndOfDayISOString(values.snoozedUntil),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update task:', updateError)
      setSubmitError('Something went wrong saving your task. Please try again.')
      setIsSubmitting(false)
      return
    }

    if (initialStatus !== values.status) {
      const actorName = members.find((member) => member.id === user.id)?.name || user.email
      logActivity(
        currentWorkspace.id,
        user.id,
        `${actorName} moved "${values.title}" to ${values.status}`,
        'task',
        id,
      )
    }

    // Delete-and-reinsert rather than diffing - simpler and just as correct
    // given how few tags a task typically carries.
    const { error: clearTagsError } = await supabase.from('task_tags').delete().eq('task_id', id)
    if (clearTagsError) {
      console.error('Failed to update tags:', clearTagsError)
    } else if (values.tagIds.length > 0) {
      const { error: tagInsertError } = await supabase
        .from('task_tags')
        .insert(values.tagIds.map((tagId) => ({ task_id: id, tag_id: tagId })))
      if (tagInsertError) {
        console.error('Failed to update tags:', tagInsertError)
      }
    }

    // Best-effort: the task's own save above already succeeded, so a failure
    // creating its next occurrence shouldn't block navigation or surface as
    // the task-save error.
    if (initialStatus !== 'Done' && values.status === 'Done' && recurrenceRule) {
      const nextDueAt = computeNextOccurrenceDueAt(
        values.dueAt ? new Date(values.dueAt).toISOString() : null,
        recurrenceRule,
      )
      if (nextDueAt) {
        const { error: nextOccurrenceError } = await supabase.from('tasks').insert({
          workspace_id: currentWorkspace.id,
          title: values.title,
          description: values.description || null,
          priority: values.priority,
          status: 'Todo',
          due_at: nextDueAt,
          assignee_id: values.assigneeId || null,
          project_id: values.projectId || null,
          client_id: values.clientId || null,
          recurrence_rule: recurrenceRule,
        })
        if (nextOccurrenceError) {
          console.error('Failed to create next occurrence:', nextOccurrenceError)
        }
      }
    }

    navigate('/tasks')
  }

  async function handleDelete() {
    setDeleteError(null)
    setIsDeleting(true)

    const { error: deleteFailure } = await supabase.from('tasks').delete().eq('id', id)

    if (deleteFailure) {
      console.error('Failed to delete task:', deleteFailure)
      setDeleteError('Something went wrong deleting your task. Please try again.')
      setIsDeleting(false)
      return
    }

    navigate('/tasks')
  }

  if (loading) {
    return <p className="p-8 text-muted">Loading...</p>
  }

  if (notFound) {
    return (
      <p className="p-8 text-muted">
        Task not found.{' '}
        <Link to="/tasks" className="text-secondary hover:underline">
          Back to tasks
        </Link>
        .
      </p>
    )
  }

  return (
    <div className="p-8">
      <Link to="/tasks" className="mb-4 inline-block text-sm text-secondary hover:underline">
        &lt; All tasks
      </Link>

      <form id="task-edit-form" onSubmit={handleSubmit} noValidate>
        {submitError && (
          <p className="mb-4 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{submitError}</p>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-4 md:col-span-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                type="text"
                className="text-lg font-semibold"
                value={values.title}
                onChange={handleChange}
                aria-invalid={Boolean(errors.title)}
                disabled={readOnly}
              />
              {errors.title && <p className="text-xs text-danger">{errors.title}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={values.description}
                onChange={handleChange}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status" className={CAPTION_CLASS}>
                Status
              </Label>
              <Select id="status" name="status" value={values.status} onChange={handleChange} disabled={readOnly}>
                <option value="Todo">Todo</option>
                <option value="In Progress">In Progress</option>
                <option value="Blocked">Blocked</option>
                <option value="Waiting">Waiting</option>
                <option value="Done">Done</option>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className={CAPTION_CLASS}>Priority</Label>
              <div className="flex gap-2">
                {PRIORITIES.map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleChange({ target: { name: 'priority', value: priority } })}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-sm border px-2 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50',
                      values.priority === priority
                        ? 'border-accent-border bg-accent-bg text-text'
                        : 'border-border bg-transparent text-muted hover:bg-surface-hover',
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT_CLASS[priority])} />
                    {priority}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assigneeId" className={CAPTION_CLASS}>
                Assignee
              </Label>
              <Select id="assigneeId" name="assigneeId" value={values.assigneeId} onChange={handleChange} disabled={readOnly}>
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || member.email}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="projectId" className={CAPTION_CLASS}>
                Project
              </Label>
              <Select id="projectId" name="projectId" value={values.projectId} onChange={handleChange} disabled={readOnly}>
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="clientId" className={CAPTION_CLASS}>
                Client
              </Label>
              <Select id="clientId" name="clientId" value={values.clientId} onChange={handleChange} disabled={readOnly}>
                <option value="">No client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueAt" className={CAPTION_CLASS}>
                Due date
              </Label>
              <Input
                id="dueAt"
                name="dueAt"
                type="datetime-local"
                value={values.dueAt}
                onChange={handleChange}
                disabled={readOnly}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recurrenceFrequency" className={CAPTION_CLASS}>
                Repeat
              </Label>
              <Select
                id="recurrenceFrequency"
                name="recurrenceFrequency"
                value={values.recurrenceFrequency}
                onChange={handleChange}
                disabled={readOnly || !values.dueAt}
              >
                <option value="">Does not repeat</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </Select>
              {!values.dueAt && (
                <p className="text-xs text-muted">Set a due date to repeat this task.</p>
              )}
              {values.recurrenceFrequency && (
                <div className="mt-1 flex gap-4">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="recurrenceInterval" className={CAPTION_CLASS}>
                      Every
                    </Label>
                    <Input
                      id="recurrenceInterval"
                      name="recurrenceInterval"
                      type="number"
                      min="1"
                      step="1"
                      value={values.recurrenceInterval}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.recurrenceInterval)}
                      disabled={readOnly}
                    />
                    {errors.recurrenceInterval && (
                      <p className="text-xs text-danger">{errors.recurrenceInterval}</p>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="recurrenceEndDate" className={CAPTION_CLASS}>
                      Ends on
                    </Label>
                    <Input
                      id="recurrenceEndDate"
                      name="recurrenceEndDate"
                      type="date"
                      value={values.recurrenceEndDate}
                      onChange={handleChange}
                      disabled={readOnly}
                    />
                  </div>
                </div>
              )}
            </div>

            {values.snoozedUntil !== undefined && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="snoozedUntil" className={CAPTION_CLASS}>
                  Snoozed until
                </Label>
                <Input
                  id="snoozedUntil"
                  name="snoozedUntil"
                  type="date"
                  value={values.snoozedUntil}
                  onChange={handleChange}
                  disabled={readOnly}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className={CAPTION_CLASS}>Tags</Label>
              <TagPicker
                tags={tags}
                selectedTagIds={values.tagIds}
                onChange={(tagIds) => handleChange({ target: { name: 'tagIds', value: tagIds } })}
                onCreateTag={createTag}
                readOnly={readOnly}
              />
            </div>

            <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className={CAPTION_CLASS}>Created</dt>
                <dd className="text-text">{new Date(taskFacts.createdAt).toLocaleDateString()}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className={CAPTION_CLASS}>Task ID</dt>
                <dd className="text-text">{taskFacts.id.slice(0, 8).toUpperCase()}</dd>
              </div>
            </dl>
          </div>
        </div>

      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted">Last edited {formatRelativeTime(taskFacts.updatedAt)}</p>

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            {deleteError && (
              <p className="w-full rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{deleteError}</p>
            )}
            <Button type="button" variant="outline" size="sm" disabled>
              Duplicate
            </Button>
            <Button type="button" size="sm" disabled>
              Edit task
            </Button>
            {isConfirmingDelete ? (
              <>
                <span className="text-sm text-text">Delete this task? This can't be undone.</span>
                <Button type="button" variant="outline" onClick={() => setIsConfirmingDelete(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="text-danger"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="text-danger"
                onClick={() => setIsConfirmingDelete(true)}
              >
                Delete task
              </Button>
            )}
            <Button type="submit" form="task-edit-form" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default TaskEditPage
