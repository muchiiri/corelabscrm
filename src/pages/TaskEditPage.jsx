import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import TaskForm from '@/components/tasks/TaskForm'
import { Button } from '@/components/ui/button'
import { validateTaskForm } from '@/lib/validateTaskForm'
import { supabase } from '@/lib/supabase'

function toDatetimeLocalValue(isoString) {
  if (!isoString) {
    return ''
  }
  const date = new Date(isoString)
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localTime.toISOString().slice(0, 16)
}

function TaskEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [values, setValues] = useState(null)
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
        .select('id, title, description, priority, status, due_at')
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
      } else {
        setValues({
          title: data.title,
          description: data.description ?? '',
          priority: data.priority,
          status: data.status,
          dueAt: toDatetimeLocalValue(data.due_at),
        })
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  function handleChange(event) {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateTaskForm(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitError(null)
    setIsSubmitting(true)

    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        title: values.title,
        description: values.description || null,
        priority: values.priority,
        status: values.status,
        due_at: values.dueAt ? new Date(values.dueAt).toISOString() : null,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update task:', updateError)
      setSubmitError('Something went wrong saving your task. Please try again.')
      setIsSubmitting(false)
      return
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
        onChange={handleChange}
        onSubmit={handleSubmit}
      />

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
    </div>
  )
}

export default TaskEditPage
