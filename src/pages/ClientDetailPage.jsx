import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { validateInteractionNote } from '@/lib/validateInteractionNote'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceMembers } from '@/lib/useWorkspaceMembers'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'
import { useClientInteractionLogs } from '@/lib/useClientInteractionLogs'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'

function ClientDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { members } = useWorkspaceMembers(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const canWrite = myRole !== 'Viewer'
  const { logs, createLog } = useClientInteractionLogs(id)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [noteValue, setNoteValue] = useState('')
  const [noteErrors, setNoteErrors] = useState({})
  const [noteSubmitError, setNoteSubmitError] = useState(null)
  const [isLoggingNote, setIsLoggingNote] = useState(false)

  async function handleNoteSubmit(event) {
    event.preventDefault()
    const validationErrors = validateInteractionNote({ note: noteValue })
    setNoteErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setNoteSubmitError(null)
    setIsLoggingNote(true)

    try {
      await createLog(user.id, noteValue)
      setNoteValue('')
    } catch (logError) {
      console.error('Failed to log interaction:', logError)
      setNoteSubmitError('Something went wrong logging that note. Please try again.')
    } finally {
      setIsLoggingNote(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, phone, company, website')
        .eq('id', id)
        .maybeSingle()

      if (cancelled) {
        return
      }
      if (error || !data) {
        if (error) {
          console.error('Failed to load client:', error)
        }
        setNotFound(true)
        setLoading(false)
        return
      }

      setClient(data)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <p className="p-8 text-muted">Loading...</p>
  }

  if (notFound) {
    return (
      <p className="p-8 text-muted">
        Client not found.{' '}
        <Link to="/clients" className="text-secondary hover:underline">
          Back to clients
        </Link>
        .
      </p>
    )
  }

  return (
    <div className="p-8">
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle className="text-heading">{client.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-3 text-sm">
            {client.email && (
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="text-text">{client.email}</dd>
              </div>
            )}
            {client.phone && (
              <div>
                <dt className="text-muted">Phone</dt>
                <dd className="text-text">{client.phone}</dd>
              </div>
            )}
            {client.company && (
              <div>
                <dt className="text-muted">Company</dt>
                <dd className="text-text">{client.company}</dd>
              </div>
            )}
            {client.website && (
              <div>
                <dt className="text-muted">Website</dt>
                <dd className="text-text">{client.website}</dd>
              </div>
            )}
            {!client.email && !client.phone && !client.company && !client.website && (
              <p className="text-muted">No additional contact info.</p>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card className="mt-6 max-w-sm">
        <CardHeader>
          <CardTitle className="text-heading">Interaction history</CardTitle>
        </CardHeader>
        <CardContent>
          {canWrite && (
            <form className="mb-4 flex flex-col gap-3 border-b border-border pb-4" onSubmit={handleNoteSubmit} noValidate>
              {noteSubmitError && (
                <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{noteSubmitError}</p>
              )}
              <Textarea
                placeholder="Log an interaction or note..."
                value={noteValue}
                onChange={(event) => setNoteValue(event.target.value)}
                aria-invalid={Boolean(noteErrors.note)}
              />
              {noteErrors.note && <p className="text-xs text-danger">{noteErrors.note}</p>}
              <Button type="submit" variant="outline" className="self-start" disabled={isLoggingNote}>
                {isLoggingNote ? 'Logging...' : 'Add note'}
              </Button>
            </form>
          )}

          {logs.length === 0 ? (
            <p className="text-muted">No interactions logged yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {logs.map((log) => {
                const author = members.find((member) => member.id === log.author_id)
                return (
                  <li key={log.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Avatar name={author?.name} email={author?.email} />
                      <span>{author?.name || author?.email || 'Unknown'}</span>
                      <span>-</span>
                      <span>{new Date(log.occurred_at).toLocaleString()}</span>
                    </div>
                    <p className="text-text">{log.note}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ClientDetailPage
