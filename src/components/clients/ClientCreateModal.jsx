import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { validateClientForm } from '@/lib/validateClientForm'
import { cn } from '@/lib/utils'

const INITIAL_VALUES = {
  name: '',
  company: '',
  email: '',
  phone: '',
  website: '',
  industry: '',
  ownerId: '',
  relationship: 'Prospect',
  notes: '',
}

const CAPTION_CLASS = 'text-xs font-semibold uppercase tracking-wide text-muted'

const RELATIONSHIPS = ['Active', 'Prospect', 'Churned']

const RELATIONSHIP_DOT_CLASS = {
  Active: 'bg-success',
  Prospect: 'bg-secondary',
  Churned: 'bg-danger',
}

function ClientCreateModal({
  open,
  onOpenChange,
  createClient,
  updateClient,
  clientId,
  mode = 'create',
  members,
  initialValues = {},
}) {
  const [values, setValues] = useState({ ...INITIAL_VALUES, ...initialValues })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = mode === 'edit'

  function handleChange(event) {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function handleCancel() {
    setValues({ ...INITIAL_VALUES, ...initialValues })
    setErrors({})
    setSubmitError(null)
    onOpenChange(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateClientForm({ name: values.name, email: values.email })
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitError(null)
    setIsSubmitting(true)

    try {
      if (isEdit) {
        await updateClient(clientId, values)
      } else {
        await createClient(values)
        setValues(INITIAL_VALUES)
      }
      onOpenChange(false)
    } catch (submitErr) {
      console.error(`Failed to ${isEdit ? 'update' : 'create'} client:`, submitErr)
      setSubmitError(`Something went wrong ${isEdit ? 'saving' : 'creating'} your client. Please try again.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleKeyDown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      handleSubmit(event)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader className="border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {isEdit ? 'Edit client' : 'New client'}
          </p>
          <DialogTitle>{isEdit ? 'Edit client' : 'Create a client'}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this client's contact and relationship details." : 'Keep contact and relationship details in one place.'}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
          {submitError && (
            <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{submitError}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="modalClientName" className={CAPTION_CLASS}>
              Client name
            </Label>
            <Input
              id="modalClientName"
              name="name"
              type="text"
              value={values.name}
              onChange={handleChange}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="modalClientCompany" className={CAPTION_CLASS}>
                Company
              </Label>
              <Input id="modalClientCompany" name="company" type="text" value={values.company} onChange={handleChange} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="modalClientEmail" className={CAPTION_CLASS}>
                Email
              </Label>
              <Input
                id="modalClientEmail"
                name="email"
                type="email"
                value={values.email}
                onChange={handleChange}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <p className="text-xs text-danger">{errors.email}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="modalClientPhone" className={CAPTION_CLASS}>
                Phone
              </Label>
              <Input id="modalClientPhone" name="phone" type="text" value={values.phone} onChange={handleChange} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="modalClientWebsite" className={CAPTION_CLASS}>
              Website
            </Label>
            <Input id="modalClientWebsite" name="website" type="text" value={values.website} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="modalClientIndustry" className={CAPTION_CLASS}>
                Industry
              </Label>
              <Input
                id="modalClientIndustry"
                name="industry"
                type="text"
                value={values.industry}
                onChange={handleChange}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="modalClientOwnerId" className={CAPTION_CLASS}>
                Account owner
              </Label>
              <Select id="modalClientOwnerId" name="ownerId" value={values.ownerId} onChange={handleChange}>
                <option value="">No owner</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || member.email}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className={CAPTION_CLASS}>Relationship</Label>
            <div className="flex gap-2">
              {RELATIONSHIPS.map((relationship) => (
                <button
                  key={relationship}
                  type="button"
                  onClick={() => handleChange({ target: { name: 'relationship', value: relationship } })}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-sm border px-3 py-1.5 text-sm transition',
                    values.relationship === relationship
                      ? 'border-accent-border bg-accent-bg text-text'
                      : 'border-border bg-transparent text-muted hover:bg-surface-hover',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', RELATIONSHIP_DOT_CLASS[relationship])} />
                  {relationship}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="modalClientNotes" className={CAPTION_CLASS}>
              Notes
            </Label>
            <Textarea id="modalClientNotes" name="notes" value={values.notes} onChange={handleChange} />
          </div>

          <DialogFooter className="justify-between border-t border-border pt-4">
            <p className="text-xs text-muted">Press Cmd/Ctrl+Enter to save</p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (isEdit ? 'Saving...' : 'Creating...') : isEdit ? 'Save changes' : 'Create client'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ClientCreateModal
