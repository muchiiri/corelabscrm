import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { validateProjectName } from '@/lib/validateProjectName'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'

function ProjectsPage() {
  const { currentWorkspace } = useWorkspace()
  const { projects, createProject } = useWorkspaceProjects(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const canWrite = myRole !== 'Viewer'

  const [name, setName] = useState('')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isCreating, setIsCreating] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateProjectName({ name })
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitError(null)
    setIsCreating(true)

    try {
      await createProject(name)
      setName('')
    } catch (createError) {
      console.error('Failed to create project:', createError)
      setSubmitError('Something went wrong creating your project. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-heading font-semibold text-text">Projects</h1>

      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle className="text-heading">All projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-muted">No projects yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link to={`/projects/${project.id}`} className="text-secondary hover:underline">
                    {project.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {canWrite && (
            <form className="mt-4 flex flex-col gap-3 border-t border-border pt-4" onSubmit={handleSubmit} noValidate>
              {submitError && (
                <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{submitError}</p>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="projectName">New project</Label>
                <Input
                  id="projectName"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
              </div>
              <Button type="submit" variant="outline" className="self-start" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Add project'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ProjectsPage
