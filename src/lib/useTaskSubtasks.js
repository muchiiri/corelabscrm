import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useTaskSubtasks(taskId) {
  const [subtasks, setSubtasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!taskId) {
        setSubtasks([])
        setLoading(false)
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from('task_subtasks')
        .select('id, title, is_done, position')
        .eq('task_id', taskId)
        .order('position', { ascending: true })

      if (cancelled) {
        return
      }

      if (error) {
        console.error('Failed to load subtasks:', error)
        setSubtasks([])
      } else {
        setSubtasks(data)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [taskId])

  async function addSubtask(title) {
    const nextPosition =
      subtasks.length > 0 ? Math.max(...subtasks.map((subtask) => subtask.position)) + 1 : 0

    const { data, error } = await supabase
      .from('task_subtasks')
      .insert({ task_id: taskId, title: title.trim(), position: nextPosition })
      .select('id, title, is_done, position')
      .single()

    if (error) {
      throw error
    }

    setSubtasks((prev) => [...prev, data])
    return data
  }

  async function toggleSubtask(id, isDone) {
    const { error } = await supabase.from('task_subtasks').update({ is_done: isDone }).eq('id', id)

    if (error) {
      throw error
    }

    setSubtasks((prev) =>
      prev.map((subtask) => (subtask.id === id ? { ...subtask, is_done: isDone } : subtask)),
    )
  }

  async function deleteSubtask(id) {
    const { error } = await supabase.from('task_subtasks').delete().eq('id', id)

    if (error) {
      throw error
    }

    setSubtasks((prev) => prev.filter((subtask) => subtask.id !== id))
  }

  return { subtasks, loading, addSubtask, toggleSubtask, deleteSubtask }
}
