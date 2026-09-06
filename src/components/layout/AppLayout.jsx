import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import ActivityPanel from '@/components/layout/ActivityPanel'
import MobileNav from '@/components/layout/MobileNav'

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text lg:flex-row">
      <MobileNav />
      <div className="hidden lg:flex">
        <Sidebar />
      </div>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
      <div className="hidden lg:flex">
        <ActivityPanel />
      </div>
    </div>
  )
}

export default AppLayout
