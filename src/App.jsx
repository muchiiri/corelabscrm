import { Route, Routes } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import DashboardPage from '@/pages/DashboardPage'
import CreateWorkspacePage from '@/pages/CreateWorkspacePage'
import WorkspaceSettingsPage from '@/pages/WorkspaceSettingsPage'
import TaskListPage from '@/pages/TaskListPage'
import CreateTaskPage from '@/pages/CreateTaskPage'
import TaskEditPage from '@/pages/TaskEditPage'
import ProjectsPage from '@/pages/ProjectsPage'
import ProjectOverviewPage from '@/pages/ProjectOverviewPage'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PublicOnlyRoute from '@/components/auth/PublicOnlyRoute'
import RequireWorkspace from '@/components/workspace/RequireWorkspace'
import RequireEditor from '@/components/workspace/RequireEditor'
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
        <Route path="/tasks" element={<TaskListPage />} />
        <Route
          path="/tasks/new"
          element={
            <RequireEditor>
              <CreateTaskPage />
            </RequireEditor>
          }
        />
        <Route path="/tasks/:id/edit" element={<TaskEditPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectOverviewPage />} />
        <Route path="/settings/workspace" element={<WorkspaceSettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
