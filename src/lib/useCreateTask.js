import { useEffect, useRef, useState } from 'react'
import { validateTaskForm } from '@/lib/validateTaskForm'
import { validateRecurrenceRule } from '@/lib/validateRecurrenceRule'
import { logActivity } from '@/lib/logActivity'
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

export function useCreateTask({
  workspaceId,
  userId,
  userEmail,
  members,
  open = true,
  initialValues = {},
  onSuccess,
}) {
  const [values, setValues] = useState({ ...INITIAL_VALUES, ...initialValues })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Callers recreate `initialValues` as a new object every render, so it
  // can't be a dependency without resetting the form on every render while
  // open - a ref gives the effect below the latest value without that.
  const initialValuesRef = useRef(initialValues)
  useEffect(() => {
    initialValuesRef.current = initialValues
  })

  useEffect(() => {
    // Reused across multiple opens (Kanban/Calendar pass different
    // per-click initialValues into one modal instance) - resetting only on
    // the open transition, not on every initialValues identity change,
    // avoids re-clearing a form the user is mid-typing in.
    if (open) {
      setValues({ ...INITIAL_VALUES, ...initialValuesRef.current })
      setErrors({})
      setSubmitError(null)
      setIsSubmitting(false)
    }
  }, [open])

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
        workspace_id: workspaceId,
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

    const actorName = members.find((member) => member.id === userId)?.name || userEmail
    logActivity(workspaceId, userId, `${actorName} created "${values.title}"`, 'task', newTask.id)
    window.dispatchEvent(new Event('tasks:changed'))

    setIsSubmitting(false)
    onSuccess?.(newTask.id)
  }

  return { values, errors, submitError, isSubmitting, handleChange, handleSubmit }
}
