import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'

const WorkspaceContext = createContext(undefined)

export function WorkspaceProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)

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
    refetch().finally(() => setLoading(false))
  }, [authLoading, refetch])

  const value = {
    workspaces,
    currentWorkspace: workspaces[0] ?? null,
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
