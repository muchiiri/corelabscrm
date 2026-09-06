import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Activity, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import Sidebar from '@/components/layout/Sidebar'
import ActivityPanel from '@/components/layout/ActivityPanel'
import { useWorkspace } from '@/lib/WorkspaceContext'

function MobileNav() {
  const { currentWorkspace } = useWorkspace()
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isActivityOpen, setIsActivityOpen] = useState(false)

  useEffect(() => {
    setIsSidebarOpen(false)
    setIsActivityOpen(false)
  }, [location.pathname])

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-3 py-2 lg:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <p className="truncate text-sm font-semibold text-text">{currentWorkspace.name}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={() => setIsActivityOpen(true)}
          aria-label="Open activity"
        >
          <Activity className="h-5 w-5" />
        </Button>
      </div>

      <Dialog open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <DialogContent className="fixed inset-y-0 left-0 h-full w-64 max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0">
          <Sidebar />
        </DialogContent>
      </Dialog>

      <Dialog open={isActivityOpen} onOpenChange={setIsActivityOpen}>
        <DialogContent className="fixed inset-y-0 left-auto right-0 h-full w-80 max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0">
          <ActivityPanel />
        </DialogContent>
      </Dialog>
    </>
  )
}

export default MobileNav
