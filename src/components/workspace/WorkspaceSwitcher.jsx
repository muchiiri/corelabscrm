import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { cn } from '@/lib/utils'

function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspace()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleOutsideClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  function handleSelect(workspaceId) {
    setCurrentWorkspace(workspaceId)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2.5 rounded-sm border border-transparent p-2 text-left transition hover:bg-surface-hover"
      >
        <Avatar name={currentWorkspace?.name} className="h-7 w-7 rounded-md text-sm" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">
          {currentWorkspace?.name}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-sm border border-border bg-surface p-1.5 shadow-md">
          <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
            Workspaces
          </p>
          {workspaces.map((workspace) => {
            const active = workspace.id === currentWorkspace?.id
            return (
              <button
                key={workspace.id}
                type="button"
                onClick={() => handleSelect(workspace.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left text-sm transition',
                  active ? 'bg-accent-bg' : 'hover:bg-surface-hover',
                )}
              >
                <Avatar name={workspace.name} className="h-6 w-6 rounded-md text-[11px]" />
                <span className="min-w-0 flex-1 truncate text-text">{workspace.name}</span>
                {active && <Check className="h-4 w-4 shrink-0 text-accent" />}
              </button>
            )
          })}
          <div className="my-1 h-px bg-border" />
          <Link
            to="/workspace/new"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm text-secondary hover:bg-surface-hover"
          >
            <Plus className="h-4 w-4" />
            New workspace
          </Link>
        </div>
      )}
    </div>
  )
}

export default WorkspaceSwitcher
