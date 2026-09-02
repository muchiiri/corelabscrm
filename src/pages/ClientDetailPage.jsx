import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

function ClientDetailPage() {
  const { id } = useParams()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

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
    </div>
  )
}

export default ClientDetailPage
