import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Circle, CircleCheck, CircleDot, CircleSlash, Clock, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import PageHeader from '@/components/layout/PageHeader'
import NotificationBell from '@/components/layout/NotificationBell'
import PriorityBadge from '@/components/tasks/PriorityBadge'
import TaskSnoozeControl from '@/components/tasks/TaskSnoozeControl'
import TaskCreateModal from '@/components/tasks/TaskCreateModal'
import MobileTaskCard from '@/components/tasks/MobileTaskCard'
import { Avatar } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import BulkActionToolbar from '@/components/tasks/BulkActionToolbar'
import TagBadge from '@/components/tags/TagBadge'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { useWorkspaceTags } from '@/lib/useWorkspaceTags'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { useAuth } from '@/lib/AuthContext'
import { logActivity } from '@/lib/logActivity'
import { supabase } from '@/lib/supabase'
import { filterTasks } from '@/lib/filterTasks'
import { formatDueDate } from '@/lib/formatDueDate'
import { getDatePresetRange } from '@/lib/getDatePresetRange'
import { isTaskOverdue } from '@/lib/isTaskOverdue'
import { isTaskDueThisWeek } from '@/lib/isTaskDueThisWeek'
import { rowsToCsv } from '@/lib/rowsToCsv'
import { downloadTextFile } from '@/lib/downloadTextFile'
import { buildReportPdf } from '@/lib/buildReportPdf'
import { cn } from '@/lib/utils'

const INITIAL_FILTERS = {
  search: '',
  status: 'All',
  priority: 'All',
  dueFrom: '',
  dueTo: '',
  overdueOnly: false,
}

const DATE_PRESETS = ['Today', 'This Week', 'This Month', 'Future']

const TASKS_PER_PAGE = 10

const DAY_MS = 24 * 60 * 60 * 1000

const TASK_REPORT_PERIODS = ['This Week', 'This Month', 'All Time']

const TASK_REPORT_PERIOD_SLUGS = {
  'This Week': 'this-week',
  'This Month': 'this-month',
  'All Time': 'all-time',
}

const TASK_REPORT_HEADERS = ['Task', 'Project', 'Assignee', 'Completed']

// Local to this page, not the shared StatusBadge component - see
// current-feature.md's Design reference for why. Literal class strings,
// not `bg-status-${status}/15` interpolation, so Tailwind's build-time
// scanner can see them.
const STATUS_PILL_CLASS = {
  Todo: 'bg-status-todo/15 text-status-todo',
  'In Progress': 'bg-status-in-progress/15 text-status-in-progress',
  Blocked: 'bg-status-blocked/15 text-status-blocked',
  Waiting: 'bg-status-waiting/15 text-status-waiting',
  Done: 'bg-status-done/15 text-status-done',
}

const STATUS_ICON = {
  Todo: Circle,
  'In Progress': CircleDot,
  Blocked: CircleSlash,
  Waiting: Clock,
  Done: CircleCheck,
}

function TaskListPage() {
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { projects } = useWorkspaceProjects(currentWorkspace.id)
  const { clients } = useWorkspaceClients(currentWorkspace.id)
  const { tags, createTag } = useWorkspaceTags(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const canWrite = myRole !== 'Viewer'
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [tagsByTaskId, setTagsByTaskId] = useState({})
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [snoozeError, setSnoozeError] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [isBulkActionPending, setIsBulkActionPending] = useState(false)
  const [bulkActionError, setBulkActionError] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [reportPeriod, setReportPeriod] = useState('This Week')

  useEffect(() => {
    let cancelled = false
    // Guards two calls to load() racing within this same effect run (the
    // initial fetch and a 'tasks:changed' event firing before it resolves) -
    // same shape as useActivityFeed.js's requestId guard.
    let requestId = 0
    // A workspace switch reloads `tasks` here; without also resetting
    // selection, ids from the previous workspace would linger, stale and
    // unmatched by any row in the new list.
    setSelectedIds(new Set())
    setCurrentPage(1)

    async function load() {
      const currentRequestId = ++requestId

      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, priority, status, due_at, assignee_id, project_id, client_id, snoozed_until, updated_at')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })

      if (cancelled || requestId !== currentRequestId) {
        return
      }
      if (error) {
        console.error('Failed to load tasks:', error)
        setTasks([])
        setTagsByTaskId({})
        setLoading(false)
        return
      }

      setTasks(data)

      const taskIds = data.map((task) => task.id)
      if (taskIds.length === 0) {
        setTagsByTaskId({})
        setLoading(false)
        return
      }

      // task_tags.tag_id has a real FK to tags.id, so this can use a single
      // PostgREST embed - unlike useWorkspaceMembers' two-query client join,
      // which exists only because workspace_members.user_id lacks a
      // profiles FK.
      const { data: taskTagRows, error: taskTagsError } = await supabase
        .from('task_tags')
        .select('task_id, tags(id, name, color)')
        .in('task_id', taskIds)

      if (cancelled || requestId !== currentRequestId) {
        return
      }
      if (taskTagsError) {
        console.error('Failed to load task tags:', taskTagsError)
        setTagsByTaskId({})
      } else {
        const grouped = {}
        for (const row of taskTagRows) {
          if (!grouped[row.task_id]) {
            grouped[row.task_id] = []
          }
          grouped[row.task_id].push(row.tags)
        }
        setTagsByTaskId(grouped)
      }
      setLoading(false)
    }

    load()
    window.addEventListener('tasks:changed', load)
    return () => {
      cancelled = true
      window.removeEventListener('tasks:changed', load)
    }
  }, [currentWorkspace.id])

  function toggleSelected(taskId) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  function handleFilterChange(event) {
    const { name, value } = event.target
    setSelectedIds(new Set())
    setCurrentPage(1)
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      // Editing the date range manually is an alternative to a preset, not
      // additive with one - clear any active preset so the typed value wins.
      ...(name === 'dueFrom' || name === 'dueTo' ? { overdueOnly: false } : {}),
    }))
  }

  function handleDatePreset(preset) {
    const { dueFrom, dueTo } = getDatePresetRange(preset)
    setSelectedIds(new Set())
    setCurrentPage(1)
    setFilters((prev) => ({ ...prev, dueFrom, dueTo: dueTo ?? '', overdueOnly: false }))
  }

  function handleOverduePreset() {
    setSelectedIds(new Set())
    setCurrentPage(1)
    setFilters((prev) => ({ ...prev, dueFrom: '', dueTo: '', overdueOnly: true }))
  }

  function isDatePresetActive(preset) {
    if (filters.overdueOnly) {
      return false
    }
    const range = getDatePresetRange(preset)
    return filters.dueFrom === range.dueFrom && filters.dueTo === (range.dueTo ?? '')
  }

  async function handleSnooze(taskId, snoozedUntilIso) {
    setSnoozeError(null)
    const previousTasks = tasks
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, snoozed_until: snoozedUntilIso } : t)))

    const { error } = await supabase.from('tasks').update({ snoozed_until: snoozedUntilIso }).eq('id', taskId)
    if (error) {
      console.error('Failed to update snooze:', error)
      setTasks(previousTasks)
      setSnoozeError('Something went wrong updating that task. Please try again.')
    }
  }

  async function handleBulkMarkDone(ids) {
    setBulkActionError(null)
    setIsBulkActionPending(true)
    const idSet = new Set(ids)
    const previousTasks = tasks
    setTasks((prev) => prev.map((t) => (idSet.has(t.id) ? { ...t, status: 'Done' } : t)))

    // .select() (no .single() - this can touch any number of rows) turns a
    // partially or fully RLS-filtered bulk write into a detectable result:
    // compare the returned row count to the ids we asked for, the same
    // lesson feature 20b learned for the single-row case.
    const { data, error } = await supabase.from('tasks').update({ status: 'Done' }).in('id', ids).select()

    if (error || !data || data.length !== ids.length) {
      console.error('Failed to bulk mark tasks done:', error)
      setTasks(previousTasks)
      setBulkActionError('Something went wrong updating those tasks. Please try again.')
    } else {
      setSelectedIds(new Set())
    }
    setIsBulkActionPending(false)
  }

  async function handleBulkDelete(ids) {
    setBulkActionError(null)
    setIsBulkActionPending(true)
    const idSet = new Set(ids)
    const previousTasks = tasks
    setTasks((prev) => prev.filter((t) => !idSet.has(t.id)))

    const { data, error } = await supabase.from('tasks').delete().in('id', ids).select()

    if (error || !data || data.length !== ids.length) {
      console.error('Failed to bulk delete tasks:', error)
      setTasks(previousTasks)
      setBulkActionError('Something went wrong deleting those tasks. Please try again.')
    } else {
      setSelectedIds(new Set())
    }
    setIsBulkActionPending(false)
  }

  async function handleBulkStatusChange(ids, status) {
    setBulkActionError(null)
    setIsBulkActionPending(true)
    const idSet = new Set(ids)
    const previousTasks = tasks
    setTasks((prev) => prev.map((t) => (idSet.has(t.id) ? { ...t, status } : t)))

    const { data, error } = await supabase.from('tasks').update({ status }).in('id', ids).select()

    if (error || !data || data.length !== ids.length) {
      console.error('Failed to bulk change task status:', error)
      setTasks(previousTasks)
      setBulkActionError('Something went wrong updating those tasks. Please try again.')
    } else {
      setSelectedIds(new Set())
      const actorName = members.find((member) => member.id === user.id)?.name || user.email
      const taskWord = ids.length === 1 ? 'task' : 'tasks'
      logActivity(currentWorkspace.id, user.id, `${actorName} moved ${ids.length} ${taskWord} to ${status}`, 'task')
    }
    setIsBulkActionPending(false)
  }

  async function handleBulkAssign(ids, value) {
    setBulkActionError(null)
    setIsBulkActionPending(true)
    const idSet = new Set(ids)
    const assigneeId = value === 'unassign' ? null : value
    const previousTasks = tasks
    setTasks((prev) => prev.map((t) => (idSet.has(t.id) ? { ...t, assignee_id: assigneeId } : t)))

    const { data, error } = await supabase.from('tasks').update({ assignee_id: assigneeId }).in('id', ids).select()

    if (error || !data || data.length !== ids.length) {
      console.error('Failed to bulk assign tasks:', error)
      setTasks(previousTasks)
      setBulkActionError('Something went wrong assigning those tasks. Please try again.')
    } else {
      setSelectedIds(new Set())
    }
    setIsBulkActionPending(false)
  }

  if (loading) {
    return <p className="p-8 text-muted">Loading...</p>
  }

  const filteredTasks = filterTasks(tasks, filters)
  const membersById = new Map(members.map((member) => [member.id, member]))
  const projectsById = new Map(projects.map((project) => [project.id, project]))
  const clientsById = new Map(clients.map((client) => [client.id, client]))
  const overdueCount = tasks.filter((task) => isTaskOverdue(task)).length
  const dueThisWeekCount = tasks.filter((task) => isTaskDueThisWeek(task)).length
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / TASKS_PER_PAGE))

  // 7-day/30-day rolling windows, matching computeDashboardMetrics.js's
  // "completed this week" convention rather than calendar boundaries.
  const reportRangeEnd = new Date()
  const reportRangeStart =
    reportPeriod === 'This Month'
      ? new Date(reportRangeEnd.getTime() - 30 * DAY_MS)
      : new Date(reportRangeEnd.getTime() - 7 * DAY_MS)

  const completedTasksInPeriod = tasks.filter((task) => {
    if (task.status !== 'Done') {
      return false
    }
    if (reportPeriod === 'All Time') {
      return true
    }
    const updatedAt = new Date(task.updated_at)
    return updatedAt >= reportRangeStart && updatedAt <= reportRangeEnd
  })

  function buildReportRows() {
    return completedTasksInPeriod.map((task) => {
      const project = task.project_id ? projectsById.get(task.project_id) : null
      const assignee = task.assignee_id ? membersById.get(task.assignee_id) : null
      return [
        task.title,
        project ? project.name : 'No project',
        assignee ? assignee.name || assignee.email : 'Unassigned',
        task.updated_at.slice(0, 10),
      ]
    })
  }

  async function logReport(format) {
    // All Time has no natural start bound, so both dates collapse to today -
    // the same degenerate convention ProjectsPage's project-status report uses.
    const periodStart =
      reportPeriod === 'All Time' ? reportRangeEnd.toISOString().slice(0, 10) : reportRangeStart.toISOString().slice(0, 10)
    const periodEnd = reportRangeEnd.toISOString().slice(0, 10)
    const { error } = await supabase.from('reports').insert({
      workspace_id: currentWorkspace.id,
      type: 'task-completion',
      format,
      period_start: periodStart,
      period_end: periodEnd,
    })
    if (error) {
      console.error('Failed to log report export:', error)
    }
  }

  function handleExportCsv() {
    const today = new Date().toISOString().slice(0, 10)
    const csv = rowsToCsv(TASK_REPORT_HEADERS, buildReportRows())
    downloadTextFile(`task-completion-report-${TASK_REPORT_PERIOD_SLUGS[reportPeriod]}-${today}.csv`, csv, 'text/csv')
    logReport('csv')
  }

  function handleExportPdf() {
    const today = new Date().toISOString().slice(0, 10)
    const doc = buildReportPdf('Task completion report', TASK_REPORT_HEADERS, buildReportRows())
    doc.save(`task-completion-report-${TASK_REPORT_PERIOD_SLUGS[reportPeriod]}-${today}.pdf`)
    logReport('pdf')
  }
  // Guards against a bulk delete shrinking the list out from under an
  // already-advanced page, without needing a dedicated effect.
  const safePage = Math.min(currentPage, totalPages)
  const pageStart = (safePage - 1) * TASKS_PER_PAGE
  const paginatedTasks = filteredTasks.slice(pageStart, pageStart + TASKS_PER_PAGE)

  return (
    <div className="p-4 lg:p-8">
      <PageHeader
        title="Tasks"
        subtitle={`${tasks.length} task${tasks.length === 1 ? '' : 's'}, ${overdueCount} overdue, ${dueThisWeekCount} due this week`}
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
            <NotificationBell />
            {canWrite && (
              <Button type="button" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New task
              </Button>
            )}
          </div>
        }
      />

      {snoozeError && (
        <p className="mb-4 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{snoozeError}</p>
      )}
      {bulkActionError && (
        <p className="mb-4 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{bulkActionError}</p>
      )}

      {tasks.length === 0 ? (
        <p className="text-muted">
          {canWrite ? (
            <>
              No tasks yet.{' '}
              <button
                type="button"
                className="text-secondary hover:underline"
                onClick={() => setIsCreateOpen(true)}
              >
                Create your first one
              </button>
              .
            </>
          ) : (
            'No tasks yet.'
          )}
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <Input
                name="search"
                type="text"
                placeholder="Search tasks"
                aria-label="Search tasks"
                value={filters.search}
                onChange={handleFilterChange}
                className="pl-8"
              />
            </div>
            <Select
              name="status"
              aria-label="Filter by status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-auto"
            >
              <option value="All">Status: All</option>
              <option value="Todo">Todo</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Waiting">Waiting</option>
              <option value="Done">Done</option>
            </Select>
            <Select
              name="priority"
              aria-label="Filter by priority"
              value={filters.priority}
              onChange={handleFilterChange}
              className="w-auto"
            >
              <option value="All">Priority: All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </Select>
            <div className="flex items-center gap-1.5">
              <label htmlFor="dueFrom" className="text-xs text-muted">
                Due from
              </label>
              <Input
                id="dueFrom"
                name="dueFrom"
                type="date"
                value={filters.dueFrom ? filters.dueFrom.slice(0, 10) : ''}
                onChange={handleFilterChange}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="dueTo" className="text-xs text-muted">
                Due to
              </label>
              <Input
                id="dueTo"
                name="dueTo"
                type="date"
                value={filters.dueTo ? filters.dueTo.slice(0, 10) : ''}
                onChange={handleFilterChange}
                className="w-auto"
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant={isDatePresetActive(preset) ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => handleDatePreset(preset)}
              >
                {preset}
              </Button>
            ))}
            <Button
              type="button"
              variant={filters.overdueOnly ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleOverduePreset}
            >
              Overdue
            </Button>
          </div>

          {selectedIds.size > 0 && (
            <BulkActionToolbar
              selectedCount={selectedIds.size}
              onClear={() => setSelectedIds(new Set())}
              onMarkDone={() => handleBulkMarkDone(Array.from(selectedIds))}
              onDelete={() => handleBulkDelete(Array.from(selectedIds))}
              onStatusChange={(status) => handleBulkStatusChange(Array.from(selectedIds), status)}
              onAssign={(value) => handleBulkAssign(Array.from(selectedIds), value)}
              members={members}
              isPending={isBulkActionPending}
            />
          )}

          <Card className="hidden lg:block">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm font-normal text-muted">
                {filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'}
              </CardTitle>
              <p className="text-xs text-faint">Sorted by newest</p>
            </CardHeader>
            <CardContent>
              {filteredTasks.length === 0 ? (
                <p className="text-muted">No tasks match your filters.</p>
              ) : (
                <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-4 font-normal">
                    {canWrite && (
                      <Checkbox
                        checked={
                          paginatedTasks.length > 0 &&
                          paginatedTasks.every((task) => selectedIds.has(task.id))
                        }
                        onChange={(event) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev)
                            for (const task of paginatedTasks) {
                              if (event.target.checked) {
                                next.add(task.id)
                              } else {
                                next.delete(task.id)
                              }
                            }
                            return next
                          })
                        }}
                      />
                    )}
                  </th>
                  <th className="py-2 pr-4 font-normal">Task</th>
                  <th className="py-2 pr-4 font-normal">Priority</th>
                  <th className="py-2 pr-4 font-normal">Status</th>
                  <th className="py-2 pr-4 font-normal">Due Date</th>
                  <th className="py-2 pr-4 font-normal">Snooze</th>
                  <th className="py-2 pr-4 font-normal">Assignee</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTasks.map((task) => {
                  const assignee = task.assignee_id ? membersById.get(task.assignee_id) : null
                  const project = task.project_id ? projectsById.get(task.project_id) : null
                  const client = task.client_id ? clientsById.get(task.client_id) : null
                  const StatusIcon = STATUS_ICON[task.status]
                  return (
                    <tr
                      key={task.id}
                      onClick={() => navigate(`/tasks/${task.id}/edit`)}
                      className="cursor-pointer border-b border-border hover:bg-surface-hover"
                    >
                      <td className="py-2.5 pr-4">
                        {canWrite && (
                          <Checkbox
                            checked={selectedIds.has(task.id)}
                            onChange={(event) => {
                              event.stopPropagation()
                              toggleSelected(task.id)
                            }}
                            onClick={(event) => event.stopPropagation()}
                          />
                        )}
                      </td>
                      <td className="max-w-md py-2.5 pr-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="min-w-0 max-w-[75%] truncate font-bold text-text">{task.title}</p>
                          {(tagsByTaskId[task.id] ?? []).map((tag) => (
                            <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                          ))}
                        </div>
                        <p className="truncate text-xs text-muted">
                          {project ? project.name : 'No project'}
                          {client ? ` · ${client.name}` : ''}
                        </p>
                      </td>
                      <td className="py-2.5 pr-4">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                            STATUS_PILL_CLASS[task.status],
                          )}
                        >
                          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                          {task.status}
                        </span>
                      </td>
                      <td className={cn('py-2.5 pr-4', isTaskOverdue(task) ? 'text-danger' : 'text-muted')}>
                        {task.due_at ? formatDueDate(task) : 'No due date'}
                      </td>
                      <td className="py-2.5 pr-4">
                        <TaskSnoozeControl
                          task={task}
                          onSnooze={(iso) => handleSnooze(task.id, iso)}
                          disabled={!canWrite}
                        />
                      </td>
                      <td className="py-2.5 pr-4">
                        {assignee ? (
                          <span className="flex items-center gap-2 font-semibold text-text">
                            <Avatar name={assignee.name} email={assignee.email} />
                            {assignee.name || assignee.email}
                          </span>
                        ) : (
                          <span className="text-muted">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
                </table>
              )}
            </CardContent>
            {filteredTasks.length > 0 && (
              <CardFooter className="flex items-center justify-between">
                <p className="text-xs text-faint">
                  Showing {pageStart + 1}-{Math.min(pageStart + TASKS_PER_PAGE, filteredTasks.length)} of{' '}
                  {filteredTasks.length} tasks
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(safePage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage(safePage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>

          <div className="lg:hidden">
            {filteredTasks.length === 0 ? (
              <p className="text-muted">No tasks match your filters.</p>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm text-muted">
                    {filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'}
                  </p>
                  <p className="text-xs text-faint">Sorted by newest</p>
                </div>
                <div className="flex flex-col gap-2">
                  {paginatedTasks.map((task) => {
                    const assignee = task.assignee_id ? membersById.get(task.assignee_id) : null
                    const project = task.project_id ? projectsById.get(task.project_id) : null
                    const client = task.client_id ? clientsById.get(task.client_id) : null
                    return (
                      <MobileTaskCard
                        key={task.id}
                        task={task}
                        tags={tagsByTaskId[task.id] ?? []}
                        assignee={assignee}
                        project={project}
                        client={client}
                        canWrite={canWrite}
                        isSelected={selectedIds.has(task.id)}
                        onToggleSelected={toggleSelected}
                        onSnooze={handleSnooze}
                        onOpen={() => navigate(`/tasks/${task.id}/edit`)}
                      />
                    )
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-faint">
                    Showing {pageStart + 1}-{Math.min(pageStart + TASKS_PER_PAGE, filteredTasks.length)} of{' '}
                    {filteredTasks.length} tasks
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage(safePage - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage(safePage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-heading">Task Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-2">
                {TASK_REPORT_PERIODS.map((period) => (
                  <Button
                    key={period}
                    type="button"
                    variant={reportPeriod === period ? 'secondary' : 'outline'}
                    onClick={() => setReportPeriod(period)}
                  >
                    {period}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  {completedTasksInPeriod.length} task{completedTasksInPeriod.length === 1 ? '' : 's'} completed
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportCsv}
                    disabled={completedTasksInPeriod.length === 0}
                  >
                    Export CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportPdf}
                    disabled={completedTasksInPeriod.length === 0}
                  >
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <TaskCreateModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        workspaceId={currentWorkspace.id}
        members={members}
        tags={tags}
        onCreateTag={createTag}
        projects={projects}
        clients={clients}
        initialValues={{}}
      />
    </div>
  )
}

export default TaskListPage
