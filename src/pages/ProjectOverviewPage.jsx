import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { STATUS_DOT_CLASS } from '@/components/tasks/StatusBadge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PageHeader from '@/components/layout/PageHeader'
import TaskCreateModal from '@/components/tasks/TaskCreateModal'
import ProjectCreateModal from '@/components/projects/ProjectCreateModal'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useWorkspaceTags } from '@/lib/useWorkspaceTags'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/formatDate'
import { formatDueDate } from '@/lib/formatDueDate'
import { isTaskOverdue } from '@/lib/isTaskOverdue'
import { isTaskSnoozed } from '@/lib/isTaskSnoozed'
import { computeCompletionRate } from '@/lib/computeCompletionRate'
import { rowsToCsv } from '@/lib/rowsToCsv'
import { downloadTextFile } from '@/lib/downloadTextFile'
import { buildReportPdf } from '@/lib/buildReportPdf'

const TASK_REPORT_HEADERS = ['Task', 'Priority', 'Status', 'Due Date', 'Assignee']

// Local to this page - same reasoning as TaskListPage's STATUS_PILL_CLASS
// (feature 32c). Literal class strings, not `bg-status-${status}/15`
// interpolation, so Tailwind's build-time scanner can see them.
const STATUS_PILL_CLASS = {
  Todo: 'bg-status-todo/15 text-status-todo',
  'In Progress': 'bg-status-in-progress/15 text-status-in-progress',
  Blocked: 'bg-status-blocked/15 text-status-blocked',
  Waiting: 'bg-status-waiting/15 text-status-waiting',
  Done: 'bg-status-done/15 text-status-done',
}

function ProjectOverviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { clients } = useWorkspaceClients(currentWorkspace.id)
  const { projects, updateProject } = useWorkspaceProjects(currentWorkspace.id)
  const { tags, createTag } = useWorkspaceTags(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const canWrite = myRole !== 'Viewer'
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Guards two calls to load() racing within this same effect run (the
    // initial fetch and a 'tasks:changed' event firing before it resolves) -
    // same shape as useActivityFeed.js's requestId guard.
    let requestId = 0

    async function load() {
      const currentRequestId = ++requestId

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, client_id, status, description, owner_id, start_date, target_date, label_color, deal_value, deal_currency, created_at')
        .eq('id', id)
        .maybeSingle()

      if (cancelled || requestId !== currentRequestId) {
        return
      }
      if (projectError || !projectData) {
        if (projectError) {
          console.error('Failed to load project:', projectError)
        }
        setNotFound(true)
        setLoading(false)
        return
      }
      setProject(projectData)

      const { data: taskRows, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, priority, status, due_at, assignee_id, snoozed_until')
        .eq('project_id', id)
        .order('created_at', { ascending: false })

      if (cancelled || requestId !== currentRequestId) {
        return
      }
      if (tasksError) {
        console.error('Failed to load project tasks:', tasksError)
        setTasks([])
        setLoading(false)
        return
      }
      setTasks(taskRows)
      setLoading(false)
    }

    load()
    window.addEventListener('tasks:changed', load)
    return () => {
      cancelled = true
      window.removeEventListener('tasks:changed', load)
    }
  }, [id])

  useEffect(() => {
    let cancelled = false

    async function loadTeam() {
      const { data: memberRows, error: memberError } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', id)

      if (cancelled) {
        return
      }
      if (memberError) {
        console.error('Failed to load project team members:', memberError)
        setTeamMembers([])
        return
      }

      const userIds = memberRows.map((row) => row.user_id)
      if (userIds.length === 0) {
        setTeamMembers([])
        return
      }

      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds)

      if (cancelled) {
        return
      }
      if (profileError) {
        console.error('Failed to load project team member profiles:', profileError)
        setTeamMembers([])
        return
      }
      setTeamMembers(profileRows)
    }

    loadTeam()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <p className="p-8 text-muted">Loading...</p>
  }

  if (notFound) {
    return (
      <p className="p-8 text-muted">
        Project not found.{' '}
        <Link to="/projects" className="text-secondary hover:underline">
          Back to projects
        </Link>
        .
      </p>
    )
  }

  const membersById = new Map(members.map((member) => [member.id, member]))
  const client = project.client_id ? clients.find((c) => c.id === project.client_id) : null
  const owner = project.owner_id ? membersById.get(project.owner_id) : null
  const completionRate = computeCompletionRate(tasks)
  const openTaskCount = completionRate.total - completionRate.completed

  const subtitleParts = [client ? client.name : 'No client', project.status]
  if (project.target_date) {
    subtitleParts.push(`due ${formatDate(project.target_date)}`)
  }
  const subtitle = subtitleParts.join(' · ')

  const projectSlug = project.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  function buildTaskReportRows() {
    return tasks.map((task) => {
      const assignee = task.assignee_id ? membersById.get(task.assignee_id) : null
      return [
        task.title,
        task.priority,
        task.status,
        task.due_at ? formatDate(task.due_at) : 'No due date',
        assignee ? assignee.name || assignee.email : 'Unassigned',
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
    const csv = rowsToCsv(TASK_REPORT_HEADERS, buildTaskReportRows())
    downloadTextFile(`${projectSlug}-tasks-${today}.csv`, csv, 'text/csv')
    logReport('csv')
  }

  function handleExportPdf() {
    const today = new Date().toISOString().slice(0, 10)
    const doc = buildReportPdf(`${project.name} - Tasks`, TASK_REPORT_HEADERS, buildTaskReportRows())
    doc.save(`${projectSlug}-tasks-${today}.pdf`)
    logReport('pdf')
  }

  return (
    <div className="p-8">
      <PageHeader
        title={project.name}
        subtitle={subtitle}
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
                New task
              </Button>
            )}
          </div>
        }
      />

      <Link to="/projects" className="mb-4 inline-block text-sm text-secondary hover:underline">
        &lt; All projects
      </Link>

      <Card className="mb-4 max-w-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              {completionRate.completed} of {completionRate.total} tasks
            </p>
            <p className="text-lg font-semibold text-text">{completionRate.rate}%</p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-hover">
            <div className="h-full rounded-full bg-accent" style={{ width: `${completionRate.rate}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted">Open tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-text">{openTaskCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-text">{completionRate.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted">Team</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-text">{teamMembers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted">Target date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-text">
              {project.target_date ? formatDate(project.target_date) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {project.description && <p className="mb-6 text-sm text-muted">{project.description}</p>}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Tasks in this project</h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleExportCsv}>
            Export CSV
          </Button>
          <Button type="button" variant="outline" onClick={handleExportPdf}>
            Export PDF
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="text-muted">No tasks in this project yet.</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <tbody>
            {tasks.map((task) => {
              const assignee = task.assignee_id ? membersById.get(task.assignee_id) : null
              return (
                <tr
                  key={task.id}
                  onClick={() => navigate(`/tasks/${task.id}/edit`)}
                  className="cursor-pointer border-b border-border hover:bg-border"
                >
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2 text-text">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT_CLASS[task.status])} />
                      <span className="max-w-xs truncate">{task.title}</span>
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        STATUS_PILL_CLASS[task.status],
                      )}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {assignee ? (
                      <span className="flex items-center gap-2 text-text">
                        <Avatar name={assignee.name} email={assignee.email} />
                        {assignee.name || assignee.email}
                      </span>
                    ) : (
                      <span className="text-muted">Unassigned</span>
                    )}
                  </td>
                  <td className={cn('py-3 pr-4', isTaskOverdue(task) ? 'text-danger' : 'text-muted')}>
                    {task.due_at ? formatDueDate(task) : 'No due date'}
                    {isTaskSnoozed(task) && (
                      <span className="ml-2 text-xs text-faint">
                        Snoozed until {formatDate(task.snoozed_until)}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Team</h2>
        {teamMembers.length === 0 ? (
          <p className="text-sm text-muted">No team members yet.</p>
        ) : (
          <div className="flex -space-x-2">
            {teamMembers.slice(0, 3).map((member) => (
              <Avatar
                key={member.id}
                name={member.name}
                email={member.email}
                className="h-6 w-6 border-2 border-surface"
              />
            ))}
            {teamMembers.length > 3 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-surface-hover text-[10px] font-medium text-muted">
                +{teamMembers.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-muted">
          Owner: {owner ? owner.name || owner.email : 'Unassigned'} · Created{' '}
          {formatDate(project.created_at)}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled>
            Duplicate
          </Button>
          {canWrite && (
            <Button type="button" size="sm" onClick={() => setIsEditOpen(true)}>
              Edit project
            </Button>
          )}
        </div>
      </div>

      <TaskCreateModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        workspaceId={currentWorkspace.id}
        members={members}
        tags={tags}
        onCreateTag={createTag}
        projects={projects}
        initialValues={{ projectId: project.id }}
      />

      <ProjectCreateModal
        mode="edit"
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        updateProject={async (projectId, values) => {
          const updated = await updateProject(projectId, values)
          setProject((prev) => ({ ...prev, ...updated }))
        }}
        projectId={project.id}
        clients={clients}
        members={members}
        initialValues={{
          name: project.name,
          clientId: project.client_id || '',
          ownerId: project.owner_id || '',
          startDate: project.start_date || '',
          targetDate: project.target_date || '',
          description: project.description || '',
          labelColor: project.label_color || 'gray',
          dealValue: project.deal_value != null ? String(project.deal_value) : '',
          dealCurrency: project.deal_currency || 'USD',
        }}
      />
    </div>
  )
}

export default ProjectOverviewPage
