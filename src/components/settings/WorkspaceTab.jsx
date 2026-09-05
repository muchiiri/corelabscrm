import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validateWorkspaceName } from '@/lib/validateWorkspaceName'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// Reuses the same six tag colors Avatar/TagPicker already use - no new
// palette. Decorative only, no schema backs an accent-color preference.
const ACCENT_SWATCH_CLASS = {
  gray: 'bg-tag-gray-text',
  red: 'bg-tag-red-text',
  orange: 'bg-tag-orange-text',
  green: 'bg-tag-green-text',
  blue: 'bg-tag-blue-text',
  purple: 'bg-tag-purple-text',
}

function WorkspaceTab() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentWorkspace, refetch } = useWorkspace()
  const { projects } = useWorkspaceProjects(currentWorkspace?.id)
  const { clients } = useWorkspaceClients(currentWorkspace?.id)
  const [taskCount, setTaskCount] = useState(null)
  const [name, setName] = useState(currentWorkspace?.name ?? '')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [deleteError, setDeleteError] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isOwner = currentWorkspace?.owner_id === user.id

  useEffect(() => {
    let cancelled = false

    async function loadTaskCount() {
      if (!currentWorkspace?.id) {
        return
      }
      const { count, error } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace.id)

      if (cancelled) {
        return
      }
      if (error) {
        console.error('Failed to load task count:', error)
        return
      }
      setTaskCount(count)
    }

    loadTaskCount()
    return () => {
      cancelled = true
    }
  }, [currentWorkspace?.id])

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

  function handleCancelDelete() {
    setIsConfirmingDelete(false)
    setConfirmName('')
    setDeleteError(null)
  }

  async function handleDelete() {
    setDeleteError(null)
    setIsDeleting(true)

    const { error: deleteFailure } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', currentWorkspace.id)

    if (deleteFailure) {
      console.error('Failed to delete workspace:', deleteFailure)
      setDeleteError('Something went wrong deleting your workspace. Please try again.')
      setIsDeleting(false)
      return
    }

    await refetch()
    navigate('/workspace')
  }

  return (
    <>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="workspaceUrl">Workspace URL</Label>
                <Input id="workspaceUrl" type="text" value="" placeholder="Not set" disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="weekStart">Week starts on</Label>
                <Input id="weekStart" type="text" value="" placeholder="Not set" disabled />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 sm:w-1/2">
              <Label htmlFor="defaultView">Default task view</Label>
              <Input id="defaultView" type="text" value="" placeholder="Not set" disabled />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Accent color</Label>
              <div className="flex gap-1.5">
                {Object.entries(ACCENT_SWATCH_CLASS).map(([color, className]) => (
                  <span
                    key={color}
                    aria-label={`${color} accent color`}
                    className={cn('h-5 w-5 rounded-full opacity-50', className)}
                  />
                ))}
              </div>
            </div>

            <Button type="submit" className="mt-2 self-start" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-sm border-danger">
        <CardHeader>
          <CardTitle className="text-heading text-danger">Delete this workspace</CardTitle>
          <CardDescription>
            Removes {projects.length} project{projects.length === 1 ? '' : 's'},{' '}
            {taskCount === null ? '...' : taskCount} task{taskCount === 1 ? '' : 's'}, and {clients.length}{' '}
            client record{clients.length === 1 ? '' : 's'}. Not reversible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deleteError && (
            <p className="mb-3 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{deleteError}</p>
          )}
          {!isOwner ? (
            <>
              <Button type="button" variant="outline" className="text-danger" disabled>
                Delete workspace
              </Button>
              <p className="mt-2 text-xs text-muted">Only the workspace owner can delete this workspace.</p>
            </>
          ) : isConfirmingDelete ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmWorkspaceName">
                Type <span className="font-semibold text-text">{currentWorkspace.name}</span> to confirm
              </Label>
              <Input
                id="confirmWorkspaceName"
                type="text"
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCancelDelete} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="text-danger"
                  onClick={handleDelete}
                  disabled={confirmName !== currentWorkspace.name || isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Permanently delete'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="text-danger"
              onClick={() => setIsConfirmingDelete(true)}
            >
              Delete workspace
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default WorkspaceTab
