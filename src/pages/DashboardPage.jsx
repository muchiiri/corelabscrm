import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/AuthContext'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { supabase } from '@/lib/supabase'
import { computeDashboardMetrics } from '@/lib/computeDashboardMetrics'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const CARD_DEFS = [
  { key: 'tasksToday', label: 'Tasks today' },
  { key: 'completedThisWeek', label: 'Completed this week' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'inProgress', label: 'In progress' },
]

function DashboardPage() {
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('tasks')
        .select('status, due_at, updated_at')
        .eq('workspace_id', currentWorkspace.id)

      if (cancelled) {
        return
      }
      if (error) {
        console.error('Failed to load tasks:', error)
        setTasks([])
      } else {
        setTasks(data)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [currentWorkspace.id])

  if (loading) {
    return <p className="p-8 text-muted">Loading...</p>
  }

  const name = user?.user_metadata?.name || user?.email
  const metrics = computeDashboardMetrics(tasks)

  return (
    <div className="p-8">
      <h1 className="mb-6 text-heading font-semibold text-text">
        {getGreeting()}, {name}
      </h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {CARD_DEFS.map(({ key, label }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-text">{metrics[key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default DashboardPage
