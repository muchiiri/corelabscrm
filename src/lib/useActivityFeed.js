import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const FEED_LIMIT = 20

export function useActivityFeed(workspaceId) {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!workspaceId) {
        setActivity([])
        setLoading(false)
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from('activity_log')
        .select('id, actor_id, summary, entity_type, entity_id, occurred_at')
        .eq('workspace_id', workspaceId)
        .order('occurred_at', { ascending: false })
        .limit(FEED_LIMIT)

      if (cancelled) {
        return
      }
      if (error) {
        console.error('Failed to load activity feed:', error)
        setActivity([])
        setLoading(false)
        return
      }

      const actorIds = [...new Set(data.map((row) => row.actor_id).filter(Boolean))]
      if (actorIds.length === 0) {
        setActivity(data.map((row) => ({ ...row, actor: null })))
        setLoading(false)
        return
      }

      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', actorIds)

      if (cancelled) {
        return
      }
      if (profileError) {
        console.error('Failed to load activity actors:', profileError)
        setActivity(data.map((row) => ({ ...row, actor: null })))
        setLoading(false)
        return
      }

      const profilesById = new Map(profileRows.map((profile) => [profile.id, profile]))
      setActivity(data.map((row) => ({ ...row, actor: profilesById.get(row.actor_id) ?? null })))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  return { activity, loading }
}
