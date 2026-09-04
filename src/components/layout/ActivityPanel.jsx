import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useActivityFeed } from '@/lib/useActivityFeed'
import { formatRelativeTime } from '@/lib/formatRelativeTime'

function ActivityPanel() {
  const { currentWorkspace } = useWorkspace()
  const { activity, loading } = useActivityFeed(currentWorkspace?.id)

  return (
    <aside className="sticky top-0 hidden h-screen w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-surface px-5 py-6 lg:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Activity</h2>
        <Button type="button" variant="ghost" size="sm" disabled>
          Mark all read
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : activity.length === 0 ? (
        <p className="text-sm text-muted">No activity yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {activity.map((entry) => (
            <li key={entry.id} className="flex gap-2.5 rounded-sm px-1 py-2">
              <Avatar name={entry.actor?.name} email={entry.actor?.email} className="mt-0.5 h-7 w-7 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-relaxed text-text">{entry.summary}</p>
                <p className="mt-1 text-[11px] text-faint">{formatRelativeTime(entry.occurred_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

export default ActivityPanel
