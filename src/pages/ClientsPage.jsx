import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
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

const STATUS_TABS = ['All', 'Active', 'Prospect', 'Churned']
const CLIENTS_PER_PAGE = 10

function ClientsPage() {
  const { currentWorkspace } = useWorkspace()
  const { clients, createClient } = useWorkspaceClients(currentWorkspace.id)
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const canWrite = myRole !== 'Viewer'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [projectCountByClientId, setProjectCountByClientId] = useState({})

  useEffect(() => {
    setCurrentPage(1)
  }, [currentWorkspace.id])

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

  const membersById = new Map(members.map((member) => [member.id, member]))

  const searchLower = search.trim().toLowerCase()
  const searchedClients = searchLower
    ? clients.filter(
        (client) =>
          client.name.toLowerCase().includes(searchLower) ||
          (client.company ?? '').toLowerCase().includes(searchLower),
      )
    : clients

  // Computed from searchedClients, not the tab-filtered result, so a
  // tab's count reflects the current search but never shifts just
  // because a different tab is selected - same rule 34g used for
  // Projects' tabs, extended to compose with this page's search box.
  function countByRelationship(tab) {
    return tab === 'All'
      ? searchedClients.length
      : searchedClients.filter((client) => client.relationship === tab).length
  }

  const filteredClients =
    statusFilter === 'All'
      ? searchedClients
      : searchedClients.filter((client) => client.relationship === statusFilter)

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / CLIENTS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const pageStart = (safePage - 1) * CLIENTS_PER_PAGE
  const paginatedClients = filteredClients.slice(pageStart, pageStart + CLIENTS_PER_PAGE)

  return (
    <div className="p-8">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length === 1 ? '' : 's'}, ${clients.filter((client) => client.relationship === 'Active').length} active`}
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
          onChange={(event) => {
            setSearch(event.target.value)
            setCurrentPage(1)
          }}
          className="pl-8"
        />
      </div>

      <div className="mb-4 flex gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant={statusFilter === tab ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter(tab)
              setCurrentPage(1)
            }}
          >
            {tab} ({countByRelationship(tab)})
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal text-muted">
            {filteredClients.length} client{filteredClients.length === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-muted">No clients yet.</p>
          ) : filteredClients.length === 0 ? (
            <p className="text-muted">
              {statusFilter === 'All' ? 'No clients match your search.' : `No ${statusFilter} clients.`}
            </p>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-4 font-normal">Client</th>
                  <th className="py-2 pr-4 font-normal">Owner</th>
                  <th className="py-2 pr-4 text-right font-normal">Projects</th>
                  <th className="py-2 pr-4 font-normal">Open tasks</th>
                  <th className="py-2 pr-4 text-right font-normal">Last contact</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map((client) => {
                  const completionRate = computeCompletionRate(tasksByClientId[client.id] || [])
                  const openCount = completionRate.total - completionRate.completed
                  const lastContact = lastContactByClientId[client.id]
                  const owner = client.owner_id ? membersById.get(client.owner_id) : null
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
                      <td className="py-2.5 pr-4">
                        {owner ? (
                          <span className="flex items-center gap-2 text-text">
                            <Avatar name={owner.name} email={owner.email} />
                            {owner.name || owner.email}
                          </span>
                        ) : (
                          <span className="text-muted">No owner</span>
                        )}
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
        {filteredClients.length > 0 && (
          <CardFooter className="flex items-center justify-between">
            <p className="text-xs text-faint">
              Showing {pageStart + 1}-{Math.min(pageStart + CLIENTS_PER_PAGE, filteredClients.length)} of{' '}
              {filteredClients.length} clients
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(safePage - 1)}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(safePage + 1)}
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
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
