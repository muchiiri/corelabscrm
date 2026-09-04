import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import ActivityPanel from '@/components/layout/ActivityPanel'

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-bg text-text">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
      <ActivityPanel />
    </div>
  )
}

export default AppLayout
