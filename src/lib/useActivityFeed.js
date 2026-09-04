import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const FEED_LIMIT = 20

export function useActivityFeed(workspaceId) {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // Guards two calls to load() racing within this same effect run (the
    // initial fetch and an 'activity-log:changed' event firing before it
    // resolves) - `cancelled` alone only protects against a stale run from
    // before a workspace switch, not overlapping calls within one run.
    let requestId = 0

    async function load() {
      const currentRequestId = ++requestId

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

      if (cancelled || requestId !== currentRequestId) {
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

      if (cancelled || requestId !== currentRequestId) {
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
    window.addEventListener('activity-log:changed', load)
    return () => {
      cancelled = true
      window.removeEventListener('activity-log:changed', load)
    }
  }, [workspaceId])

  return { activity, loading }
}
