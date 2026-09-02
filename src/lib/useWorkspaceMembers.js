import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useWorkspaceMembers(workspaceId) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!workspaceId) {
        setMembers([])
        setLoading(false)
        return
      }

      setLoading(true)

      const { data: memberRows, error: memberError } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)

      if (memberError) {
        console.error('Failed to load workspace members:', memberError)
        if (!cancelled) {
          setMembers([])
          setLoading(false)
        }
        return
      }

      const userIds = memberRows.map((row) => row.user_id)
      if (userIds.length === 0) {
        if (!cancelled) {
          setMembers([])
          setLoading(false)
        }
        return
      }

      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds)

      if (cancelled) {
        return
      }

      if (profileError) {
        console.error('Failed to load member profiles:', profileError)
        setMembers([])
      } else {
        setMembers(profileRows.map((profile) => ({ id: profile.id, name: profile.name, email: profile.email })))
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  return { members, loading }
}
