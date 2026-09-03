import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import TaskForm from '@/components/tasks/TaskForm'
import { Button } from '@/components/ui/button'
import { validateTaskForm } from '@/lib/validateTaskForm'
import { validateRecurrenceRule } from '@/lib/validateRecurrenceRule'
import { computeNextOccurrenceDueAt } from '@/lib/computeNextOccurrenceDueAt'
import { toEndOfDayISOString } from '@/lib/toEndOfDayISOString'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useWorkspaceTags } from '@/lib/useWorkspaceTags'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
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

function TaskEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { tags, createTag } = useWorkspaceTags(currentWorkspace.id)
  const { projects } = useWorkspaceProjects(currentWorkspace.id)
  const { clients } = useWorkspaceClients(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const readOnly = myRole === 'Viewer'
  const [values, setValues] = useState(null)
  const [initialStatus, setInitialStatus] = useState(null)
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
          'id, title, description, priority, status, due_at, assignee_id, project_id, client_id, recurrence_rule, snoozed_until',
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
      <TaskForm
        title="Edit task"
        values={values}
        errors={errors}
        submitError={submitError}
        isSubmitting={isSubmitting}
        submitLabel={isSubmitting ? 'Saving...' : 'Save changes'}
        members={members}
        tags={tags}
        projects={projects}
        clients={clients}
        onCreateTag={createTag}
        onChange={handleChange}
        onSubmit={handleSubmit}
        readOnly={readOnly}
      />

      {!readOnly && (
        <div className="mt-4 max-w-lg">
          {deleteError && (
            <p className="mb-2 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{deleteError}</p>
          )}
          {isConfirmingDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-text">Delete this task? This can't be undone.</span>
              <Button type="button" variant="outline" onClick={() => setIsConfirmingDelete(false)}>
                Cancel
              </Button>
              <Button type="button" variant="outline" className="text-danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="text-danger" onClick={() => setIsConfirmingDelete(true)}>
              Delete task
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default TaskEditPage
