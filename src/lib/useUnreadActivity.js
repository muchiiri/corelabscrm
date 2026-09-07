import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useUnreadActivity(workspaceId, userId) {
  const [hasUnread, setHasUnread] = useState(false)

  const checkUnread = useCallback(async () => {
    if (!workspaceId || !userId) {
      setHasUnread(false)
      return
    }

    const { data: readRow, error: readError } = await supabase
      .from('activity_reads')
      .select('last_read_at')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle()

    if (readError) {
      console.error('Failed to load activity read state:', readError)
      return
    }

    let query = supabase
      .from('activity_log')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)

    // No read row yet means nothing has ever been marked read - everything
    // currently in the log counts as unread.
    if (readRow?.last_read_at) {
      query = query.gt('occurred_at', readRow.last_read_at)
    }

    const { count, error: countError } = await query

    if (countError) {
      console.error('Failed to check unread activity:', countError)
      return
    }

    setHasUnread((count ?? 0) > 0)
  }, [workspaceId, userId])

  useEffect(() => {
    checkUnread()
    window.addEventListener('activity-log:changed', checkUnread)
    window.addEventListener('activity-read:changed', checkUnread)
    return () => {
      window.removeEventListener('activity-log:changed', checkUnread)
      window.removeEventListener('activity-read:changed', checkUnread)
    }
  }, [checkUnread])

  const markAllRead = useCallback(async () => {
    if (!workspaceId || !userId) {
      return
    }

    const { error } = await supabase.from('activity_reads').upsert(
      { workspace_id: workspaceId, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: 'workspace_id,user_id' },
    )

    if (error) {
      console.error('Failed to mark activity read:', error)
      return
    }

    window.dispatchEvent(new Event('activity-read:changed'))
  }, [workspaceId, userId])

  return { hasUnread, markAllRead }
}
