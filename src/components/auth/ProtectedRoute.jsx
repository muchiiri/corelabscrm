import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return <p className="flex min-h-screen items-center justify-center text-muted">Loading...</p>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
