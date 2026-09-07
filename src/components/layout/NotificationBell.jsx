import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useAuth } from '@/lib/AuthContext'
import { useUnreadActivity } from '@/lib/useUnreadActivity'

// Shared across every page header - previously duplicated identically 9
// times as a bare disabled button with no unread indicator. Stays exactly
// as decorative as before (disabled, same aria-label); only the dot is new.
function NotificationBell() {
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { hasUnread } = useUnreadActivity(currentWorkspace?.id, user?.id)

  return (
    <Button type="button" variant="ghost" size="icon" disabled aria-label="Notifications" className="bg-surface">
      <span className="relative inline-flex">
        <Bell className="h-4 w-4" />
        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
        )}
      </span>
    </Button>
  )
}

export default NotificationBell
