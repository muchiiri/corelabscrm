import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar } from '@/components/ui/avatar'
import PriorityBadge from '@/components/tasks/PriorityBadge'
import TaskSnoozeControl from '@/components/tasks/TaskSnoozeControl'
import TagBadge from '@/components/tags/TagBadge'
import { formatDueDate } from '@/lib/formatDueDate'
import { isTaskOverdue } from '@/lib/isTaskOverdue'
import { cn } from '@/lib/utils'

function MobileTaskCard({
  task,
  tags,
  assignee,
  project,
  client,
  canWrite,
  isSelected,
  onToggleSelected,
  onSnooze,
  onOpen,
}) {
  return (
    <Card onClick={onOpen} className="cursor-pointer p-3">
      <div className="flex items-start gap-2">
        {canWrite && (
          <Checkbox
            checked={isSelected}
            onChange={(event) => {
              event.stopPropagation()
              onToggleSelected(task.id)
            }}
            onClick={(event) => event.stopPropagation()}
            className="mt-1"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="min-w-0 flex-1 truncate font-bold text-text">{task.title}</p>
            {tags.map((tag) => (
              <TagBadge key={tag.id} name={tag.name} color={tag.color} />
            ))}
          </div>
          <p className="truncate text-xs text-muted">
            {project ? project.name : 'No project'}
            {client ? ` · ${client.name}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-sm">
        <PriorityBadge priority={task.priority} />
        <span className={cn('text-xs', isTaskOverdue(task) ? 'text-danger' : 'text-muted')}>
          {task.due_at ? formatDueDate(task) : 'No due date'}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        {assignee ? (
          <span className="flex min-w-0 items-center gap-2 font-semibold text-text">
            <Avatar name={assignee.name} email={assignee.email} />
            <span className="truncate">{assignee.name || assignee.email}</span>
          </span>
        ) : (
          <span className="text-sm text-muted">Unassigned</span>
        )}
        <span onClick={(event) => event.stopPropagation()}>
          <TaskSnoozeControl task={task} onSnooze={(iso) => onSnooze(task.id, iso)} disabled={!canWrite} />
        </span>
      </div>
    </Card>
  )
}

export default MobileTaskCard
