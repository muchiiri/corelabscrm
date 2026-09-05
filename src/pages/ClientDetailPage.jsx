import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PageHeader from '@/components/layout/PageHeader'
import ProjectCreateModal from '@/components/projects/ProjectCreateModal'
import ClientCreateModal from '@/components/clients/ClientCreateModal'
import { validateInteractionNote } from '@/lib/validateInteractionNote'
import { formatCurrency } from '@/lib/formatCurrency'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { useClientInteractionLogs } from '@/lib/useClientInteractionLogs'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { groupTasksByProjectId } from '@/lib/groupTasksByProjectId'
import { computeCompletionRate } from '@/lib/computeCompletionRate'

// Local to this page - same reasoning as ProjectsPage's
// PROJECT_STATUS_BORDER_CLASS/PROJECT_STATUS_TEXT_CLASS (feature 34d),
// reusing the same semantic colors as a dot + a tinted pill instead.
// Literal class strings, not `bg-${status}` interpolation, so Tailwind's
// build-time scanner can see them.
const PROJECT_STATUS_DOT_CLASS = {
  Active: 'bg-success',
  Completed: 'bg-secondary',
  Archived: 'bg-faint',
}

const PROJECT_STATUS_PILL_CLASS = {
  Active: 'bg-success/15 text-success',
  Completed: 'bg-secondary/15 text-secondary',
  Archived: 'bg-faint/15 text-faint',
}

function ClientDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { clients, updateClient } = useWorkspaceClients(currentWorkspace.id)
  const { createProject } = useWorkspaceProjects(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const canWrite = myRole !== 'Viewer'
  const { logs, createLog } = useClientInteractionLogs(id)
  const [client, setClient] = useState(null)
  const [relatedTasks, setRelatedTasks] = useState([])
  const [relatedProjects, setRelatedProjects] = useState([])
  const [tasksByProjectId, setTasksByProjectId] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const [noteValue, setNoteValue] = useState('')
  const [noteErrors, setNoteErrors] = useState({})
  const [noteSubmitError, setNoteSubmitError] = useState(null)
  const [isLoggingNote, setIsLoggingNote] = useState(false)

  async function handleNoteSubmit(event) {
    event.preventDefault()
    const validationErrors = validateInteractionNote({ note: noteValue })
    setNoteErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setNoteSubmitError(null)
    setIsLoggingNote(true)

    try {
      await createLog(user.id, noteValue)
      setNoteValue('')
    } catch (logError) {
      console.error('Failed to log interaction:', logError)
      setNoteSubmitError('Something went wrong logging that note. Please try again.')
    } finally {
      setIsLoggingNote(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, phone, company, website, industry, owner_id, relationship, notes, created_at')
        .eq('id', id)
        .maybeSingle()

      if (cancelled) {
        return
      }
      if (error || !data) {
        if (error) {
          console.error('Failed to load client:', error)
        }
        setNotFound(true)
        setLoading(false)
        return
      }

      setClient(data)

      const { data: taskRows, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, status')
        .eq('client_id', id)
        .order('created_at', { ascending: false })

      if (cancelled) {
        return
      }
      if (taskError) {
        console.error('Failed to load client tasks:', taskError)
        setRelatedTasks([])
      } else {
        setRelatedTasks(taskRows)
      }

      const { data: projectRows, error: projectError } = await supabase
        .from('projects')
        .select('id, name, status, deal_value, deal_currency')
        .eq('client_id', id)
        .order('created_at', { ascending: false })

      if (cancelled) {
        return
      }
      if (projectError) {
        console.error('Failed to load client projects:', projectError)
        setRelatedProjects([])
        setLoading(false)
        return
      }
      setRelatedProjects(projectRows)

      const projectIds = projectRows.map((project) => project.id)
      if (projectIds.length === 0) {
        setTasksByProjectId(new Map())
        setLoading(false)
        return
      }

      const { data: projectTaskRows, error: projectTaskError } = await supabase
        .from('tasks')
        .select('id, project_id, status')
        .in('project_id', projectIds)

      if (cancelled) {
        return
      }
      if (projectTaskError) {
        console.error('Failed to load project tasks for completion rates:', projectTaskError)
        setTasksByProjectId(new Map())
      } else {
        setTasksByProjectId(groupTasksByProjectId(projectTaskRows))
      }

      setLoading(false)
    }

    load()
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
        Client not found.{' '}
        <Link to="/clients" className="text-secondary hover:underline">
          Back to clients
        </Link>
        .
      </p>
    )
  }

  const membersById = new Map(members.map((member) => [member.id, member]))
  const owner = client.owner_id ? membersById.get(client.owner_id) : null

  const openTaskCount = relatedTasks.filter((task) => task.status !== 'Done').length

  const openValueByCurrency = {}
  for (const project of relatedProjects) {
    if (project.status === 'Active' && project.deal_value != null) {
      openValueByCurrency[project.deal_currency] =
        (openValueByCurrency[project.deal_currency] || 0) + project.deal_value
    }
  }

  const lastContactAt = logs.reduce(
    (latest, log) => (!latest || new Date(log.occurred_at) > new Date(latest) ? log.occurred_at : latest),
    null,
  )

  const subtitle = `${client.industry || 'No industry'} · ${client.relationship} · Owner: ${
    owner ? owner.name || owner.email : 'Unassigned'
  }`

  return (
    <div className="p-8">
      <PageHeader
        title={client.name}
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
                New project
              </Button>
            )}
          </div>
        }
      />

      <Link to="/clients" className="mb-4 inline-block text-sm text-secondary hover:underline">
        &lt; All clients
      </Link>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-text">{relatedProjects.length}</p>
          </CardContent>
        </Card>
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
            <CardTitle className="text-sm font-normal text-muted">Open value</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(openValueByCurrency).length === 0 ? (
              <p className="text-2xl font-semibold text-text">—</p>
            ) : (
              Object.entries(openValueByCurrency).map(([currency, amount]) => (
                <p key={currency} className="text-2xl font-semibold text-text">
                  {formatCurrency(amount, currency)}
                </p>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted">Last contact</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-text">
              {lastContactAt ? formatRelativeTime(lastContactAt) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted">Primary contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2.5">
              <Avatar name={client.name} />
              <span>
                <span className="block text-text">{client.name}</span>
                {client.email && <span className="block text-xs text-muted">{client.email}</span>}
                {client.phone && <span className="block text-xs text-muted">{client.phone}</span>}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Owner</dt>
                <dd className="text-text">{owner ? owner.name || owner.email : 'Unassigned'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Relationship</dt>
                <dd className="text-text">{client.relationship}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Industry</dt>
                <dd className="text-text">{client.industry || '—'}</dd>
              </div>
              {client.company && (
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Company</dt>
                  <dd className="text-text">{client.company}</dd>
                </div>
              )}
              {client.website && (
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Website</dt>
                  <dd className="text-text">{client.website}</dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-muted">Client since</dt>
                <dd className="text-text">{new Date(client.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 max-w-sm">
        <CardHeader>
          <CardTitle className="text-heading">Interaction history</CardTitle>
        </CardHeader>
        <CardContent>
          {canWrite && (
            <form className="mb-4 flex flex-col gap-3 border-b border-border pb-4" onSubmit={handleNoteSubmit} noValidate>
              {noteSubmitError && (
                <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{noteSubmitError}</p>
              )}
              <Textarea
                placeholder="Log an interaction or note..."
                value={noteValue}
                onChange={(event) => setNoteValue(event.target.value)}
                aria-invalid={Boolean(noteErrors.note)}
              />
              {noteErrors.note && <p className="text-xs text-danger">{noteErrors.note}</p>}
              <Button type="submit" variant="outline" className="self-start" disabled={isLoggingNote}>
                {isLoggingNote ? 'Logging...' : 'Add note'}
              </Button>
            </form>
          )}

          {logs.length === 0 ? (
            <p className="text-muted">No interactions logged yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {logs.map((log) => {
                const author = members.find((member) => member.id === log.author_id)
                return (
                  <li key={log.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Avatar name={author?.name} email={author?.email} />
                      <span>{author?.name || author?.email || 'Unknown'}</span>
                      <span>-</span>
                      <span>{new Date(log.occurred_at).toLocaleString()}</span>
                    </div>
                    <p className="text-text">{log.note}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-sm">
        <CardHeader>
          <CardTitle className="text-heading">Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {relatedTasks.length === 0 ? (
            <p className="text-muted">No tasks linked to this client yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {relatedTasks.map((task) => (
                <li key={task.id}>
                  <Link to={`/tasks/${task.id}/edit`} className="text-secondary hover:underline">
                    {task.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-sm">
        <CardHeader>
          <CardTitle className="text-heading">Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {relatedProjects.length === 0 ? (
            <p className="text-muted">No projects linked to this client yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {relatedProjects.map((project) => {
                const projectCompletionRate = computeCompletionRate(tasksByProjectId.get(project.id) || [])
                return (
                  <li key={project.id}>
                    <Link
                      to={`/projects/${project.id}`}
                      className="flex items-center justify-between gap-2 rounded-sm px-1 py-1 hover:bg-surface-hover"
                    >
                      <span className="flex items-center gap-2 text-text">
                        <span
                          className={cn('h-2 w-2 shrink-0 rounded-full', PROJECT_STATUS_DOT_CLASS[project.status])}
                        />
                        {project.name}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-muted">{projectCompletionRate.rate}%</span>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            PROJECT_STATUS_PILL_CLASS[project.status],
                          )}
                        >
                          {project.status}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-muted">
          Last contact {lastContactAt ? formatRelativeTime(lastContactAt) : 'No contact yet'}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled>
            Duplicate
          </Button>
          {canWrite && (
            <Button type="button" size="sm" onClick={() => setIsEditOpen(true)}>
              Edit client
            </Button>
          )}
        </div>
      </div>

      <ProjectCreateModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        createProject={createProject}
        clients={clients}
        members={members}
        initialValues={{ clientId: client.id }}
      />

      <ClientCreateModal
        mode="edit"
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        updateClient={async (clientId, values) => {
          const updated = await updateClient(clientId, values)
          setClient((prev) => ({ ...prev, ...updated }))
        }}
        clientId={client.id}
        members={members}
        initialValues={{
          name: client.name,
          company: client.company || '',
          email: client.email || '',
          phone: client.phone || '',
          website: client.website || '',
          industry: client.industry || '',
          ownerId: client.owner_id || '',
          relationship: client.relationship || 'Prospect',
          notes: client.notes || '',
        }}
      />
    </div>
  )
}

export default ClientDetailPage
