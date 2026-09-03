import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TaskForm from '@/components/tasks/TaskForm'
import { validateTaskForm } from '@/lib/validateTaskForm'
import { validateRecurrenceRule } from '@/lib/validateRecurrenceRule'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useWorkspaceTags } from '@/lib/useWorkspaceTags'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { supabase } from '@/lib/supabase'

const INITIAL_VALUES = {
  title: '',
  description: '',
  priority: 'Medium',
  status: 'Todo',
  dueAt: '',
  assigneeId: '',
  tagIds: [],
  projectId: '',
  clientId: '',
  recurrenceFrequency: '',
  recurrenceInterval: '1',
  recurrenceEndDate: '',
}

function CreateTaskPage() {
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { tags, createTag } = useWorkspaceTags(currentWorkspace.id)
  const { projects } = useWorkspaceProjects(currentWorkspace.id)
  const { clients } = useWorkspaceClients(currentWorkspace.id)
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

    const { data: newTask, error: insertError } = await supabase
      .from('tasks')
      .insert({
        workspace_id: currentWorkspace.id,
        title: values.title,
        description: values.description || null,
        priority: values.priority,
        status: values.status,
        due_at: values.dueAt ? new Date(values.dueAt).toISOString() : null,
        assignee_id: values.assigneeId || null,
        project_id: values.projectId || null,
        client_id: values.clientId || null,
        recurrence_rule: recurrenceRule,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to create task:', insertError)
      setSubmitError('Something went wrong creating your task. Please try again.')
      setIsSubmitting(false)
      return
    }

    // Best-effort, not atomic with the task insert above - a partial failure
    // here just means reopening the task and re-adding tags, not worth an
    // RPC's complexity for this feature.
    if (values.tagIds.length > 0) {
      const { error: tagInsertError } = await supabase
        .from('task_tags')
        .insert(values.tagIds.map((tagId) => ({ task_id: newTask.id, tag_id: tagId })))
      if (tagInsertError) {
        console.error('Failed to save tags:', tagInsertError)
      }
    }

    navigate('/tasks')
  }

  return (
    <div className="p-8">
      <TaskForm
        title="New task"
        values={values}
        errors={errors}
        submitError={submitError}
        isSubmitting={isSubmitting}
        submitLabel={isSubmitting ? 'Creating...' : 'Create task'}
        members={members}
        tags={tags}
        projects={projects}
        clients={clients}
        onCreateTag={createTag}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

export default CreateTaskPage
