import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { validateClientForm } from '@/lib/validateClientForm'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useWorkspaceClients } from '@/lib/useWorkspaceClients'
import { useMyWorkspaceRole } from '@/lib/useMyWorkspaceRole'

const INITIAL_VALUES = { name: '', email: '', phone: '', company: '', website: '' }

function ClientsPage() {
  const { currentWorkspace } = useWorkspace()
  const { clients, createClient } = useWorkspaceClients(currentWorkspace.id)
  const { role: myRole } = useMyWorkspaceRole(currentWorkspace.id)
  const canWrite = myRole !== 'Viewer'

  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isCreating, setIsCreating] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateClientForm(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitError(null)
    setIsCreating(true)

    try {
      await createClient(values)
      setValues(INITIAL_VALUES)
    } catch (createError) {
      console.error('Failed to create client:', createError)
      setSubmitError('Something went wrong creating your client. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-heading font-semibold text-text">Clients</h1>

      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle className="text-heading">All clients</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-muted">No clients yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {clients.map((client) => (
                <li key={client.id}>
                  <Link to={`/clients/${client.id}`} className="text-secondary hover:underline">
                    {client.name}
                  </Link>
                  {client.company && <span className="text-muted"> - {client.company}</span>}
                </li>
              ))}
            </ul>
          )}

          {canWrite && (
            <form className="mt-4 flex flex-col gap-3 border-t border-border pt-4" onSubmit={handleSubmit} noValidate>
              {submitError && (
                <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{submitError}</p>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clientName">Name</Label>
                <Input
                  id="clientName"
                  name="name"
                  type="text"
                  value={values.name}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && <p className="text-xs text-danger">{errors.email}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clientPhone">Phone</Label>
                <Input id="clientPhone" name="phone" type="text" value={values.phone} onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clientCompany">Company</Label>
                <Input id="clientCompany" name="company" type="text" value={values.company} onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clientWebsite">Website</Label>
                <Input id="clientWebsite" name="website" type="text" value={values.website} onChange={handleChange} />
              </div>
              <Button type="submit" variant="outline" className="self-start" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Add client'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ClientsPage
