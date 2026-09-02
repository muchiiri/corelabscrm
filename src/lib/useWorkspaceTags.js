import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useWorkspaceTags(workspaceId) {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!workspaceId) {
        setTags([])
        setLoading(false)
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from('tags')
        .select('id, name, color')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true })

      if (cancelled) {
        return
      }

      if (error) {
        console.error('Failed to load tags:', error)
        setTags([])
      } else {
        setTags(data)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  async function createTag(name, color) {
    const { data, error } = await supabase
      .from('tags')
      .insert({ workspace_id: workspaceId, name: name.trim(), color })
      .select('id, name, color')
      .single()

    if (error) {
      throw error
    }

    setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  return { tags, loading, createTag }
}
