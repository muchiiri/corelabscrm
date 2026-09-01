import { Route, Routes } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import DashboardPage from '@/pages/DashboardPage'
import CreateWorkspacePage from '@/pages/CreateWorkspacePage'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PublicOnlyRoute from '@/components/auth/PublicOnlyRoute'
import RequireWorkspace from '@/components/workspace/RequireWorkspace'
import AppLayout from '@/components/layout/AppLayout'

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
        path="/workspace/new"
        element={
          <ProtectedRoute>
            <CreateWorkspacePage />
          </ProtectedRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <RequireWorkspace>
              <AppLayout />
            </RequireWorkspace>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>
    </Routes>
  )
}

export default App
