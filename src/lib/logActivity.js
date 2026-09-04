import { supabase } from '@/lib/supabase'

export async function logActivity(workspaceId, actorId, summary, entityType = null, entityId = null) {
  const { error } = await supabase.from('activity_log').insert({
    workspace_id: workspaceId,
    actor_id: actorId,
    summary,
    entity_type: entityType,
    entity_id: entityId,
  })

  if (error) {
    console.error('Failed to log activity:', error)
    return
  }

  window.dispatchEvent(new Event('activity-log:changed'))
}
