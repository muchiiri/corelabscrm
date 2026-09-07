import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { sendTestEmail } from '@/lib/sendTestEmail'

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
    description: 'A morning digest of anything due today or already overdue.',
  },
  {
    key: 'notify_evening_summary',
    label: 'Evening summary',
    description: "A wrap-up each evening of tasks you completed and today's workspace activity.",
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
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [testResult, setTestResult] = useState(null)

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

  async function handleSendTest() {
    setTestResult(null)
    setIsSendingTest(true)

    try {
      await sendTestEmail(user.email)
      setTestResult({ type: 'success', message: `Test email sent to ${user.email}.` })
    } catch (error) {
      console.error('Failed to send test email:', error)
      setTestResult({
        type: 'error',
        message: 'Something went wrong sending the test email. Please try again.',
      })
    } finally {
      setIsSendingTest(false)
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
    <Card>
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
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text">Test email delivery</p>
              <p className="text-xs text-muted">Send a one-off test email to {user.email} to confirm delivery is configured.</p>
            </div>
            <Button type="button" variant="outline" onClick={handleSendTest} disabled={isSendingTest}>
              {isSendingTest ? 'Sending...' : 'Send test email'}
            </Button>
          </div>
          {testResult && (
            <p
              className={`rounded-sm px-3 py-2 text-sm ${
                testResult.type === 'success' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
              }`}
            >
              {testResult.message}
            </p>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">
          Digest and reminder emails aren't wired to these toggles yet - that ships in a later feature.
        </p>
        <p className="mt-2 text-xs text-muted">Notification preferences save per account.</p>
      </CardContent>
    </Card>
  )
}

export default NotificationsTab
