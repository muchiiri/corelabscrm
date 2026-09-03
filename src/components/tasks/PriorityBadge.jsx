import { cn } from '@/lib/utils'

const PRIORITY_DOT_CLASS = {
  High: 'bg-priority-high',
  Medium: 'bg-priority-medium',
  Low: 'bg-priority-low',
}

function PriorityBadge({ priority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', PRIORITY_DOT_CLASS[priority])} />
      {priority}
    </span>
  )
}

export default PriorityBadge
export { PRIORITY_DOT_CLASS }
