import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { validateProjectName } from '@/lib/validateProjectName'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { supabase } from '@/lib/supabase'
import { groupTasksByProjectId } from '@/lib/groupTasksByProjectId'
import { computeCompletionRate } from '@/lib/computeCompletionRate'
import { rowsToCsv } from '@/lib/rowsToCsv'
import { downloadTextFile } from '@/lib/downloadTextFile'
import { buildReportPdf } from '@/lib/buildReportPdf'
import { cn } from '@/lib/utils'

const INITIAL_VALUES = { name: '', clientId: '', description: '' }
const REPORT_HEADERS = ['Project', 'Client', 'Completion %', 'Completed', 'Total']

// Local to this page - same reasoning as TaskListPage's STATUS_PILL_CLASS
// (feature 32c). Literal class strings, not `border-t-${status}`
// interpolation, so Tailwind's build-time scanner can see them.
const PROJECT_STATUS_BORDER_CLASS = {
  Active: 'border-t-success',
  Completed: 'border-t-secondary',
  Archived: 'border-t-faint',
}

const PROJECT_STATUS_TEXT_CLASS = {
  Active: 'text-success',
  Completed: 'text-secondary',
  Archived: 'text-faint',
}

function ProjectsPage() {
  const { currentWorkspace } = useWorkspace()
  const { projects, createProject } = useWorkspaceProjects(currentWorkspace.id)
  const { clients } = useWorkspaceClients(currentWorkspace.id)
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const canWrite = myRole !== 'Viewer'

  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    let cancelled = false

    async function loadTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, project_id, status, due_at, assignee_id')
        .eq('workspace_id', currentWorkspace.id)

      if (cancelled) {
        return
      }
      if (error) {
        console.error('Failed to load tasks for project completion rates:', error)
        setTasks([])
        return
      }
      setTasks(data)
    }

    loadTasks()
    return () => {
      cancelled = true
    }
  }, [currentWorkspace.id])

  const tasksByProjectId = groupTasksByProjectId(tasks)
  const clientsById = new Map(clients.map((client) => [client.id, client]))
  const membersById = new Map(members.map((member) => [member.id, member]))

  // Computed once and shared by the Grid view, the List view, and
  // buildReportRows below - previously each recomputed this independently.
  const projectsWithDerived = projects.map((project) => {
    const projectTasks = tasksByProjectId.get(project.id) || []
    const completionRate = computeCompletionRate(projectTasks)
    const client = project.client_id ? clientsById.get(project.client_id) : null
    const contributors = [...new Set(projectTasks.map((task) => task.assignee_id).filter(Boolean))]
      .map((id) => membersById.get(id))
      .filter(Boolean)
    const nextDue = projectTasks
      .filter((task) => task.due_at && task.status !== 'Done')
      .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))[0]
    return { ...project, completionRate, client, contributors, nextDue }
  })

  function buildReportRows() {
    return projectsWithDerived.map((project) => [
      project.name,
      project.client ? project.client.name : 'No client',
      project.completionRate.rate,
      project.completionRate.completed,
      project.completionRate.total,
    ])
  }

  async function logReport(format) {
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('reports').insert({
      workspace_id: currentWorkspace.id,
      type: 'project-status',
      format,
      period_start: today,
      period_end: today,
    })
    if (error) {
      console.error('Failed to log report export:', error)
    }
  }

  function handleExportCsv() {
    const today = new Date().toISOString().slice(0, 10)
    const csv = rowsToCsv(REPORT_HEADERS, buildReportRows())
    downloadTextFile(`project-status-report-${today}.csv`, csv, 'text/csv')
    logReport('csv')
  }

  function handleExportPdf() {
    const today = new Date().toISOString().slice(0, 10)
    const doc = buildReportPdf('Project status report', REPORT_HEADERS, buildReportRows())
    doc.save(`project-status-report-${today}.pdf`)
    logReport('pdf')
  }

  function handleChange(event) {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateProjectName({ name: values.name })
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitError(null)
    setIsCreating(true)

    try {
      await createProject(values.name, values.clientId, values.description)
      setValues(INITIAL_VALUES)
    } catch (createError) {
      console.error('Failed to create project:', createError)
      setSubmitError('Something went wrong creating your project. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-heading font-semibold text-text">Projects</h1>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={viewMode === 'grid' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            type="button"
            variant={viewMode === 'list' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleExportCsv}>
            Export CSV
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleExportPdf}>
            Export PDF
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="text-muted">No projects yet.</p>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {projectsWithDerived.map((project) => {
            const { completionRate, client, contributors, nextDue } = project

            return (
              <Card
                key={project.id}
                className={cn('border-t-4', PROJECT_STATUS_BORDER_CLASS[project.status])}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/projects/${project.id}`} className="font-medium text-text hover:underline">
                      {project.name}
                    </Link>
                    <span
                      className={cn(
                        'shrink-0 text-xs font-medium',
                        PROJECT_STATUS_TEXT_CLASS[project.status],
                      )}
                    >
                      {project.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{client ? client.name : 'No client'}</p>
                  <p className="mt-2 truncate text-sm text-muted">
                    {project.description || 'No description'}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-hover">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${completionRate.rate}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs text-muted">
                      {completionRate.rate}% · {completionRate.completed} of {completionRate.total} tasks done
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <div className="flex -space-x-2">
                      {contributors.slice(0, 3).map((member) => (
                        <Avatar
                          key={member.id}
                          name={member.name}
                          email={member.email}
                          className="h-6 w-6 border-2 border-surface"
                        />
                      ))}
                      {contributors.length > 3 && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-surface-hover text-[10px] font-medium text-muted">
                          +{contributors.length - 3}
                        </span>
                      )}
                    </div>
                    {nextDue && <span>{new Date(nextDue.due_at).toLocaleDateString()}</span>}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="px-4 py-2 font-normal">Name</th>
                  <th className="px-4 py-2 font-normal">Client</th>
                  <th className="px-4 py-2 font-normal">Status</th>
                  <th className="px-4 py-2 font-normal">Progress</th>
                  <th className="px-4 py-2 font-normal">Contributors</th>
                  <th className="px-4 py-2 font-normal">Due date</th>
                </tr>
              </thead>
              <tbody>
                {projectsWithDerived.map((project) => {
                  const { completionRate, client, contributors, nextDue } = project

                  return (
                    <tr key={project.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2.5">
                        <Link
                          to={`/projects/${project.id}`}
                          className="font-medium text-text hover:underline"
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-muted">{client ? client.name : 'No client'}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            'text-xs font-medium',
                            PROJECT_STATUS_TEXT_CLASS[project.status],
                          )}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-hover">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${completionRate.rate}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted">{completionRate.rate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex -space-x-2">
                          {contributors.slice(0, 3).map((member) => (
                            <Avatar
                              key={member.id}
                              name={member.name}
                              email={member.email}
                              className="h-6 w-6 border-2 border-surface"
                            />
                          ))}
                          {contributors.length > 3 && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-surface-hover text-[10px] font-medium text-muted">
                              +{contributors.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted">
                        {nextDue ? new Date(nextDue.due_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {canWrite && (
        <Card className="mt-6 max-w-sm">
          <CardHeader>
            <CardTitle className="text-heading">New project</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
              {submitError && (
                <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{submitError}</p>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="projectName">Name</Label>
                <Input
                  id="projectName"
                  name="name"
                  type="text"
                  value={values.name}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="projectClientId">Client</Label>
                <Select id="projectClientId" name="clientId" value={values.clientId} onChange={handleChange}>
                  <option value="">No client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="projectDescription">Description</Label>
                <Textarea
                  id="projectDescription"
                  name="description"
                  value={values.description}
                  onChange={handleChange}
                />
              </div>
              <Button type="submit" variant="outline" className="self-start" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Add project'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ProjectsPage
