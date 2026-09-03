import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PRIORITY_DOT_CLASS } from '@/components/tasks/PriorityBadge'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { supabase } from '@/lib/supabase'
import { getCalendarGridDates } from '@/lib/getCalendarGridDates'
import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function CalendarPage() {
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspace()
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [tasksByDate, setTasksByDate] = useState({})
  const [loading, setLoading] = useState(true)

  const gridDates = getCalendarGridDates(visibleMonth.getFullYear(), visibleMonth.getMonth())
  const gridStart = gridDates[0]
  const gridEnd = gridDates[gridDates.length - 1]
  const rangeEndExclusive = new Date(gridEnd.getFullYear(), gridEnd.getMonth(), gridEnd.getDate() + 1)
  const gridStartMs = gridStart.getTime()
  const rangeEndExclusiveMs = rangeEndExclusive.getTime()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, priority, due_at')
        .eq('workspace_id', currentWorkspace.id)
        .gte('due_at', new Date(gridStartMs).toISOString())
        .lt('due_at', new Date(rangeEndExclusiveMs).toISOString())
      if (cancelled) return
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
    return () => {
      cancelled = true
    }
  }, [currentWorkspace.id, gridStartMs, rangeEndExclusiveMs])

  if (loading) return <p className="p-8 text-muted">Loading...</p>

  const todayKey = toDateKey(new Date())

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
      <h1 className="mb-6 text-heading font-semibold text-text">Calendar</h1>
      <div className="mb-4 flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={goToPreviousMonth}>
          Prev
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={goToNextMonth}>
          Next
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
          <div key={label} className="bg-bg px-2 py-1 text-xs font-medium text-muted">
            {label}
          </div>
        ))}
        {gridDates.map((date) => {
          const key = toDateKey(date)
          const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()
          const isToday = key === todayKey
          const dayTasks = tasksByDate[key] || []
          return (
            <div key={key} className="min-h-24 bg-bg p-1.5">
              <p
                className={cn(
                  'mb-1 text-xs',
                  isCurrentMonth ? 'text-text' : 'text-faint',
                  isToday && 'font-semibold text-accent',
                )}
              >
                {date.getDate()}
              </p>
              <div className="flex flex-col gap-1">
                {dayTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => navigate(`/tasks/${task.id}/edit`)}
                    className="flex w-full items-center gap-1.5 truncate rounded-sm px-1 py-0.5 text-left text-xs text-text hover:bg-border"
                  >
                    <span
                      className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PRIORITY_DOT_CLASS[task.priority])}
                    />
                    <span className="truncate">{task.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarPage
