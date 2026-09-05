import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { resolveCurrentWorkspace } from '@/lib/resolveCurrentWorkspace'

const WorkspaceContext = createContext(undefined)
const STORAGE_KEY = 'taskflow.currentWorkspaceId'

function getPersistedWorkspaceId() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function setPersistedWorkspaceId(workspaceId) {
  try {
    localStorage.setItem(STORAGE_KEY, workspaceId)
  } catch {
    // Private browsing or storage disabled - the selection just won't survive a reload.
  }
}

export function WorkspaceProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(getPersistedWorkspaceId)

  const refetch = useCallback(async () => {
    if (!user) {
      setWorkspaces([])
      return
    }

    const { data, error } = await supabase
      .from('workspaces')
      .select('id, name, owner_id, created_at')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to load workspaces:', error)
      setWorkspaces([])
    } else {
      setWorkspaces(data)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) {
      return
    }
    // Without this, a refetch triggered by `user` changing (e.g. logging in
    // right after being signed out, where `loading` already settled to
    // false with an empty `workspaces`) would leave `loading` false while
    // the new fetch is in flight - callers like RequireWorkspace would see
    // stale, empty `workspaces` and redirect before the real data arrives.
    setLoading(true)
    refetch().finally(() => setLoading(false))
  }, [authLoading, refetch])

  function setCurrentWorkspace(workspaceId) {
    setCurrentWorkspaceId(workspaceId)
    setPersistedWorkspaceId(workspaceId)
  }

  const value = {
    workspaces,
    currentWorkspace: resolveCurrentWorkspace(workspaces, currentWorkspaceId),
    setCurrentWorkspace,
    loading: authLoading || loading,
    refetch,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}
