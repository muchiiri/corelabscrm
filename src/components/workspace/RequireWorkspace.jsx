import { Navigate } from 'react-router-dom'
import { useWorkspace } from '@/lib/WorkspaceContext'

function RequireWorkspace({ children }) {
  const { currentWorkspace, workspaces, loading } = useWorkspace()

  if (loading) {
    return <p className="flex min-h-screen items-center justify-center text-muted">Loading...</p>
  }

  if (!currentWorkspace) {
    return <Navigate to={workspaces.length > 0 ? '/workspace' : '/workspace/new'} replace />
  }

  return children
}

export default RequireWorkspace
