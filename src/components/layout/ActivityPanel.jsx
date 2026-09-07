import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useAuth } from '@/lib/AuthContext'
import { useActivityFeed } from '@/lib/useActivityFeed'
import { useUnreadActivity } from '@/lib/useUnreadActivity'
import { formatRelativeTime } from '@/lib/formatRelativeTime'

// Every logActivity call site writes the actor's display name as the
// literal first token(s) of the summary string. If the live actor name/
// email still matches that prefix, split it out for bold treatment - if
// the actor has since renamed (or has no profile), fall through to
// rendering the whole summary as plain text, exactly as before.
function splitActorPrefix(entry) {
  const candidates = [entry.actor?.name, entry.actor?.email].filter(Boolean)
  const actorLabel = candidates.find((candidate) => entry.summary.startsWith(candidate))
  if (!actorLabel) {
    return null
  }
  return { actorLabel, rest: entry.summary.slice(actorLabel.length) }
}

function ActivityPanel() {
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { activity, loading } = useActivityFeed(currentWorkspace?.id)
  const { hasUnread, markAllRead } = useUnreadActivity(currentWorkspace?.id, user?.id)

  return (
    <aside className="sticky top-0 flex h-screen w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-surface px-5 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Activity</h2>
        <Button type="button" variant="ghost" size="sm" onClick={markAllRead} disabled={!hasUnread}>
          Mark all read
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : activity.length === 0 ? (
        <p className="text-sm text-muted">No activity yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {activity.map((entry) => {
            const split = splitActorPrefix(entry)
            return (
              <li key={entry.id} className="flex gap-2.5 rounded-sm px-1 py-2">
                <Avatar name={entry.actor?.name} email={entry.actor?.email} className="mt-0.5 h-7 w-7 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-relaxed text-text">
                    {split ? (
                      <>
                        <span className="font-semibold">{split.actorLabel}</span>
                        {split.rest}
                      </>
                    ) : (
                      entry.summary
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-faint">{formatRelativeTime(entry.occurred_at)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}

export default ActivityPanel
