import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useWorkspaceMembers(workspaceId) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) {
      return []
    }

    const { data: memberRows, error: memberError } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId)

    if (memberError) {
      console.error('Failed to load workspace members:', memberError)
      return []
    }

    const roleByUserId = new Map(memberRows.map((row) => [row.user_id, row.role]))
    const userIds = memberRows.map((row) => row.user_id)
    if (userIds.length === 0) {
      return []
    }

    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds)

    if (profileError) {
      console.error('Failed to load member profiles:', profileError)
      return []
    }

    return profileRows.map((profile) => ({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: roleByUserId.get(profile.id),
    }))
  }, [workspaceId])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const result = await fetchMembers()
      if (!cancelled) {
        setMembers(result)
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [fetchMembers])

  async function refetch() {
    const result = await fetchMembers()
    setMembers(result)
  }

  return { members, loading, refetch }
}
