import { Navigate } from 'react-router-dom'
import { useWorkspace } from '@/lib/WorkspaceContext'

function RequireWorkspace({ children }) {
  const { currentWorkspace, loading } = useWorkspace()

  if (loading) {
    return <p className="flex min-h-screen items-center justify-center text-muted">Loading...</p>
  }

  if (!currentWorkspace) {
    return <Navigate to="/workspace/new" replace />
  }

  return children
}

export default RequireWorkspace
