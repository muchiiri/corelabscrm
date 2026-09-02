import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useWorkspaceProjects(workspaceId) {
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

  async function createProject(name) {
    const { data, error } = await supabase
      .from('projects')
      .insert({ workspace_id: workspaceId, name: name.trim() })
      .select('id, name')
      .single()

    if (error) {
      throw error
    }

    setProjects((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  return { projects, loading, createProject }
}
