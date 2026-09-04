import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRIORITY_DOT_CLASS = {
  High: 'bg-priority-high',
  Medium: 'bg-priority-medium',
  Low: 'bg-priority-low',
}

const PRIORITY_TEXT_CLASS = {
  High: 'text-priority-high',
  Medium: 'text-priority-medium',
  Low: 'text-priority-low',
}

const PRIORITY_ICON = {
  High: ArrowUp,
  Medium: Minus,
  Low: ArrowDown,
}

function PriorityBadge({ priority }) {
  const Icon = PRIORITY_ICON[priority]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', PRIORITY_TEXT_CLASS[priority])}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {priority}
    </span>
  )
}

export default PriorityBadge
export { PRIORITY_DOT_CLASS }
