import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-bg text-text">
      <Sidebar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
