import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'

const NOTIFICATION_ROWS = [
  {
    key: 'notify_assigned_to_me',
    label: 'Assigned to me',
    description: 'Email me the moment a task lands on my list.',
  },
  {
    key: 'notify_mentions',
    label: 'Mentions and comments',
    description: 'Someone @mentions me or replies on a task I follow.',
  },
  {
    key: 'notify_due_soon',
    label: 'Due soon',
    description: 'A morning digest of anything due in the next 48 hours.',
  },
  {
    key: 'notify_project_activity',
    label: 'Project activity',
    description: 'Every status change on projects I am a member of.',
  },
  {
    key: 'notify_product_news',
    label: 'Product news',
    description: 'Occasional notes about new TaskFlow features.',
  },
]

function NotificationsTab() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [rowError, setRowError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('profiles')
        .select(NOTIFICATION_ROWS.map((row) => row.key).join(', '))
        .eq('id', user.id)
        .single()

      if (cancelled) {
        return
      }
      if (error || !data) {
        console.error('Failed to load notification preferences:', error)
        setLoadError(true)
        setLoading(false)
        return
      }

      setPreferences(data)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user.id])

  async function handleToggle(key, nextValue) {
    setRowError(null)
    const previousValue = preferences[key]
    setPreferences((prev) => ({ ...prev, [key]: nextValue }))

    const { error } = await supabase.from('profiles').update({ [key]: nextValue }).eq('id', user.id)

    if (error) {
      console.error('Failed to update notification preference:', error)
      setPreferences((prev) => ({ ...prev, [key]: previousValue }))
      setRowError('Something went wrong saving that change. Please try again.')
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading...</p>
  }

  if (loadError) {
    return (
      <p className="text-sm text-danger">
        Something went wrong loading your notification preferences. Please try again.
      </p>
    )
  }

  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle className="text-heading">Notifications</CardTitle>
        <CardDescription>Choose what reaches your inbox and what stays in the app.</CardDescription>
      </CardHeader>
      <CardContent>
        {rowError && (
          <p className="mb-3 rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{rowError}</p>
        )}
        <ul className="flex flex-col gap-4">
          {NOTIFICATION_ROWS.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-text">{row.label}</p>
                <p className="text-xs text-muted">{row.description}</p>
              </div>
              <Switch
                checked={preferences[row.key]}
                onChange={(nextValue) => handleToggle(row.key, nextValue)}
              />
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-border pt-4 text-xs text-muted">
          These preferences are saved now and will take effect once email delivery ships.
        </p>
        <p className="mt-2 text-xs text-muted">Notification preferences save per account.</p>
      </CardContent>
    </Card>
  )
}

export default NotificationsTab
