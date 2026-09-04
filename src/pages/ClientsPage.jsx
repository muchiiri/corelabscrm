import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import PageHeader from '@/components/layout/PageHeader'
import ClientCreateModal from '@/components/clients/ClientCreateModal'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { computeCompletionRate } from '@/lib/computeCompletionRate'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { supabase } from '@/lib/supabase'

function ClientsPage() {
  const { currentWorkspace } = useWorkspace()
  const { clients, createClient } = useWorkspaceClients(currentWorkspace.id)
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const canWrite = myRole !== 'Viewer'

  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
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

  return (
    <div className="p-8">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length === 1 ? '' : 's'}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label="Search"
              className="bg-surface-hover"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled
              aria-label="Notifications"
              className="bg-surface-hover"
            >
              <Bell className="h-4 w-4" />
            </Button>
            {canWrite && (
              <Button type="button" onClick={() => setIsCreateOpen(true)}>
                New client
              </Button>
            )}
          </div>
        }
      />

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

      <ClientCreateModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        createClient={createClient}
        members={members}
      />
    </div>
  )
}

export default ClientsPage
