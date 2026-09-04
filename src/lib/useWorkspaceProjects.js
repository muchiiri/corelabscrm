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
        .select('id, name')
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

  async function createProject(name, clientId) {
    const { data, error } = await supabase
      .from('projects')
      .insert({ workspace_id: workspaceId, name: name.trim(), client_id: clientId || null })
      .select('id, name')
      .single()

    if (error) {
      throw error
    }

    setProjects((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    logActivity(workspaceId, user.id, `${user.email} created project "${data.name}"`, 'project', data.id)
    return data
  }

  return { projects, loading, createProject }
}
