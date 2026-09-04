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
import { TAG_COLORS, SWATCH_CLASS } from '@/components/tags/TagPicker'
import { validateProjectName } from '@/lib/validateProjectName'
import { cn } from '@/lib/utils'

const INITIAL_VALUES = {
  name: '',
  clientId: '',
  ownerId: '',
  startDate: '',
  targetDate: '',
  description: '',
  labelColor: 'gray',
}

const CAPTION_CLASS = 'text-xs font-semibold uppercase tracking-wide text-muted'

function ProjectCreateModal({ open, onOpenChange, createProject, clients, members }) {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateProjectName({ name: values.name })
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitError(null)
    setIsSubmitting(true)

    try {
      await createProject(values)
      setValues(INITIAL_VALUES)
      onOpenChange(false)
    } catch (createError) {
      console.error('Failed to create project:', createError)
      setSubmitError('Something went wrong creating your project. Please try again.')
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
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">New project</p>
          <DialogTitle>Create a project</DialogTitle>
          <DialogDescription>Track progress and keep your team aligned.</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
          {submitError && (
            <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{submitError}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="modalProjectName" className={CAPTION_CLASS}>
              Project name
            </Label>
            <Input
              id="modalProjectName"
              name="name"
              type="text"
              placeholder="e.g. Acme Corp website redesign"
              value={values.name}
              onChange={handleChange}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="modalProjectDescription" className={CAPTION_CLASS}>
              Description
            </Label>
            <Textarea
              id="modalProjectDescription"
              name="description"
              placeholder="What is this project about?"
              value={values.description}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="modalProjectClientId" className={CAPTION_CLASS}>
                Client
              </Label>
              <Select id="modalProjectClientId" name="clientId" value={values.clientId} onChange={handleChange}>
                <option value="">No client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="modalProjectOwnerId" className={CAPTION_CLASS}>
                Owner
              </Label>
              <Select id="modalProjectOwnerId" name="ownerId" value={values.ownerId} onChange={handleChange}>
                <option value="">No owner</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || member.email}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="modalProjectStartDate" className={CAPTION_CLASS}>
                Start date
              </Label>
              <Input
                id="modalProjectStartDate"
                name="startDate"
                type="date"
                value={values.startDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="modalProjectTargetDate" className={CAPTION_CLASS}>
              Target date
            </Label>
            <Input
              id="modalProjectTargetDate"
              name="targetDate"
              type="date"
              value={values.targetDate}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className={CAPTION_CLASS}>Label color</Label>
            <div className="flex gap-1.5">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`${color} label color`}
                  onClick={() => handleChange({ target: { name: 'labelColor', value: color } })}
                  className={cn(
                    'h-6 w-6 rounded-full border-2',
                    SWATCH_CLASS[color],
                    values.labelColor === color ? 'border-text' : 'border-transparent',
                  )}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="justify-between border-t border-border pt-4">
            <p className="text-xs text-muted">Press Cmd/Ctrl+Enter to save</p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create project'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ProjectCreateModal
