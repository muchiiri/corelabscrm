import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-heading">New task</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {submitError && (
              <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{submitError}</p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                type="text"
                value={values.title}
                onChange={handleChange}
                aria-invalid={Boolean(errors.title)}
              />
              {errors.title && <p className="text-xs text-danger">{errors.title}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" value={values.description} onChange={handleChange} />
            </div>
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="priority">Priority</Label>
                <Select id="priority" name="priority" value={values.priority} onChange={handleChange}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </Select>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="status">Status</Label>
                <Select id="status" name="status" value={values.status} onChange={handleChange}>
                  <option value="Todo">Todo</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Waiting">Waiting</option>
                  <option value="Done">Done</option>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueAt">Due date</Label>
              <Input
                id="dueAt"
                name="dueAt"
                type="datetime-local"
                value={values.dueAt}
                onChange={handleChange}
              />
            </div>
            <Button type="submit" className="mt-2 self-start" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create task'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default CreateTaskPage
