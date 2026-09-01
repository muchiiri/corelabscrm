import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/AuthContext'
import WorkspaceSwitcher from '@/components/workspace/WorkspaceSwitcher'

function Sidebar() {
  const { signOut } = useAuth()

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-bg px-4 py-6">
      <WorkspaceSwitcher />

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        <Link to="/dashboard" className="rounded-sm px-2 py-1.5 text-sm text-text hover:bg-border">
          Dashboard
        </Link>
      </nav>

      <Button type="button" variant="outline" onClick={signOut}>
        Sign out
      </Button>
    </aside>
  )
}

export default Sidebar
