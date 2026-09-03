import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useClientInteractionLogs(clientId) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!clientId) {
        setLogs([])
        setLoading(false)
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from('client_interaction_logs')
        .select('id, author_id, note, occurred_at')
        .eq('client_id', clientId)
        .order('occurred_at', { ascending: false })

      if (cancelled) {
        return
      }

      if (error) {
        console.error('Failed to load interaction logs:', error)
        setLogs([])
      } else {
        setLogs(data)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [clientId])

  async function createLog(authorId, note) {
    const { data, error } = await supabase
      .from('client_interaction_logs')
      .insert({ client_id: clientId, author_id: authorId, note: note.trim() })
      .select('id, author_id, note, occurred_at')
      .single()

    if (error) {
      throw error
    }

    setLogs((prev) => [data, ...prev])
    return data
  }

  return { logs, loading, createLog }
}
