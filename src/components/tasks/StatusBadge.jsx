import { cn } from '@/lib/utils'

const STATUS_DOT_CLASS = {
  Todo: 'bg-status-todo',
  'In Progress': 'bg-status-in-progress',
  Blocked: 'bg-status-blocked',
  Waiting: 'bg-status-waiting',
  Done: 'bg-status-done',
}

function StatusBadge({ status }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT_CLASS[status])} />
      {status}
    </span>
  )
}

export default StatusBadge
export { STATUS_DOT_CLASS }
