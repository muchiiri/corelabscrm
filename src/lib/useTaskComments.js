import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useTaskComments(taskId) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!taskId) {
        setComments([])
        setLoading(false)
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from('task_comments')
        .select('id, author_id, body, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (cancelled) {
        return
      }

      if (error) {
        console.error('Failed to load comments:', error)
        setComments([])
      } else {
        setComments(data)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [taskId])

  async function addComment(authorId, body) {
    const { data, error } = await supabase
      .from('task_comments')
      .insert({ task_id: taskId, author_id: authorId, body: body.trim() })
      .select('id, author_id, body, created_at')
      .single()

    if (error) {
      throw error
    }

    setComments((prev) => [data, ...prev])
    return data
  }

  return { comments, loading, addComment }
}
