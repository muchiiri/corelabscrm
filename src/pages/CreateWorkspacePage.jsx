import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { validateWorkspaceName } from '@/lib/validateWorkspaceName'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { supabase } from '@/lib/supabase'

const INITIAL_VALUES = { name: '' }

function CreateWorkspacePage() {
  const navigate = useNavigate()
  const { refetch } = useWorkspace()
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
    const validationErrors = validateWorkspaceName(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitError(null)
    setIsSubmitting(true)

    const { error: rpcError } = await supabase.rpc('create_workspace', {
      workspace_name: values.name,
    })

    if (rpcError) {
      console.error('Failed to create workspace:', rpcError)
      setSubmitError('Something went wrong creating your workspace. Please try again.')
      setIsSubmitting(false)
      return
    }

    await refetch()
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-text">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-heading">Create your workspace</CardTitle>
          <CardDescription>This is where your team's tasks and clients will live.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {submitError && (
              <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{submitError}</p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Workspace name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Acme Co"
                value={values.name}
                onChange={handleChange}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
            </div>
            <Button type="submit" className="mt-2" disabled={isSubmitting}>
              {isSubmitting ? 'Creating workspace...' : 'Create workspace'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default CreateWorkspacePage
