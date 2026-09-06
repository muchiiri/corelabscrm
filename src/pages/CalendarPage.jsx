import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { PRIORITY_DOT_CLASS } from '@/components/tasks/PriorityBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PageHeader from '@/components/layout/PageHeader'
import TaskCreateModal from '@/components/tasks/TaskCreateModal'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useWorkspaceProjects } from '@/lib/useWorkspaceProjects'
import { useWorkspaceTags } from '@/lib/useWorkspaceTags'
import { supabase } from '@/lib/supabase'
import { getCalendarGridDates } from '@/lib/getCalendarGridDates'
import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_VISIBLE_CHIPS = 2
const PRIORITIES = ['High', 'Medium', 'Low']

// Local to this page, not the shared PriorityBadge component - same
// reasoning as KanbanPage's PRIORITY_PILL_CLASS (feature 32d). Literal
// class strings, not `bg-priority-${priority}/15` interpolation, so
// Tailwind's build-time scanner can see them.
const PRIORITY_CHIP_CLASS = {
  High: 'bg-priority-high/15 text-priority-high',
  Medium: 'bg-priority-medium/15 text-priority-medium',
  Low: 'bg-priority-low/15 text-priority-low',
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Inverse of toDateKey - `new Date('YYYY-MM-DD')` parses as UTC midnight
// and can land on the wrong local day (same pitfall fixed in
// computeCompletionTrend.js, feature 32b).
function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function CalendarPage() {
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { projects } = useWorkspaceProjects(currentWorkspace.id)
  const { tags, createTag } = useWorkspaceTags(currentWorkspace.id)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [tasksByDate, setTasksByDate] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()))
  const [createDefaults, setCreateDefaults] = useState(null)

  const gridDates = getCalendarGridDates(visibleMonth.getFullYear(), visibleMonth.getMonth())
  const gridStart = gridDates[0]
  const gridEnd = gridDates[gridDates.length - 1]
  const rangeEndExclusive = new Date(gridEnd.getFullYear(), gridEnd.getMonth(), gridEnd.getDate() + 1)
  const gridStartMs = gridStart.getTime()
  const rangeEndExclusiveMs = rangeEndExclusive.getTime()

  useEffect(() => {
    let cancelled = false
    // Guards two calls to load() racing within this same effect run (the
    // initial fetch and a 'tasks:changed' event firing before it resolves) -
    // same shape as useActivityFeed.js's requestId guard.
    let requestId = 0
    async function load() {
      const currentRequestId = ++requestId
      setLoading(true)
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, priority, due_at')
        .eq('workspace_id', currentWorkspace.id)
        .gte('due_at', new Date(gridStartMs).toISOString())
        .lt('due_at', new Date(rangeEndExclusiveMs).toISOString())
      if (cancelled || requestId !== currentRequestId) return
      if (error) {
        console.error('Failed to load tasks:', error)
        setTasksByDate({})
      } else {
        const grouped = {}
        for (const task of data) {
          const key = toDateKey(new Date(task.due_at))
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(task)
        }
        setTasksByDate(grouped)
      }
      setLoading(false)
    }
    load()
    window.addEventListener('tasks:changed', load)
    return () => {
      cancelled = true
      window.removeEventListener('tasks:changed', load)
    }
  }, [currentWorkspace.id, gridStartMs, rangeEndExclusiveMs])

  if (loading) return <p className="p-8 text-muted">Loading...</p>

  const todayKey = toDateKey(new Date())
  const isViewingToday = selectedDate === todayKey
  const selectedDayTasks = tasksByDate[selectedDate] || []
  const selectedDateLabel = parseDateKey(selectedDate).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const scheduledCount = Object.values(tasksByDate).reduce((sum, dayTasks) => sum + dayTasks.length, 0)

  function goToPreviousMonth() {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  function goToNextMonth() {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }
  function goToToday() {
    const now = new Date()
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Calendar"
        subtitle={`${visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} · ${scheduledCount} scheduled task${scheduledCount === 1 ? '' : 's'}`}
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
            <Button type="button" onClick={() => setCreateDefaults({})}>
              New task
            </Button>
          </div>
        }
      />
      <div className="flex flex-wrap items-start gap-6">
      <div className="min-w-0 flex-1">
      <div className="mb-4 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={goToPreviousMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={goToNextMonth} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
        <p className="text-sm text-muted">
          {visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </p>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-sm border border-border bg-border">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bg-surface px-2 py-1 text-xs font-medium text-muted">
            {label}
          </div>
        ))}
        {gridDates.map((date) => {
          const key = toDateKey(date)
          const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()
          const isToday = key === todayKey
          const isSelected = key === selectedDate
          const dayTasks = tasksByDate[key] || []
          const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_CHIPS)
          const overflowCount = dayTasks.length - visibleTasks.length
          return (
            <div
              key={key}
              onClick={() => setSelectedDate(key)}
              className={cn(
                'min-h-24 cursor-pointer bg-surface p-1.5',
                isSelected && 'bg-accent-bg ring-1 ring-inset ring-accent-border',
              )}
            >
              <p
                className={cn(
                  'mb-1 flex h-5 w-5 items-center justify-center rounded-full text-xs',
                  isCurrentMonth ? 'text-text' : 'text-faint',
                  isToday && 'bg-accent font-semibold text-accent-ink',
                )}
              >
                {date.getDate()}
              </p>
              <div className="flex flex-col gap-1">
                {visibleTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      navigate(`/tasks/${task.id}/edit`)
                    }}
                    className={cn(
                      'flex w-full items-center gap-1.5 truncate rounded-sm px-1 py-0.5 text-left text-xs',
                      PRIORITY_CHIP_CLASS[task.priority],
                    )}
                  >
                    <span
                      className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PRIORITY_DOT_CLASS[task.priority])}
                    />
                    <span className="truncate">{task.title}</span>
                  </button>
                ))}
                {overflowCount > 0 && (
                  <p className="px-1 text-xs text-faint">+{overflowCount} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </div>

      <div className="flex w-72 shrink-0 flex-col gap-4">
        <Card>
          <CardHeader className={isViewingToday ? 'border-b border-border pb-4' : undefined}>
            <CardTitle
              className={cn('text-sm', isViewingToday ? 'font-bold text-text' : 'font-normal text-muted')}
            >
              {selectedDateLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayTasks.length === 0 ? (
              <div>
                <p className="text-sm text-muted">Nothing scheduled.</p>
                <button
                  type="button"
                  onClick={() => setCreateDefaults({ dueAt: `${selectedDate}T09:00` })}
                  className="mt-3 inline-block text-sm text-secondary hover:underline"
                >
                  Schedule a task
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {selectedDayTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => navigate(`/tasks/${task.id}/edit`)}
                    className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-surface-hover"
                  >
                    <span
                      className={cn(
                        'w-1 shrink-0 self-stretch rounded-full',
                        PRIORITY_DOT_CLASS[task.priority],
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text">{task.title}</span>
                      <span className="block text-xs text-muted">
                        {new Date(task.due_at).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {PRIORITIES.map((priority) => (
                <div key={priority} className="flex items-center gap-2 text-xs text-muted">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', PRIORITY_DOT_CLASS[priority])} />
                  {priority} priority
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>

      <TaskCreateModal
        open={createDefaults !== null}
        onOpenChange={(next) => !next && setCreateDefaults(null)}
        workspaceId={currentWorkspace.id}
        members={members}
        tags={tags}
        onCreateTag={createTag}
        projects={projects}
        initialValues={createDefaults ?? {}}
      />
    </div>
  )
}

export default CalendarPage
