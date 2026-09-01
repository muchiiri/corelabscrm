import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWorkspace } from '@/lib/WorkspaceContext'

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
        className="w-full truncate rounded-sm px-2 py-1.5 text-left font-semibold text-text hover:bg-border"
      >
        {currentWorkspace?.name}
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-sm border border-border bg-bg py-1 shadow-md">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              onClick={() => handleSelect(workspace.id)}
              className="block w-full truncate px-3 py-1.5 text-left text-sm text-text hover:bg-border"
            >
              {workspace.name}
            </button>
          ))}
          <Link
            to="/workspace/new"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-1.5 text-sm text-secondary hover:bg-border"
          >
            + Create new workspace
          </Link>
        </div>
      )}
    </div>
  )
}

export default WorkspaceSwitcher
