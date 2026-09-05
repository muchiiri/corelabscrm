import { Link, useLocation } from 'react-router-dom'
import { Calendar, FolderKanban, Kanban, LayoutDashboard, ListChecks, LogOut, Settings, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { useAuth } from '@/lib/AuthContext'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import WorkspaceSwitcher from '@/components/workspace/WorkspaceSwitcher'
import ThemeToggle from '@/components/layout/ThemeToggle'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, isActive: (path) => path === '/dashboard' },
  { to: '/tasks', label: 'Tasks', Icon: ListChecks, isActive: (path) => path === '/tasks' },
  { to: '/tasks/kanban', label: 'Kanban', Icon: Kanban, isActive: (path) => path === '/tasks/kanban' },
  { to: '/tasks/calendar', label: 'Calendar', Icon: Calendar, isActive: (path) => path === '/tasks/calendar' },
  { to: '/projects', label: 'Projects', Icon: FolderKanban, isActive: (path) => path.startsWith('/projects') },
  { to: '/clients', label: 'Clients', Icon: Users, isActive: (path) => path.startsWith('/clients') },
  { to: '/settings/workspace', label: 'Settings', Icon: Settings, isActive: (path) => path.startsWith('/settings') },
]

function Sidebar() {
  const { signOut, user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const location = useLocation()

  const me = members.find((member) => member.id === user?.id)

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-6 border-r border-border bg-surface px-4 py-5">
      <WorkspaceSwitcher />

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map(({ to, label, Icon, isActive }) => {
          const active = isActive(location.pathname)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-sm px-2.5 py-2 text-sm transition',
                active ? 'bg-accent-bg font-semibold text-accent' : 'font-semibold text-text hover:bg-surface-hover',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-col gap-3">
        <ThemeToggle />
        <div className="flex items-center gap-2 rounded-sm px-1 py-1">
          <Avatar name={me?.name} email={me?.email ?? user?.email} className="h-7 w-7" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-text">{me?.name || me?.email || user?.email}</p>
            {me?.role && <p className="truncate text-xs text-muted">{me.role}</p>}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
