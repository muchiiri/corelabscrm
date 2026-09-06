import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import PageHeader from '@/components/layout/PageHeader'
import ProjectCreateModal from '@/components/projects/ProjectCreateModal'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { supabase } from '@/lib/supabase'
import { formatDueDate } from '@/lib/formatDueDate'
import { groupTasksByProjectId } from '@/lib/groupTasksByProjectId'
import { computeCompletionRate } from '@/lib/computeCompletionRate'
import { rowsToCsv } from '@/lib/rowsToCsv'
import { downloadTextFile } from '@/lib/downloadTextFile'
import { buildReportPdf } from '@/lib/buildReportPdf'
import { cn } from '@/lib/utils'

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

const STATUS_TABS = ['All', 'Active', 'Completed', 'Archived']

function ProjectsPage() {
  const { currentWorkspace } = useWorkspace()
  const { projects, createProject } = useWorkspaceProjects(currentWorkspace.id)
  const { clients } = useWorkspaceClients(currentWorkspace.id)
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const canWrite = myRole !== 'Viewer'

  const [viewMode, setViewMode] = useState('grid')
  const [statusFilter, setStatusFilter] = useState('All')
  const [tasks, setTasks] = useState([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)

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

  function countByStatus(status) {
    return status === 'All' ? projects.length : projects.filter((project) => project.status === status).length
  }

  const filteredProjects =
    statusFilter === 'All'
      ? projectsWithDerived
      : projectsWithDerived.filter((project) => project.status === statusFilter)

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

  return (
    <div className="p-8">
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} project${projects.length === 1 ? '' : 's'}, ${countByStatus('Active')} active`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label="Search"
              className="bg-surface"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label="Notifications"
              className="bg-surface"
            >
              <Bell className="h-4 w-4" />
            </Button>
            {canWrite && (
              <Button type="button" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New project
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-end gap-2">
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

      <div className="mb-4 flex gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant={statusFilter === tab ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(tab)}
          >
            {tab} ({countByStatus(tab)})
          </Button>
        ))}
      </div>

      {projects.length === 0 ? (
        <p className="text-muted">No projects yet.</p>
      ) : filteredProjects.length === 0 ? (
        <p className="text-muted">No {statusFilter} projects.</p>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {filteredProjects.map((project) => {
            const { completionRate, client, contributors, nextDue } = project

            return (
              <Card
                key={project.id}
                className={cn('border-t-4', PROJECT_STATUS_BORDER_CLASS[project.status])}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/projects/${project.id}`} className="font-bold text-text hover:underline">
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
                    {nextDue && <span>{formatDueDate(nextDue)}</span>}
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
                {filteredProjects.map((project) => {
                  const { completionRate, client, contributors, nextDue } = project

                  return (
                    <tr key={project.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2.5">
                        <Link
                          to={`/projects/${project.id}`}
                          className="font-bold text-text hover:underline"
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
                        {nextDue ? formatDueDate(nextDue) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <ProjectCreateModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        createProject={createProject}
        clients={clients}
        members={members}
      />
    </div>
  )
}

export default ProjectsPage
