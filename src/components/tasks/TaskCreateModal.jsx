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
import TagPicker from '@/components/tags/TagPicker'
import { PRIORITY_DOT_CLASS } from '@/components/tasks/PriorityBadge'
import { useAuth } from '@/lib/AuthContext'
import { useCreateTask } from '@/lib/useCreateTask'
import { cn } from '@/lib/utils'

const PRIORITIES = ['High', 'Medium', 'Low']
const CAPTION_CLASS = 'text-xs font-semibold uppercase tracking-wide text-muted'

function TaskCreateModal({
  open,
  onOpenChange,
  workspaceId,
  members,
  tags,
  onCreateTag,
  projects,
  clients = [],
  initialValues,
}) {
  const { user } = useAuth()
  const { values, errors, submitError, isSubmitting, handleChange, handleSubmit } = useCreateTask({
    workspaceId,
    userId: user.id,
    userEmail: user.email,
    members,
    open,
    initialValues,
    onSuccess: () => onOpenChange(false),
  })

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
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">New task</p>
          <DialogTitle>Create a task</DialogTitle>
          <DialogDescription>It lands in the project backlog and on the assignee&apos;s list.</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
          {submitError && (
            <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{submitError}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="modalTaskTitle" className={CAPTION_CLASS}>
              Task name
            </Label>
            <Input
              id="modalTaskTitle"
              name="title"
              type="text"
              placeholder="e.g. Draft Q4 onboarding sequence"
              value={values.title}
              onChange={handleChange}
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title && <p className="text-xs text-danger">{errors.title}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="modalTaskDescription" className={CAPTION_CLASS}>
              Description
            </Label>
            <Textarea
              id="modalTaskDescription"
              name="description"
              placeholder="What needs to happen, and what does done look like?"
              value={values.description}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="modalTaskProjectId" className={CAPTION_CLASS}>
                Project
              </Label>
              <Select id="modalTaskProjectId" name="projectId" value={values.projectId} onChange={handleChange}>
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="modalTaskAssigneeId" className={CAPTION_CLASS}>
                Assignee
              </Label>
              <Select id="modalTaskAssigneeId" name="assigneeId" value={values.assigneeId} onChange={handleChange}>
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || member.email}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="modalTaskDueAt" className={CAPTION_CLASS}>
                Due date
              </Label>
              <Input
                id="modalTaskDueAt"
                type="date"
                value={values.dueAt ? values.dueAt.slice(0, 10) : ''}
                onChange={(event) => {
                  const date = event.target.value
                  handleChange({ target: { name: 'dueAt', value: date ? `${date}T09:00` : '' } })
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="modalTaskClientId" className={CAPTION_CLASS}>
              Client
            </Label>
            <Select id="modalTaskClientId" name="clientId" value={values.clientId} onChange={handleChange}>
              <option value="">No client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="modalTaskRecurrenceFrequency" className={CAPTION_CLASS}>
              Repeat
            </Label>
            <Select
              id="modalTaskRecurrenceFrequency"
              name="recurrenceFrequency"
              value={values.recurrenceFrequency}
              onChange={handleChange}
              disabled={!values.dueAt}
            >
              <option value="">Does not repeat</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </Select>
            {!values.dueAt && (
              <p className="text-xs text-muted">Set a due date to repeat this task.</p>
            )}
            {values.recurrenceFrequency && (
              <div className="mt-1 flex gap-4">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="modalTaskRecurrenceInterval" className={CAPTION_CLASS}>
                    Every
                  </Label>
                  <Input
                    id="modalTaskRecurrenceInterval"
                    name="recurrenceInterval"
                    type="number"
                    min="1"
                    step="1"
                    value={values.recurrenceInterval}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.recurrenceInterval)}
                  />
                  {errors.recurrenceInterval && (
                    <p className="text-xs text-danger">{errors.recurrenceInterval}</p>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="modalTaskRecurrenceEndDate" className={CAPTION_CLASS}>
                    Ends on
                  </Label>
                  <Input
                    id="modalTaskRecurrenceEndDate"
                    name="recurrenceEndDate"
                    type="date"
                    value={values.recurrenceEndDate}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="modalTaskStatus" className={CAPTION_CLASS}>
              Status
            </Label>
            <Select id="modalTaskStatus" name="status" value={values.status} onChange={handleChange}>
              <option value="Todo">Todo</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Waiting">Waiting</option>
              <option value="Done">Done</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className={CAPTION_CLASS}>Priority</Label>
            <div className="flex gap-2">
              {PRIORITIES.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => handleChange({ target: { name: 'priority', value: priority } })}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-sm border px-3 py-1.5 text-sm transition',
                    values.priority === priority
                      ? 'border-accent-border bg-accent-bg text-text'
                      : 'border-border bg-transparent text-muted hover:bg-surface-hover',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT_CLASS[priority])} />
                  {priority}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className={CAPTION_CLASS}>Tags</Label>
            <TagPicker
              tags={tags}
              selectedTagIds={values.tagIds}
              onChange={(tagIds) => handleChange({ target: { name: 'tagIds', value: tagIds } })}
              onCreateTag={onCreateTag}
            />
          </div>

          <DialogFooter className="justify-between border-t border-border pt-4">
            <p className="text-xs text-muted">Press Cmd/Ctrl+Enter to save</p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create task'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default TaskCreateModal
