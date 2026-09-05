import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validateWorkspaceName } from '@/lib/validateWorkspaceName'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { supabase } from '@/lib/supabase'

function WorkspaceTab() {
  const { currentWorkspace, refetch } = useWorkspace()
  const [name, setName] = useState(currentWorkspace?.name ?? '')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    setName(event.target.value)
    setSaveSuccess(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateWorkspaceName({ name })
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitError(null)
    setSaveSuccess(false)
    setIsSubmitting(true)

    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ name })
      .eq('id', currentWorkspace.id)

    if (updateError) {
      console.error('Failed to update workspace:', updateError)
      setSubmitError('Something went wrong saving your changes. Please try again.')
      setIsSubmitting(false)
      return
    }

    await refetch()
    setSaveSuccess(true)
    setIsSubmitting(false)
  }

  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle className="text-heading">Workspace settings</CardTitle>
        <CardDescription>
          Created{' '}
          {currentWorkspace &&
            new Date(currentWorkspace.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {submitError && (
            <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{submitError}</p>
          )}
          {saveSuccess && (
            <p className="rounded-sm bg-border px-3 py-2 text-sm text-text">Saved.</p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Workspace name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={handleChange}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
          </div>
          <Button type="submit" className="mt-2 self-start" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default WorkspaceTab
