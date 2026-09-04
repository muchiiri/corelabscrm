import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import PageHeader from '@/components/layout/PageHeader'
import { validateClientForm } from '@/lib/validateClientForm'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { computeCompletionRate } from '@/lib/computeCompletionRate'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { supabase } from '@/lib/supabase'

const INITIAL_VALUES = { name: '', email: '', phone: '', company: '', website: '' }

function ClientsPage() {
  const { currentWorkspace } = useWorkspace()
  const { clients, createClient } = useWorkspaceClients(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const canWrite = myRole !== 'Viewer'

  const [search, setSearch] = useState('')
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [projectCountByClientId, setProjectCountByClientId] = useState({})

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('projects')
        .select('id, client_id')
        .eq('workspace_id', currentWorkspace.id)

      if (cancelled) {
        return
      }
      if (error) {
        console.error('Failed to load projects for client counts:', error)
        setProjectCountByClientId({})
        return
      }

      const counts = {}
      for (const project of data) {
        if (!project.client_id) {
          continue
        }
        counts[project.client_id] = (counts[project.client_id] || 0) + 1
      }
      setProjectCountByClientId(counts)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [currentWorkspace.id])

  const [tasksByClientId, setTasksByClientId] = useState({})

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, client_id, status')
        .eq('workspace_id', currentWorkspace.id)

      if (cancelled) {
        return
      }
      if (error) {
        console.error('Failed to load tasks for client completion:', error)
        setTasksByClientId({})
        return
      }

      const grouped = {}
      for (const task of data) {
        if (!task.client_id) {
          continue
        }
        if (!grouped[task.client_id]) {
          grouped[task.client_id] = []
        }
        grouped[task.client_id].push(task)
      }
      setTasksByClientId(grouped)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [currentWorkspace.id])

  const [lastContactByClientId, setLastContactByClientId] = useState({})

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (clients.length === 0) {
        setLastContactByClientId({})
        return
      }

      const clientIds = clients.map((client) => client.id)
      const { data, error } = await supabase
        .from('client_interaction_logs')
        .select('client_id, occurred_at')
        .in('client_id', clientIds)

      if (cancelled) {
        return
      }
      if (error) {
        console.error('Failed to load client interaction logs:', error)
        setLastContactByClientId({})
        return
      }

      const latest = {}
      for (const log of data) {
        const current = latest[log.client_id]
        if (!current || new Date(log.occurred_at) > new Date(current)) {
          latest[log.client_id] = log.occurred_at
        }
      }
      setLastContactByClientId(latest)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [currentWorkspace.id, clients])

  const searchLower = search.trim().toLowerCase()
  const filteredClients = searchLower
    ? clients.filter(
        (client) =>
          client.name.toLowerCase().includes(searchLower) ||
          (client.company ?? '').toLowerCase().includes(searchLower),
      )
    : clients

  function handleChange(event) {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateClientForm(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitError(null)
    setIsCreating(true)

    try {
      await createClient(values)
      setValues(INITIAL_VALUES)
    } catch (createError) {
      console.error('Failed to create client:', createError)
      setSubmitError('Something went wrong creating your client. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="p-8">
      <PageHeader title="Clients" subtitle={`${clients.length} client${clients.length === 1 ? '' : 's'}`} />

      <div className="relative mb-4 w-56">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <Input
          type="text"
          placeholder="Search clients"
          aria-label="Search clients"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-8"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal text-muted">
            {filteredClients.length} client{filteredClients.length === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <p className="text-muted">{clients.length === 0 ? 'No clients yet.' : 'No clients match your search.'}</p>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-4 font-normal">Client</th>
                  <th className="py-2 pr-4 text-right font-normal">Projects</th>
                  <th className="py-2 pr-4 font-normal">Open tasks</th>
                  <th className="py-2 pr-4 text-right font-normal">Last contact</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const completionRate = computeCompletionRate(tasksByClientId[client.id] || [])
                  const openCount = completionRate.total - completionRate.completed
                  const lastContact = lastContactByClientId[client.id]
                  return (
                    <tr key={client.id} className="border-b border-border hover:bg-surface-hover">
                      <td className="py-2.5 pr-4">
                        <Link to={`/clients/${client.id}`} className="flex items-center gap-2.5 text-text">
                          <Avatar name={client.name} />
                          <span>
                            <span className="block">{client.name}</span>
                            {client.company && (
                              <span className="block text-xs text-muted">{client.company}</span>
                            )}
                          </span>
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-text">
                        {projectCountByClientId[client.id] || 0}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-xs text-muted">{openCount} open</span>
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-surface-hover">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${completionRate.rate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-xs text-muted">
                        {lastContact ? formatRelativeTime(lastContact) : 'No contact yet'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {canWrite && (
        <Card className="mt-6 max-w-sm">
          <CardHeader>
            <CardTitle className="text-heading">Add client</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
              {submitError && (
                <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{submitError}</p>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clientName">Name</Label>
                <Input
                  id="clientName"
                  name="name"
                  type="text"
                  value={values.name}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && <p className="text-xs text-danger">{errors.email}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clientPhone">Phone</Label>
                <Input id="clientPhone" name="phone" type="text" value={values.phone} onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clientCompany">Company</Label>
                <Input id="clientCompany" name="company" type="text" value={values.company} onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clientWebsite">Website</Label>
                <Input id="clientWebsite" name="website" type="text" value={values.website} onChange={handleChange} />
              </div>
              <Button type="submit" variant="outline" className="self-start" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Add client'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ClientsPage
