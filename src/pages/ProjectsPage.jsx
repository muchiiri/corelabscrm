import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { validateProjectName } from '@/lib/validateProjectName'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { supabase } from '@/lib/supabase'
import { groupTasksByProjectId } from '@/lib/groupTasksByProjectId'
import { computeCompletionRate } from '@/lib/computeCompletionRate'
import { rowsToCsv } from '@/lib/rowsToCsv'
import { downloadTextFile } from '@/lib/downloadTextFile'
import { buildReportPdf } from '@/lib/buildReportPdf'

const INITIAL_VALUES = { name: '', clientId: '' }
const REPORT_HEADERS = ['Project', 'Client', 'Completion %', 'Completed', 'Total']

function ProjectsPage() {
  const { currentWorkspace } = useWorkspace()
  const { projects, createProject } = useWorkspaceProjects(currentWorkspace.id)
  const { clients } = useWorkspaceClients(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const canWrite = myRole !== 'Viewer'

  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    let cancelled = false

    async function loadTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, project_id, status')
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

  function buildReportRows() {
    return projects.map((project) => {
      const completionRate = computeCompletionRate(tasksByProjectId.get(project.id) || [])
      const client = project.client_id ? clientsById.get(project.client_id) : null
      return [
        project.name,
        client ? client.name : 'No client',
        completionRate.rate,
        completionRate.completed,
        completionRate.total,
      ]
    })
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
      await createProject(values.name, values.clientId)
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
      <h1 className="mb-6 text-heading font-semibold text-text">Projects</h1>

      <Card className="max-w-sm">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-heading">All projects</CardTitle>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleExportCsv}>
              Export CSV
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleExportPdf}>
              Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-muted">No projects yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {projects.map((project) => {
                const completionRate = computeCompletionRate(tasksByProjectId.get(project.id) || [])
                return (
                  <li key={project.id} className="flex flex-col gap-1.5">
                    <Link to={`/projects/${project.id}`} className="text-secondary hover:underline">
                      {project.name}
                    </Link>
                    <div className="flex items-center gap-2">
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
                  </li>
                )
              })}
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
