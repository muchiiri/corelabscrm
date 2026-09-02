import { Navigate } from 'react-router-dom'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'

function RequireEditor({ children }) {
  const { currentWorkspace } = useWorkspace()
  const { role, loading } = useMyWorkspaceRole(currentWorkspace?.id)

  if (loading) {
    return <p className="flex min-h-screen items-center justify-center text-muted">Loading...</p>
  }

  if (role === 'Viewer') {
    return <Navigate to="/tasks" replace />
  }

  return children
}

export default RequireEditor
