import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { logActivity } from '@/lib/logActivity'

export function useWorkspaceProjects(workspaceId) {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!workspaceId) {
        setProjects([])
        setLoading(false)
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_id, status, description, owner_id, start_date, target_date, label_color, deal_value, deal_currency')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true })

      if (cancelled) {
        return
      }

      if (error) {
        console.error('Failed to load projects:', error)
        setProjects([])
      } else {
        setProjects(data)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  async function createProject({
    name,
    clientId,
    description,
    ownerId,
    startDate,
    targetDate,
    labelColor,
    dealValue,
    dealCurrency,
    memberIds = [],
  }) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        client_id: clientId || null,
        description: description?.trim() || null,
        owner_id: ownerId || null,
        start_date: startDate || null,
        target_date: targetDate || null,
        label_color: labelColor || 'gray',
        deal_value: dealValue ? Number(dealValue) : null,
        deal_currency: dealCurrency || 'USD',
      })
      .select('id, name, client_id, status, description, owner_id, start_date, target_date, label_color, deal_value, deal_currency')
      .single()

    if (error) {
      throw error
    }

    // Best-effort, not atomic with the project insert above - a partial
    // failure here just means reopening the project and re-adding team
    // members later, not worth an RPC's complexity for this feature.
    if (memberIds.length > 0) {
      const { error: memberInsertError } = await supabase
        .from('project_members')
        .insert(memberIds.map((memberId) => ({ project_id: data.id, user_id: memberId })))
      if (memberInsertError) {
        console.error('Failed to save team members:', memberInsertError)
      }
    }

    setProjects((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))

    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()
    const actorName = actorProfile?.name || user.email
    logActivity(workspaceId, user.id, `${actorName} created project "${data.name}"`, 'project', data.id)

    return data
  }

  return { projects, loading, createProject }
}
