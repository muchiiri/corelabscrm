import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TaskForm from '@/components/tasks/TaskForm'
import { validateTaskForm } from '@/lib/validateTaskForm'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { supabase } from '@/lib/supabase'

const INITIAL_VALUES = {
  title: '',
  description: '',
  priority: 'Medium',
  status: 'Todo',
  dueAt: '',
}

function CreateTaskPage() {
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspace()
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

    const { error: insertError } = await supabase.from('tasks').insert({
      workspace_id: currentWorkspace.id,
      title: values.title,
      description: values.description || null,
      priority: values.priority,
      status: values.status,
      due_at: values.dueAt ? new Date(values.dueAt).toISOString() : null,
    })

    if (insertError) {
      console.error('Failed to create task:', insertError)
      setSubmitError('Something went wrong creating your task. Please try again.')
      setIsSubmitting(false)
      return
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
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

export default CreateTaskPage
