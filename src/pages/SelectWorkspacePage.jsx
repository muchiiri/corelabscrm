import { useNavigate, Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useWorkspace } from '@/lib/WorkspaceContext'

function SelectWorkspacePage() {
  const navigate = useNavigate()
  const { workspaces, loading, setCurrentWorkspace } = useWorkspace()

  function handleSelect(workspaceId) {
    setCurrentWorkspace(workspaceId)
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-text">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-heading">Select a workspace</CardTitle>
          <CardDescription>Choose which workspace you'd like to work in.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted">Loading your workspaces...</p>
          ) : workspaces.length === 0 ? (
            <p className="text-sm text-muted">You don't have any workspaces yet.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => handleSelect(workspace.id)}
                  className="flex w-full items-center gap-2.5 rounded-sm border border-transparent p-2 text-left transition hover:bg-surface-hover"
                >
                  <Avatar name={workspace.name} className="h-7 w-7 rounded-md text-sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">
                    {workspace.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          <Link
            to="/workspace/new"
            className="mt-4 flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm text-secondary hover:underline"
          >
            <Plus className="h-4 w-4" />
            Create new workspace
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default SelectWorkspacePage
