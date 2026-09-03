import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/AuthContext'
import WorkspaceSwitcher from '@/components/workspace/WorkspaceSwitcher'
import ThemeToggle from '@/components/layout/ThemeToggle'

function Sidebar() {
  const { signOut } = useAuth()

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-bg px-4 py-6">
      <WorkspaceSwitcher />

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        <Link to="/dashboard" className="rounded-sm px-2 py-1.5 text-sm text-text hover:bg-border">
          Dashboard
        </Link>
        <Link to="/tasks" className="rounded-sm px-2 py-1.5 text-sm text-text hover:bg-border">
          Tasks
        </Link>
        <Link to="/tasks/kanban" className="rounded-sm px-2 py-1.5 text-sm text-text hover:bg-border">
          Kanban
        </Link>
        <Link to="/tasks/calendar" className="rounded-sm px-2 py-1.5 text-sm text-text hover:bg-border">
          Calendar
        </Link>
        <Link to="/projects" className="rounded-sm px-2 py-1.5 text-sm text-text hover:bg-border">
          Projects
        </Link>
        <Link to="/clients" className="rounded-sm px-2 py-1.5 text-sm text-text hover:bg-border">
          Clients
        </Link>
        <Link
          to="/settings/workspace"
          className="rounded-sm px-2 py-1.5 text-sm text-text hover:bg-border"
        >
          Settings
        </Link>
      </nav>

      <div className="flex items-center justify-between gap-2">
        <ThemeToggle />
        <Button type="button" variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </aside>
  )
}

export default Sidebar
