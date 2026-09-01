import { Route, Routes } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import DashboardPage from '@/pages/DashboardPage'
import CreateWorkspacePage from '@/pages/CreateWorkspacePage'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PublicOnlyRoute from '@/components/auth/PublicOnlyRoute'
import RequireWorkspace from '@/components/workspace/RequireWorkspace'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <SignupPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RequireWorkspace>
              <DashboardPage />
            </RequireWorkspace>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/new"
        element={
          <ProtectedRoute>
            <CreateWorkspacePage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
